export const WORKSPACE_ROLES = ['OWNER', 'ADMIN', 'ANALYST', 'VIEWER'] as const;
export type WorkspaceRoleName = (typeof WORKSPACE_ROLES)[number];

const ROLE_RANK: Record<WorkspaceRoleName, number> = {
  VIEWER: 1,
  ANALYST: 2,
  ADMIN: 3,
  OWNER: 4,
};

export function roleAtLeast(actual: WorkspaceRoleName, needed: WorkspaceRoleName): boolean {
  return ROLE_RANK[actual] >= ROLE_RANK[needed];
}

export function isWorkspaceRole(value: string): value is WorkspaceRoleName {
  return (WORKSPACE_ROLES as readonly string[]).includes(value);
}
