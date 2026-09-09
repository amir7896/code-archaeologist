import { Controller, Get, Inject, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../workspaces/guards/workspace.guard';
import {
  GraphCyclesResponseDto,
  GraphMapQueryDto,
  GraphMapResponseDto,
  GraphNeighborsResponseDto,
  GraphWalkQueryDto,
} from './dto/graph.dto';
import { GraphService } from './graph.service';
import {
  GetGraphCyclesDocs,
  GetGraphDependenciesDocs,
  GetGraphDependentsDocs,
  GetGraphMapDocs,
} from './swagger/graph.swagger';

@ApiTags('graph')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceGuard)
@Controller('workspaces/:workspaceId/repositories/:repositoryId/graph')
export class GraphController {
  constructor(@Inject(GraphService) private readonly graph: GraphService) {}

  @Get()
  @GetGraphMapDocs()
  getMap(
    @Param('workspaceId') workspaceId: string,
    @Param('repositoryId') repositoryId: string,
    @Query() query: GraphMapQueryDto,
  ): Promise<GraphMapResponseDto> {
    return this.graph.getMap(workspaceId, repositoryId, query);
  }

  @Get('dependencies')
  @GetGraphDependenciesDocs()
  getDependencies(
    @Param('workspaceId') workspaceId: string,
    @Param('repositoryId') repositoryId: string,
    @Query() query: GraphWalkQueryDto,
  ): Promise<GraphNeighborsResponseDto> {
    return this.graph.getDependencies(workspaceId, repositoryId, query);
  }

  @Get('dependents')
  @GetGraphDependentsDocs()
  getDependents(
    @Param('workspaceId') workspaceId: string,
    @Param('repositoryId') repositoryId: string,
    @Query() query: GraphWalkQueryDto,
  ): Promise<GraphNeighborsResponseDto> {
    return this.graph.getDependents(workspaceId, repositoryId, query);
  }

  @Get('cycles')
  @GetGraphCyclesDocs()
  getCycles(
    @Param('workspaceId') workspaceId: string,
    @Param('repositoryId') repositoryId: string,
  ): Promise<GraphCyclesResponseDto> {
    return this.graph.getCycles(workspaceId, repositoryId);
  }
}
