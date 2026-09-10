import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const GITHUB_API_VERSION = '2022-11-28';
export const GITHUB_USER_AGENT = 'code-archaeologist';
export const GITHUB_MAX_PAGES = 3;
export const GITHUB_PAGE_SIZE = 100;
export const GITHUB_DETAIL_LIMIT = 40;
export const GITHUB_DETAIL_CONCURRENCY = 4;
export const GITHUB_LINK_LIMIT = 40;

export type ThreadLinkMethodName =
  | 'PR_COMMIT'
  | 'PR_FILE'
  | 'REVIEW_PATH'
  | 'TEXT_PATH'
  | 'TEXT_SYMBOL';

export type ThreadLinkDraft = {
  fileId?: string | null;
  symbolId?: string | null;
  commitId?: string | null;
  path?: string | null;
  method: ThreadLinkMethodName;
  confidence: number;
  excerpt?: string | null;
};

export type CodeFileRef = { id: string; path: string };
export type CodeSymbolRef = { id: string; name: string; fileId: string; path: string };

export type CodeIndex = {
  filesByPath: Map<string, CodeFileRef>;
  filesByName: Map<string, CodeFileRef[]>;
  symbolsByName: Map<string, CodeSymbolRef[]>;
};

const PATH_RE = /(?<![A-Za-z0-9_])((?:[\w.-]+\/)+[\w.-]+\.[A-Za-z][\w.-]*)/g;
const BASENAME_RE = /(?<![A-Za-z0-9_/])([\w.-]+\.[A-Za-z][\w.-]*)/g;
const SYMBOL_RE = /\b([A-Z][A-Za-z0-9]+(?:[A-Z][A-Za-z0-9]+)+)\b/g;

export function githubOAuthConfigured(env: {
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
}): boolean {
  return Boolean(env.GITHUB_CLIENT_ID?.trim() && env.GITHUB_CLIENT_SECRET?.trim());
}

export function githubApiHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': GITHUB_USER_AGENT,
    'X-GitHub-Api-Version': GITHUB_API_VERSION,
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export function hashGithubPayload(payload: string | Buffer): string {
  return createHash('sha256').update(payload).digest('hex');
}

export function verifyGithubWebhookSignature(input: {
  payload: string | Buffer;
  signature: string | undefined;
  secret: string;
}): boolean {
  if (!input.secret || !input.signature?.startsWith('sha256=')) {
    return false;
  }
  const expected = createHmac('sha256', input.secret).update(input.payload).digest('hex');
  const actual = input.signature.slice('sha256='.length);
  const expectedBuf = Buffer.from(expected, 'hex');
  const actualBuf = Buffer.from(actual, 'hex');
  if (expectedBuf.length === 0 || expectedBuf.length !== actualBuf.length) {
    return false;
  }
  return timingSafeEqual(expectedBuf, actualBuf);
}

export function newGithubWebhookSecret(): string {
  return `whsec_${randomBytes(24).toString('hex')}`;
}

export function createGithubOAuthState(workspaceId: string, secret: string, now = Date.now()): string {
  const exp = String(now + 10 * 60 * 1000);
  const payload = `${workspaceId}.${exp}`;
  const sig = createHmac('sha256', secret).update(payload).digest('base64url');
  return Buffer.from(`${payload}.${sig}`).toString('base64url');
}

export function readGithubOAuthState(state: string, secret: string, now = Date.now()): string | null {
  try {
    const decoded = Buffer.from(state, 'base64url').toString('utf8');
    const lastDot = decoded.lastIndexOf('.');
    if (lastDot <= 0) {
      return null;
    }
    const payload = decoded.slice(0, lastDot);
    const sig = decoded.slice(lastDot + 1);
    const expected = createHmac('sha256', secret).update(payload).digest('base64url');
    const sigBuf = Buffer.from(sig);
    const expectedBuf = Buffer.from(expected);
    if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
      return null;
    }
    const [workspaceId, expRaw] = payload.split('.');
    if (!workspaceId || !expRaw || Number(expRaw) < now) {
      return null;
    }
    return workspaceId;
  } catch {
    return null;
  }
}

