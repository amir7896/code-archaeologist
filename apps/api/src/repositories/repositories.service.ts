import { Inject, Injectable } from '@nestjs/common';
import { encryptSecret, newSecretRef } from '@code-archaeologist/core';
import { GitUrlError, parseHttpsGitUrl } from '@code-archaeologist/git';
import { type AppEnv, type WorkspaceRoleName } from '@code-archaeologist/shared';
import { AuditService } from '../audit/audit.service';
import { type RequestUser } from '../auth/auth.types';
import { ApiErrors } from '../common/api-exception';
import {
  type PaginationQueryDto,
  paginationMeta,
  paginationSkip,
  resolvePagination,
} from '../common/pagination.dto';
import { APP_ENV } from '../config/env.service';
import { PrismaService } from '../database/prisma.service';
import {
  type AnalysisRunResponseDto,
  type CreateRepositoryDto,
  type RepositoryListResponseDto,
  type RepositoryResponseDto,
  type SyncRepositoryDto,
  type UpdateRepositoryDto,
} from './dto/repository.dto';

type RunWithTasks = {
  id: string;
  revision: string | null;
  type: string;
  status: string;
  progress: number;
  error: string | null;
  createdAt: Date;
  tasks: Array<{
    id: string;
    taskType: string;
    status: string;
    attempts: number;
    error: string | null;
  }>;
};

type RepositoryRecord = {
  id: string;
  workspaceId: string;
  name: string;
  url: string;
  provider: string;
  defaultBranch: string | null;
  currentRevision: string | null;
  lastIndexedRevision?: string | null;
  lastParsedRevision?: string | null;
  lastGraphRevision?: string | null;
  lastDnaRevision?: string | null;
  lastEvidenceRevision?: string | null;
  status: string;
  lastError: string | null;
  lastSyncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  credential: { id: string } | null;
  analysisRuns?: RunWithTasks[];
};

