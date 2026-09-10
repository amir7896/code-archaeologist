import { Controller, Get, Inject, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../workspaces/guards/workspace.guard';
import {
  ThreadDetailResponseDto,
  ThreadListQueryDto,
  ThreadListResponseDto,
} from './dto/integration.dto';
import { IntegrationsService } from './integrations.service';
import { GetThreadDocs, ListThreadsDocs } from './swagger/integration.swagger';

@ApiTags('integrations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceGuard)
@Controller('workspaces/:workspaceId/repositories/:repositoryId/threads')
export class ThreadsController {
  constructor(@Inject(IntegrationsService) private readonly integrations: IntegrationsService) {}

  @Get()
  @ListThreadsDocs()
  list(
    @Param('workspaceId') workspaceId: string,
    @Param('repositoryId') repositoryId: string,
    @Query() query: ThreadListQueryDto,
  ): Promise<ThreadListResponseDto> {
    return this.integrations.listThreads(workspaceId, repositoryId, query);
  }

  @Get(':threadId')
  @GetThreadDocs()
  getOne(
    @Param('workspaceId') workspaceId: string,
    @Param('repositoryId') repositoryId: string,
    @Param('threadId') threadId: string,
  ): Promise<ThreadDetailResponseDto> {
    return this.integrations.getThread(workspaceId, repositoryId, threadId);
  }
}
