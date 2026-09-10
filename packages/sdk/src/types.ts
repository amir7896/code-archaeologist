export type TokenPair = {
  accessToken: string;
  refreshToken: string;
  tokenType?: 'Bearer';
  expiresIn?: number;
};

export type User = {
  id: string;
  email: string;
  name: string;
  status: string;
  createdAt: string;
};

export type AuthSession = TokenPair & { user: User };

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type Paginated<T> = {
  items: T[];
  pagination: PaginationMeta;
};

export type PageQuery = {
  page?: number;
  limit?: number;
};

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  status: string;
  role: string;
  createdAt: string;
  updatedAt: string;
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
  startedAt?: string | null;
  finishedAt?: string | null;
  tasks: AnalysisTask[];
};

export type LanguageShare = {
  language: string;
  count: number;
  percent: number;
};

export type Repository = {
  id: string;
  workspaceId: string;
  name: string;
  url: string;
  provider: string;
  defaultBranch: string | null;
  currentRevision: string | null;
  commitCount?: number;
  fileCount?: number;
  symbolCount?: number;
  healthScore?: number | null;
  languages?: LanguageShare[];
  analysisRuns?: AnalysisRun[];
  status: string;
  hasCredential: boolean;
  lastError: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
  latestRun: AnalysisRun | null;
};

export type CreateRepositoryInput = {
  url: string;
  name?: string;
  defaultBranch?: string;
  source?: 'GITHUB' | 'GITLAB' | 'BITBUCKET' | 'LOCAL';
  includePullRequests?: boolean;
  respectGitignore?: boolean;
  credential?: { type: 'HTTPS_TOKEN'; username?: string; secret: string };
};

export type SourceFile = {
  id: string;
  path: string;
  language: string | null;
  loc: number | null;
  complexity: number | null;
  symbolCount: number;
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

export type DnaHealth = {
  revision: string | null;
  fileCount: number;
  hotspotCount: number;
  highRiskCount: number;
  averageComplexity: number;
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

export type ImpactReport = {
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
  modules: { id: string; path: string; consumerCount: number; dependencyCount: number }[];
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

export type HealthStatus = {
  status: string;
  service: string;
  version: string;
  checks?: { postgres?: boolean; redis?: boolean };
};

export type AiStatus = {
  provider: string;
  model: string;
  available: boolean;
};

export type PollOptions = {
  intervalMs?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
  onProgress?: (message: string) => void;
};
