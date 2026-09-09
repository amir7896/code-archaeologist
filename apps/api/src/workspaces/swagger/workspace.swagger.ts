import { applyDecorators } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { messageResponseExample } from '../../auth/swagger/auth.schema';
import { ApiCreatedExample, ApiOkExample, ApiRequestExample } from '../../common/swagger/swagger-docs';
import { MessageResponseDto } from '../../auth/dto/auth-response.dto';
import {
  AuditLogListResponseDto,
  CreateWorkspaceDto,
  InviteMemberDto,
  MemberListResponseDto,
  MemberResponseDto,
  UpdateMemberDto,
  UpdateWorkspaceDto,
  WorkspaceListResponseDto,
  WorkspaceResponseDto,
} from '../dto/workspace.dto';
import {
  auditLogListResponseExample,
  createWorkspaceRequestExample,
  inviteMemberRequestExample,
  memberListResponseExample,
  memberResponseExample,
  updateMemberRequestExample,
  updateWorkspaceRequestExample,
  workspaceListResponseExample,
  workspaceResponseExample,
} from './workspace.schema';

export const ListWorkspacesDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'List workspaces for the current user' }),
    ApiOkExample(WorkspaceListResponseDto, workspaceListResponseExample, 'Workspace list'),
  );

export const CreateWorkspaceDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Create a workspace and become its owner' }),
    ApiRequestExample(CreateWorkspaceDto, createWorkspaceRequestExample, 'Create a workspace'),
    ApiCreatedExample(WorkspaceResponseDto, workspaceResponseExample, 'Created workspace'),
  );

export const GetWorkspaceDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Get a workspace' }),
    ApiOkExample(WorkspaceResponseDto, workspaceResponseExample, 'Workspace'),
  );

export const UpdateWorkspaceDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Rename a workspace, or archive/restore it as owner' }),
    ApiRequestExample(UpdateWorkspaceDto, updateWorkspaceRequestExample, 'Update a workspace'),
    ApiOkExample(WorkspaceResponseDto, workspaceResponseExample, 'Updated workspace'),
  );

export const DeleteWorkspaceDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Soft-delete a workspace' }),
    ApiOkExample(MessageResponseDto, messageResponseExample, 'Workspace deleted'),
  );

export const ListMembersDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'List workspace members' }),
    ApiOkExample(MemberListResponseDto, memberListResponseExample, 'Member list'),
  );

export const InviteMemberDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Invite an existing user to the workspace' }),
    ApiRequestExample(InviteMemberDto, inviteMemberRequestExample, 'Invite a member'),
    ApiCreatedExample(MemberResponseDto, memberResponseExample, 'Invited member'),
  );

export const UpdateMemberDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Change a member role' }),
    ApiRequestExample(UpdateMemberDto, updateMemberRequestExample, 'Change role'),
    ApiOkExample(MemberResponseDto, memberResponseExample, 'Updated member'),
  );

export const RemoveMemberDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Remove a member or leave the workspace' }),
    ApiOkExample(MessageResponseDto, messageResponseExample, 'Member removed'),
  );

export const ListAuditLogsDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'List security-sensitive audit events for the workspace' }),
    ApiOkExample(AuditLogListResponseDto, auditLogListResponseExample, 'Audit log list'),
  );
