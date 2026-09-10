import { type PrismaClient } from '@code-archaeologist/core';
import { parseHttpsGitUrl } from '@code-archaeologist/git';

type LoggerLike = {
  log(message: string): void;
  warn(message: string): void;
};

type FetchLike = (url: string, init?: { headers?: Record<string, string>; signal?: AbortSignal }) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

type ThreadRow = {
  kind: 'ISSUE' | 'PULL_REQUEST';
  provider: string;
  externalId: string;
  number: number | null;
  title: string;
  body: string;
  state: string;
  authorLogin: string | null;
  url: string | null;
  mergedAt: Date | null;
  providerCreatedAt: Date | null;
};

const FETCH_TIMEOUT_MS = 15_000;
const PAGE_SIZE = 100;

export async function fetchRepositoryThreads(input: {
  prisma: PrismaClient;
  repositoryId: string;
  url: string;
  provider: string;
  credential?: { username: string; secret: string };
  fetchImpl?: FetchLike;
  logger?: LoggerLike;
}): Promise<{ issueCount: number; pullRequestCount: number }> {
  if (input.provider === 'GENERIC') {
    return { issueCount: 0, pullRequestCount: 0 };
  }

  const fetchImpl = input.fetchImpl ?? (globalThis.fetch as FetchLike);
  let rows: ThreadRow[] = [];
  try {
    if (input.provider === 'GITHUB') {
      rows = await fetchGitHub(input.url, input.credential?.secret, fetchImpl);
    } else if (input.provider === 'GITLAB') {
      rows = await fetchGitLab(input.url, input.credential?.secret, fetchImpl);
    } else if (input.provider === 'BITBUCKET') {
      rows = await fetchBitbucket(input.url, input.credential?.secret, fetchImpl);
    }
  } catch (error) {
    input.logger?.warn(
      `Could not fetch issues or pull requests for ${input.repositoryId}: ${error instanceof Error ? error.message : 'unknown error'}`,
    );
    return { issueCount: 0, pullRequestCount: 0 };
  }

  for (const row of rows) {
    const data = {
      kind: row.kind,
      provider: row.provider,
      externalId: row.externalId.slice(0, 80),
      number: row.number,
      title: row.title.slice(0, 500),
      body: row.body.slice(0, 8000),
      state: row.state.slice(0, 40),
      authorLogin: row.authorLogin?.slice(0, 120) ?? null,
      url: row.url?.slice(0, 1000) ?? null,
      mergedAt: row.mergedAt,
      providerCreatedAt: row.providerCreatedAt,
    };
    await input.prisma.repositoryThread.upsert({
      where: {
        repositoryId_kind_externalId: {
          repositoryId: input.repositoryId,
          kind: row.kind,
          externalId: data.externalId,
        },
      },
      create: { repositoryId: input.repositoryId, ...data },
      update: data,
    });
  }

  return {
    issueCount: rows.filter((row) => row.kind === 'ISSUE').length,
    pullRequestCount: rows.filter((row) => row.kind === 'PULL_REQUEST').length,
  };
}

async function fetchGitHub(
  url: string,
  token: string | undefined,
  fetchImpl: FetchLike,
): Promise<ThreadRow[]> {
  const parsed = parseHttpsGitUrl(url);
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'code-archaeologist',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const base = `https://api.github.com/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.name)}`;
  const [issues, pulls] = await Promise.all([
    fetchJson(`${base}/issues?state=all&per_page=${PAGE_SIZE}`, headers, fetchImpl),
    fetchJson(`${base}/pulls?state=all&per_page=${PAGE_SIZE}`, headers, fetchImpl),
  ]);
  const issueRows = asArray(issues)
    .filter((item) => !isRecord(item) || !item.pull_request)
    .map((item) => mapGitHubIssue(item));
  const pullRows = asArray(pulls).map((item) => mapGitHubPull(item));
  return [...issueRows, ...pullRows].filter((row): row is ThreadRow => Boolean(row));
}

async function fetchGitLab(
  url: string,
  token: string | undefined,
  fetchImpl: FetchLike,
): Promise<ThreadRow[]> {
  const parsed = parseHttpsGitUrl(url);
  const project = encodeURIComponent(`${parsed.owner}/${parsed.name}`);
  const headers: Record<string, string> = { 'User-Agent': 'code-archaeologist' };
  if (token) {
    headers['PRIVATE-TOKEN'] = token;
  }
  const base = `https://${parsed.hostname}/api/v4/projects/${project}`;
  const [issues, merges] = await Promise.all([
    fetchJson(`${base}/issues?state=all&per_page=${PAGE_SIZE}`, headers, fetchImpl),
    fetchJson(`${base}/merge_requests?state=all&per_page=${PAGE_SIZE}`, headers, fetchImpl),
  ]);
  return [
    ...asArray(issues).map((item) => mapGitLabIssue(item)),
    ...asArray(merges).map((item) => mapGitLabMerge(item)),
  ].filter((row): row is ThreadRow => Boolean(row));
}

