import { Module } from '@nestjs/common';
import { WorkspaceGuard } from '../workspaces/guards/workspace.guard';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { ThreadsController } from './threads.controller';
import { WebhooksController } from './webhooks.controller';

@Module({
  controllers: [IntegrationsController, ThreadsController, WebhooksController],
  providers: [IntegrationsService, WorkspaceGuard],
})
export class IntegrationsModule {}
