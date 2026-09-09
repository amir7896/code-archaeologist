import { join } from 'node:path';
import { Inject, Injectable } from '@nestjs/common';
import { type Prisma } from '@code-archaeologist/core';
import { type AppEnv } from '@code-archaeologist/shared';
import { ApiErrors } from '../common/api-exception';
import { paginationMeta, paginationSkip, resolvePagination } from '../common/pagination.dto';
import { APP_ENV } from '../config/env.service';
import { PrismaService } from '../database/prisma.service';
import {
  type FileListQueryDto,
  type SourceFileListResponseDto,
  type SourceFileResponseDto,
  type SourcePreviewResponseDto,
  type SymbolDetailResponseDto,
  type SymbolListQueryDto,
  type SymbolListResponseDto,
} from './dto/source.dto';
import { readGitBlob } from './source-git.reader';

const PREVIEW_LIMIT = 32_000;
const SYMBOL_KINDS = [
  'MODULE',
  'CLASS',
  'INTERFACE',
  'ENUM',
  'FUNCTION',
  'METHOD',
  'VARIABLE',
  'CONSTANT',
  'TYPE',
  'NAMESPACE',
] as const;

type SymbolKindName = (typeof SYMBOL_KINDS)[number];

@Injectable()
export class SourceService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(APP_ENV) private readonly env: AppEnv,
  ) {}

  async listFiles(
    workspaceId: string,
    repositoryId: string,
    query: FileListQueryDto,
  ): Promise<SourceFileListResponseDto> {
    await this.requireRepository(workspaceId, repositoryId);
    const { page, limit } = resolvePagination(query);
    const where: Prisma.RepoFileWhereInput = {
      repositoryId,
      ...(query.language?.trim() ? { language: query.language.trim() } : {}),
      ...(query.q?.trim() ? { path: { contains: query.q.trim(), mode: 'insensitive' } } : {}),
    };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.repoFile.count({ where }),
      this.prisma.repoFile.findMany({
        where,
        orderBy: { path: 'asc' },
        skip: paginationSkip(page, limit),
        take: limit,
        include: { _count: { select: { symbols: true } } },
      }),
    ]);
    return {
      items: rows.map((row) => toFile(row)),
      pagination: paginationMeta(page, limit, total),
    };
  }

  async getFile(
    workspaceId: string,
    repositoryId: string,
    fileId: string,
  ): Promise<SourceFileResponseDto> {
    await this.requireRepository(workspaceId, repositoryId);
    const file = await this.prisma.repoFile.findFirst({
      where: { id: fileId, repositoryId },
      include: { _count: { select: { symbols: true } } },
    });
    if (!file) {
      throw ApiErrors.notFound('FILE_NOT_FOUND', 'File not found');
    }
    return toFile(file);
  }

  async preview(
    workspaceId: string,
    repositoryId: string,
    fileId: string,
  ): Promise<SourcePreviewResponseDto> {
    const file = await this.prisma.repoFile.findFirst({
      where: { id: fileId, repositoryId, repository: { workspaceId, deletedAt: null } },
    });
    if (!file) {
      throw ApiErrors.notFound('FILE_NOT_FOUND', 'File not found');
    }
    const revision = file.lastParsedRevision || file.lastRevision;
    try {
      const content = await readGitBlob(
        join(this.env.REPOSITORY_WORK_DIR, 'mirrors', repositoryId),
        revision,
        file.path,
      );
      const truncated = content.length > PREVIEW_LIMIT;
      return {
        fileId: file.id,
        path: file.path,
        language: file.language,
        content: truncated ? content.slice(0, PREVIEW_LIMIT) : content,
        truncated,
      };
    } catch {
      throw ApiErrors.notFound('SOURCE_UNAVAILABLE', 'Source is not available yet. Sync the repository.');
    }
  }

  async listSymbols(
    workspaceId: string,
    repositoryId: string,
    query: SymbolListQueryDto,
  ): Promise<SymbolListResponseDto> {
    await this.requireRepository(workspaceId, repositoryId);
    const { page, limit } = resolvePagination(query);
    const kind = parseKind(query.kind);
    const search = query.q?.trim();
    const where: Prisma.CodeSymbolWhereInput = {
      file: { repositoryId },
      ...(query.fileId ? { fileId: query.fileId } : {}),
      ...(kind ? { kind } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { qualifiedName: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.codeSymbol.count({ where }),
      this.prisma.codeSymbol.findMany({
        where,
        orderBy: [{ file: { path: 'asc' } }, { startLine: 'asc' }],
        skip: paginationSkip(page, limit),
        take: limit,
        include: { file: { select: { path: true } } },
      }),
    ]);
    return {
      items: rows.map((row) => ({
        id: row.id,
        fileId: row.fileId,
        path: row.file.path,
        kind: row.kind,
        name: row.name,
        qualifiedName: row.qualifiedName,
        startLine: row.startLine,
        endLine: row.endLine,
        loc: row.loc,
        complexity: row.complexity,
        nesting: row.nesting,
      })),
      pagination: paginationMeta(page, limit, total),
    };
  }

  async getSymbol(
    workspaceId: string,
    repositoryId: string,
    symbolId: string,
  ): Promise<SymbolDetailResponseDto> {
    await this.requireRepository(workspaceId, repositoryId);
    const symbol = await this.prisma.codeSymbol.findFirst({
      where: { id: symbolId, file: { repositoryId } },
      include: {
        file: { select: { path: true } },
        outgoing: {
          orderBy: { type: 'asc' },
          select: {
            type: true,
            targetQualifiedName: true,
            targetSymbolId: true,
            confidence: true,
          },
        },
      },
    });
    if (!symbol) {
      throw ApiErrors.notFound('SYMBOL_NOT_FOUND', 'Symbol not found');
    }
    return {
      id: symbol.id,
      fileId: symbol.fileId,
      path: symbol.file.path,
      kind: symbol.kind,
      name: symbol.name,
      qualifiedName: symbol.qualifiedName,
      startLine: symbol.startLine,
      endLine: symbol.endLine,
      loc: symbol.loc,
      complexity: symbol.complexity,
      nesting: symbol.nesting,
      parentSymbolId: symbol.parentSymbolId,
      relations: symbol.outgoing.map((relation) => ({
        type: relation.type,
        targetQualifiedName: relation.targetQualifiedName,
        targetSymbolId: relation.targetSymbolId,
        confidence: relation.confidence,
      })),
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

function parseKind(value?: string): SymbolKindName | undefined {
  const kind = value?.trim().toUpperCase();
  return SYMBOL_KINDS.includes(kind as SymbolKindName) ? (kind as SymbolKindName) : undefined;
}

function toFile(row: {
  id: string;
  path: string;
  language: string | null;
  size: number | null;
  loc: number | null;
  complexity: number | null;
  lastRevision: string;
  _count: { symbols: number };
}): SourceFileResponseDto {
  return {
    id: row.id,
    path: row.path,
    language: row.language,
    size: row.size,
    loc: row.loc,
    complexity: row.complexity,
    symbolCount: row._count.symbols,
    lastRevision: row.lastRevision,
  };
}
