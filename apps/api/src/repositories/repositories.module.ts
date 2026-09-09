import { Module } from '@nestjs/common';
import { WorkspaceGuard } from '../workspaces/guards/workspace.guard';
import { HistoryController } from './history.controller';
import { HistoryService } from './history.service';
import { RepositoriesController } from './repositories.controller';
import { RepositoriesService } from './repositories.service';

@Module({
  controllers: [RepositoriesController, HistoryController],
  providers: [RepositoriesService, HistoryService, WorkspaceGuard],
})
export class RepositoriesModule {}
