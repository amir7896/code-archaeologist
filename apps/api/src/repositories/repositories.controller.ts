import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { type RequestUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MessageResponseDto } from '../auth/dto/auth-response.dto';
import { PaginationQueryDto } from '../common/pagination.dto';
import {
  CurrentMembership,
  type RequestMembership,
} from '../workspaces/decorators/current-membership.decorator';
import { RequireRole } from '../workspaces/decorators/require-role.decorator';
import { WorkspaceGuard } from '../workspaces/guards/workspace.guard';
import {
  CreateRepositoryDto,
  RepositoryListResponseDto,
  RepositoryResponseDto,
  RepositoryStatusResponseDto,
  SyncRepositoryDto,
  UpdateRepositoryDto,
} from './dto/repository.dto';
import { RepositoriesService } from './repositories.service';
import {
  CreateRepositoryDocs,
  DeleteRepositoryDocs,
  GetRepositoryDocs,
  GetRepositoryStatusDocs,
  ListRepositoriesDocs,
  SyncRepositoryDocs,
  UpdateRepositoryDocs,
} from './swagger/repository.swagger';

@ApiTags('repositories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceGuard)
@Controller('workspaces/:workspaceId/repositories')
export class RepositoriesController {
  constructor(@Inject(RepositoriesService) private readonly repositories: RepositoriesService) {}

  @Get()
  @ListRepositoriesDocs()
  list(
    @Param('workspaceId') workspaceId: string,
    @Query() query: PaginationQueryDto,
  ): Promise<RepositoryListResponseDto> {
    return this.repositories.list(workspaceId, query);
  }

  @Post()
  @RequireRole('ADMIN')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @CreateRepositoryDocs()
  create(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: RequestUser,
    @Body() body: CreateRepositoryDto,
  ): Promise<RepositoryResponseDto> {
    return this.repositories.create(workspaceId, user, body);
  }

  @Get(':repositoryId')
  @GetRepositoryDocs()
  getOne(
    @Param('workspaceId') workspaceId: string,
    @Param('repositoryId') repositoryId: string,
  ): Promise<RepositoryResponseDto> {
    return this.repositories.get(workspaceId, repositoryId);
  }

  @Get(':repositoryId/status')
  @GetRepositoryStatusDocs()
  status(
    @Param('workspaceId') workspaceId: string,
    @Param('repositoryId') repositoryId: string,
  ): Promise<RepositoryStatusResponseDto> {
    return this.repositories.get(workspaceId, repositoryId);
  }

  @Patch(':repositoryId')
  @RequireRole('ADMIN')
  @UpdateRepositoryDocs()
  update(
    @Param('workspaceId') workspaceId: string,
    @Param('repositoryId') repositoryId: string,
    @CurrentUser() user: RequestUser,
    @Body() body: UpdateRepositoryDto,
  ): Promise<RepositoryResponseDto> {
    return this.repositories.update(workspaceId, repositoryId, user, body);
  }

  @Delete(':repositoryId')
  @HttpCode(200)
  @RequireRole('ADMIN')
  @DeleteRepositoryDocs()
  async remove(
    @Param('workspaceId') workspaceId: string,
    @Param('repositoryId') repositoryId: string,
    @CurrentUser() user: RequestUser,
  ): Promise<MessageResponseDto> {
    await this.repositories.remove(workspaceId, repositoryId, user);
    return { status: 'ok' };
  }

  @Post(':repositoryId/sync')
  @RequireRole('ANALYST')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @SyncRepositoryDocs()
  sync(
    @Param('workspaceId') workspaceId: string,
    @Param('repositoryId') repositoryId: string,
    @CurrentUser() user: RequestUser,
    @CurrentMembership() membership: RequestMembership,
    @Body() body: SyncRepositoryDto,
  ): Promise<RepositoryResponseDto> {
    return this.repositories.sync(workspaceId, repositoryId, user, body, membership.role);
  }
}