@Injectable()
export class RepositoriesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(APP_ENV) private readonly env: AppEnv,
  ) {}

  async list(workspaceId: string, query: PaginationQueryDto): Promise<RepositoryListResponseDto> {
    await this.requireWorkspace(workspaceId);
    const { page, limit } = resolvePagination(query);
    const where = { workspaceId, deletedAt: null };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.repository.count({ where }),
      this.prisma.repository.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: paginationSkip(page, limit),
        take: limit,
        include: {
          credential: { select: { id: true } },
          analysisRuns: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { tasks: { orderBy: { createdAt: 'asc' } } },
          },
        },
      }),
    ]);

    return {
      items: rows.map((row) => toRepositoryResponse(row)),
      pagination: paginationMeta(page, limit, total),
    };
  }

  async create(
    workspaceId: string,
    user: RequestUser,
    input: CreateRepositoryDto,
  ): Promise<RepositoryResponseDto> {
    await this.requireActiveWorkspace(workspaceId);
    const parsed = parseRepositoryUrl(input.url);
    await this.assertUniqueUrl(workspaceId, parsed.compareKey);

    const repository = await this.prisma.repository.create({
      data: {
        workspaceId,
        name: input.name?.trim() || parsed.name,
        url: parsed.url,
        provider: parsed.provider,
        defaultBranch: input.defaultBranch?.trim() || null,
        status: 'PENDING',
      },
    });

    if (input.credential?.secret) {
      await this.writeCredential(repository.id, input.credential);
    }

    await this.startIngestionRun(repository.id, input.defaultBranch?.trim());
    await this.audit.record({
      workspaceId,
      userId: user.id,
      action: 'REPOSITORY_CREATE',
      resource: `repository:${repository.id}`,
      metadata: { provider: parsed.provider, hasCredential: Boolean(input.credential?.secret) },
    });
    return this.get(workspaceId, repository.id);
  }

  async get(workspaceId: string, repositoryId: string): Promise<RepositoryResponseDto> {
    const repository = await this.requireRepository(workspaceId, repositoryId);
    const [commitCount, branchCount, fileCount, symbolCount] = await this.prisma.$transaction([
      this.prisma.commit.count({ where: { repositoryId } }),
      this.prisma.branch.count({ where: { repositoryId } }),
      this.prisma.repoFile.count({ where: { repositoryId } }),
      this.prisma.codeSymbol.count({ where: { file: { repositoryId } } }),
    ]);
    return toRepositoryResponse(repository, { commitCount, branchCount, fileCount, symbolCount });
  }

  async update(
    workspaceId: string,
    repositoryId: string,
    user: RequestUser,
    input: UpdateRepositoryDto,
  ): Promise<RepositoryResponseDto> {
    await this.requireActiveWorkspace(workspaceId);
    await this.requireRepository(workspaceId, repositoryId);

    if (input.removeCredential) {
      await this.prisma.repositoryCredential.deleteMany({ where: { repositoryId } });
    } else if (input.credential?.secret) {
      await this.writeCredential(repositoryId, input.credential);
    }

    if (input.name || input.defaultBranch) {
      await this.prisma.repository.update({
        where: { id: repositoryId },
        data: {
          ...(input.name ? { name: input.name.trim() } : {}),
          ...(input.defaultBranch ? { defaultBranch: input.defaultBranch.trim() } : {}),
        },
      });
    }

    await this.audit.record({
      workspaceId,
      userId: user.id,
      action: 'REPOSITORY_UPDATE',
      resource: `repository:${repositoryId}`,
      metadata: {
        renamed: Boolean(input.name),
        credentialChanged: Boolean(input.credential?.secret) || Boolean(input.removeCredential),
      },
    });
    return this.get(workspaceId, repositoryId);
  }

  async remove(workspaceId: string, repositoryId: string, user: RequestUser): Promise<void> {
    await this.requireActiveWorkspace(workspaceId);
    await this.requireRepository(workspaceId, repositoryId);
    await this.prisma.analysisRun.updateMany({
      where: { repositoryId, status: { in: ['QUEUED', 'RUNNING'] } },
      data: { status: 'CANCELLED', finishedAt: new Date(), error: 'Repository removed' },
    });
    await this.prisma.repository.update({
      where: { id: repositoryId },
      data: { deletedAt: new Date() },
    });
    await this.audit.record({
      workspaceId,
      userId: user.id,
      action: 'REPOSITORY_DELETE',
      resource: `repository:${repositoryId}`,
    });
  }

  async sync(
    workspaceId: string,
    repositoryId: string,
    user: RequestUser,
    input: SyncRepositoryDto,
    role: WorkspaceRoleName,
  ): Promise<RepositoryResponseDto> {
    await this.requireActiveWorkspace(workspaceId);
    const repository = await this.requireRepository(workspaceId, repositoryId);
    if (repository.status === 'SYNCING') {
      throw ApiErrors.conflict('REPOSITORY_SYNCING', 'This repository is already syncing');
    }
    if (input.revision) {
      await this.prisma.repository.update({
        where: { id: repositoryId },
        data: { defaultBranch: input.revision.trim() },
      });
    }
    await this.startIngestionRun(repositoryId, input.revision?.trim() || repository.defaultBranch);
    await this.audit.record({
      workspaceId,
      userId: user.id,
      action: 'REPOSITORY_SYNC',
      resource: `repository:${repositoryId}`,
      metadata: { role },
    });
    return this.get(workspaceId, repositoryId);
  }

  private async startIngestionRun(repositoryId: string, revision?: string | null): Promise<void> {
    await this.prisma.analysisRun.updateMany({
      where: { repositoryId, status: 'QUEUED' },
      data: { status: 'CANCELLED', finishedAt: new Date() },
    });
    await this.prisma.repository.update({
      where: { id: repositoryId },
      data: { status: 'PENDING', lastError: null },
    });
    await this.prisma.analysisRun.create({
      data: {
        repositoryId,
        revision: revision || null,
        type: 'INGESTION',
        status: 'QUEUED',
        progress: 0,
        tasks: {
          create: [
            { taskType: 'CLONE' },
            { taskType: 'DETECT_REVISION' },
            { taskType: 'INDEX_HISTORY' },
            { taskType: 'PARSE_AST' },
            { taskType: 'BUILD_GRAPH' },
            { taskType: 'COMPUTE_DNA' },
            { taskType: 'LINK_EVIDENCE' },
          ],
        },
      },
    });
  }

  private async writeCredential(
    repositoryId: string,
    input: { type: string; username?: string; secret: string },
  ): Promise<void> {
    const encryptedPayload = encryptSecret(
      JSON.stringify({
        username: input.username?.trim() || 'x-access-token',
        secret: input.secret,
      }),
      this.env.CREDENTIALS_ENCRYPTION_KEY,
    );
    await this.prisma.repositoryCredential.upsert({
      where: { repositoryId },
      create: {
        repositoryId,
        type: 'HTTPS_TOKEN',
        encryptedSecretRef: newSecretRef(),
        encryptedPayload,
      },
      update: {
        type: 'HTTPS_TOKEN',
        encryptedPayload,
        keyVersion: { increment: 1 },
        rotatedAt: new Date(),
      },
    });
  }

  private async requireWorkspace(workspaceId: string) {
    const workspace = await this.prisma.workspace.findFirst({
      where: { id: workspaceId, deletedAt: null },
    });
    if (!workspace) {
      throw ApiErrors.notFound('WORKSPACE_NOT_FOUND', 'Workspace not found');
    }
    return workspace;
  }

  private async requireActiveWorkspace(workspaceId: string) {
    const workspace = await this.requireWorkspace(workspaceId);
    if (workspace.status === 'ARCHIVED') {
      throw ApiErrors.conflict('WORKSPACE_ARCHIVED', 'This workspace is archived');
    }
    return workspace;
  }

  private async requireRepository(
    workspaceId: string,
    repositoryId: string,
  ): Promise<RepositoryRecord> {
    const repository = await this.prisma.repository.findFirst({
      where: { id: repositoryId, workspaceId, deletedAt: null },
      include: {
        credential: { select: { id: true } },
        analysisRuns: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { tasks: { orderBy: { createdAt: 'asc' } } },
        },
      },
    });
    if (!repository) {
      throw ApiErrors.notFound('REPOSITORY_NOT_FOUND', 'Repository not found');
    }
    return repository;
  }

  private async assertUniqueUrl(workspaceId: string, compareKey: string): Promise<void> {
    const existing = await this.prisma.repository.findMany({
      where: { workspaceId, deletedAt: null },
      select: { url: true },
    });
    if (existing.some((row) => parseHttpsGitUrl(row.url).compareKey === compareKey)) {
      throw ApiErrors.conflict('REPOSITORY_EXISTS', 'That repository is already in this workspace');
    }
  }
}

