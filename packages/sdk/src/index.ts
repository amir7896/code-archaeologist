export { createClient, type CodeArchaeologistClient, type CreateClientOptions } from './client';
export { ApiError, exitCodeForError, isApiError, isAuthError, isNotFoundError } from './errors';
export { iteratePages } from './pagination';
export { isFailedStatus, isTerminalRunStatus, waitUntil } from './poll';
export { redactSecrets, redactUnknown } from './redact';
export { normalizeBaseUrl } from './query';
export type { RequestOptions } from './http';
export { SDK_API_VERSION, SDK_COMPATIBILITY, SDK_USER_AGENT, SDK_VERSION } from './version';
export type {
  AiStatus,
  AnalysisRun,
  AuthSession,
  CreateRepositoryInput,
  DnaHealth,
  HealthStatus,
  ImpactReport,
  InsightItem,
  Investigation,
  InvestigationEvidence,
  PageQuery,
  Paginated,
  PaginationMeta,
  PollOptions,
  Repository,
  SourceFile,
  TokenPair,
  User,
  Workspace,
} from './types';
