import { Controller, Get, Inject, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../workspaces/guards/workspace.guard';
import {
  FileListQueryDto,
  FileTreeQueryDto,
  FileTreeResponseDto,
  SourceFileListResponseDto,
  SourceFileResponseDto,
  SourcePreviewResponseDto,
  SymbolDetailResponseDto,
  SymbolListQueryDto,
  SymbolListResponseDto,
} from './dto/source.dto';
import { EvolutionResponseDto } from './dto/evidence.dto';
import { EvidenceService } from './evidence.service';
import { SourceService } from './source.service';
import { GetSymbolHistoryDocs } from './swagger/evidence.swagger';
import {
  GetFileDocs,
  GetSymbolDocs,
  ListFilesDocs,
  ListFileTreeDocs,
  ListSymbolsDocs,
  PreviewFileDocs,
} from './swagger/source.swagger';

@ApiTags('source')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceGuard)
@Controller('workspaces/:workspaceId/repositories/:repositoryId')
export class SourceController {
  constructor(
    @Inject(SourceService) private readonly source: SourceService,
    @Inject(EvidenceService) private readonly evidence: EvidenceService,
  ) {}

  @Get('code/tree')
  @ListFileTreeDocs()
  listTree(
    @Param('workspaceId') workspaceId: string,
    @Param('repositoryId') repositoryId: string,
    @Query() query: FileTreeQueryDto,
  ): Promise<FileTreeResponseDto> {
    return this.source.listTree(workspaceId, repositoryId, query);
  }

  @Get('code/files')
  @ListFilesDocs()
  listFiles(
    @Param('workspaceId') workspaceId: string,
    @Param('repositoryId') repositoryId: string,
    @Query() query: FileListQueryDto,
  ): Promise<SourceFileListResponseDto> {
    return this.source.listFiles(workspaceId, repositoryId, query);
  }

  @Get('code/files/:fileId')
  @GetFileDocs()
  getFile(
    @Param('workspaceId') workspaceId: string,
    @Param('repositoryId') repositoryId: string,
    @Param('fileId') fileId: string,
  ): Promise<SourceFileResponseDto> {
    return this.source.getFile(workspaceId, repositoryId, fileId);
  }

  @Get('code/files/:fileId/preview')
  @PreviewFileDocs()
  preview(
    @Param('workspaceId') workspaceId: string,
    @Param('repositoryId') repositoryId: string,
    @Param('fileId') fileId: string,
  ): Promise<SourcePreviewResponseDto> {
    return this.source.preview(workspaceId, repositoryId, fileId);
  }

  @Get('code/symbols')
  @ListSymbolsDocs()
  listSymbols(
    @Param('workspaceId') workspaceId: string,
    @Param('repositoryId') repositoryId: string,
    @Query() query: SymbolListQueryDto,
  ): Promise<SymbolListResponseDto> {
    return this.source.listSymbols(workspaceId, repositoryId, query);
  }

  @Get('code/symbols/:symbolId/history')
  @GetSymbolHistoryDocs()
  symbolHistory(
    @Param('workspaceId') workspaceId: string,
    @Param('repositoryId') repositoryId: string,
    @Param('symbolId') symbolId: string,
  ): Promise<EvolutionResponseDto> {
    return this.evidence.symbolHistory(workspaceId, repositoryId, symbolId);
  }

  @Get('code/symbols/:symbolId')
  @GetSymbolDocs()
  getSymbol(
    @Param('workspaceId') workspaceId: string,
    @Param('repositoryId') repositoryId: string,
    @Param('symbolId') symbolId: string,
  ): Promise<SymbolDetailResponseDto> {
    return this.source.getSymbol(workspaceId, repositoryId, symbolId);
  }
}
