import { Inject, Injectable } from '@nestjs/common';
import { complexityLabel, couplingLabel, hotspotScore, moduleKey } from '@code-archaeologist/shared';
import { ApiErrors } from '../common/api-exception';
import { PrismaService } from '../database/prisma.service';
import {
  type DnaHealthResponseDto,
  type DnaProfileResponseDto,
  type DnaQueryDto,
  type InsightListResponseDto,
  type InsightsQueryDto,
} from './dto/dna.dto';

const RISK_LEVELS = new Set(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

@Injectable()
export class DnaService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getProfile(
    workspaceId: string,
    repositoryId: string,
    query: DnaQueryDto,
  ): Promise<DnaProfileResponseDto> {
    await this.requireRepository(workspaceId, repositoryId);
    if (query.symbolId) {
      return this.symbolProfile(repositoryId, query.symbolId);
    }
    if (query.module?.trim()) {
      return this.moduleProfile(repositoryId, query.module.trim());
    }
    if (query.fileId) {
      return this.fileProfile(repositoryId, query.fileId);
    }
    throw ApiErrors.badRequest('DNA_SUBJECT_REQUIRED', 'Choose a file, symbol, or folder');
  }

  async listHotspots(
    workspaceId: string,
    repositoryId: string,
    query: InsightsQueryDto,
  ): Promise<InsightListResponseDto> {
    await this.requireRepository(workspaceId, repositoryId);
    const items = await this.fileInsights(repositoryId);
    const ranked = items
      .map((item) => ({ ...item, hotspot: hotspotScore(item) }))
      .sort((left, right) => right.hotspot - left.hotspot)
      .slice(0, query.limit || 20);
    return { items: ranked.map(toInsight) };
  }

  async listRisks(
    workspaceId: string,
    repositoryId: string,
    query: InsightsQueryDto,
  ): Promise<InsightListResponseDto> {
    await this.requireRepository(workspaceId, repositoryId);
    const level = query.level?.trim().toUpperCase();
    const items = (await this.fileInsights(repositoryId))
      .filter((item) => !level || !RISK_LEVELS.has(level) || item.level === level)
      .sort((left, right) => right.score - left.score)
      .slice(0, query.limit || 20);
    return { items: items.map(toInsight) };
  }

  async getHealth(workspaceId: string, repositoryId: string): Promise<DnaHealthResponseDto> {
    const repository = await this.requireRepository(workspaceId, repositoryId);
    const [fileCount, highRiskCount, files] = await Promise.all([
      this.prisma.repoFile.count({ where: { repositoryId } }),
      this.prisma.riskScore.count({
        where: { repositoryId, subjectType: 'FILE', level: { in: ['HIGH', 'CRITICAL'] } },
      }),
      this.prisma.repoFile.findMany({
        where: { repositoryId, complexity: { not: null } },
        select: { complexity: true },
      }),
    ]);
    const complexitySum = files.reduce((sum, file) => sum + (file.complexity ?? 0), 0);
    return {
      revision: repository.lastDnaRevision,
      fileCount,
      hotspotCount: highRiskCount,
      highRiskCount,
      averageComplexity: files.length === 0 ? 0 : Number((complexitySum / files.length).toFixed(1)),
    };
  }

  private async fileProfile(repositoryId: string, fileId: string): Promise<DnaProfileResponseDto> {
    const file = await this.prisma.repoFile.findFirst({
      where: { id: fileId, repositoryId },
    });
    if (!file) {
      throw ApiErrors.notFound('FILE_NOT_FOUND', 'File not found');
    }
    const [risk, fan, history, versions] = await Promise.all([
      this.loadRisk(repositoryId, 'FILE', file.id),
      this.fileFan(repositoryId, file.id),
      this.fileHistory(file.id),
      this.fileVersions(file.id),
    ]);
    return {
      subjectType: 'FILE',
      subjectId: file.id,
      name: file.path.split('/').pop() || file.path,
      path: file.path,
      firstRevision: history.firstSha ?? file.firstRevision,
      lastRevision: history.lastSha ?? file.lastRevision,
      firstSeenAt: history.firstAt,
      lastChangedAt: history.lastAt,
      changeCount: history.changeCount,
      fanIn: fan.in,
      fanOut: fan.out,
      complexity: file.complexity ?? 0,
      loc: file.loc ?? 0,
      dependencyCount: fan.out,
      coupling: couplingLabel(fan.in, fan.out),
      complexityLabel: complexityLabel(file.complexity ?? 0),
      risk,
      contributors: history.contributors,
      versions,
      relatedCommits: history.commits,
    };
  }

  private async symbolProfile(repositoryId: string, symbolId: string): Promise<DnaProfileResponseDto> {
    const symbol = await this.prisma.codeSymbol.findFirst({
      where: { id: symbolId, file: { repositoryId } },
      include: { file: true },
    });
    if (!symbol) {
      throw ApiErrors.notFound('SYMBOL_NOT_FOUND', 'Symbol not found');
    }
    const [risk, fan, history, versions] = await Promise.all([
      this.loadRisk(repositoryId, 'SYMBOL', symbol.id),
      this.symbolFan(repositoryId, symbol.id),
      this.fileHistory(symbol.fileId),
      this.fileVersions(symbol.fileId, symbol.qualifiedName),
    ]);
    return {
      subjectType: 'SYMBOL',
      subjectId: symbol.id,
      name: symbol.name,
      path: symbol.file.path,
      firstRevision: history.firstSha ?? symbol.file.firstRevision,
      lastRevision: history.lastSha ?? symbol.file.lastRevision,
      firstSeenAt: history.firstAt,
      lastChangedAt: history.lastAt,
      changeCount: history.changeCount,
      fanIn: fan.in,
      fanOut: fan.out,
      complexity: symbol.complexity,
      loc: symbol.loc,
      dependencyCount: fan.out,
      coupling: couplingLabel(fan.in, fan.out),
      complexityLabel: complexityLabel(symbol.complexity),
      risk,
      contributors: history.contributors,
      versions,
      relatedCommits: history.commits,
    };
  }

  private async moduleProfile(repositoryId: string, module: string): Promise<DnaProfileResponseDto> {
    const files = await this.prisma.repoFile.findMany({ where: { repositoryId } });
    const members = files.filter((file) => moduleKey(file.path) === module);
    if (members.length === 0) {
      throw ApiErrors.notFound('MODULE_NOT_FOUND', 'Folder not found');
    }
    const ids = members.map((file) => file.id);
    const [risk, edges, history] = await Promise.all([
      this.loadRisk(repositoryId, 'MODULE', module),
      this.prisma.graphEdge.findMany({
        where: {
          repositoryId,
          type: 'DEPENDS_ON',
          sourceType: 'FILE',
          targetType: 'FILE',
          OR: [{ sourceId: { in: ids } }, { targetId: { in: ids } }],
        },
        select: { sourceId: true, targetId: true },
      }),
      this.filesHistory(ids),
    ]);
    const memberSet = new Set(ids);
    const fanIn = edges.filter((edge) => edge.targetId && memberSet.has(edge.targetId) && !memberSet.has(edge.sourceId))
      .length;
    const fanOut = edges.filter((edge) => memberSet.has(edge.sourceId) && edge.targetId && !memberSet.has(edge.targetId))
      .length;
    const complexity = members.reduce((sum, file) => sum + (file.complexity ?? 0), 0);
    const loc = members.reduce((sum, file) => sum + (file.loc ?? 0), 0);
    return {
      subjectType: 'MODULE',
      subjectId: module,
      name: module,
      path: module,
      firstRevision: history.firstSha,
      lastRevision: history.lastSha,
      firstSeenAt: history.firstAt,
      lastChangedAt: history.lastAt,
      changeCount: history.changeCount,
      fanIn,
      fanOut,
      complexity,
      loc,
      dependencyCount: fanOut,
      coupling: couplingLabel(fanIn, fanOut),
      complexityLabel: complexityLabel(complexity),
      risk,
      contributors: history.contributors,
      versions: [],
      relatedCommits: history.commits,
    };
  }

  private async fileInsights(repositoryId: string) {
    const [files, risks, edges, history] = await Promise.all([
      this.prisma.repoFile.findMany({
        where: { repositoryId },
        select: { id: true, path: true, complexity: true },
      }),
      this.prisma.riskScore.findMany({
        where: { repositoryId, subjectType: 'FILE' },
        select: { subjectId: true, score: true, level: true, factors: true },
      }),
      this.prisma.graphEdge.findMany({
        where: { repositoryId, type: 'DEPENDS_ON', sourceType: 'FILE', targetType: 'FILE' },
        select: { sourceId: true, targetId: true },
      }),
      this.prisma.commitFile.groupBy({
        by: ['fileId'],
        where: { file: { repositoryId } },
        _count: { fileId: true },
      }),
    ]);
    const riskById = new Map(risks.map((row) => [row.subjectId, row]));
    const changeById = new Map(history.map((row) => [row.fileId, row._count.fileId]));
    const fanIn = new Map<string, number>();
    for (const edge of edges) {
      if (edge.targetId) {
        fanIn.set(edge.targetId, (fanIn.get(edge.targetId) ?? 0) + 1);
      }
    }
    return files.map((file) => {
      const risk = riskById.get(file.id);
      return {
        subjectType: 'FILE' as const,
        subjectId: file.id,
        name: file.path.split('/').pop() || file.path,
        path: file.path,
        score: risk?.score ?? 0,
        level: risk?.level ?? 'LOW',
        changeCount: changeById.get(file.id) ?? 0,
        complexity: file.complexity ?? 0,
        fanIn: fanIn.get(file.id) ?? 0,
      };
    });
  }

  private async loadRisk(repositoryId: string, subjectType: 'FILE' | 'SYMBOL' | 'MODULE', subjectId: string) {
    const row = await this.prisma.riskScore.findUnique({
      where: { repositoryId_subjectType_subjectId: { repositoryId, subjectType, subjectId } },
    });
    const factors = Array.isArray(row?.factors) ? row.factors : [];
    return {
      score: row?.score ?? 0,
      level: row?.level ?? 'LOW',
      evidenceConfidence: row?.evidenceConfidence ?? 0,
      factors: factors as Array<{
        key: string;
        label: string;
        raw: number;
        normalized: number;
        weight: number;
        contribution: number;
      }>,
    };
  }

  private async fileFan(repositoryId: string, fileId: string) {
    const [out, incoming] = await Promise.all([
      this.prisma.graphEdge.count({
        where: { repositoryId, type: 'DEPENDS_ON', sourceType: 'FILE', sourceId: fileId },
      }),
      this.prisma.graphEdge.count({
        where: { repositoryId, type: 'DEPENDS_ON', targetType: 'FILE', targetId: fileId },
      }),
    ]);
    return { in: incoming, out };
  }

  private async symbolFan(repositoryId: string, symbolId: string) {
    const [out, incoming] = await Promise.all([
      this.prisma.graphEdge.count({
        where: {
          repositoryId,
          sourceType: 'SYMBOL',
          sourceId: symbolId,
          type: { in: ['IMPORTS', 'CALLS', 'REFERENCES', 'EXTENDS', 'IMPLEMENTS'] },
        },
      }),
      this.prisma.graphEdge.count({
        where: {
          repositoryId,
          targetType: 'SYMBOL',
          targetId: symbolId,
          type: { in: ['IMPORTS', 'CALLS', 'REFERENCES', 'EXTENDS', 'IMPLEMENTS'] },
        },
      }),
    ]);
    return { in: incoming, out };
  }

  private async fileHistory(fileId: string) {
    return this.filesHistory([fileId]);
  }

  private async filesHistory(fileIds: string[]) {
    if (fileIds.length === 0) {
      return emptyHistory();
    }
    const rows = await this.prisma.commitFile.findMany({
      where: { fileId: { in: fileIds } },
      include: { commit: true },
      orderBy: { commit: { committedAt: 'desc' } },
      take: 80,
    });
    const contributors = new Map<string, { name: string; email: string; commits: number }>();
    const commits: Array<{ sha: string; message: string; authorName: string; committedAt: Date }> = [];
    const seen = new Set<string>();
    for (const row of rows) {
      const key = row.commit.authorEmail.toLowerCase();
      const current = contributors.get(key);
      if (current) {
        current.commits += 1;
      } else {
        contributors.set(key, {
          name: row.commit.authorName,
          email: row.commit.authorEmail,
          commits: 1,
        });
      }
      if (!seen.has(row.commit.sha) && commits.length < 8) {
        seen.add(row.commit.sha);
        commits.push({
          sha: row.commit.sha,
          message: row.commit.message,
          authorName: row.commit.authorName,
          committedAt: row.commit.committedAt,
        });
      }
    }
    const oldest = rows.at(-1)?.commit;
    const newest = rows[0]?.commit;
    return {
      changeCount: rows.length,
      contributors: [...contributors.values()].sort((left, right) => right.commits - left.commits),
      commits,
      firstAt: oldest?.committedAt ?? null,
      lastAt: newest?.committedAt ?? null,
      firstSha: oldest?.sha ?? null,
      lastSha: newest?.sha ?? null,
    };
  }

  private async fileVersions(fileId: string, qualifiedName?: string) {
    return this.prisma.symbolVersion.findMany({
      where: { fileId, ...(qualifiedName ? { qualifiedName } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { commit: { select: { committedAt: true } } },
    }).then((rows) =>
      rows.map((row) => ({
        revision: row.revision,
        changeType: row.changeType,
        loc: row.loc,
        complexity: row.complexity,
        committedAt: row.commit?.committedAt ?? null,
      })),
    );
  }

  private async requireRepository(workspaceId: string, repositoryId: string) {
    const repository = await this.prisma.repository.findFirst({
      where: { id: repositoryId, workspaceId, deletedAt: null },
      select: { lastDnaRevision: true },
    });
    if (!repository) {
      throw ApiErrors.notFound('REPOSITORY_NOT_FOUND', 'Repository not found');
    }
    return repository;
  }
}

function emptyHistory() {
  return {
    changeCount: 0,
    contributors: [],
    commits: [],
    firstAt: null,
    lastAt: null,
    firstSha: null,
    lastSha: null,
  };
}

function toInsight(item: {
  subjectType: string;
  subjectId: string;
  name: string;
  path: string | null;
  score: number;
  level: string;
  changeCount: number;
  complexity: number;
  fanIn: number;
}) {
  return {
    subjectType: item.subjectType,
    subjectId: item.subjectId,
    name: item.name,
    path: item.path,
    score: item.score,
    level: item.level,
    changeCount: item.changeCount,
    complexity: item.complexity,
    fanIn: item.fanIn,
  };
}
