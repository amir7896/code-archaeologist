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
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
