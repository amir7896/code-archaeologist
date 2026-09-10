/**
 * BullMQ queue names from the project scope.
 * Processors are added in later phases; names are frozen now so API and worker stay aligned.
 */
export const QUEUE_NAMES = {
  repositorySync: 'repository-sync',
  analysisRun: 'analysis-run',
  gitHistory: 'git-history',
  astParse: 'ast-parse',
  graphBuild: 'graph-build',
  metrics: 'metrics',
  risk: 'risk',
  embedding: 'embedding',
  integrationSync: 'integration-sync',
  reportGeneration: 'report-generation',
  cleanup: 'cleanup',
  investigation: 'investigation',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export const REPOSITORY_SYNC_JOB = 'sync';
export const INVESTIGATION_JOB = 'investigate';
export const INTEGRATION_SYNC_JOB = 'sync';

export type InvestigationJobData = {
  investigationId: string;
  repositoryId: string;
  workspaceId: string;
};

export type RepositorySyncJobData = {
  repositoryId: string;
  analysisRunId: string;
  workspaceId: string;
};

export type IntegrationSyncJobData = {
  workspaceId: string;
  integrationId: string;
  repositoryId?: string;
  webhookEventId?: string;
};
