import { Inject, Injectable } from '@nestjs/common';
import { findCycles, moduleKey, walkNeighbors } from '@code-archaeologist/shared';
import { ApiErrors } from '../common/api-exception';
import { PrismaService } from '../database/prisma.service';
import {
  type GraphCyclesResponseDto,
  type GraphMapResponseDto,
  type GraphNeighborsResponseDto,
  type GraphWalkQueryDto,
} from './dto/graph.dto';

type FileRow = { id: string; path: string };
type FileEdgeRow = { sourceId: string; targetId: string | null; confidence: number };

@Injectable()
export class GraphService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getMap(workspaceId: string, repositoryId: string): Promise<GraphMapResponseDto> {
    const repository = await this.requireRepository(workspaceId, repositoryId);
    const [files, edges, unresolvedImportCount] = await Promise.all([
      this.prisma.repoFile.findMany({
        where: { repositoryId },
        select: { id: true, path: true },
        orderBy: { path: 'asc' },
      }),
      this.loadFileDependsOn(repositoryId),
      this.prisma.graphEdge.count({
        where: { repositoryId, type: 'IMPORTS', targetId: null },
      }),
    ]);

    const grouped = groupModules(files, edges);
    const cycleNodes = new Set(grouped.cycles.flatMap((cycle) => cycle.nodes));

    return {
      revision: repository.lastGraphRevision,
      modules: grouped.modules.map((module) => ({
        ...module,
        inCycle: cycleNodes.has(module.id),
      })),
      edges: grouped.edges,
      cycles: grouped.cycles,
      stats: {
        fileCount: files.length,
        moduleCount: grouped.modules.length,
        edgeCount: grouped.edges.length,
        cycleCount: grouped.cycles.length,
        unresolvedImportCount,
      },
    };
  }

  async getDependencies(
    workspaceId: string,
    repositoryId: string,
    query: GraphWalkQueryDto,
  ): Promise<GraphNeighborsResponseDto> {
    return this.walk(workspaceId, repositoryId, query, 'out');
  }

  async getDependents(
    workspaceId: string,
    repositoryId: string,
    query: GraphWalkQueryDto,
  ): Promise<GraphNeighborsResponseDto> {
    return this.walk(workspaceId, repositoryId, query, 'in');
  }

  async getCycles(workspaceId: string, repositoryId: string): Promise<GraphCyclesResponseDto> {
    await this.requireRepository(workspaceId, repositoryId);
    const [files, edges] = await Promise.all([
      this.prisma.repoFile.findMany({
        where: { repositoryId },
        select: { id: true, path: true },
      }),
      this.loadFileDependsOn(repositoryId),
    ]);
    const filesById = new Map(files.map((file) => [file.id, file]));
    const fileLinks = toFileLinks(edges);
    const grouped = groupModules(files, edges);

    return {
      modules: grouped.cycles,
      files: findCycles(fileLinks).map((nodes, index) => ({
        id: `file-cycle-${index + 1}`,
        nodes: nodes
          .map((id) => filesById.get(id))
          .filter((file): file is FileRow => Boolean(file))
          .map((file) => ({ id: file.id, path: file.path })),
      })),
    };
  }

  private async walk(
    workspaceId: string,
    repositoryId: string,
    query: GraphWalkQueryDto,
    direction: 'out' | 'in',
  ): Promise<GraphNeighborsResponseDto> {
    await this.requireRepository(workspaceId, repositoryId);
    const file = await this.prisma.repoFile.findFirst({
      where: { id: query.fileId, repositoryId },
      select: { id: true, path: true },
    });
    if (!file) {
      throw ApiErrors.notFound('FILE_NOT_FOUND', 'File not found');
    }

    const depth = query.depth || 2;
    const edges = await this.loadFileDependsOn(repositoryId);
    const neighborIds = uniqueIds(edges);
    const neighbors =
      neighborIds.length === 0
        ? []
        : await this.prisma.repoFile.findMany({
            where: { repositoryId, id: { in: neighborIds } },
            select: { id: true, path: true },
          });
    const filesById = new Map(neighbors.map((row) => [row.id, row]));
    filesById.set(file.id, file);

    const items = walkNeighbors(toFileLinks(edges), file.id, direction, depth)
      .map((hop) => {
        const neighbor = filesById.get(hop.id);
        return neighbor ? { fileId: neighbor.id, path: neighbor.path, depth: hop.depth } : null;
      })
      .filter((item): item is { fileId: string; path: string; depth: number } => Boolean(item));

    return {
      fileId: file.id,
      path: file.path,
      direction: direction === 'out' ? 'dependencies' : 'dependents',
      depth,
      items,
    };
  }

  private async loadFileDependsOn(repositoryId: string): Promise<FileEdgeRow[]> {
    return this.prisma.graphEdge.findMany({
      where: {
        repositoryId,
        type: 'DEPENDS_ON',
        sourceType: 'FILE',
        targetType: 'FILE',
      },
      select: { sourceId: true, targetId: true, confidence: true },
    });
  }

  private async requireRepository(
    workspaceId: string,
    repositoryId: string,
  ): Promise<{ lastGraphRevision: string | null; currentRevision: string | null }> {
    const repository = await this.prisma.repository.findFirst({
      where: { id: repositoryId, workspaceId, deletedAt: null },
      select: { lastGraphRevision: true, currentRevision: true },
    });
    if (!repository) {
      throw ApiErrors.notFound('REPOSITORY_NOT_FOUND', 'Repository not found');
    }
    return repository;
  }
}

