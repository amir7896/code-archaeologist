import { Module } from '@nestjs/common';
import { WorkspaceGuard } from '../workspaces/guards/workspace.guard';
import { InvestigationsController } from './investigations.controller';
import { InvestigationsService } from './investigations.service';

@Module({
  controllers: [InvestigationsController],
  providers: [InvestigationsService, WorkspaceGuard],
})
export class InvestigationsModule {}
