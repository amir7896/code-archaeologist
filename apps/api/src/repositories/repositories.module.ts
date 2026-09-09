import { Module } from '@nestjs/common';
import { WorkspaceGuard } from '../workspaces/guards/workspace.guard';
import { RepositoriesController } from './repositories.controller';
import { RepositoriesService } from './repositories.service';

@Module({
  controllers: [RepositoriesController],
  providers: [RepositoriesService, WorkspaceGuard],
})
export class RepositoriesModule {}
