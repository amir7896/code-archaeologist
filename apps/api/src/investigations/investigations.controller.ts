import { Body, Controller, Get, Inject, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { type RequestUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireRole } from '../workspaces/decorators/require-role.decorator';
import { WorkspaceGuard } from '../workspaces/guards/workspace.guard';
import {
  AiStatusResponseDto,
  CreateInvestigationDto,
  InvestigationListQueryDto,
  InvestigationListResponseDto,
  InvestigationResponseDto,
} from './dto/investigation.dto';
import { InvestigationsService } from './investigations.service';
import {
  CreateInvestigationDocs,
  GetAiStatusDocs,
  GetInvestigationDocs,
  ListInvestigationEvidenceDocs,
  ListInvestigationMessagesDocs,
  ListInvestigationsDocs,
} from './swagger/investigation.swagger';

@ApiTags('investigations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceGuard)
@Controller('workspaces/:workspaceId/repositories/:repositoryId')
export class InvestigationsController {
  constructor(@Inject(InvestigationsService) private readonly investigations: InvestigationsService) {}

  @Get('ai/status')
  @GetAiStatusDocs()
  status(): Promise<AiStatusResponseDto> {
    return this.investigations.status();
  }

  @Get('investigations')
  @ListInvestigationsDocs()
  list(
    @Param('workspaceId') workspaceId: string,
    @Param('repositoryId') repositoryId: string,
    @Query() query: InvestigationListQueryDto,
  ): Promise<InvestigationListResponseDto> {
    return this.investigations.list(workspaceId, repositoryId, query);
  }

  @Post('investigations')
  @RequireRole('ANALYST')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @CreateInvestigationDocs()
  create(
    @Param('workspaceId') workspaceId: string,
    @Param('repositoryId') repositoryId: string,
    @CurrentUser() user: RequestUser,
    @Body() body: CreateInvestigationDto,
  ): Promise<InvestigationResponseDto> {
    return this.investigations.create(workspaceId, repositoryId, user.id, body);
  }

  @Get('investigations/:investigationId')
  @GetInvestigationDocs()
  getOne(
    @Param('workspaceId') workspaceId: string,
    @Param('repositoryId') repositoryId: string,
    @Param('investigationId') investigationId: string,
  ): Promise<InvestigationResponseDto> {
    return this.investigations.get(workspaceId, repositoryId, investigationId);
  }

  @Get('investigations/:investigationId/messages')
  @ListInvestigationMessagesDocs()
  messages(
    @Param('workspaceId') workspaceId: string,
    @Param('repositoryId') repositoryId: string,
    @Param('investigationId') investigationId: string,
  ): Promise<InvestigationResponseDto> {
    return this.investigations.get(workspaceId, repositoryId, investigationId);
  }

  @Get('investigations/:investigationId/evidence')
  @ListInvestigationEvidenceDocs()
  evidence(
    @Param('workspaceId') workspaceId: string,
    @Param('repositoryId') repositoryId: string,
    @Param('investigationId') investigationId: string,
  ): Promise<InvestigationResponseDto> {
    return this.investigations.get(workspaceId, repositoryId, investigationId);
  }
}
