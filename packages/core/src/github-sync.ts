import { decryptSecret } from './secrets';
import { type PrismaClient } from './prisma';
import {
  GITHUB_DETAIL_CONCURRENCY,
  GITHUB_DETAIL_LIMIT,
  GITHUB_MAX_PAGES,
  GITHUB_PAGE_SIZE,
  buildCodeIndex,
  githubApiHeaders,
  linkThreadToCode,
  mapPool,
  type AppEnv,
  type ThreadLinkDraft,
} from '@code-archaeologist/shared';

type LoggerLike = {
  log(message: string): void;
  warn(message: string): void;
};

export type FetchLike = (
  url: string,
  init?: { headers?: Record<string, string>; signal?: AbortSignal },
) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

type ThreadKind = 'ISSUE' | 'PULL_REQUEST';

type ThreadRow = {
  kind: ThreadKind;
  externalId: string;
  number: number | null;
  title: string;
  body: string;
  state: string;
  authorLogin: string | null;
  url: string | null;
  mergedAt: Date | null;
  providerCreatedAt: Date | null;
  providerUpdatedAt: Date | null;
  mergeCommitSha: string | null;
  headSha: string | null;
};

const FETCH_TIMEOUT_MS = 15_000;

export function parseGithubRepo(url: string): { owner: string; name: string } {
  const parsed = new URL(url);
  const parts = parsed.pathname.replace(/\.git$/i, '').split('/').filter(Boolean);
  if (parts.length < 2) {
    throw new Error('GitHub URL must include owner and repository');
  }
  return { owner: parts[0], name: parts[1] };
}