async function fetchBitbucket(
  url: string,
  token: string | undefined,
  fetchImpl: FetchLike,
): Promise<ThreadRow[]> {
  const parsed = parseHttpsGitUrl(url);
  const headers: Record<string, string> = { 'User-Agent': 'code-archaeologist' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const base = `https://api.bitbucket.org/2.0/repositories/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.name)}`;
  const pulls = await fetchJson(`${base}/pullrequests?state=ALL&pagelen=${PAGE_SIZE}`, headers, fetchImpl);
  let issues: unknown = { values: [] };
  try {
    issues = await fetchJson(`${base}/issues?pagelen=${PAGE_SIZE}`, headers, fetchImpl);
  } catch {
    issues = { values: [] };
  }
  return [
    ...valuesOf(issues).map((item) => mapBitbucketIssue(item)),
    ...valuesOf(pulls).map((item) => mapBitbucketPull(item)),
  ].filter((row): row is ThreadRow => Boolean(row));
}

async function fetchJson(
  url: string,
  headers: Record<string, string>,
  fetchImpl: FetchLike,
): Promise<unknown> {
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

function mapGitHubIssue(value: unknown): ThreadRow | null {
  if (!isRecord(value)) {
    return null;
  }
  return {
    kind: 'ISSUE',
    provider: 'GITHUB',
    externalId: String(value.id ?? value.number ?? ''),
    number: asNumber(value.number),
    title: asString(value.title) || 'Untitled issue',
    body: asString(value.body),
    state: asString(value.state) || 'open',
    authorLogin: isRecord(value.user) ? asString(value.user.login) || null : null,
    url: asString(value.html_url) || null,
    mergedAt: null,
    providerCreatedAt: asDate(value.created_at),
  };
}

function mapGitHubPull(value: unknown): ThreadRow | null {
  if (!isRecord(value)) {
    return null;
  }
  return {
    kind: 'PULL_REQUEST',
    provider: 'GITHUB',
    externalId: String(value.id ?? value.number ?? ''),
    number: asNumber(value.number),
    title: asString(value.title) || 'Untitled pull request',
    body: asString(value.body),
    state: asString(value.state) || 'open',
    authorLogin: isRecord(value.user) ? asString(value.user.login) || null : null,
    url: asString(value.html_url) || null,
    mergedAt: asDate(value.merged_at),
    providerCreatedAt: asDate(value.created_at),
  };
}

function mapGitLabIssue(value: unknown): ThreadRow | null {
  if (!isRecord(value)) {
    return null;
  }
  return {
    kind: 'ISSUE',
    provider: 'GITLAB',
    externalId: String(value.id ?? value.iid ?? ''),
    number: asNumber(value.iid),
    title: asString(value.title) || 'Untitled issue',
    body: asString(value.description),
    state: asString(value.state) || 'opened',
    authorLogin: isRecord(value.author) ? asString(value.author.username) || null : null,
    url: asString(value.web_url) || null,
    mergedAt: null,
    providerCreatedAt: asDate(value.created_at),
  };
}

function mapGitLabMerge(value: unknown): ThreadRow | null {
  if (!isRecord(value)) {
    return null;
  }
  return {
    kind: 'PULL_REQUEST',
    provider: 'GITLAB',
    externalId: String(value.id ?? value.iid ?? ''),
    number: asNumber(value.iid),
    title: asString(value.title) || 'Untitled merge request',
    body: asString(value.description),
    state: asString(value.state) || 'opened',
    authorLogin: isRecord(value.author) ? asString(value.author.username) || null : null,
    url: asString(value.web_url) || null,
    mergedAt: asDate(value.merged_at),
    providerCreatedAt: asDate(value.created_at),
  };
}

function mapBitbucketIssue(value: unknown): ThreadRow | null {
  if (!isRecord(value)) {
    return null;
  }
  const content = isRecord(value.content) ? value.content : {};
  const links = isRecord(value.links) ? value.links : {};
  const html = isRecord(links.html) ? links.html : {};
  return {
    kind: 'ISSUE',
    provider: 'BITBUCKET',
    externalId: String(value.id ?? ''),
    number: asNumber(value.id),
    title: asString(value.title) || 'Untitled issue',
    body: asString(content.raw),
    state: asString(value.state) || 'open',
    authorLogin: isRecord(value.reporter)
      ? asString(value.reporter.nickname) || asString(value.reporter.display_name) || null
      : null,
    url: asString(html.href) || null,
    mergedAt: null,
    providerCreatedAt: asDate(value.created_on),
  };
}

function mapBitbucketPull(value: unknown): ThreadRow | null {
  if (!isRecord(value)) {
    return null;
  }
  const links = isRecord(value.links) ? value.links : {};
  const html = isRecord(links.html) ? links.html : {};
  return {
    kind: 'PULL_REQUEST',
    provider: 'BITBUCKET',
    externalId: String(value.id ?? ''),
    number: asNumber(value.id),
    title: asString(value.title) || 'Untitled pull request',
    body: asString(value.description),
    state: asString(value.state) || 'OPEN',
    authorLogin: isRecord(value.author)
      ? asString(value.author.nickname) || asString(value.author.display_name) || null
      : null,
    url: asString(html.href) || null,
    mergedAt: null,
    providerCreatedAt: asDate(value.created_on),
  };
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function valuesOf(value: unknown): unknown[] {
  return isRecord(value) && Array.isArray(value.values) ? value.values : [];
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
