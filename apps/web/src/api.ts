const apiBase = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

export type User = {
  id: string;
  email: string;
  name: string;
  status: string;
  createdAt: string;
};

export type Tokens = {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
};

export type AuthSession = Tokens & { user: User };

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  status: 'ACTIVE' | 'ARCHIVED' | string;
  role: 'OWNER' | 'ADMIN' | 'ANALYST' | 'VIEWER' | string;
  createdAt: string;
  updatedAt: string;
};

export type Member = {
  userId: string;
  email: string;
  name: string;
  role: string;
  status: string;
  createdAt: string;
};

export type AuditEvent = {
  id: string;
  action: string;
  resource: string;
  metadata: Record<string, unknown>;
  userId: string | null;
  createdAt: string;
};

export type Paginated<T> = {
  items: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type TokenStore = {
  get(): Tokens | null;
  set(tokens: Tokens | null): void;
};

let tokenStore: TokenStore = {
  get: () => null,
  set: () => undefined,
};

let refreshInFlight: Promise<boolean> | null = null;

export function configureTokenStore(store: TokenStore): void {
  tokenStore = store;
}

export async function api<T>(
  path: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const response = await request(path, init);
  if (response.status === 401 && tokenStore.get()?.refreshToken) {
    const refreshed = await refreshTokens();
    if (refreshed) {
      return parseResponse<T>(await request(path, init));
    }
  }
  return parseResponse<T>(response);
}

export const authApi = {
  register: (body: { email: string; password: string; name: string }) =>
    api<AuthSession>('/auth/register', { method: 'POST', json: body }),
  login: (body: { email: string; password: string }) =>
    api<AuthSession>('/auth/login', { method: 'POST', json: body }),
  logout: () => api<{ status: string }>('/auth/logout', { method: 'POST' }),
  me: () => api<User>('/me'),
};

export type AnalysisTask = {
  id: string;
  taskType: string;
  status: string;
  attempts: number;
  error: string | null;
};

export type AnalysisRun = {
  id: string;
  revision: string | null;
  type: string;
  status: string;
  progress: number;
  error: string | null;
  createdAt: string;
  tasks: AnalysisTask[];
};

export type Repository = {
  id: string;
  workspaceId: string;
  name: string;
  url: string;
  provider: string;
  defaultBranch: string | null;
  currentRevision: string | null;
  status: string;
  hasCredential: boolean;
  lastError: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
  latestRun: AnalysisRun | null;
};

export const workspaceApi = {
  list: () => api<Paginated<Workspace>>('/workspaces'),
  create: (name: string) => api<Workspace>('/workspaces', { method: 'POST', json: { name } }),
  get: (id: string) => api<Workspace>(`/workspaces/${id}`),
  update: (id: string, body: { name?: string; status?: 'ACTIVE' | 'ARCHIVED' }) =>
    api<Workspace>(`/workspaces/${id}`, { method: 'PATCH', json: body }),
  remove: (id: string) => api<{ status: string }>(`/workspaces/${id}`, { method: 'DELETE' }),
  members: (id: string) => api<Paginated<Member>>(`/workspaces/${id}/members`),
  invite: (id: string, body: { email: string; role: 'ADMIN' | 'ANALYST' | 'VIEWER' }) =>
    api<Member>(`/workspaces/${id}/members`, { method: 'POST', json: body }),
  updateMember: (id: string, userId: string, role: 'ADMIN' | 'ANALYST' | 'VIEWER') =>
    api<Member>(`/workspaces/${id}/members/${userId}`, { method: 'PATCH', json: { role } }),
  removeMember: (id: string, userId: string) =>
    api<{ status: string }>(`/workspaces/${id}/members/${userId}`, { method: 'DELETE' }),
  auditLogs: (id: string) => api<Paginated<AuditEvent>>(`/workspaces/${id}/audit-logs`),
};

export const repositoryApi = {
  list: (workspaceId: string) =>
    api<Paginated<Repository>>(`/workspaces/${workspaceId}/repositories`),
  create: (
    workspaceId: string,
    body: {
      url: string;
      name?: string;
      defaultBranch?: string;
      credential?: { type: 'HTTPS_TOKEN'; secret: string };
    },
  ) => api<Repository>(`/workspaces/${workspaceId}/repositories`, { method: 'POST', json: body }),
  get: (workspaceId: string, repositoryId: string) =>
    api<Repository>(`/workspaces/${workspaceId}/repositories/${repositoryId}`),
  status: (workspaceId: string, repositoryId: string) =>
    api<Repository>(`/workspaces/${workspaceId}/repositories/${repositoryId}/status`),
  update: (
    workspaceId: string,
    repositoryId: string,
    body: {
      name?: string;
      defaultBranch?: string;
      credential?: { type: 'HTTPS_TOKEN'; secret: string };
      removeCredential?: boolean;
    },
  ) =>
    api<Repository>(`/workspaces/${workspaceId}/repositories/${repositoryId}`, {
      method: 'PATCH',
      json: body,
    }),
  remove: (workspaceId: string, repositoryId: string) =>
    api<{ status: string }>(`/workspaces/${workspaceId}/repositories/${repositoryId}`, {
      method: 'DELETE',
    }),
  sync: (workspaceId: string, repositoryId: string, body?: { revision?: string }) =>
    api<Repository>(`/workspaces/${workspaceId}/repositories/${repositoryId}/sync`, {
      method: 'POST',
      json: body ?? {},
    }),
};

async function refreshTokens(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const current = tokenStore.get();
      if (!current?.refreshToken) {
        return false;
      }
      const response = await fetch(`${apiBase}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: current.refreshToken }),
      });
      if (!response.ok) {
        tokenStore.set(null);
        return false;
      }
      const next = (await response.json()) as Tokens;
      tokenStore.set(next);
      return true;
    })().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function request(path: string, init: RequestInit & { json?: unknown }): Promise<Response> {
  const tokens = tokenStore.get();
  const headers = new Headers(init.headers);
  if (init.json !== undefined) {
    headers.set('Content-Type', 'application/json');
  }
  if (tokens?.accessToken) {
    headers.set('Authorization', `Bearer ${tokens.accessToken}`);
  }
  return fetch(`${apiBase}${path}`, {
    ...init,
    headers,
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
  });
}

async function parseResponse<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as {
    message?: string | string[];
    code?: string;
    details?: Array<{ field: string; message: string }>;
  };
  if (!response.ok) {
    const detail = body.details?.map((item) => item.message).join(' ');
    const message =
      detail ||
      (Array.isArray(body.message) ? body.message.join(' ') : body.message) ||
      'Request failed';
    throw new ApiError(response.status, message, body.code);
  }
  return body as T;
}
