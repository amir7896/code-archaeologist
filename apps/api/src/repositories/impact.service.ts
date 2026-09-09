import { Inject, Injectable } from '@nestjs/common';
import {
  IMPACT_LIST_LIMIT,
  classifyFileRole,
  clampImpactDepth,
  groupImpactModules,
  impactPriority,
  moduleKey,
  walkBlastRadius,
} from '@code-archaeologist/shared';
import { ApiErrors } from '../common/api-exception';
import { PrismaService } from '../database/prisma.service';
import { loadFileDependencyLinks } from './file-graph';
import {
  type ImpactNodeDto,
  type ImpactQueryDto,
  type ImpactResponseDto,
} from './dto/impact.dto';

type FileRow = { id: string; path: string; complexity: number | null };
type RiskRow = { subjectId: string; score: number; level: string };
type Origin = {
  subjectType: 'FILE' | 'SYMBOL';
  subjectId: string;
  name: string;
  path: string;
  fileId: string;
  symbolId: string | null;
};

@Injectable()
export class ImpactService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async analyze(
    workspaceId: string,
    repositoryId: string,
    query: ImpactQueryDto,
  ): Promise<ImpactResponseDto> {
    const repository = await this.requireRepository(workspaceId, repositoryId);
    const origin = await this.resolveOrigin(repositoryId, query);
    const depth = clampImpactDepth(query.depth);
    const edges = await loadFileDependencyLinks(this.prisma, repositoryId);
    const walk = walkBlastRadius(
      edges.map((edge) => ({ from: edge.sourceId, to: edge.targetId, confidence: edge.confidence })),
      origin.fileId,
      depth,
    );

    const hops = new Map<string, { depth: number; confidence: number; direction: 'consumer' | 'dependency' }>();
    for (const hop of walk.consumers) {
      hops.set(hop.id, { depth: hop.depth, confidence: hop.confidence, direction: 'consumer' });
    }
    for (const hop of walk.dependencies) {
      const existing = hops.get(hop.id);
      if (!existing || hop.depth < existing.depth) {
        hops.set(hop.id, { depth: hop.depth, confidence: hop.confidence, direction: 'dependency' });
      }
    }

    const ids = [origin.fileId, ...hops.keys()];
    const [files, risks] = await Promise.all([
      this.prisma.repoFile.findMany({
        where: { repositoryId, id: { in: ids } },
        select: { id: true, path: true, complexity: true },
      }),
      this.prisma.riskScore.findMany({
        where: { repositoryId, subjectType: 'FILE', subjectId: { in: ids } },
        select: { subjectId: true, score: true, level: true },
      }),
    ]);

    const filesById = new Map(files.map((file) => [file.id, file]));
    const riskById = new Map(risks.map((risk) => [risk.subjectId, risk]));
    if (!filesById.has(origin.fileId)) {
      throw ApiErrors.notFound('FILE_NOT_FOUND', 'File not found');
    }

    const consumers = toRankedNodes(walk.consumers, 'consumer', filesById, riskById);
    const dependencies = toRankedNodes(walk.dependencies, 'dependency', filesById, riskById);
    const overlays = [...consumers, ...dependencies];
    const tests = overlays.filter((node) => node.role === 'test');
    const endpoints = overlays.filter((node) => node.role === 'endpoint');
    const modules = groupImpactModules(
      overlays.map((node) => ({
        path: node.path,
        direction: node.direction as 'consumer' | 'dependency',
      })),
    );
    const originRisk = riskById.get(origin.fileId);
    const highRiskCount = countHighRisk(originRisk, overlays);

    return {
      revision: repository.lastGraphRevision,
      depth,
      origin: {
        subjectType: origin.subjectType,
        subjectId: origin.subjectId,
        name: origin.name,
        path: origin.path,
        fileId: origin.fileId,
        symbolId: origin.symbolId,
        riskScore: originRisk?.score ?? 0,
        riskLevel: originRisk?.level ?? 'LOW',
      },
      stats: {
        affectedFileCount: new Set([...walk.consumers, ...walk.dependencies].map((hop) => hop.id)).size,
        consumerCount: walk.consumers.length,
        dependencyCount: walk.dependencies.length,
        testCount: tests.length,
        endpointCount: endpoints.length,
        moduleCount: modules.length,
        highRiskCount,
        truncated: walk.truncated,
      },
      consumers: consumers.slice(0, IMPACT_LIST_LIMIT),
      dependencies: dependencies.slice(0, IMPACT_LIST_LIMIT),
      tests: tests.slice(0, IMPACT_LIST_LIMIT),
      endpoints: endpoints.slice(0, IMPACT_LIST_LIMIT),
      modules: modules.slice(0, IMPACT_LIST_LIMIT),
    };
  }

  private async resolveOrigin(repositoryId: string, query: ImpactQueryDto): Promise<Origin> {
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

    throw ApiErrors.badRequest('IMPACT_SUBJECT_REQUIRED', 'Choose a file or symbol');
  }

  private async requireRepository(
    workspaceId: string,
    repositoryId: string,
  ): Promise<{ lastGraphRevision: string | null }> {
    const repository = await this.prisma.repository.findFirst({
      where: { id: repositoryId, workspaceId, deletedAt: null },
      select: { lastGraphRevision: true },
    });
    if (!repository) {
      throw ApiErrors.notFound('REPOSITORY_NOT_FOUND', 'Repository not found');
    }
    return repository;
  }
}

function toRankedNodes(
  hops: Array<{ id: string; depth: number; confidence: number }>,
  direction: 'consumer' | 'dependency',
  filesById: Map<string, FileRow>,
  riskById: Map<string, RiskRow>,
): ImpactNodeDto[] {
  const nodes: ImpactNodeDto[] = [];
  for (const hop of hops) {
    const file = filesById.get(hop.id);
    if (!file) {
      continue;
    }
    const risk = riskById.get(file.id);
    nodes.push({
      fileId: file.id,
      path: file.path,
      depth: hop.depth,
      direction,
      role: classifyFileRole(file.path),
      module: moduleKey(file.path),
      riskScore: risk?.score ?? 0,
      riskLevel: risk?.level ?? 'LOW',
      complexity: file.complexity ?? 0,
      confidence: hop.confidence,
    });
  }
  return nodes.sort((left, right) => {
    const rank = impactPriority(right.depth, right.riskScore) - impactPriority(left.depth, left.riskScore);
    return rank !== 0 ? rank : left.path.localeCompare(right.path);
  });
}

function countHighRisk(origin: RiskRow | undefined, nodes: ImpactNodeDto[]): number {
  const seen = new Set<string>();
  let count = 0;
  if (origin && isHighRisk(origin.level)) {
    count += 1;
  }
  for (const node of nodes) {
    if (seen.has(node.fileId) || !isHighRisk(node.riskLevel)) {
      continue;
    }
    seen.add(node.fileId);
    count += 1;
  }
  return count;
}

function isHighRisk(level: string): boolean {
  return level === 'HIGH' || level === 'CRITICAL';
}
