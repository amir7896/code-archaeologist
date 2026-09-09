import { Inject, Injectable } from '@nestjs/common';
import { ApiErrors } from '../common/api-exception';
import { paginationMeta, paginationSkip, resolvePagination } from '../common/pagination.dto';
import { PrismaService } from '../database/prisma.service';
import {
  type BranchListResponseDto,
  type CommitDetailResponseDto,
  type CommitListQueryDto,
  type CommitListResponseDto,
  type CommitSummaryDto,
  type FileHistoryQueryDto,
  type FileHistoryResponseDto,
} from './dto/history.dto';

@Injectable()
export class HistoryService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listBranches(workspaceId: string, repositoryId: string): Promise<BranchListResponseDto> {
    await this.requireRepository(workspaceId, repositoryId);
    const rows = await this.prisma.branch.findMany({
      where: { repositoryId },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      include: { headCommit: { select: { sha: true } } },
    });
    return {
      items: rows.map((row) => ({
        id: row.id,
        name: row.name,
        headSha: row.headCommit?.sha ?? null,
        isDefault: row.isDefault,
      })),
    };
  }

  async listCommits(
    workspaceId: string,
    repositoryId: string,
    query: CommitListQueryDto,
  ): Promise<CommitListResponseDto> {
    await this.requireRepository(workspaceId, repositoryId);
    const { page, limit } = resolvePagination(query);
    const branchName = query.branch?.trim();
    const where = branchName
      ? { repositoryId, branches: { some: { branch: { name: branchName } } } }
      : { repositoryId };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.commit.count({ where }),
      this.prisma.commit.findMany({
        where,
        orderBy: { committedAt: 'desc' },
        skip: paginationSkip(page, limit),
        take: limit,
        include: {
          files: { select: { additions: true, deletions: true } },
        },
      }),
    ]);

    return {
      items: rows.map((row) => toCommitSummary(row)),
      pagination: paginationMeta(page, limit, total),
    };
  }

  async getCommit(
    workspaceId: string,
    repositoryId: string,
    sha: string,
  ): Promise<CommitDetailResponseDto> {
    await this.requireRepository(workspaceId, repositoryId);
    const commit = await this.prisma.commit.findUnique({
      where: { repositoryId_sha: { repositoryId, sha } },
      include: {
        files: {
          orderBy: { newPath: 'asc' },
          include: { file: { select: { id: true, language: true } } },
        },
      },
    });
    if (!commit) {
      throw ApiErrors.notFound('COMMIT_NOT_FOUND', 'Commit not found');
    }
    return {
      ...toCommitSummary(commit),
      files: commit.files.map((row) => ({
        fileId: row.fileId ?? row.file.id,
        path: row.newPath,
        oldPath: row.oldPath,
        changeType: row.changeType,
        additions: row.additions,
        deletions: row.deletions,
        similarity: row.similarity,
        language: row.file.language,
      })),
    };
  }

  async fileHistory(
    workspaceId: string,
    repositoryId: string,
    query: FileHistoryQueryDto,
  ): Promise<FileHistoryResponseDto> {
    await this.requireRepository(workspaceId, repositoryId);
    const path = query.path.trim();
    if (!path) {
      throw ApiErrors.badRequest('FILE_PATH_REQUIRED', 'Enter a file path');
    }
    const { page, limit } = resolvePagination(query);
    const where = {
      OR: [
        { file: { repositoryId, path } },
        { oldPath: path, commit: { repositoryId } },
        { newPath: path, commit: { repositoryId } },
      ],
    };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.commitFile.count({ where }),
      this.prisma.commitFile.findMany({
        where,
        orderBy: { commit: { committedAt: 'desc' } },
        skip: paginationSkip(page, limit),
        take: limit,
        include: {
          commit: {
            select: {
              sha: true,
              message: true,
              authorName: true,
              committedAt: true,
            },
          },
        },
      }),
    ]);

    return {
      path,
      items: rows.map((row) => ({
        sha: row.commit.sha,
        message: row.commit.message,
        authorName: row.commit.authorName,
        committedAt: row.commit.committedAt,
        changeType: row.changeType,
        oldPath: row.oldPath,
        path: row.newPath,
        additions: row.additions,
        deletions: row.deletions,
      })),
      pagination: paginationMeta(page, limit, total),
    };
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

function toCommitSummary(row: {
  sha: string;
  message: string;
  authorName: string;
  authorEmail: string;
  authoredAt: Date;
  committedAt: Date;
  parentShas: string[];
  isMerge: boolean;
  files: Array<{ additions: number; deletions: number }>;
}): CommitSummaryDto {
  return {
    sha: row.sha,
    message: row.message,
    authorName: row.authorName,
    authorEmail: row.authorEmail,
    authoredAt: row.authoredAt,
    committedAt: row.committedAt,
    parentShas: row.parentShas,
    isMerge: row.isMerge,
    additions: row.files.reduce((sum, file) => sum + file.additions, 0),
    deletions: row.files.reduce((sum, file) => sum + file.deletions, 0),
    changedFileCount: row.files.length,
  };
}
