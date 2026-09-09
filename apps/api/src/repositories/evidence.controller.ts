import { Controller, Get, Inject, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../workspaces/guards/workspace.guard';
import {
  EvidenceListResponseDto,
  EvidenceResolveQueryDto,
  EvidenceResolveResponseDto,
  EvidenceSubjectQueryDto,
  EvolutionResponseDto,
} from './dto/evidence.dto';
import { EvidenceService } from './evidence.service';
import { GetEvolutionDocs, ListEvidenceDocs, ResolveEvidenceDocs } from './swagger/evidence.swagger';

@ApiTags('evidence')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceGuard)
@Controller('workspaces/:workspaceId/repositories/:repositoryId')
export class EvidenceController {
  constructor(@Inject(EvidenceService) private readonly evidence: EvidenceService) {}

  @Get('evidence')
  @ListEvidenceDocs()
  list(
    @Param('workspaceId') workspaceId: string,
    @Param('repositoryId') repositoryId: string,
    @Query() query: EvidenceSubjectQueryDto,
  ): Promise<EvidenceListResponseDto> {
    return this.evidence.list(workspaceId, repositoryId, query);
  }

  @Get('evidence/resolve')
  @ResolveEvidenceDocs()
  resolve(
    @Param('workspaceId') workspaceId: string,
    @Param('repositoryId') repositoryId: string,
    @Query() query: EvidenceResolveQueryDto,
  ): Promise<EvidenceResolveResponseDto> {
    return this.evidence.resolve(workspaceId, repositoryId, query);
  }

  @Get('insights/evolution')
  @GetEvolutionDocs()
  evolution(
    @Param('workspaceId') workspaceId: string,
    @Param('repositoryId') repositoryId: string,
    @Query() query: EvidenceSubjectQueryDto,
  ): Promise<EvolutionResponseDto> {
    return this.evidence.evolution(workspaceId, repositoryId, query);
  }
}
