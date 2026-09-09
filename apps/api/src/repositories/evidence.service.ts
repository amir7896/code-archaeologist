import { Inject, Injectable } from '@nestjs/common';
import { evidenceConfidenceLabel, scoreFileCommitLink } from '@code-archaeologist/shared';
import { ApiErrors } from '../common/api-exception';
import { PrismaService } from '../database/prisma.service';
import {
  type EvidenceItemDto,
  type EvidenceListResponseDto,
  type EvidenceOriginDto,
  type EvidenceResolveQueryDto,
  type EvidenceResolveResponseDto,
  type EvidenceSubjectQueryDto,
  type EvidenceVersionDto,
  type EvolutionEventDto,
  type EvolutionResponseDto,
} from './dto/evidence.dto';

const LIST_LIMIT = 80;
const HONESTY_NOTE =
  'Symbol locations come from the current tree. Commit links are scored from changed files and line ranges, never certain.';

type Origin = Omit<EvidenceOriginDto, 'subjectType'> & { subjectType: 'FILE' | 'SYMBOL' };

@Injectable()
export class EvidenceService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(
    workspaceId: string,
    repositoryId: string,
    query: EvidenceSubjectQueryDto,
  ): Promise<EvidenceListResponseDto> {
    const repository = await this.requireRepository(workspaceId, repositoryId);
    const origin = await this.resolveOrigin(repositoryId, query);
    const items = await this.loadEvidenceItems(repositoryId, origin);
    return {
      revision: repository.lastEvidenceRevision,
      origin,
      note: HONESTY_NOTE,
      items: items.slice(0, LIST_LIMIT),
    };
  }

  async resolve(
    workspaceId: string,
    repositoryId: string,
    query: EvidenceResolveQueryDto,
  ): Promise<EvidenceResolveResponseDto> {
    const repository = await this.requireRepository(workspaceId, repositoryId);
    const origin = await this.resolveOrigin(repositoryId, query);
    const requested = query.revision?.trim() || repository.currentRevision;
    const items = await this.loadEvidenceItems(repositoryId, origin);
    const versions = await this.loadVersions(origin);
    const matchedItems = requested
      ? items.filter((item) => item.commit?.sha === requested || item.commit?.sha.startsWith(requested))
      : items.slice(0, 1);
    const matchedVersions = requested
      ? versions.filter((version) => version.revision === requested || version.revision.startsWith(requested))
      : versions.slice(0, 1);

    return {
      revision: repository.lastEvidenceRevision,
      requestedRevision: requested ?? null,
      matched: matchedItems.length > 0 || matchedVersions.length > 0,
      origin,
      note: HONESTY_NOTE,
      items: matchedItems.slice(0, LIST_LIMIT),
      versions: matchedVersions.slice(0, LIST_LIMIT),
    };
  }

  async evolution(
    workspaceId: string,
    repositoryId: string,
    query: EvidenceSubjectQueryDto,
  ): Promise<EvolutionResponseDto> {
    const repository = await this.requireRepository(workspaceId, repositoryId);
    const origin = await this.resolveOrigin(repositoryId, query);
    const items = await this.loadEvidenceItems(repositoryId, origin);
    const versions = await this.loadVersions(origin);
    const timeline = toTimeline(items);
    const labels = timeline.map((event) => event.confidenceLabel);

    return {
      revision: repository.lastEvidenceRevision,
      origin,
      note: HONESTY_NOTE,
      stats: {
        commitCount: timeline.length,
        strongCount: labels.filter((label) => label === 'strong').length,
        likelyCount: labels.filter((label) => label === 'likely').length,
        possibleCount: labels.filter((label) => label === 'possible').length,
        versionCount: versions.length,
      },
      timeline: timeline.slice(0, LIST_LIMIT),
      versions: versions.slice(0, LIST_LIMIT),
    };
  }

  async symbolHistory(
    workspaceId: string,
    repositoryId: string,
    symbolId: string,
  ): Promise<EvolutionResponseDto> {
    return this.evolution(workspaceId, repositoryId, { symbolId });
  }

  private async loadEvidenceItems(repositoryId: string, origin: Origin): Promise<EvidenceItemDto[]> {
    const stored = await this.prisma.evidence.findMany({
      where: {
        repositoryId,
        subjectType: origin.subjectType,
        subjectId: origin.subjectId,
      },
      include: {
        commit: {
          select: { sha: true, message: true, authorName: true, committedAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 400,
    });
    if (stored.length > 0) {
      return stored
        .map((row) => toItem(row))
        .sort((left, right) => commitTime(right) - commitTime(left));
    }
    return this.fallbackFileCommits(origin);
  }

  private async fallbackFileCommits(origin: Origin): Promise<EvidenceItemDto[]> {
    const rows = await this.prisma.commitFile.findMany({
      where: { fileId: origin.fileId },
      include: {
        commit: {
          select: { id: true, sha: true, message: true, authorName: true, committedAt: true },
        },
      },
      orderBy: { commit: { committedAt: 'desc' } },
      take: LIST_LIMIT,
    });
    return rows.map((row) => {
      const score = scoreFileCommitLink(row.changeType);
      return {
        id: row.id,
        kind: 'FILE_COMMIT',
        method: score.method,
        subjectType: origin.subjectType,
        subjectId: origin.subjectId,
        confidence: origin.subjectType === 'SYMBOL' ? Math.min(score.confidence, 0.32) : score.confidence,
        confidenceLabel: evidenceConfidenceLabel(
          origin.subjectType === 'SYMBOL' ? Math.min(score.confidence, 0.32) : score.confidence,
        ),
        excerpt: null,
        details: {
          changeType: row.changeType,
          path: origin.path,
          overlapLines: 0,
          additions: row.additions,
          deletions: row.deletions,
          fallback: true,
        },
        commit: {
          sha: row.commit.sha,
          message: row.commit.message,
          authorName: row.commit.authorName,
          committedAt: row.commit.committedAt,
        },
      };
    });
  }

  private async loadVersions(origin: Origin): Promise<EvidenceVersionDto[]> {
    const where = origin.symbolId
      ? { symbolId: origin.symbolId }
      : { fileId: origin.fileId };
    const rows = await this.prisma.symbolVersion.findMany({
      where,
      include: { commit: { select: { sha: true } } },
      orderBy: { createdAt: 'desc' },
      take: LIST_LIMIT,
    });
    return rows.map((row) => ({
      revision: row.revision,
      contentHash: row.contentHash,
      changeType: row.changeType,
      startLine: row.startLine,
      endLine: row.endLine,
      commitSha: row.commit?.sha ?? null,
    }));
  }

  private async resolveOrigin(repositoryId: string, query: EvidenceSubjectQueryDto): Promise<Origin> {
    if (query.symbolId) {
      const symbol = await this.prisma.codeSymbol.findFirst({
        where: { id: query.symbolId, file: { repositoryId } },
        select: {
          id: true,
          name: true,
          qualifiedName: true,
          file: { select: { id: true, path: true } },
        },
      });
      if (!symbol) {
        throw ApiErrors.notFound('SYMBOL_NOT_FOUND', 'Symbol not found');
      }
      return {
        subjectType: 'SYMBOL',
        subjectId: symbol.id,
        name: symbol.qualifiedName || symbol.name,
        path: symbol.file.path,
        fileId: symbol.file.id,
        symbolId: symbol.id,
      };
    }

    if (query.fileId) {
      const file = await this.prisma.repoFile.findFirst({
        where: { id: query.fileId, repositoryId },
        select: { id: true, path: true },
      });
      if (!file) {
        throw ApiErrors.notFound('FILE_NOT_FOUND', 'File not found');
      }
      return {
        subjectType: 'FILE',
        subjectId: file.id,
        name: file.path.split('/').pop() || file.path,
        path: file.path,
        fileId: file.id,
        symbolId: null,
      };
    }

    throw ApiErrors.badRequest('EVIDENCE_SUBJECT_REQUIRED', 'Choose a file or symbol');
  }

  private async requireRepository(
    workspaceId: string,
    repositoryId: string,
  ): Promise<{ lastEvidenceRevision: string | null; currentRevision: string | null }> {
    const repository = await this.prisma.repository.findFirst({
      where: { id: repositoryId, workspaceId, deletedAt: null },
      select: { lastEvidenceRevision: true, currentRevision: true },
    });
    if (!repository) {
      throw ApiErrors.notFound('REPOSITORY_NOT_FOUND', 'Repository not found');
    }
    return repository;
  }
}

function toItem(row: {
  id: string;
  kind: string;
  method: string;
  subjectType: string;
  subjectId: string;
  confidence: number;
  excerpt: string | null;
  details: unknown;
  commit: { sha: string; message: string; authorName: string; committedAt: Date } | null;
}): EvidenceItemDto {
  return {
    id: row.id,
    kind: row.kind,
    method: row.method,
    subjectType: row.subjectType,
    subjectId: row.subjectId,
    confidence: row.confidence,
    confidenceLabel: evidenceConfidenceLabel(row.confidence),
    excerpt: row.excerpt,
    details: asDetails(row.details),
    commit: row.commit,
  };
}

function toTimeline(items: EvidenceItemDto[]): EvolutionEventDto[] {
  const seen = new Set<string>();
  const events: EvolutionEventDto[] = [];
  for (const item of items) {
    if (!item.commit || seen.has(item.commit.sha)) {
      continue;
    }
    seen.add(item.commit.sha);
    const details = item.details;
    events.push({
      sha: item.commit.sha,
      message: item.commit.message,
      authorName: item.commit.authorName,
      committedAt: item.commit.committedAt,
      method: item.method,
      confidence: item.confidence,
      confidenceLabel: item.confidenceLabel,
      changeType: typeof details.changeType === 'string' ? details.changeType : null,
      additions: asNumber(details.additions),
      deletions: asNumber(details.deletions),
      overlapLines: asNumber(details.overlapLines),
    });
  }
  return events;
}

function commitTime(item: EvidenceItemDto): number {
  return item.commit ? new Date(item.commit.committedAt).getTime() : 0;
}

function asDetails(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}
