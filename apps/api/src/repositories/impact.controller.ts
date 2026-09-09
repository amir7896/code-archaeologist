import { Controller, Get, Inject, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../workspaces/guards/workspace.guard';
import { ImpactQueryDto, ImpactResponseDto } from './dto/impact.dto';
import { ImpactService } from './impact.service';
import { GetImpactDocs } from './swagger/impact.swagger';

@ApiTags('impact')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceGuard)
@Controller('workspaces/:workspaceId/repositories/:repositoryId')
export class ImpactController {
  constructor(@Inject(ImpactService) private readonly impact: ImpactService) {}

  @Get('impact')
  @GetImpactDocs()
  analyze(
    @Param('workspaceId') workspaceId: string,
    @Param('repositoryId') repositoryId: string,
    @Query() query: ImpactQueryDto,
  ): Promise<ImpactResponseDto> {
    return this.impact.analyze(workspaceId, repositoryId, query);
  }
}
