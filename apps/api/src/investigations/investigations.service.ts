import { Inject, Injectable } from '@nestjs/common';
import { OllamaProvider } from '@code-archaeologist/ai';
import { investigationConfidenceLabel, type AppEnv } from '@code-archaeologist/shared';
import { AuditService } from '../audit/audit.service';
import { ApiErrors } from '../common/api-exception';
import { assertWorkspaceAskQuota, dayAgo } from '../common/workspace-quota';
import { paginationMeta, paginationSkip, resolvePagination } from '../common/pagination.dto';
import { APP_ENV } from '../config/env.service';
import { PrismaService } from '../database/prisma.service';
import {
  type AiStatusResponseDto,
  type CreateInvestigationDto,
  type InvestigationListQueryDto,
  type InvestigationListResponseDto,
  type InvestigationResponseDto,
} from './dto/investigation.dto';

@Injectable()
export class InvestigationsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(APP_ENV) private readonly env: AppEnv,
  ) {}

  async status(): Promise<AiStatusResponseDto> {
    const provider = new OllamaProvider(this.env.OLLAMA_BASE_URL);
    const health = await provider.health();
    return {
      provider: 'ollama',
      model: this.env.OLLAMA_MODEL,
      available: health.ok,
    };
  }

  async create(
    workspaceId: string,
    repositoryId: string,
    userId: string,
    body: CreateInvestigationDto,
  ): Promise<InvestigationResponseDto> {
    await this.requireRepository(workspaceId, repositoryId);
    await assertWorkspaceAskQuota(
      () =>
        this.prisma.investigation.count({
          where: { createdAt: { gte: dayAgo() }, repository: { workspaceId } },
        }),
      this.env.WORKSPACE_ASK_DAILY_LIMIT,
    );
    if (body.fileId) {
      const file = await this.prisma.repoFile.findFirst({
        where: { id: body.fileId, repositoryId },
        select: { id: true },
      });
      if (!file) {
        throw ApiErrors.notFound('FILE_NOT_FOUND', 'File not found');
      }
    }
    if (body.symbolId) {
      const symbol = await this.prisma.codeSymbol.findFirst({
        where: { id: body.symbolId, file: { repositoryId } },
        select: { id: true },
      });
      if (!symbol) {
        throw ApiErrors.notFound('SYMBOL_NOT_FOUND', 'Symbol not found');
      }
    }
    const created = await this.prisma.investigation.create({
      data: {
        repositoryId,
        userId,
        question: body.question.trim(),
        model: this.env.OLLAMA_MODEL,
        subjectFileId: body.fileId ?? null,
        subjectSymbolId: body.symbolId ?? null,
      },
    });
    await this.audit.record({
      workspaceId,
      userId,
      action: 'INVESTIGATION_CREATE',
      resource: `investigation:${created.id}`,
      metadata: { repositoryId },
    });
    return toInvestigation(created);
  }

  async list(
    workspaceId: string,
    repositoryId: string,
    query: InvestigationListQueryDto,
  ): Promise<InvestigationListResponseDto> {
    await this.requireRepository(workspaceId, repositoryId);
    const { page, limit } = resolvePagination(query);
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.investigation.count({ where: { repositoryId } }),
      this.prisma.investigation.findMany({
        where: { repositoryId },
        orderBy: { createdAt: 'desc' },
        skip: paginationSkip(page, limit),
        take: limit,
      }),
    ]);
    return {
      items: rows.map((row) => toInvestigation(row)),
      pagination: paginationMeta(page, limit, total),
    };
  }

  async get(
    workspaceId: string,
    repositoryId: string,
    investigationId: string,
  ): Promise<InvestigationResponseDto> {
    await this.requireRepository(workspaceId, repositoryId);
    const row = await this.prisma.investigation.findFirst({
      where: { id: investigationId, repositoryId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        evidence: { orderBy: { relevance: 'desc' } },
      },
    });
    if (!row) {
      throw ApiErrors.notFound('INVESTIGATION_NOT_FOUND', 'Question not found');
    }
    return toInvestigation(row, true);
  }

  private async requireRepository(workspaceId: string, repositoryId: string): Promise<void> {
    const repository = await this.prisma.repository.findFirst({
      where: { id: repositoryId, workspaceId, deletedAt: null },
      select: { id: true },
    });
    if (!repository) {
      throw ApiErrors.notFound('REPOSITORY_NOT_FOUND', 'Repository not found');
    }
  }
}

function toInvestigation(
  row: {
    id: string;
    repositoryId: string;
    question: string;
    status: string;
    model: string;
    usedModel: boolean;
    confidence: number | null;
    subjectFileId: string | null;
    subjectSymbolId: string | null;
    error: string | null;
    createdAt: Date;
    updatedAt: Date;
    messages?: Array<{
      id: string;
      role: string;
      content: string;
      promptTokens: number | null;
      completionTokens: number | null;
      createdAt: Date;
    }>;
    evidence?: Array<{
      id: string;
      sourceType: string;
      sourceId: string;
      citation: string;
      excerpt: string;
      relevance: number;
      fileId: string | null;
      symbolId: string | null;
      commitSha: string | null;
      path: string | null;
    }>;
  },
  includeChildren = false,
): InvestigationResponseDto {
  return {
    id: row.id,
    repositoryId: row.repositoryId,
    question: row.question,
    status: row.status,
    model: row.model,
    usedModel: row.usedModel,
    confidence: row.confidence,
    confidenceLabel: row.confidence === null ? null : investigationConfidenceLabel(row.confidence),
    subjectFileId: row.subjectFileId,
    subjectSymbolId: row.subjectSymbolId,
    error: row.error,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    ...(includeChildren
      ? {
          messages: row.messages ?? [],
          evidence: row.evidence ?? [],
        }
      : {}),
  };
}
