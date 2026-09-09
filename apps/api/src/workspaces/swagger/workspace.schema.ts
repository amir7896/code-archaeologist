import { ApiProperty } from '@nestjs/swagger';
import {
  EXAMPLE_DATE,
  EXAMPLE_USER_ID,
  EXAMPLE_WORKSPACE_ID,
} from '../../common/swagger/example-ids';

export const paginationExample = {
  page: 1,
  limit: 20,
  total: 1,
  totalPages: 1,
};

export const createWorkspaceRequestExample = {
  name: 'Platform',
};

export const updateWorkspaceRequestExample = {
  name: 'Platform Research',
  status: 'ACTIVE',
};

export const inviteMemberRequestExample = {
  email: 'analyst@example.com',
  role: 'ANALYST',
};

export const updateMemberRequestExample = {
  role: 'VIEWER',
};

export const workspaceResponseExample = {
  id: EXAMPLE_WORKSPACE_ID,
  name: 'Platform',
  slug: 'platform',
  ownerId: EXAMPLE_USER_ID,
  status: 'ACTIVE',
  role: 'OWNER',
  createdAt: EXAMPLE_DATE,
  updatedAt: EXAMPLE_DATE,
};

export const workspaceListResponseExample = {
  items: [workspaceResponseExample],
  pagination: paginationExample,
};

export const memberResponseExample = {
  userId: EXAMPLE_USER_ID,
  email: 'analyst@example.com',
  name: 'Ada Lovelace',
  role: 'ANALYST',
  status: 'ACTIVE',
  createdAt: EXAMPLE_DATE,
};

export const memberListResponseExample = {
  items: [memberResponseExample],
  pagination: paginationExample,
};

export const auditLogResponseExample = {
  id: 'c0ffee00-0000-4000-8000-000000000001',
  action: 'WORKSPACE_CREATE',
  resource: 'workspace',
  metadata: { name: 'Platform' },
  userId: EXAMPLE_USER_ID,
  createdAt: EXAMPLE_DATE,
};

export const auditLogListResponseExample = {
  items: [auditLogResponseExample],
  pagination: paginationExample,
};

export class WorkspaceSchema {
  @ApiProperty({ type: String, example: EXAMPLE_WORKSPACE_ID })
  id!: string;

  @ApiProperty({ type: String, example: 'Platform' })
  name!: string;

  @ApiProperty({ type: String, example: 'platform' })
  slug!: string;

  @ApiProperty({ type: String, example: EXAMPLE_USER_ID })
  ownerId!: string;

  @ApiProperty({ type: String, example: 'ACTIVE' })
  status!: string;

  @ApiProperty({ type: String, example: 'OWNER' })
  role!: string;

  @ApiProperty({ type: String, format: 'date-time', example: EXAMPLE_DATE })
  createdAt!: string;

  @ApiProperty({ type: String, format: 'date-time', example: EXAMPLE_DATE })
  updatedAt!: string;
}
