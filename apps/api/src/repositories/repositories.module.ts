import { Module } from '@nestjs/common';
import { WorkspaceGuard } from '../workspaces/guards/workspace.guard';
import { HistoryController } from './history.controller';
import { HistoryService } from './history.service';
import { RepositoriesController } from './repositories.controller';
import { RepositoriesService } from './repositories.service';
import { SourceController } from './source.controller';
import { SourceService } from './source.service';

@Module({
  controllers: [RepositoriesController, HistoryController, SourceController],
  providers: [RepositoriesService, HistoryService, SourceService, WorkspaceGuard],
})
export class RepositoriesModule {}
