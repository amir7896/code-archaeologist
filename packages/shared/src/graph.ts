/** A directed link between two node ids. */
export type DirectedLink = {
  from: string;
  to: string;
};

/** Folders that usually hold the real package names one level down. */
const NESTED_ROOTS = new Set(['src', 'app', 'lib', 'pkg', 'packages', 'internal', 'cmd', 'apps']);

export type ModuleGrouping = 'auto' | 1 | 2 | 3;

export function parseModuleGrouping(value?: string): ModuleGrouping {
  if (value === '1' || value === '2' || value === '3') {
    return Number(value) as 1 | 2 | 3;
  }
  return 'auto';
}

/**
 * Collapse a file path to a stable architecture-map node.
 * `alembic/env.py` → `alembic`, `src/auth/login.ts` → `src/auth`.
 * Pass 1–3 to force that many path segments for large-repo aggregation.
 */
export function moduleKey(path: string, grouping: ModuleGrouping = 'auto'): string {
  const parts = path.replaceAll('\\', '/').split('/').filter(Boolean);
  if (parts.length === 0) {
    return path || '(root)';
  }
  if (grouping !== 'auto') {
    return parts.slice(0, Math.min(grouping, parts.length)).join('/');
  }
  if (parts.length === 1) {
    return parts[0];
  }
  if (NESTED_ROOTS.has(parts[0])) {
    return `${parts[0]}/${parts[1]}`;
  }
  return parts[0];
}

/**
 * Strongly connected components that are real cycles (size > 1 or a self-loop).
 * Tarjan, O(V + E), deterministic node order inside each cycle.
 */
export function findCycles(links: DirectedLink[]): string[][] {
  const nodes = new Set<string>();
  const outgoing = new Map<string, string[]>();
  for (const { from, to } of links) {
    nodes.add(from);
    nodes.add(to);
    const next = outgoing.get(from);
    if (next) {
      next.push(to);
    } else {
      outgoing.set(from, [to]);
    }
  }

  let index = 0;
  const indices = new Map<string, number>();
  const lowlink = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const cycles: string[][] = [];

  function strongConnect(node: string): void {
    indices.set(node, index);
    lowlink.set(node, index);
    index += 1;
    stack.push(node);
    onStack.add(node);

    for (const next of outgoing.get(node) ?? []) {
      if (!indices.has(next)) {
        strongConnect(next);
        lowlink.set(node, Math.min(lowlink.get(node) ?? 0, lowlink.get(next) ?? 0));
      } else if (onStack.has(next)) {
        lowlink.set(node, Math.min(lowlink.get(node) ?? 0, indices.get(next) ?? 0));
      }
    }

    if (lowlink.get(node) !== indices.get(node)) {
      return;
    }

    const component: string[] = [];
    let popped: string;
    do {
      popped = stack.pop() ?? node;
      onStack.delete(popped);
      component.push(popped);
    } while (popped !== node);

    const selfLoop = (outgoing.get(node) ?? []).includes(node);
    if (component.length > 1 || selfLoop) {
      cycles.push(component.sort((left, right) => left.localeCompare(right)));
    }
  }

  for (const node of [...nodes].sort((left, right) => left.localeCompare(right))) {
    if (!indices.has(node)) {
      strongConnect(node);
    }
  }
  return cycles;
}

/** Hard stop so a hub file cannot walk the whole repository. */
export const GRAPH_WALK_CAP = 400;

/** Breadth-first walk. `start` is omitted from the result. */
export function walkNeighbors(
  links: DirectedLink[],
  start: string,
  direction: 'out' | 'in',
  maxDepth: number,
  maxNodes = GRAPH_WALK_CAP,
): Array<{ id: string; depth: number }> {
  const depthLimit = Math.max(1, maxDepth);
  const nodeLimit = Math.max(1, maxNodes);
  const adjacency = new Map<string, string[]>();
  for (const { from, to } of links) {
    const origin = direction === 'out' ? from : to;
    const target = direction === 'out' ? to : from;
    const next = adjacency.get(origin);
    if (next) {
      next.push(target);
    } else {
      adjacency.set(origin, [target]);
    }
  }

  const seen = new Set<string>([start]);
  const found: Array<{ id: string; depth: number }> = [];
  const queue: Array<{ id: string; depth: number }> = [{ id: start, depth: 0 }];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || current.depth >= depthLimit) {
      continue;
    }
    for (const next of adjacency.get(current.id) ?? []) {
      if (seen.has(next)) {
        continue;
      }
      seen.add(next);
      const hop = { id: next, depth: current.depth + 1 };
      found.push(hop);
      if (found.length >= nodeLimit) {
        return found;
      }
      queue.push(hop);
    }
  }
  return found;
}
