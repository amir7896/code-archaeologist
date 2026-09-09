import { Controller, Get, Inject, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../workspaces/guards/workspace.guard';
import {
  DnaHealthResponseDto,
  DnaProfileResponseDto,
  DnaQueryDto,
  InsightListResponseDto,
  InsightsQueryDto,
} from './dto/dna.dto';
import { DnaService } from './dna.service';
import { GetDnaHealthDocs, GetDnaProfileDocs, ListHotspotsDocs, ListRisksDocs } from './swagger/dna.swagger';

@ApiTags('dna')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceGuard)
@Controller('workspaces/:workspaceId/repositories/:repositoryId')
export class DnaController {
  constructor(@Inject(DnaService) private readonly dna: DnaService) {}

  @Get('dna')
  @GetDnaProfileDocs()
  getProfile(
    @Param('workspaceId') workspaceId: string,
    @Param('repositoryId') repositoryId: string,
    @Query() query: DnaQueryDto,
  ): Promise<DnaProfileResponseDto> {
    return this.dna.getProfile(workspaceId, repositoryId, query);
  }

  @Get('insights/hotspots')
  @ListHotspotsDocs()
  listHotspots(
    @Param('workspaceId') workspaceId: string,
    @Param('repositoryId') repositoryId: string,
    @Query() query: InsightsQueryDto,
  ): Promise<InsightListResponseDto> {
    return this.dna.listHotspots(workspaceId, repositoryId, query);
  }

  @Get('insights/risks')
  @ListRisksDocs()
  listRisks(
    @Param('workspaceId') workspaceId: string,
    @Param('repositoryId') repositoryId: string,
    @Query() query: InsightsQueryDto,
  ): Promise<InsightListResponseDto> {
    return this.dna.listRisks(workspaceId, repositoryId, query);
  }

  @Get('insights/health')
  @GetDnaHealthDocs()
  getHealth(
    @Param('workspaceId') workspaceId: string,
    @Param('repositoryId') repositoryId: string,
  ): Promise<DnaHealthResponseDto> {
    return this.dna.getHealth(workspaceId, repositoryId);
  }
}
