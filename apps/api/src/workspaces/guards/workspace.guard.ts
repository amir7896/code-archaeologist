import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { type WorkspaceRoleName, roleAtLeast } from '@code-archaeologist/shared';
import { ApiErrors } from '../../common/api-exception';
import { PrismaService } from '../../database/prisma.service';
import { type RequestUser } from '../../auth/auth.types';
import { REQUIRE_ROLE_KEY } from '../decorators/require-role.decorator';

@Injectable()
export class WorkspaceGuard implements CanActivate {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(Reflector) private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      params: { id?: string; workspaceId?: string };
      user: RequestUser;
      workspace?: unknown;
      membership?: unknown;
    }>();
    const workspaceId = request.params.workspaceId ?? request.params.id;
    if (!workspaceId) {
      throw ApiErrors.notFound('WORKSPACE_NOT_FOUND', 'Workspace not found');
    }

    const workspace = await this.prisma.workspace.findFirst({
      where: { id: workspaceId, deletedAt: null },
    });
    if (!workspace) {
      throw ApiErrors.notFound('WORKSPACE_NOT_FOUND', 'Workspace not found');
    }

    const membership = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: request.user.id } },
    });
    if (!membership || membership.status !== 'ACTIVE') {
      throw ApiErrors.forbidden('You are not a member of this workspace');
    }

    const needed = this.reflector.getAllAndOverride<WorkspaceRoleName>(REQUIRE_ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) ?? 'VIEWER';

    if (!roleAtLeast(membership.role, needed)) {
      throw ApiErrors.forbidden('Your role cannot perform this action');
    }

    request.workspace = workspace;
    request.membership = membership;
    return true;
  }
}
