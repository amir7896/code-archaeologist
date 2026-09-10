export const REPOSITORY_PROVIDERS = ['GITHUB', 'GITLAB', 'BITBUCKET', 'GENERIC'] as const;
export type RepositoryProviderName = (typeof REPOSITORY_PROVIDERS)[number];

export class GitUrlError extends Error {
  readonly code = 'INVALID_GIT_URL';

  constructor(message: string) {
    super(message);
    this.name = 'GitUrlError';
  }
}

export type ParsedGitUrl = {
  url: string;
  provider: RepositoryProviderName;
  name: string;
  owner: string;
  hostname: string;
  compareKey: string;
};

const HOST_PROVIDERS: Record<string, RepositoryProviderName> = {
  'github.com': 'GITHUB',
  'www.github.com': 'GITHUB',
  'gitlab.com': 'GITLAB',
  'www.gitlab.com': 'GITLAB',
  'bitbucket.org': 'BITBUCKET',
  'www.bitbucket.org': 'BITBUCKET',
};

export function parseHttpsGitUrl(value: string): ParsedGitUrl {
  const trimmed = value.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new GitUrlError('Enter a valid HTTPS Git URL');
  }

  if (parsed.protocol !== 'https:') {
    throw new GitUrlError('Only HTTPS Git URLs are supported');
  }
  if (parsed.username || parsed.password) {
    throw new GitUrlError(
      'Do not put a username or token in the URL. Add an access token separately.',
    );
  }
  if (!parsed.hostname || parsed.hostname === 'localhost' || parsed.hostname.endsWith('.local')) {
    throw new GitUrlError('Enter a valid HTTPS Git URL');
  }

  const path = parsed.pathname.replace(/\/+$/, '');
  const segments = path.split('/').filter(Boolean);
  if (segments.length < 2) {
    throw new GitUrlError('The URL must include the owner and repository name');
  }

  const last = segments[segments.length - 1].replace(/\.git$/i, '');
  if (!last) {
    throw new GitUrlError('The URL must include the owner and repository name');
  }

  const hostname = parsed.hostname.toLowerCase();
  const comparePath = `${path.replace(/\.git$/i, '')}`.toLowerCase();
  return {
    url: `https://${hostname}${path}`,
    provider: HOST_PROVIDERS[hostname] ?? 'GENERIC',
    name: last.slice(0, 80),
    owner: segments.slice(0, -1).join('/'),
    hostname,
    compareKey: `${hostname}${comparePath}`,
  };
}

export function sanitizeGitError(message: string): string {
  return message
    .replace(/https:\/\/[^/\s]+@/gi, 'https://***@')
    .replace(/Authorization:\s*Basic\s+\S+/gi, 'Authorization: Basic ***')
    .replace(/x-access-token:[^\s@]+/gi, 'x-access-token:***')
    .slice(0, 400);
}

export function classifyCloneFailure(message: string): string {
  const normalized = message.toLowerCase();
  if (
    normalized.includes('authentication failed') ||
    normalized.includes('invalid username or password')
  ) {
    return 'Could not access the repository. Check the URL and access token.';
  }
  if (normalized.includes('not found') || normalized.includes('repository not found')) {
    return 'Repository not found. Check the URL.';
  }
  if (normalized.includes('timed out') || normalized.includes('etimedout')) {
    return 'The repository took too long to clone.';
  }
  return 'Could not clone the repository.';
}
