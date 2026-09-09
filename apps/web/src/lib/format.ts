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

export function shortRevision(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }
  return value.length > 12 ? value.slice(0, 7) : value;
}
