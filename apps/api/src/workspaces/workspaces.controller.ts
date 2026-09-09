import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
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
import { WorkspacesService } from './workspaces.service';

@ApiTags('workspaces')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workspaces')
export class WorkspacesController {
  constructor(@Inject(WorkspacesService) private readonly workspaces: WorkspacesService) {}

  @Get()
  @ApiOperation({ summary: 'List workspaces for the current user' })
  @ApiOkResponse({ type: WorkspaceListResponseDto })
  list(@CurrentUser() user: RequestUser, @Query() query: PaginationQueryDto): Promise<WorkspaceListResponseDto> {
    return this.workspaces.list(user, query);
  }

  @Post()
  @ApiOperation({ summary: 'Create a workspace and become its owner' })
  @ApiCreatedResponse({ type: WorkspaceResponseDto })
  create(@CurrentUser() user: RequestUser, @Body() body: CreateWorkspaceDto): Promise<WorkspaceResponseDto> {
    return this.workspaces.create(user, body);
  }

  @Get(':id')
  @UseGuards(WorkspaceGuard)
  @ApiOperation({ summary: 'Get a workspace' })
  @ApiOkResponse({ type: WorkspaceResponseDto })
  getOne(
    @Param('id') id: string,
    @CurrentMembership() membership: RequestMembership,
  ): Promise<WorkspaceResponseDto> {
    return this.workspaces.get(id, membership.role);
  }

  @Patch(':id')
  @UseGuards(WorkspaceGuard)
  @RequireRole('ADMIN')
  @ApiOperation({ summary: 'Rename a workspace, or archive/restore it as owner' })
  @ApiOkResponse({ type: WorkspaceResponseDto })
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
  @ApiOperation({ summary: 'Soft-delete a workspace' })
  @ApiOkResponse({ type: MessageResponseDto })
  async remove(@Param('id') id: string, @CurrentUser() user: RequestUser): Promise<MessageResponseDto> {
    await this.workspaces.remove(id, user);
    return { status: 'ok' };
  }

  @Get(':id/members')
  @UseGuards(WorkspaceGuard)
  @ApiOperation({ summary: 'List workspace members' })
  @ApiOkResponse({ type: MemberListResponseDto })
  listMembers(@Param('id') id: string, @Query() query: PaginationQueryDto): Promise<MemberListResponseDto> {
    return this.workspaces.listMembers(id, query);
  }

  @Post(':id/members')
  @UseGuards(WorkspaceGuard)
  @RequireRole('ADMIN')
  @ApiOperation({ summary: 'Invite an existing user to the workspace' })
  @ApiCreatedResponse({ type: MemberResponseDto })
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
  @ApiOperation({ summary: 'Change a member role' })
  @ApiOkResponse({ type: MemberResponseDto })
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
  @ApiOperation({ summary: 'Remove a member or leave the workspace' })
  @ApiOkResponse({ type: MessageResponseDto })
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
  @ApiOperation({ summary: 'List security-sensitive audit events for the workspace' })
  @ApiOkResponse({ type: AuditLogListResponseDto })
  listAuditLogs(@Param('id') id: string, @Query() query: PaginationQueryDto): Promise<AuditLogListResponseDto> {
    return this.workspaces.listAuditLogs(id, query);
  }
}
