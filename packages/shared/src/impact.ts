import { clamp01 } from './risk';
import { moduleKey } from './graph';

export const IMPACT_DEPTH_DEFAULT = 2;
export const IMPACT_DEPTH_MIN = 1;
export const IMPACT_DEPTH_MAX = 6;
/** Hard stop per direction so a hub file cannot hydrate the whole repository. */
export const IMPACT_WALK_CAP = 400;
/** Rows returned in each impact list. Stats still use the full walked set. */
export const IMPACT_LIST_LIMIT = 80;

export type FileRole = 'file' | 'test' | 'endpoint';
export type ImpactHopDirection = 'consumer' | 'dependency';

export type WeightedLink = {
  from: string;
  to: string;
  confidence?: number;
};

export type ImpactHop = {
  id: string;
  depth: number;
  confidence: number;
};

export type BlastWalk = {
  consumers: ImpactHop[];
  dependencies: ImpactHop[];
  truncated: boolean;
};

const TEST_PATH =
  /(^|\/)(__tests__|tests?|spec)(\/|$)|[._-](test|spec)\.[^./]+$|_test\.[^./]+$|Test\.(ts|tsx|js|jsx|py|go)$/i;
const ENDPOINT_PATH =
  /(^|\/)(controllers?|routes?|routers?|handlers?|endpoints?)(\/|$)|(controller|router|routes)\.[^./]+$/i;

export function clampImpactDepth(value?: number): number {
  if (value === undefined || Number.isNaN(value)) {
    return IMPACT_DEPTH_DEFAULT;
  }
  return Math.min(IMPACT_DEPTH_MAX, Math.max(IMPACT_DEPTH_MIN, Math.trunc(value)));
}

export function classifyFileRole(path: string): FileRole {
  const normalized = path.replaceAll('\\', '/');
  if (TEST_PATH.test(normalized)) {
    return 'test';
  }
  if (ENDPOINT_PATH.test(normalized)) {
    return 'endpoint';
  }
  return 'file';
}

/** Closer hops and higher risk rank first. */
export function impactPriority(depth: number, riskScore: number): number {
  return (IMPACT_DEPTH_MAX + 1 - depth) * 100 + riskScore;
}

/**
 * One pass over the edges, then two bounded BFS walks.
 * Consumers = files that depend on `start`. Dependencies = files `start` depends on.
 */
export function walkBlastRadius(
  links: WeightedLink[],
  start: string,
  maxDepth: number,
  cap = IMPACT_WALK_CAP,
): BlastWalk {
  const depthLimit = clampImpactDepth(maxDepth);
  const outgoing = new Map<string, Array<{ id: string; confidence: number }>>();
  const incoming = new Map<string, Array<{ id: string; confidence: number }>>();

  for (const link of links) {
    if (!link.from || !link.to) {
      continue;
    }
    const confidence = clamp01(link.confidence ?? 1);
    addAdjacency(outgoing, link.from, link.to, confidence);
    addAdjacency(incoming, link.to, link.from, confidence);
  }
  sortAdjacency(outgoing);
  sortAdjacency(incoming);

  const consumers = walkDirected(incoming, start, depthLimit, cap);
  const dependencies = walkDirected(outgoing, start, depthLimit, cap);
  return {
    consumers: consumers.hops,
    dependencies: dependencies.hops,
    truncated: consumers.truncated || dependencies.truncated,
  };
}

export function groupImpactModules(
  files: Array<{ path: string; direction: ImpactHopDirection }>,
): Array<{ id: string; path: string; consumerCount: number; dependencyCount: number }> {
  const modules = new Map<string, { id: string; path: string; consumerCount: number; dependencyCount: number }>();
  for (const file of files) {
    const id = moduleKey(file.path);
    const bucket = modules.get(id) ?? { id, path: id, consumerCount: 0, dependencyCount: 0 };
    if (file.direction === 'consumer') {
      bucket.consumerCount += 1;
    } else {
      bucket.dependencyCount += 1;
    }
    modules.set(id, bucket);
  }
  return [...modules.values()].sort((left, right) => {
    const touch = right.consumerCount + right.dependencyCount - (left.consumerCount + left.dependencyCount);
    return touch !== 0 ? touch : left.path.localeCompare(right.path);
  });
}

function addAdjacency(
  map: Map<string, Array<{ id: string; confidence: number }>>,
  from: string,
  to: string,
  confidence: number,
): void {
  const next = map.get(from);
  if (!next) {
    map.set(from, [{ id: to, confidence }]);
    return;
  }
  const existing = next.find((item) => item.id === to);
  if (existing) {
    existing.confidence = Math.max(existing.confidence, confidence);
    return;
  }
  next.push({ id: to, confidence });
}

function sortAdjacency(map: Map<string, Array<{ id: string; confidence: number }>>): void {
  for (const list of map.values()) {
    list.sort((left, right) => left.id.localeCompare(right.id));
  }
}

function walkDirected(
  adjacency: Map<string, Array<{ id: string; confidence: number }>>,
  start: string,
  depthLimit: number,
  cap: number,
): { hops: ImpactHop[]; truncated: boolean } {
  const seen = new Set<string>([start]);
  const hops: ImpactHop[] = [];
  const queue: ImpactHop[] = [{ id: start, depth: 0, confidence: 1 }];
  let truncated = false;

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || current.depth >= depthLimit) {
      continue;
    }
    for (const edge of adjacency.get(current.id) ?? []) {
      if (seen.has(edge.id)) {
        continue;
      }
      if (hops.length >= cap) {
        truncated = true;
        return { hops, truncated };
      }
      seen.add(edge.id);
      const hop: ImpactHop = {
        id: edge.id,
        depth: current.depth + 1,
        confidence: Number(Math.min(current.confidence, edge.confidence).toFixed(3)),
      };
      hops.push(hop);
      queue.push(hop);
    }
  }
  return { hops, truncated };
}