function parseRepositoryUrl(url: string) {
  try {
    return parseHttpsGitUrl(url);
  } catch (error) {
    if (error instanceof GitUrlError) {
      throw ApiErrors.badRequest('INVALID_GIT_URL', error.message);
    }
    throw error;
  }
}

function toRepositoryResponse(
  repository: RepositoryRecord,
  counts?: { commitCount: number; branchCount: number; fileCount: number; symbolCount: number },
): RepositoryResponseDto {
  return {
    id: repository.id,
    workspaceId: repository.workspaceId,
    name: repository.name,
    url: repository.url,
    provider: repository.provider,
    defaultBranch: repository.defaultBranch,
    currentRevision: repository.currentRevision,
    lastIndexedRevision: repository.lastIndexedRevision ?? null,
    lastParsedRevision: repository.lastParsedRevision ?? null,
    lastGraphRevision: repository.lastGraphRevision ?? null,
    lastDnaRevision: repository.lastDnaRevision ?? null,
    lastEvidenceRevision: repository.lastEvidenceRevision ?? null,
    commitCount: counts?.commitCount,
    fileCount: counts?.fileCount,
    symbolCount: counts?.symbolCount,
    branchCount: counts?.branchCount,
    status: repository.status,
    hasCredential: Boolean(repository.credential),
    lastError: repository.lastError,
    lastSyncedAt: repository.lastSyncedAt,
    createdAt: repository.createdAt,
    updatedAt: repository.updatedAt,
    latestRun: repository.analysisRuns?.[0] ? toRunResponse(repository.analysisRuns[0]) : null,
  };
}

function toRunResponse(run: RunWithTasks): AnalysisRunResponseDto {
  return {
    id: run.id,
    revision: run.revision,
    type: run.type,
    status: run.status,
    progress: run.progress,
    error: run.error,
    createdAt: run.createdAt,
    tasks: run.tasks.map((task) => ({
      id: task.id,
      taskType: task.taskType,
      status: task.status,
      attempts: task.attempts,
      error: task.error,
    })),
  };
}
