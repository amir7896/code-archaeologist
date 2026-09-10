import { HttpClient, type FetchLike, type HttpHooks, type RequestOptions } from './http';
import { iteratePages } from './pagination';
import { isFailedStatus, isTerminalRunStatus, waitUntil } from './poll';
import {
  type AiStatus,
  type AuthSession,
  type CreateRepositoryInput,
  type DnaHealth,
  type HealthStatus,
  type ImpactReport,
  type InsightItem,
  type Investigation,
  type PageQuery,
  type Paginated,
  type PollOptions,
  type Repository,
  type SourceFile,
  type TokenPair,
  type User,
  type Workspace,
} from './types';

export type CreateClientOptions = {
  baseUrl: string;
  accessToken?: string;
  refreshToken?: string;
  fetch?: FetchLike;
  onTokens?: HttpHooks['onTokens'];
};

export type CodeArchaeologistClient = ReturnType<typeof createClient>;

export function createClient(options: CreateClientOptions) {
  const http = new HttpClient(
    options.baseUrl,
    options.fetch ?? globalThis.fetch.bind(globalThis),
    { onTokens: options.onTokens },
    { accessToken: options.accessToken, refreshToken: options.refreshToken },
  );

  const auth = {
    login: (body: { email: string; password: string }) =>
      storeSession(http, options.onTokens, http.request<AuthSession>('/auth/login', { method: 'POST', json: body, auth: false })),
    register: (body: { email: string; password: string; name: string }) =>
      storeSession(
        http,
        options.onTokens,
        http.request<AuthSession>('/auth/register', { method: 'POST', json: body, auth: false }),
      ),
    refresh: (refreshToken: string) =>
      storeTokens(http, options.onTokens, http.request<TokenPair>('/auth/refresh', { method: 'POST', json: { refreshToken }, auth: false })),
    logout: () => http.request<{ status: string }>('/auth/logout', { method: 'POST' }),
    me: () => http.request<User>('/me'),
  };

  const workspaces = {
    list: (query: PageQuery = {}) => http.request<Paginated<Workspace>>('/workspaces', { query }),
    create: (name: string) => http.request<Workspace>('/workspaces', { method: 'POST', json: { name } }),
    get: (workspaceId: string) => http.request<Workspace>(`/workspaces/${workspaceId}`),
    iterate: (query: PageQuery = {}) => iteratePages((page) => workspaces.list(page), query),
  };

  const repositories = {
    list: (workspaceId: string, query: PageQuery = {}) =>
      http.request<Paginated<Repository>>(`/workspaces/${workspaceId}/repositories`, { query }),
    create: (workspaceId: string, body: CreateRepositoryInput) =>
      http.request<Repository>(`/workspaces/${workspaceId}/repositories`, { method: 'POST', json: body }),
    get: (workspaceId: string, repositoryId: string) =>
      http.request<Repository>(`/workspaces/${workspaceId}/repositories/${repositoryId}`),
    status: (workspaceId: string, repositoryId: string) =>
      http.request<Repository>(`/workspaces/${workspaceId}/repositories/${repositoryId}/status`),
    sync: (workspaceId: string, repositoryId: string, body: { revision?: string } = {}) =>
      http.request<Repository>(`/workspaces/${workspaceId}/repositories/${repositoryId}/sync`, {
        method: 'POST',
        json: body,
      }),
    iterate: (workspaceId: string, query: PageQuery = {}) =>
      iteratePages((page) => repositories.list(workspaceId, page), query),
    files: (workspaceId: string, repositoryId: string, query: PageQuery & { q?: string } = {}) =>
      http.request<Paginated<SourceFile>>(
        `/workspaces/${workspaceId}/repositories/${repositoryId}/code/files`,
        { query },
      ),
    findFile: async (workspaceId: string, repositoryId: string, path: string) => {
      const exact = path.replace(/^\.\//, '');
      const listed = await repositories.files(workspaceId, repositoryId, { q: exact, limit: 100 });
      return (
        listed.items.find((file) => file.path === exact || file.path.endsWith(`/${exact}`)) ??
        listed.items.find((file) => file.path.endsWith(exact)) ??
        null
      );
    },
    waitForAnalysis: async (workspaceId: string, repositoryId: string, poll: PollOptions = {}) => {
      const repository = await waitUntil(
        () => repositories.status(workspaceId, repositoryId),
        (item) => {
          const run = item.latestRun;
          poll.onProgress?.(run ? `${run.status} ${run.progress}%` : item.status);
          if (run) {
            return isTerminalRunStatus(run.status);
          }
          return item.status === 'READY' || item.status === 'FAILED';
        },
        poll,
      );
      const failed = repository.latestRun
        ? isFailedStatus(repository.latestRun.status)
        : repository.status === 'FAILED';
      return { repository, failed };
    },
  };

  const investigations = {
    create: (
      workspaceId: string,
      repositoryId: string,
      body: { question: string; fileId?: string; symbolId?: string },
    ) =>
      http.request<Investigation>(`/workspaces/${workspaceId}/repositories/${repositoryId}/investigations`, {
        method: 'POST',
        json: body,
      }),
    get: (workspaceId: string, repositoryId: string, investigationId: string) =>
      http.request<Investigation>(
        `/workspaces/${workspaceId}/repositories/${repositoryId}/investigations/${investigationId}`,
      ),
    list: (workspaceId: string, repositoryId: string, query: PageQuery = {}) =>
      http.request<Paginated<Investigation>>(
        `/workspaces/${workspaceId}/repositories/${repositoryId}/investigations`,
        { query },
      ),
    wait: async (
      workspaceId: string,
      repositoryId: string,
      investigationId: string,
      poll: PollOptions = {},
    ) => {
      const investigation = await waitUntil(
        () => investigations.get(workspaceId, repositoryId, investigationId),
        (item) => {
          poll.onProgress?.(item.status);
          return isTerminalRunStatus(item.status);
        },
        poll,
      );
      return { investigation, failed: isFailedStatus(investigation.status) };
    },
  };

  const insights = {
    hotspots: (workspaceId: string, repositoryId: string, limit?: number) =>
      http.request<{ items: InsightItem[] }>(
        `/workspaces/${workspaceId}/repositories/${repositoryId}/insights/hotspots`,
        { query: { limit } },
      ),
    health: (workspaceId: string, repositoryId: string) =>
      http.request<DnaHealth>(`/workspaces/${workspaceId}/repositories/${repositoryId}/insights/health`),
    ai: (workspaceId: string, repositoryId: string) =>
      http.request<AiStatus>(`/workspaces/${workspaceId}/repositories/${repositoryId}/ai/status`),
  };

  const impact = {
    get: (
      workspaceId: string,
      repositoryId: string,
      query: { fileId?: string; symbolId?: string; depth?: number },
    ) =>
      http.request<ImpactReport>(`/workspaces/${workspaceId}/repositories/${repositoryId}/impact`, { query }),
  };

  const health = {
    live: () => http.request<HealthStatus>('/health', { auth: false }),
    ready: () => http.request<HealthStatus>('/health/ready', { auth: false }),
  };

  return {
    baseUrl: http.baseUrl,
    apiPrefix: http.apiPrefix,
    setTokens: (tokens: Partial<TokenPair>) => http.setTokens(tokens),
    getTokens: () => http.getTokens(),
    request: <T>(path: string, options?: RequestOptions) => http.request<T>(path, options),
    auth,
    workspaces,
    repositories,
    investigations,
    insights,
    impact,
    health,
  };
}

async function storeSession(
  http: HttpClient,
  onTokens: HttpHooks['onTokens'],
  pending: Promise<AuthSession>,
): Promise<AuthSession> {
  const session = await pending;
  http.setTokens(session);
  await onTokens?.(session);
  return session;
}

async function storeTokens(
  http: HttpClient,
  onTokens: HttpHooks['onTokens'],
  pending: Promise<TokenPair>,
): Promise<TokenPair> {
  const tokens = await pending;
  http.setTokens(tokens);
  await onTokens?.(tokens);
  return tokens;
}