export async function syncGithubRepository(input: {
  prisma: PrismaClient;
  env: AppEnv;
  repositoryId: string;
  workspaceId: string;
  url: string;
  repoCredential?: { username: string; secret: string };
  since?: Date | null;
  onlyNumber?: number;
  fetchImpl?: FetchLike;
  logger?: LoggerLike;
}): Promise<{ issueCount: number; pullRequestCount: number; reviewCount: number; linkCount: number }> {
  const fetchImpl = input.fetchImpl ?? (globalThis.fetch as FetchLike);
  const token = await resolveGithubToken(input);
  const parsed = parseGithubRepo(input.url);
  const owner = encodeURIComponent(parsed.owner);
  const name = encodeURIComponent(parsed.name);
  const base = `https://api.github.com/repos/${owner}/${name}`;
  const headers = githubApiHeaders(token);

  let rows: ThreadRow[] = [];
  try {
    rows = input.onlyNumber
      ? await fetchOneThread(base, input.onlyNumber, headers, fetchImpl)
      : await fetchThreadPages(base, input.since, headers, fetchImpl);
  } catch (error) {
    input.logger?.warn(
      `GitHub issue/PR sync failed for ${input.repositoryId}: ${error instanceof Error ? error.message : 'unknown error'}`,
    );
    return { issueCount: 0, pullRequestCount: 0, reviewCount: 0, linkCount: 0 };
  }

  const threadIds: string[] = [];
  for (const row of rows) {
    threadIds.push(await upsertThread(input.prisma, input.repositoryId, row));
  }

  const pullRows = rows.filter((row) => row.kind === 'PULL_REQUEST' && row.number != null).slice(0, GITHUB_DETAIL_LIMIT);
  const details = await mapPool(pullRows, GITHUB_DETAIL_CONCURRENCY, async (row) => {
    const number = row.number as number;
    try {
      return {
        number,
        ...(await fetchPullDetails(base, number, headers, fetchImpl)),
      };
    } catch (error) {
      input.logger?.warn(
        `GitHub pull ${number} details failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return { number, shas: [] as string[], files: [] as string[], reviews: [], comments: [] };
    }
  });

  const shas = [...new Set(details.flatMap((item) => item.shas))];
  const commits =
    shas.length === 0
      ? []
      : await input.prisma.commit.findMany({
          where: { repositoryId: input.repositoryId, sha: { in: shas } },
          select: { id: true, sha: true },
        });
  const commitBySha = new Map(commits.map((commit) => [commit.sha, commit.id]));

  let reviewCount = 0;
  for (const detail of details) {
    const row = pullRows.find((item) => item.number === detail.number);
    if (!row) {
      continue;
    }
    const threadId = await findThreadId(input.prisma, input.repositoryId, 'PULL_REQUEST', row.externalId);
    if (!threadId) {
      continue;
    }
    reviewCount += await persistPullExtras(input.prisma, threadId, detail, commitBySha);
  }

  const index = await loadCodeIndex(input.prisma, input.repositoryId);
  let linkCount = 0;
  for (const row of rows) {
    const threadId = await findThreadId(input.prisma, input.repositoryId, row.kind, row.externalId);
    if (!threadId) {
      continue;
    }
    const detail = details.find((item) => item.number === row.number);
    const commitIds = new Map<string, string>();
    for (const sha of detail?.shas ?? []) {
      const commitId = commitBySha.get(sha);
      if (commitId) {
        commitIds.set(sha, commitId);
      }
    }
    if (row.mergeCommitSha) {
      const commitId = commitBySha.get(row.mergeCommitSha);
      if (commitId) {
        commitIds.set(row.mergeCommitSha, commitId);
      }
    }
    const drafts = linkThreadToCode({
      index,
      title: row.title,
      body: `${row.body}\n${(detail?.reviews ?? []).map((review) => review.body).join('\n')}`,
      commitIds,
      filePaths: detail?.files ?? [],
      reviewPaths: (detail?.comments ?? []).map((comment) => comment.path).filter((path): path is string => Boolean(path)),
    });
    linkCount += await replaceLinks(input.prisma, threadId, drafts);
  }

  return {
    issueCount: rows.filter((row) => row.kind === 'ISSUE').length,
    pullRequestCount: rows.filter((row) => row.kind === 'PULL_REQUEST').length,
    reviewCount,
    linkCount,
  };
}

export async function resolveGithubToken(input: {
  prisma: PrismaClient;
  env: AppEnv;
  workspaceId: string;
  repoCredential?: { username: string; secret: string };
}): Promise<string | undefined> {
  const integration = await input.prisma.integration.findUnique({
    where: { workspaceId_provider: { workspaceId: input.workspaceId, provider: 'GITHUB' } },
  });
  if (integration?.status === 'ACTIVE') {
    try {
      const parsed = JSON.parse(decryptSecret(integration.encryptedPayload, input.env.CREDENTIALS_ENCRYPTION_KEY)) as {
        token?: string;
      };
      if (parsed.token) {
        return parsed.token;
      }
    } catch {
      // Fall through to the repository credential.
    }
  }
  return input.repoCredential?.secret;
}

async function fetchThreadPages(
  base: string,
  since: Date | null | undefined,
  headers: Record<string, string>,
  fetchImpl: FetchLike,
): Promise<ThreadRow[]> {
  const rows: ThreadRow[] = [];
  const sinceQuery = since ? `&since=${encodeURIComponent(since.toISOString())}` : '';
  for (let page = 1; page <= GITHUB_MAX_PAGES; page += 1) {
    const issues = asArray(
      await fetchJson(`${base}/issues?state=all&per_page=${GITHUB_PAGE_SIZE}&page=${page}${sinceQuery}`, headers, fetchImpl),
    );
    if (issues.length === 0) {
      break;
    }
    for (const item of issues) {
      if (!isRecord(item)) {
        continue;
      }
      const mapped = item.pull_request ? mapPull(item) : mapIssue(item);
      if (mapped) {
        rows.push(mapped);
      }
    }
    if (issues.length < GITHUB_PAGE_SIZE) {
      break;
    }
  }
  return rows;
}

async function fetchOneThread(
  base: string,
  number: number,
  headers: Record<string, string>,
  fetchImpl: FetchLike,
): Promise<ThreadRow[]> {
  const issue = await fetchJson(`${base}/issues/${number}`, headers, fetchImpl);
  if (!isRecord(issue)) {
    return [];
  }
  const mapped = issue.pull_request ? mapPull(issue) : mapIssue(issue);
  return mapped ? [mapped] : [];
}

async function fetchPullDetails(
  base: string,
  number: number,
  headers: Record<string, string>,
  fetchImpl: FetchLike,
): Promise<{
  shas: string[];
  files: string[];
  reviews: Array<{ externalId: string; authorLogin: string | null; state: string; body: string; submittedAt: Date | null }>;
  comments: Array<{
    externalId: string;
    authorLogin: string | null;
    body: string;
    path: string | null;
    line: number | null;
    submittedAt: Date | null;
  }>;
}> {
  const [commits, files, reviews, comments] = await Promise.all([
    fetchJson(`${base}/pulls/${number}/commits?per_page=100`, headers, fetchImpl),
    fetchJson(`${base}/pulls/${number}/files?per_page=100`, headers, fetchImpl),
    fetchJson(`${base}/pulls/${number}/reviews?per_page=50`, headers, fetchImpl),
    fetchJson(`${base}/pulls/${number}/comments?per_page=50`, headers, fetchImpl),
  ]);
  return {
    shas: asArray(commits)
      .map((item) => (isRecord(item) ? asString(item.sha) : ''))
      .filter(Boolean)
      .slice(0, 80),
    files: asArray(files)
      .map((item) => (isRecord(item) ? asString(item.filename) : ''))
      .filter(Boolean)
      .slice(0, 80),
    reviews: asArray(reviews)
      .map((item) => {
        if (!isRecord(item)) {
          return null;
        }
        return {
          externalId: String(item.id ?? ''),
          authorLogin: isRecord(item.user) ? asString(item.user.login) || null : null,
          state: asString(item.state) || 'COMMENTED',
          body: asString(item.body).slice(0, 4000),
          submittedAt: asDate(item.submitted_at),
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item?.externalId)),
    comments: asArray(comments)
      .map((item) => {
        if (!isRecord(item)) {
          return null;
        }
        return {
          externalId: String(item.id ?? ''),
          authorLogin: isRecord(item.user) ? asString(item.user.login) || null : null,
          body: asString(item.body).slice(0, 4000),
          path: asString(item.path) || null,
          line: asNumber(item.line ?? item.original_line),
          submittedAt: asDate(item.updated_at ?? item.created_at),
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item?.externalId)),
  };
}

async function upsertThread(prisma: PrismaClient, repositoryId: string, row: ThreadRow): Promise<string> {
  const data = {
    kind: row.kind,
    provider: 'GITHUB',
    externalId: row.externalId.slice(0, 80),
    number: row.number,
    title: row.title.slice(0, 500),
    body: row.body.slice(0, 8000),
    state: row.state.slice(0, 40),
    authorLogin: row.authorLogin?.slice(0, 120) ?? null,
    url: row.url?.slice(0, 1000) ?? null,
    mergedAt: row.mergedAt,
    providerCreatedAt: row.providerCreatedAt,
    providerUpdatedAt: row.providerUpdatedAt,
    mergeCommitSha: row.mergeCommitSha,
    headSha: row.headSha,
  };
  const existing = await prisma.repositoryThread.findUnique({
    where: {
      repositoryId_kind_externalId: {
        repositoryId,
        kind: row.kind,
        externalId: data.externalId,
      },
    },
    select: { id: true },
  });
  if (existing) {
    await prisma.repositoryThread.update({ where: { id: existing.id }, data });
    return existing.id;
  }
  const created = await prisma.repositoryThread.create({
    data: { repositoryId, ...data },
    select: { id: true },
  });
  return created.id;
}

async function persistPullExtras(
  prisma: PrismaClient,
  threadId: string,
  detail: {
    shas: string[];
    reviews: Array<{ externalId: string; authorLogin: string | null; state: string; body: string; submittedAt: Date | null }>;
    comments: Array<{
      externalId: string;
      authorLogin: string | null;
      body: string;
      path: string | null;
      line: number | null;
      submittedAt: Date | null;
    }>;
  },
  commitBySha: Map<string, string>,
): Promise<number> {
  for (const review of detail.reviews) {
    await prisma.threadReview.upsert({
      where: { threadId_externalId: { threadId, externalId: review.externalId.slice(0, 80) } },
      create: { threadId, ...review, externalId: review.externalId.slice(0, 80) },
      update: { ...review, externalId: review.externalId.slice(0, 80) },
    });
  }
  for (const comment of detail.comments) {
    await prisma.threadComment.upsert({
      where: { threadId_externalId: { threadId, externalId: comment.externalId.slice(0, 80) } },
      create: { threadId, ...comment, externalId: comment.externalId.slice(0, 80), path: comment.path?.slice(0, 500) ?? null },
      update: { ...comment, externalId: comment.externalId.slice(0, 80), path: comment.path?.slice(0, 500) ?? null },
    });
  }
  for (const sha of detail.shas) {
    await prisma.threadCommit.upsert({
      where: { threadId_sha: { threadId, sha } },
      create: { threadId, sha, commitId: commitBySha.get(sha) ?? null },
      update: { commitId: commitBySha.get(sha) ?? null },
    });
  }
  return detail.reviews.length;
}

async function replaceLinks(prisma: PrismaClient, threadId: string, drafts: ThreadLinkDraft[]): Promise<number> {
  await prisma.threadLink.deleteMany({ where: { threadId } });
  if (drafts.length === 0) {
    return 0;
  }
  await prisma.threadLink.createMany({
    data: drafts.map((draft) => ({
      threadId,
      fileId: draft.fileId ?? null,
      symbolId: draft.symbolId ?? null,
      commitId: draft.commitId ?? null,
      path: draft.path ?? null,
      method: draft.method,
      confidence: draft.confidence,
      excerpt: draft.excerpt ?? null,
    })),
  });
  return drafts.length;
}

async function loadCodeIndex(prisma: PrismaClient, repositoryId: string) {
  const [files, symbols] = await Promise.all([
    prisma.repoFile.findMany({
      where: { repositoryId },
      select: { id: true, path: true },
      take: 8_000,
    }),
    prisma.codeSymbol.findMany({
      where: { file: { repositoryId } },
      select: { id: true, name: true, fileId: true, file: { select: { path: true } } },
      take: 12_000,
    }),
  ]);
  return buildCodeIndex(
    files,
    symbols.map((symbol) => ({
      id: symbol.id,
      name: symbol.name,
      fileId: symbol.fileId,
      path: symbol.file.path,
    })),
  );
}

async function findThreadId(
  prisma: PrismaClient,
  repositoryId: string,
  kind: ThreadKind,
  externalId: string,
): Promise<string | null> {
  const row = await prisma.repositoryThread.findUnique({
    where: { repositoryId_kind_externalId: { repositoryId, kind, externalId: externalId.slice(0, 80) } },
    select: { id: true },
  });
  return row?.id ?? null;
}

async function fetchJson(url: string, headers: Record<string, string>, fetchImpl: FetchLike): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetchImpl(url, { headers, signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function mapIssue(value: Record<string, unknown>): ThreadRow | null {
  return {
    kind: 'ISSUE',
    externalId: String(value.id ?? value.number ?? ''),
    number: asNumber(value.number),
    title: asString(value.title) || 'Untitled issue',
    body: asString(value.body),
    state: asString(value.state) || 'open',
    authorLogin: isRecord(value.user) ? asString(value.user.login) || null : null,
    url: asString(value.html_url) || null,
    mergedAt: null,
    providerCreatedAt: asDate(value.created_at),
    providerUpdatedAt: asDate(value.updated_at),
    mergeCommitSha: null,
    headSha: null,
  };
}

function mapPull(value: Record<string, unknown>): ThreadRow | null {
  const head = isRecord(value.head) ? value.head : {};
  return {
    kind: 'PULL_REQUEST',
    externalId: String(value.id ?? value.number ?? ''),
    number: asNumber(value.number),
    title: asString(value.title) || 'Untitled pull request',
    body: asString(value.body),
    state: asString(value.merged_at) ? 'merged' : asString(value.state) || 'open',
    authorLogin: isRecord(value.user) ? asString(value.user.login) || null : null,
    url: asString(value.html_url) || null,
    mergedAt: asDate(value.merged_at),
    providerCreatedAt: asDate(value.created_at),
    providerUpdatedAt: asDate(value.updated_at),
    mergeCommitSha: asString(value.merge_commit_sha) || null,
    headSha: asString(head.sha) || null,
  };
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
