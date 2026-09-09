import { Module } from '@nestjs/common';
import { WorkspaceGuard } from '../workspaces/guards/workspace.guard';
import { DnaController } from './dna.controller';
import { DnaService } from './dna.service';
import { GraphController } from './graph.controller';
import { GraphService } from './graph.service';
import { HistoryController } from './history.controller';
import { HistoryService } from './history.service';
import { ImpactController } from './impact.controller';
import { ImpactService } from './impact.service';
import { RepositoriesController } from './repositories.controller';
import { RepositoriesService } from './repositories.service';
import { SourceController } from './source.controller';
import { SourceService } from './source.service';

@Module({
  controllers: [
    RepositoriesController,
    HistoryController,
    SourceController,
    GraphController,
    DnaController,
    ImpactController,
  ],
  providers: [
    RepositoriesService,
    HistoryService,
    SourceService,
    GraphService,
    DnaService,
    ImpactService,
    WorkspaceGuard,
  ],
})
export class RepositoriesModule {}
