import { Module } from '@nestjs/common';
import { WorkspaceGuard } from '../workspaces/guards/workspace.guard';
import { GraphController } from './graph.controller';
import { GraphService } from './graph.service';
import { HistoryController } from './history.controller';
import { HistoryService } from './history.service';
import { RepositoriesController } from './repositories.controller';
import { RepositoriesService } from './repositories.service';
import { SourceController } from './source.controller';
import { SourceService } from './source.service';

@Module({
  controllers: [RepositoriesController, HistoryController, SourceController, GraphController],
  providers: [RepositoriesService, HistoryService, SourceService, GraphService, WorkspaceGuard],
})
export class RepositoriesModule {}