function toFileLinks(edges: FileEdgeRow[]) {
  return edges
    .filter((edge): edge is FileEdgeRow & { targetId: string } => Boolean(edge.targetId))
    .map((edge) => ({ from: edge.sourceId, to: edge.targetId }));
}

function uniqueIds(edges: FileEdgeRow[]): string[] {
  const ids = new Set<string>();
  for (const edge of edges) {
    ids.add(edge.sourceId);
    if (edge.targetId) {
      ids.add(edge.targetId);
    }
  }
  return [...ids];
}

function groupModules(files: FileRow[], edges: FileEdgeRow[]) {
  const modules = new Map<string, { id: string; path: string; files: FileRow[] }>();
  for (const file of files) {
    const id = moduleKey(file.path);
    const bucket = modules.get(id) ?? { id, path: id, files: [] };
    bucket.files.push(file);
    modules.set(id, bucket);
  }

  const fileModule = new Map(files.map((file) => [file.id, moduleKey(file.path)]));
  const links = new Map<string, { sourceId: string; targetId: string; weight: number; confidence: number }>();
  for (const edge of edges) {
    if (!edge.targetId) {
      continue;
    }
    const sourceId = fileModule.get(edge.sourceId);
    const targetId = fileModule.get(edge.targetId);
    if (!sourceId || !targetId || sourceId === targetId) {
      continue;
    }
    const key = `${sourceId}\0${targetId}`;
    const existing = links.get(key);
    if (existing) {
      existing.weight += 1;
      existing.confidence = Math.max(existing.confidence, edge.confidence);
    } else {
      links.set(key, { sourceId, targetId, weight: 1, confidence: edge.confidence });
    }
  }

  const fanIn = new Map<string, number>();
  const fanOut = new Map<string, number>();
  for (const link of links.values()) {
    fanOut.set(link.sourceId, (fanOut.get(link.sourceId) ?? 0) + 1);
    fanIn.set(link.targetId, (fanIn.get(link.targetId) ?? 0) + 1);
  }

  const cycles = findCycles(
    [...links.values()].map((link) => ({ from: link.sourceId, to: link.targetId })),
  ).map((nodes, index) => ({ id: `cycle-${index + 1}`, nodes }));

  return {
    modules: [...modules.values()]
      .map((module) => ({
        id: module.id,
        path: module.path,
        fileCount: module.files.length,
        fanIn: fanIn.get(module.id) ?? 0,
        fanOut: fanOut.get(module.id) ?? 0,
        files: module.files,
      }))
      .sort((left, right) => left.path.localeCompare(right.path)),
    edges: [...links.values()]
      .map((link) => ({ ...link, type: 'DEPENDS_ON' }))
      .sort((left, right) =>
        left.sourceId === right.sourceId
          ? left.targetId.localeCompare(right.targetId)
          : left.sourceId.localeCompare(right.sourceId),
      ),
    cycles,
  };
}
