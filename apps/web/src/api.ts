import { peekTokens, putTokens } from './session';

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

let refreshInFlight: Promise<boolean> | null = null;

export function isTransientApiError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.status === 0 || error.status === 408 || error.status === 429 || error.status >= 500;
  }
  return true;
}

export async function api<T>(
  path: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const response = await request(path, init);
  if (response.status === 401 && peekTokens()?.refreshToken) {
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
  lastIndexedRevision?: string | null;
  commitCount?: number;
  branchCount?: number;
  fileCount?: number;
  symbolCount?: number;
  lastParsedRevision?: string | null;
  lastGraphRevision?: string | null;
  lastDnaRevision?: string | null;
  lastEvidenceRevision?: string | null;
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
  branches: (workspaceId: string, repositoryId: string) =>
    api<{ items: RepoBranch[] }>(
      `/workspaces/${workspaceId}/repositories/${repositoryId}/branches`,
    ),
  commits: (
    workspaceId: string,
    repositoryId: string,
    query?: { branch?: string; page?: number; limit?: number },
  ) =>
    api<Paginated<RepoCommit>>(
      `/workspaces/${workspaceId}/repositories/${repositoryId}/commits${toQuery(query)}`,
    ),
  commit: (workspaceId: string, repositoryId: string, sha: string) =>
    api<RepoCommitDetail>(
      `/workspaces/${workspaceId}/repositories/${repositoryId}/commits/${sha}`,
    ),
  fileHistory: (
    workspaceId: string,
    repositoryId: string,
    query: { path: string; page?: number; limit?: number },
  ) =>
    api<FileHistory>(
      `/workspaces/${workspaceId}/repositories/${repositoryId}/files/history${toQuery(query)}`,
    ),
  fileTree: (workspaceId: string, repositoryId: string, query?: { prefix?: string; q?: string }) =>
    api<FileTree>(`/workspaces/${workspaceId}/repositories/${repositoryId}/code/tree${toQuery(query)}`),
  files: (
    workspaceId: string,
    repositoryId: string,
    query?: { q?: string; language?: string; page?: number },
  ) =>
    api<Paginated<SourceFile>>(
      `/workspaces/${workspaceId}/repositories/${repositoryId}/code/files${toQuery(query)}`,
    ),
  file: (workspaceId: string, repositoryId: string, fileId: string) =>
    api<SourceFile>(`/workspaces/${workspaceId}/repositories/${repositoryId}/code/files/${fileId}`),
  filePreview: (workspaceId: string, repositoryId: string, fileId: string) =>
    api<SourcePreview>(
      `/workspaces/${workspaceId}/repositories/${repositoryId}/code/files/${fileId}/preview`,
    ),
  symbols: (
    workspaceId: string,
    repositoryId: string,
    query?: { q?: string; kind?: string; fileId?: string; page?: number },
  ) =>
    api<Paginated<SourceSymbol>>(
      `/workspaces/${workspaceId}/repositories/${repositoryId}/code/symbols${toQuery(query)}`,
    ),
  symbol: (workspaceId: string, repositoryId: string, symbolId: string) =>
    api<SourceSymbolDetail>(
      `/workspaces/${workspaceId}/repositories/${repositoryId}/code/symbols/${symbolId}`,
    ),
  graph: (workspaceId: string, repositoryId: string, query?: { group?: string }) =>
    api<GraphMap>(`/workspaces/${workspaceId}/repositories/${repositoryId}/graph${toQuery(query)}`),
  graphDependencies: (
    workspaceId: string,
    repositoryId: string,
    query: { fileId: string; depth?: number },
  ) =>
    api<GraphNeighbors>(
      `/workspaces/${workspaceId}/repositories/${repositoryId}/graph/dependencies${toQuery(query)}`,
    ),
  graphDependents: (
    workspaceId: string,
    repositoryId: string,
    query: { fileId: string; depth?: number },
  ) =>
    api<GraphNeighbors>(
      `/workspaces/${workspaceId}/repositories/${repositoryId}/graph/dependents${toQuery(query)}`,
    ),
  graphCycles: (workspaceId: string, repositoryId: string) =>
    api<GraphCycles>(`/workspaces/${workspaceId}/repositories/${repositoryId}/graph/cycles`),
  dna: (
    workspaceId: string,
    repositoryId: string,
    query: { fileId?: string; symbolId?: string; module?: string },
  ) =>
    api<DnaProfile>(`/workspaces/${workspaceId}/repositories/${repositoryId}/dna${toQuery(query)}`),
  dnaHealth: (workspaceId: string, repositoryId: string) =>
    api<DnaHealth>(`/workspaces/${workspaceId}/repositories/${repositoryId}/insights/health`),
  hotspots: (workspaceId: string, repositoryId: string) =>
    api<{ items: InsightItem[] }>(
      `/workspaces/${workspaceId}/repositories/${repositoryId}/insights/hotspots`,
    ),
  risks: (workspaceId: string, repositoryId: string, query?: { level?: string }) =>
    api<{ items: InsightItem[] }>(
      `/workspaces/${workspaceId}/repositories/${repositoryId}/insights/risks${toQuery(query)}`,
    ),
  impact: (
    workspaceId: string,
    repositoryId: string,
    query: { fileId?: string; symbolId?: string; depth?: number },
  ) =>
    api<ImpactAnalysis>(`/workspaces/${workspaceId}/repositories/${repositoryId}/impact${toQuery(query)}`),
  evidence: (
    workspaceId: string,
    repositoryId: string,
    query: { fileId?: string; symbolId?: string },
  ) =>
    api<EvidenceList>(`/workspaces/${workspaceId}/repositories/${repositoryId}/evidence${toQuery(query)}`),
  evidenceResolve: (
    workspaceId: string,
    repositoryId: string,
    query: { fileId?: string; symbolId?: string; revision?: string },
  ) =>
    api<EvidenceResolve>(
      `/workspaces/${workspaceId}/repositories/${repositoryId}/evidence/resolve${toQuery(query)}`,
    ),
  evolution: (
    workspaceId: string,
    repositoryId: string,
    query: { fileId?: string; symbolId?: string },
  ) =>
    api<EvolutionTimeline>(
      `/workspaces/${workspaceId}/repositories/${repositoryId}/insights/evolution${toQuery(query)}`,
    ),
  symbolHistory: (workspaceId: string, repositoryId: string, symbolId: string) =>
    api<EvolutionTimeline>(
      `/workspaces/${workspaceId}/repositories/${repositoryId}/code/symbols/${symbolId}/history`,
    ),
  aiStatus: (workspaceId: string, repositoryId: string) =>
    api<AiStatus>(`/workspaces/${workspaceId}/repositories/${repositoryId}/ai/status`),
  investigations: (workspaceId: string, repositoryId: string, query?: { page?: number }) =>
    api<Paginated<Investigation>>(
      `/workspaces/${workspaceId}/repositories/${repositoryId}/investigations${toQuery(query)}`,
    ),
  investigation: (workspaceId: string, repositoryId: string, investigationId: string) =>
    api<Investigation>(
      `/workspaces/${workspaceId}/repositories/${repositoryId}/investigations/${investigationId}`,
    ),
  createInvestigation: (
    workspaceId: string,
    repositoryId: string,
    body: { question: string; fileId?: string; symbolId?: string },
  ) =>
    api<Investigation>(`/workspaces/${workspaceId}/repositories/${repositoryId}/investigations`, {
      method: 'POST',
      json: body,
    }),
};

export type RepoBranch = {
  id: string;
  name: string;
  headSha: string | null;
  isDefault: boolean;
};

export type RepoCommit = {
  sha: string;
  message: string;
  authorName: string;
  authorEmail: string;
  authoredAt: string;
  committedAt: string;
  parentShas: string[];
  isMerge: boolean;
  additions: number;
  deletions: number;
  changedFileCount: number;
};

export type RepoCommitFile = {
  fileId?: string | null;
  path: string;
  oldPath: string | null;
  changeType: string;
  additions: number;
  deletions: number;
  similarity: number | null;
  language: string | null;
};

export type RepoCommitDetail = RepoCommit & {
  files: RepoCommitFile[];
};

export type FileHistoryItem = {
  sha: string;
  message: string;
  authorName: string;
  committedAt: string;
  changeType: string;
  oldPath: string | null;
  path: string;
  additions: number;
  deletions: number;
};

export type FileHistory = {
  path: string;
  items: FileHistoryItem[];
  pagination: Paginated<FileHistoryItem>['pagination'];
};

export type FileTreeNode = {
  kind: 'folder' | 'file';
  name: string;
  path: string;
  fileCount?: number;
  fileId?: string;
  language?: string | null;
  loc?: number | null;
};

export type FileTree = {
  prefix: string;
  q: string;
  items: FileTreeNode[];
};

export type SourceFile = {
  id: string;
  path: string;
  language: string | null;
  size: number | null;
  loc: number | null;
  complexity: number | null;
  symbolCount: number;
  lastRevision: string | null;
};

export type SourcePreview = {
  fileId: string;
  path: string;
  language: string | null;
  content: string;
  truncated: boolean;
};

export type SourceSymbol = {
  id: string;
  fileId: string;
  path: string;
  kind: string;
  name: string;
  qualifiedName: string;
  startLine: number;
  endLine: number;
  loc: number;
  complexity: number;
  nesting: number;
};

export type SourceSymbolDetail = SourceSymbol & {
  parentSymbolId: string | null;
  relations: Array<{
    type: string;
    targetQualifiedName: string;
    targetSymbolId: string | null;
    confidence: number;
  }>;
};

export type GraphMapFile = {
  id: string;
  path: string;
};

export type GraphModule = {
  id: string;
  path: string;
  fileCount: number;
  fanIn: number;
  fanOut: number;
  inCycle: boolean;
  files: GraphMapFile[];
};

export type GraphMapEdge = {
  sourceId: string;
  targetId: string;
  type: string;
  weight: number;
  confidence: number;
};

export type GraphMap = {
  revision: string | null;
  modules: GraphModule[];
  edges: GraphMapEdge[];
  cycles: Array<{ id: string; nodes: string[] }>;
  stats: {
    fileCount: number;
    moduleCount: number;
    edgeCount: number;
    cycleCount: number;
    unresolvedImportCount: number;
  };
};

export type GraphNeighbors = {
  fileId: string;
  path: string;
  direction: string;
  depth: number;
  items: Array<{ fileId: string; path: string; depth: number }>;
};

export type GraphCycles = {
  modules: Array<{ id: string; nodes: string[] }>;
  files: Array<{ id: string; nodes: GraphMapFile[] }>;
};

export type DnaHealth = {
  revision: string | null;
  fileCount: number;
  hotspotCount: number;
  highRiskCount: number;
  averageComplexity: number;
};

export type InsightItem = {
  subjectType: string;
  subjectId: string;
  name: string;
  path: string | null;
  score: number;
  level: string;
  changeCount: number;
  complexity: number;
  fanIn: number;
};

export type DnaProfile = {
  subjectType: string;
  subjectId: string;
  name: string;
  path: string | null;
  firstRevision: string | null;
  lastRevision: string | null;
  firstSeenAt: string | null;
  lastChangedAt: string | null;
  changeCount: number;
  fanIn: number;
  fanOut: number;
  complexity: number;
  loc: number;
  dependencyCount: number;
  coupling: string;
  complexityLabel: string;
  risk: {
    score: number;
    level: string;
    evidenceConfidence: number;
    factors: Array<{
      key: string;
      label: string;
      raw: number;
      normalized: number;
      weight: number;
      contribution: number;
    }>;
  };
  contributors: Array<{ name: string; email: string; commits: number }>;
  versions: Array<{
    revision: string;
    changeType: string;
    loc: number;
    complexity: number;
    committedAt: string | null;
  }>;
  relatedCommits: Array<{
    sha: string;
    message: string;
    authorName: string;
    committedAt: string;
  }>;
};

export type ImpactNode = {
  fileId: string;
  path: string;
  depth: number;
  direction: string;
  role: string;
  module: string;
  riskScore: number;
  riskLevel: string;
  complexity: number;
  confidence: number;
};

export type ImpactAnalysis = {
  revision: string | null;
  depth: number;
  origin: {
    subjectType: string;
    subjectId: string;
    name: string;
    path: string;
    fileId: string;
    symbolId: string | null;
    riskScore: number;
    riskLevel: string;
  };
  stats: {
    affectedFileCount: number;
    consumerCount: number;
    dependencyCount: number;
    testCount: number;
    endpointCount: number;
    moduleCount: number;
    highRiskCount: number;
    truncated: boolean;
  };
  consumers: ImpactNode[];
  dependencies: ImpactNode[];
  tests: ImpactNode[];
  endpoints: ImpactNode[];
  modules: Array<{
    id: string;
    path: string;
    consumerCount: number;
    dependencyCount: number;
  }>;
};

export type EvidenceOrigin = {
  subjectType: string;
  subjectId: string;
  name: string;
  path: string;
  fileId: string;
  symbolId: string | null;
};

export type EvidenceItem = {
  id: string;
  kind: string;
  method: string;
  subjectType: string;
  subjectId: string;
  confidence: number;
  confidenceLabel: string;
  excerpt: string | null;
  details: Record<string, unknown>;
  commit: {
    sha: string;
    message: string;
    authorName: string;
    committedAt: string;
  } | null;
};

export type EvidenceList = {
  revision: string | null;
  origin: EvidenceOrigin;
  note: string;
  items: EvidenceItem[];
};

export type EvidenceVersion = {
  revision: string;
  contentHash: string;
  changeType: string;
  startLine: number;
  endLine: number;
  commitSha: string | null;
};

export type EvidenceResolve = {
  revision: string | null;
  requestedRevision: string | null;
  matched: boolean;
  origin: EvidenceOrigin;
  note: string;
  items: EvidenceItem[];
  versions: EvidenceVersion[];
};

export type EvolutionEvent = {
  sha: string;
  message: string;
  authorName: string;
  committedAt: string;
  method: string;
  confidence: number;
  confidenceLabel: string;
  changeType: string | null;
  additions: number;
  deletions: number;
  overlapLines: number;
};

export type EvolutionTimeline = {
  revision: string | null;
  origin: EvidenceOrigin;
  note: string;
  stats: {
    commitCount: number;
    strongCount: number;
    likelyCount: number;
    possibleCount: number;
    versionCount: number;
  };
  timeline: EvolutionEvent[];
  versions: EvidenceVersion[];
};

export type AiStatus = {
  provider: string;
  model: string;
  available: boolean;
};

export type InvestigationEvidence = {
  id: string;
  sourceType: string;
  sourceId: string;
  citation: string;
  excerpt: string;
  relevance: number;
  fileId: string | null;
  symbolId: string | null;
  commitSha: string | null;
  path: string | null;
};

export type InvestigationMessage = {
  id: string;
  role: string;
  content: string;
  promptTokens: number | null;
  completionTokens: number | null;
  createdAt: string;
};

export type Investigation = {
  id: string;
  repositoryId: string;
  question: string;
  status: string;
  model: string;
  usedModel: boolean;
  confidence: number | null;
  confidenceLabel: string | null;
  subjectFileId: string | null;
  subjectSymbolId: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  messages?: InvestigationMessage[];
  evidence?: InvestigationEvidence[];
};

function toQuery(query?: Record<string, string | number | undefined>): string {
  if (!query) {
    return '';
  }
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  }
  const encoded = params.toString();
  return encoded ? `?${encoded}` : '';
}

async function refreshTokens(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const current = peekTokens();
      if (!current?.refreshToken) {
        return false;
      }
      let response: Response;
      try {
        response = await fetch(`${apiBase}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: current.refreshToken }),
        });
      } catch {
        return false;
      }
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          putTokens(null);
        }
        return false;
      }
      const next = (await response.json()) as Tokens;
      putTokens(next);
      return true;
    })().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function request(path: string, init: RequestInit & { json?: unknown }): Promise<Response> {
  const tokens = peekTokens();
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
