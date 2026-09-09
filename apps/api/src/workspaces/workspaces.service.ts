import { Inject, Injectable } from '@nestjs/common';
import { type WorkspaceRoleName } from '@code-archaeologist/shared';
import { AuditService } from '../audit/audit.service';
import { type RequestUser } from '../auth/auth.types';
import { slugifyName } from '../auth/token.util';
import { ApiErrors } from '../common/api-exception';
import {
  type PaginationQueryDto,
  paginationMeta,
  paginationSkip,
  resolvePagination,
} from '../common/pagination.dto';
import { PrismaService } from '../database/prisma.service';
import {
  type AuditLogListResponseDto,
  type CreateWorkspaceDto,
  type InviteMemberDto,
  type MemberListResponseDto,
  type MemberResponseDto,
  type UpdateMemberDto,
  type UpdateWorkspaceDto,
  type WorkspaceListResponseDto,
  type WorkspaceResponseDto,
} from './dto/workspace.dto';

@Injectable()
export class WorkspacesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async list(user: RequestUser, query: PaginationQueryDto): Promise<WorkspaceListResponseDto> {
    const { page, limit } = resolvePagination(query);
    const where = {
      deletedAt: null,
      members: { some: { userId: user.id, status: 'ACTIVE' as const } },
    };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.workspace.count({ where }),
      this.prisma.workspace.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: paginationSkip(page, limit),
        take: limit,
        include: {
          members: { where: { userId: user.id } },
        },
      }),
    ]);

    return {
      items: rows.map((workspace) =>
        toWorkspaceResponse(workspace, workspace.members[0]?.role ?? 'VIEWER'),
      ),
      pagination: paginationMeta(page, limit, total),
    };
  }

  async create(user: RequestUser, input: CreateWorkspaceDto): Promise<WorkspaceResponseDto> {
    const name = input.name.trim();
    const workspace = await this.prisma.workspace.create({
      data: {
        name,
        slug: slugifyName(name),
        ownerId: user.id,
        members: {
          create: { userId: user.id, role: 'OWNER', status: 'ACTIVE' },
        },
      },
    });
    await this.audit.record({
      workspaceId: workspace.id,
      userId: user.id,
      action: 'WORKSPACE_CREATE',
      resource: `workspace:${workspace.id}`,
      metadata: { name },
    });
    return toWorkspaceResponse(workspace, 'OWNER');
  }

  async get(workspaceId: string, role: WorkspaceRoleName): Promise<WorkspaceResponseDto> {
    const workspace = await this.requireWorkspace(workspaceId);
    return toWorkspaceResponse(workspace, role);
  }

  async update(
    workspaceId: string,
    user: RequestUser,
    role: WorkspaceRoleName,
    input: UpdateWorkspaceDto,
  ): Promise<WorkspaceResponseDto> {
    const workspace = await this.requireWorkspace(workspaceId);
    if (!input.name && !input.status) {
      return toWorkspaceResponse(workspace, role);
    }

    if (input.status && input.status !== workspace.status && role !== 'OWNER') {
      throw ApiErrors.forbidden('Only the owner can archive or restore a workspace');
    }

    if (input.name && workspace.status === 'ARCHIVED') {
      throw ApiErrors.conflict('WORKSPACE_ARCHIVED', 'Archived workspaces cannot be renamed');
    }

    const updated = await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        ...(input.name ? { name: input.name.trim() } : {}),
        ...(input.status ? { status: input.status } : {}),
      },
    });

    await this.audit.record({
      workspaceId,
      userId: user.id,
      action:
        input.status && input.status !== workspace.status
          ? `WORKSPACE_${input.status}`
          : 'WORKSPACE_UPDATE',
      resource: `workspace:${workspaceId}`,
      metadata: { name: updated.name, status: updated.status },
    });
    return toWorkspaceResponse(updated, role);
  }

  async remove(workspaceId: string, user: RequestUser): Promise<void> {
    await this.requireWorkspace(workspaceId);
    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { deletedAt: new Date(), status: 'ARCHIVED' },
    });
    await this.audit.record({
      workspaceId,
      userId: user.id,
      action: 'WORKSPACE_DELETE',
      resource: `workspace:${workspaceId}`,
    });
  }

  async listMembers(
    workspaceId: string,
    query: PaginationQueryDto,
  ): Promise<MemberListResponseDto> {
    await this.requireWorkspace(workspaceId);
    const { page, limit } = resolvePagination(query);
    const where = { workspaceId };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.workspaceMember.count({ where }),
      this.prisma.workspaceMember.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip: paginationSkip(page, limit),
        take: limit,
        include: { user: true },
      }),
    ]);

    return {
      items: rows.map(toMemberResponse),
      pagination: paginationMeta(page, limit, total),
    };
  }

  async invite(
    workspaceId: string,
    actor: RequestUser,
    actorRole: WorkspaceRoleName,
    input: InviteMemberDto,
  ) {
    const workspace = await this.requireActiveWorkspace(workspaceId);
    if (input.role === 'ADMIN' && actorRole !== 'OWNER') {
      throw ApiErrors.forbidden('Only the owner can invite admins');
    }

    const email = input.email.trim().toLowerCase();
    const invitee = await this.prisma.user.findUnique({ where: { email } });
    if (!invitee) {
      throw ApiErrors.notFound(
        'USER_NOT_FOUND',
        'No account found for that email. Ask them to create an account first.',
      );
    }
    if (invitee.id === actor.id && workspace.ownerId === actor.id) {
      throw ApiErrors.conflict('MEMBER_EXISTS', 'You already own this workspace');
    }

    const existing = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: invitee.id } },
    });
    if (existing) {
      throw ApiErrors.conflict('MEMBER_EXISTS', 'That user is already a member of this workspace');
    }

    const member = await this.prisma.workspaceMember.create({
      data: { workspaceId, userId: invitee.id, role: input.role, status: 'ACTIVE' },
      include: { user: true },
    });
    await this.audit.record({
      workspaceId,
      userId: actor.id,
      action: 'MEMBER_INVITE',
      resource: `member:${invitee.id}`,
      metadata: { email, role: input.role },
    });
    return toMemberResponse(member);
  }

  async updateMember(
    workspaceId: string,
    targetUserId: string,
    actor: RequestUser,
    actorRole: WorkspaceRoleName,
    input: UpdateMemberDto,
  ): Promise<MemberResponseDto> {
    await this.requireActiveWorkspace(workspaceId);
    const member = await this.requireMember(workspaceId, targetUserId);
    if (member.role === 'OWNER') {
      throw ApiErrors.forbidden('The workspace owner role cannot be changed');
    }
    if (input.role === 'ADMIN' && actorRole !== 'OWNER') {
      throw ApiErrors.forbidden('Only the owner can assign the admin role');
    }

    const updated = await this.prisma.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
      data: { role: input.role },
      include: { user: true },
    });
    await this.audit.record({
      workspaceId,
      userId: actor.id,
      action: 'MEMBER_UPDATE',
      resource: `member:${targetUserId}`,
      metadata: { role: input.role },
    });
    return toMemberResponse(updated);
  }

  async removeMember(
    workspaceId: string,
    targetUserId: string,
    actor: RequestUser,
    actorRole: WorkspaceRoleName,
  ): Promise<void> {
    await this.requireActiveWorkspace(workspaceId);
    const member = await this.requireMember(workspaceId, targetUserId);
    if (member.role === 'OWNER') {
      throw ApiErrors.forbidden('The workspace owner cannot be removed');
    }

    const isSelf = actor.id === targetUserId;
    if (!isSelf && actorRole !== 'OWNER' && actorRole !== 'ADMIN') {
      throw ApiErrors.forbidden();
    }

    await this.prisma.workspaceMember.delete({
      where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
    });
    await this.audit.record({
      workspaceId,
      userId: actor.id,
      action: 'MEMBER_REMOVE',
      resource: `member:${targetUserId}`,
      metadata: { self: isSelf },
    });
  }

  async listAuditLogs(
    workspaceId: string,
    query: PaginationQueryDto,
  ): Promise<AuditLogListResponseDto> {
    await this.requireWorkspace(workspaceId);
    const { page, limit } = resolvePagination(query);
    const where = { workspaceId };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: paginationSkip(page, limit),
        take: limit,
      }),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        action: row.action,
        resource: row.resource,
        metadata: (row.metadata ?? {}) as Record<string, unknown>,
        userId: row.userId,
        createdAt: row.createdAt,
      })),
      pagination: paginationMeta(page, limit, total),
    };
  }

  private async requireWorkspace(workspaceId: string) {
    const workspace = await this.prisma.workspace.findFirst({
      where: { id: workspaceId, deletedAt: null },
    });
    if (!workspace) {
      throw ApiErrors.notFound('WORKSPACE_NOT_FOUND', 'Workspace not found');
    }
    return workspace;
  }

  private async requireActiveWorkspace(workspaceId: string) {
    const workspace = await this.requireWorkspace(workspaceId);
    if (workspace.status === 'ARCHIVED') {
      throw ApiErrors.conflict('WORKSPACE_ARCHIVED', 'This workspace is archived');
    }
    return workspace;
  }

  private async requireMember(workspaceId: string, userId: string) {
    const member = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      include: { user: true },
    });
    if (!member) {
      throw ApiErrors.notFound('MEMBER_NOT_FOUND', 'Member not found');
    }
    return member;
  }
}

function toWorkspaceResponse(
  workspace: {
    id: string;
    name: string;
    slug: string;
    ownerId: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  },
  role: string,
): WorkspaceResponseDto {
  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    ownerId: workspace.ownerId,
    status: workspace.status,
    role,
    createdAt: workspace.createdAt,
    updatedAt: workspace.updatedAt,
  };
}

function toMemberResponse(member: {
  userId: string;
  role: string;
  status: string;
  createdAt: Date;
  user: { email: string; name: string };
}): MemberResponseDto {
  return {
    userId: member.userId,
    email: member.user.email,
    name: member.user.name,
    role: member.role,
    status: member.status,
    createdAt: member.createdAt,
  };
}