export function buildCodeIndex(files: CodeFileRef[], symbols: CodeSymbolRef[]): CodeIndex {
  const filesByPath = new Map<string, CodeFileRef>();
  const filesByName = new Map<string, CodeFileRef[]>();
  for (const file of files) {
    const pathKey = file.path.toLowerCase();
    filesByPath.set(pathKey, file);
    const name = file.path.split('/').pop()?.toLowerCase();
    if (!name) {
      continue;
    }
    const list = filesByName.get(name) ?? [];
    list.push(file);
    filesByName.set(name, list);
  }
  const symbolsByName = new Map<string, CodeSymbolRef[]>();
  for (const symbol of symbols) {
    const key = symbol.name.toLowerCase();
    const list = symbolsByName.get(key) ?? [];
    list.push(symbol);
    symbolsByName.set(key, list);
  }
  return { filesByPath, filesByName, symbolsByName };
}

export function extractThreadMentions(text: string): { paths: string[]; symbols: string[] } {
  const paths = new Set<string>();
  const symbols = new Set<string>();
  for (const match of text.matchAll(PATH_RE)) {
    if (match[1]) {
      paths.add(match[1]);
    }
  }
  for (const match of text.matchAll(BASENAME_RE)) {
    if (match[1] && match[1].includes('.')) {
      paths.add(match[1]);
    }
  }
  for (const match of text.matchAll(SYMBOL_RE)) {
    if (match[1] && match[1].length <= 80) {
      symbols.add(match[1]);
    }
  }
  return { paths: [...paths].slice(0, 24), symbols: [...symbols].slice(0, 16) };
}

export function resolveIndexedFile(index: CodeIndex, mention: string): CodeFileRef | null {
  const key = mention.replace(/^\.?\//, '').toLowerCase();
  const exact = index.filesByPath.get(key);
  if (exact) {
    return exact;
  }
  for (const [path, file] of index.filesByPath) {
    if (path.endsWith(`/${key}`) || path === key) {
      return file;
    }
  }
  const base = key.split('/').pop();
  if (!base) {
    return null;
  }
  const named = index.filesByName.get(base);
  return named?.length === 1 ? named[0] : null;
}

export function linkThreadToCode(input: {
  index: CodeIndex;
  title: string;
  body: string;
  commitIds: Map<string, string>;
  filePaths: string[];
  reviewPaths: string[];
}): ThreadLinkDraft[] {
  const drafts: ThreadLinkDraft[] = [];
  const seen = new Set<string>();

  const add = (draft: ThreadLinkDraft) => {
    if (drafts.length >= GITHUB_LINK_LIMIT) {
      return;
    }
    const key = `${draft.method}:${draft.commitId ?? ''}:${draft.fileId ?? ''}:${draft.symbolId ?? ''}:${draft.path ?? ''}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    drafts.push(draft);
  };

  for (const [sha, commitId] of input.commitIds) {
    add({
      commitId,
      method: 'PR_COMMIT',
      confidence: 1,
      excerpt: sha.slice(0, 7),
    });
  }

  for (const path of input.filePaths) {
    const file = resolveIndexedFile(input.index, path);
    add({
      fileId: file?.id ?? null,
      path: file?.path ?? path,
      method: 'PR_FILE',
      confidence: file ? 0.95 : 0.7,
      excerpt: path,
    });
  }

  for (const path of input.reviewPaths) {
    const file = resolveIndexedFile(input.index, path);
    add({
      fileId: file?.id ?? null,
      path: file?.path ?? path,
      method: 'REVIEW_PATH',
      confidence: file ? 0.9 : 0.65,
      excerpt: path,
    });
  }

  const mentions = extractThreadMentions(`${input.title}\n${input.body}`);
  for (const path of mentions.paths) {
    const file = resolveIndexedFile(input.index, path);
    if (!file) {
      continue;
    }
    add({
      fileId: file.id,
      path: file.path,
      method: 'TEXT_PATH',
      confidence: path.includes('/') ? 0.75 : 0.58,
      excerpt: path,
    });
  }
  for (const name of mentions.symbols) {
    const matches = input.index.symbolsByName.get(name.toLowerCase()) ?? [];
    if (matches.length !== 1) {
      continue;
    }
    const symbol = matches[0];
    add({
      symbolId: symbol.id,
      fileId: symbol.fileId,
      path: symbol.path,
      method: 'TEXT_SYMBOL',
      confidence: 0.55,
      excerpt: name,
    });
  }

  return drafts;
}

export async function mapPool<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) {
    return [];
  }
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(Math.max(1, limit), items.length) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await mapper(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}
