/** Planned NestJS domain modules from the project scope. */
export const NEST_MODULES = [
  'auth',
  'users',
  'workspaces',
  'repositories',
  'git',
  'analysis',
  'parsers',
  'files',
  'symbols',
  'graph',
  'metrics',
  'risks',
  'insights',
  'investigations',
  'ai',
  'embeddings',
  'integrations',
  'webhooks',
  'reports',
  'notifications',
  'audit',
] as const;

export type NestModuleName = (typeof NEST_MODULES)[number];
