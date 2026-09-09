const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  ANALYST: 'Analyst',
  VIEWER: 'Viewer',
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  ARCHIVED: 'Archived',
  PENDING: 'Waiting',
  SYNCING: 'Syncing',
  READY: 'Ready',
  FAILED: 'Failed',
  QUEUED: 'Waiting',
  RUNNING: 'In progress',
  SUCCEEDED: 'Finished',
  CANCELLED: 'Cancelled',
};

const ACTIVITY_LABELS: Record<string, string> = {
  AUTH_REGISTER: 'Started the workspace',
  AUTH_LOGIN: 'Signed in',
  AUTH_LOGOUT: 'Signed out',
  WORKSPACE_CREATE: 'Created the workspace',
  WORKSPACE_UPDATE: 'Updated the workspace',
  WORKSPACE_ARCHIVED: 'Archived the workspace',
  WORKSPACE_ACTIVE: 'Restored the workspace',
  WORKSPACE_DELETE: 'Deleted the workspace',
  MEMBER_INVITE: 'Added a member',
  MEMBER_UPDATE: 'Changed a member role',
  MEMBER_REMOVE: 'Removed a member',
  REPOSITORY_CREATE: 'Added a repository',
  REPOSITORY_UPDATE: 'Updated a repository',
  REPOSITORY_DELETE: 'Removed a repository',
  REPOSITORY_SYNC: 'Synced a repository',
};

const TASK_LABELS: Record<string, string> = {
  CLONE: 'Copying the repository',
  DETECT_REVISION: 'Reading the current revision',
  INDEX_HISTORY: 'Reading commit history',
  PARSE_AST: 'Reading source files',
  BUILD_GRAPH: 'Building the architecture map',
  COMPUTE_DNA: 'Scoring history and risk',
};

const SYMBOL_LABELS: Record<string, string> = {
  MODULE: 'File',
  CLASS: 'Class',
  INTERFACE: 'Interface',
  ENUM: 'Enum',
  FUNCTION: 'Function',
  METHOD: 'Method',
  VARIABLE: 'Variable',
  CONSTANT: 'Constant',
  TYPE: 'Type',
  NAMESPACE: 'Namespace',
};

const RELATION_LABELS: Record<string, string> = {
  IMPORTS: 'Imports',
  EXPORTS: 'Exports',
  CALLS: 'Calls',
  REFERENCES: 'References',
  EXTENDS: 'Extends',
  IMPLEMENTS: 'Implements',
  CONTAINS: 'Contains',
  DEPENDS_ON: 'Depends on',
};

const CHANGE_LABELS: Record<string, string> = {
  ADDED: 'Added',
  MODIFIED: 'Changed',
  DELETED: 'Removed',
  RENAMED: 'Renamed',
  COPIED: 'Copied',
};

export function formatRole(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

export function formatStatus(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

export function formatActivity(action: string): string {
  return ACTIVITY_LABELS[action] ?? action.replaceAll('_', ' ').toLowerCase();
}

export function formatTask(taskType: string): string {
  return TASK_LABELS[taskType] ?? taskType.replaceAll('_', ' ').toLowerCase();
}

export function formatWhen(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
}

export function formatSymbolKind(kind: string): string {
  return SYMBOL_LABELS[kind] ?? kind.replaceAll('_', ' ').toLowerCase();
}

export function formatRelation(type: string): string {
  return RELATION_LABELS[type] ?? type.replaceAll('_', ' ').toLowerCase();
}

export function formatRiskLevel(level: string): string {
  if (level === 'CRITICAL') {
    return 'Critical';
  }
  if (level === 'HIGH') {
    return 'High';
  }
  if (level === 'MEDIUM') {
    return 'Medium';
  }
  if (level === 'LOW') {
    return 'Low';
  }
  return level.replaceAll('_', ' ').toLowerCase();
}

export function formatChange(changeType: string): string {
  return CHANGE_LABELS[changeType] ?? changeType.replaceAll('_', ' ').toLowerCase();
}

export function commitSubject(message: string): string {
  return message.split('\n')[0]?.trim() || 'Commit';
}

export function formatDiffstat(additions: number, deletions: number): string {
  return `+${additions} / −${deletions}`;
}

export function shortRevision(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }
  return value.length > 12 ? value.slice(0, 7) : value;
}

export function repositoryHost(url: string): string {
  try {
    return new URL(url.replace(/\.git$/, '')).host.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function repositorySummary(input: {
  status: string;
  defaultBranch?: string | null;
  currentRevision?: string | null;
  url?: string;
}): string {
  const revision = shortRevision(input.currentRevision);
  return [
    formatStatus(input.status),
    input.defaultBranch,
    revision !== '—' ? revision : null,
  ]
    .filter(Boolean)
    .join(' · ');
}
