import { Controller, Get, Inject, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../workspaces/guards/workspace.guard';
import {
  BranchListResponseDto,
  CommitDetailResponseDto,
  CommitListQueryDto,
  CommitListResponseDto,
  FileHistoryQueryDto,
  FileHistoryResponseDto,
} from './dto/history.dto';
import { HistoryService } from './history.service';

@ApiTags('history')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceGuard)
@Controller('workspaces/:workspaceId/repositories/:repositoryId')
export class HistoryController {
  constructor(@Inject(HistoryService) private readonly history: HistoryService) {}

  @Get('branches')
  @ApiOperation({ summary: 'List indexed branches' })
  @ApiOkResponse({ type: BranchListResponseDto })
  listBranches(
    @Param('workspaceId') workspaceId: string,
    @Param('repositoryId') repositoryId: string,
  ): Promise<BranchListResponseDto> {
    return this.history.listBranches(workspaceId, repositoryId);
  }

  @Get('commits')
  @ApiOperation({ summary: 'List indexed commits' })
  @ApiOkResponse({ type: CommitListResponseDto })
  listCommits(
    @Param('workspaceId') workspaceId: string,
    @Param('repositoryId') repositoryId: string,
    @Query() query: CommitListQueryDto,
  ): Promise<CommitListResponseDto> {
    return this.history.listCommits(workspaceId, repositoryId, query);
  }

  @Get('commits/:sha')
  @ApiOperation({ summary: 'Get a commit and its changed files' })
  @ApiOkResponse({ type: CommitDetailResponseDto })
  getCommit(
    @Param('workspaceId') workspaceId: string,
    @Param('repositoryId') repositoryId: string,
    @Param('sha') sha: string,
  ): Promise<CommitDetailResponseDto> {
    return this.history.getCommit(workspaceId, repositoryId, sha);
  }

  @Get('files/history')
  @ApiOperation({ summary: 'Get history for a file path' })
  @ApiOkResponse({ type: FileHistoryResponseDto })
  fileHistory(
    @Param('workspaceId') workspaceId: string,
    @Param('repositoryId') repositoryId: string,
    @Query() query: FileHistoryQueryDto,
  ): Promise<FileHistoryResponseDto> {
    return this.history.fileHistory(workspaceId, repositoryId, query);
  }
}
