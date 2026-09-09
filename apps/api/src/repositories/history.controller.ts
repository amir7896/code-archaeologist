import { Controller, Get, Inject, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
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
import { FileHistoryDocs, GetCommitDocs, ListBranchesDocs, ListCommitsDocs } from './swagger/history.swagger';

@ApiTags('history')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceGuard)
@Controller('workspaces/:workspaceId/repositories/:repositoryId')
export class HistoryController {
  constructor(@Inject(HistoryService) private readonly history: HistoryService) {}

  @Get('branches')
  @ListBranchesDocs()
  listBranches(
    @Param('workspaceId') workspaceId: string,
    @Param('repositoryId') repositoryId: string,
  ): Promise<BranchListResponseDto> {
    return this.history.listBranches(workspaceId, repositoryId);
  }

  @Get('commits')
  @ListCommitsDocs()
  listCommits(
    @Param('workspaceId') workspaceId: string,
    @Param('repositoryId') repositoryId: string,
    @Query() query: CommitListQueryDto,
  ): Promise<CommitListResponseDto> {
    return this.history.listCommits(workspaceId, repositoryId, query);
  }

  @Get('commits/:sha')
  @GetCommitDocs()
  getCommit(
    @Param('workspaceId') workspaceId: string,
    @Param('repositoryId') repositoryId: string,
    @Param('sha') sha: string,
  ): Promise<CommitDetailResponseDto> {
    return this.history.getCommit(workspaceId, repositoryId, sha);
  }

  @Get('files/history')
  @FileHistoryDocs()
  fileHistory(
    @Param('workspaceId') workspaceId: string,
    @Param('repositoryId') repositoryId: string,
    @Query() query: FileHistoryQueryDto,
  ): Promise<FileHistoryResponseDto> {
    return this.history.fileHistory(workspaceId, repositoryId, query);
  }
}
