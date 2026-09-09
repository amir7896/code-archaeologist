import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { type RequestUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MessageResponseDto } from '../auth/dto/auth-response.dto';
import { PaginationQueryDto } from '../common/pagination.dto';
import { CurrentMembership, type RequestMembership } from './decorators/current-membership.decorator';
import { RequireRole } from './decorators/require-role.decorator';
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
} from './dto/workspace.dto';
import { WorkspaceGuard } from './guards/workspace.guard';
import {
  CreateWorkspaceDocs,
  DeleteWorkspaceDocs,
  GetWorkspaceDocs,
  InviteMemberDocs,
  ListAuditLogsDocs,
  ListMembersDocs,
  ListWorkspacesDocs,
  RemoveMemberDocs,
  UpdateMemberDocs,
  UpdateWorkspaceDocs,
} from './swagger/workspace.swagger';
import { WorkspacesService } from './workspaces.service';

@ApiTags('workspaces')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workspaces')
export class WorkspacesController {
  constructor(@Inject(WorkspacesService) private readonly workspaces: WorkspacesService) {}

  @Get()
  @ListWorkspacesDocs()
  list(@CurrentUser() user: RequestUser, @Query() query: PaginationQueryDto): Promise<WorkspaceListResponseDto> {
    return this.workspaces.list(user, query);
  }

  @Post()
  @CreateWorkspaceDocs()
  create(@CurrentUser() user: RequestUser, @Body() body: CreateWorkspaceDto): Promise<WorkspaceResponseDto> {
    return this.workspaces.create(user, body);
  }

  @Get(':id')
  @UseGuards(WorkspaceGuard)
  @GetWorkspaceDocs()
  getOne(
    @Param('id') id: string,
    @CurrentMembership() membership: RequestMembership,
  ): Promise<WorkspaceResponseDto> {
    return this.workspaces.get(id, membership.role);
  }

  @Patch(':id')
  @UseGuards(WorkspaceGuard)
  @RequireRole('ADMIN')
  @UpdateWorkspaceDocs()
  update(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @CurrentMembership() membership: RequestMembership,
    @Body() body: UpdateWorkspaceDto,
  ): Promise<WorkspaceResponseDto> {
    return this.workspaces.update(id, user, membership.role, body);
  }

  @Delete(':id')
  @HttpCode(200)
  @UseGuards(WorkspaceGuard)
  @RequireRole('OWNER')
  @DeleteWorkspaceDocs()
  async remove(@Param('id') id: string, @CurrentUser() user: RequestUser): Promise<MessageResponseDto> {
    await this.workspaces.remove(id, user);
    return { status: 'ok' };
  }

  @Get(':id/members')
  @UseGuards(WorkspaceGuard)
  @ListMembersDocs()
  listMembers(@Param('id') id: string, @Query() query: PaginationQueryDto): Promise<MemberListResponseDto> {
    return this.workspaces.listMembers(id, query);
  }

  @Post(':id/members')
  @UseGuards(WorkspaceGuard)
  @RequireRole('ADMIN')
  @InviteMemberDocs()
  invite(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @CurrentMembership() membership: RequestMembership,
    @Body() body: InviteMemberDto,
  ): Promise<MemberResponseDto> {
    return this.workspaces.invite(id, user, membership.role, body);
  }

  @Patch(':id/members/:userId')
  @UseGuards(WorkspaceGuard)
  @RequireRole('ADMIN')
  @UpdateMemberDocs()
  updateMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() user: RequestUser,
    @CurrentMembership() membership: RequestMembership,
    @Body() body: UpdateMemberDto,
  ): Promise<MemberResponseDto> {
    return this.workspaces.updateMember(id, userId, user, membership.role, body);
  }

  @Delete(':id/members/:userId')
  @HttpCode(200)
  @UseGuards(WorkspaceGuard)
  @RemoveMemberDocs()
  async removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() user: RequestUser,
    @CurrentMembership() membership: RequestMembership,
  ): Promise<MessageResponseDto> {
    await this.workspaces.removeMember(id, userId, user, membership.role);
    return { status: 'ok' };
  }

  @Get(':id/audit-logs')
  @UseGuards(WorkspaceGuard)
  @RequireRole('ADMIN')
  @ListAuditLogsDocs()
  listAuditLogs(@Param('id') id: string, @Query() query: PaginationQueryDto): Promise<AuditLogListResponseDto> {
    return this.workspaces.listAuditLogs(id, query);
  }
}
