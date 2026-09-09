export type GraphNodeKind = 'FILE' | 'SYMBOL';

export type GraphEdgeKind =
  | 'CONTAINS'
  | 'IMPORTS'
  | 'EXPORTS'
  | 'CALLS'
  | 'REFERENCES'
  | 'EXTENDS'
  | 'IMPLEMENTS'
  | 'DEPENDS_ON';

export type GraphSymbol = {
  id: string;
  fileId: string;
  parentSymbolId: string | null;
  qualifiedName: string;
};

export type GraphRelation = {
  sourceSymbolId: string;
  targetSymbolId: string | null;
  targetQualifiedName: string;
  type: string;
  confidence: number;
};

export type GraphEdgeDraft = {
  sourceType: GraphNodeKind;
  sourceId: string;
  targetType: GraphNodeKind;
  targetId: string | null;
  targetKey: string;
  type: GraphEdgeKind;
  confidence: number;
};

/** Cross-file edges that mean "this file depends on that file". */
const FILE_DEPENDS_ON_FROM = new Set(['IMPORTS', 'CALLS', 'EXTENDS', 'IMPLEMENTS']);

const EDGE_TYPES = new Set<GraphEdgeKind>([
  'CONTAINS',
  'IMPORTS',
  'EXPORTS',
  'CALLS',
  'REFERENCES',
  'EXTENDS',
  'IMPLEMENTS',
  'DEPENDS_ON',
]);

/**
 * Turn AST symbols and relations into a unique, derived edge list.
 * Containment is the file/symbol tree. File DEPENDS_ON is only stored
 * when both sides resolved to different files.
 */
export function collectGraphEdges(input: {
  symbols: GraphSymbol[];
  relations: GraphRelation[];
}): GraphEdgeDraft[] {
  const symbolsById = new Map(input.symbols.map((symbol) => [symbol.id, symbol]));
  const edges = new Map<string, GraphEdgeDraft>();

  for (const symbol of input.symbols) {
    if (symbol.parentSymbolId && symbolsById.has(symbol.parentSymbolId)) {
      addEdge(edges, {
        sourceType: 'SYMBOL',
        sourceId: symbol.parentSymbolId,
        targetType: 'SYMBOL',
        targetId: symbol.id,
        targetKey: symbol.id,
        type: 'CONTAINS',
        confidence: 1,
      });
      continue;
    }
    addEdge(edges, {
      sourceType: 'FILE',
      sourceId: symbol.fileId,
      targetType: 'SYMBOL',
      targetId: symbol.id,
      targetKey: symbol.id,
      type: 'CONTAINS',
      confidence: 1,
    });
  }

  for (const relation of input.relations) {
    const source = symbolsById.get(relation.sourceSymbolId);
    const type = asEdgeType(relation.type);
    if (!source || !type || type === 'CONTAINS' || type === 'DEPENDS_ON') {
      continue;
    }
    const target = relation.targetSymbolId ? symbolsById.get(relation.targetSymbolId) : undefined;
    const targetKey = target?.id ?? relation.targetQualifiedName.trim();
    if (!targetKey) {
      continue;
    }

    addEdge(edges, {
      sourceType: 'SYMBOL',
      sourceId: source.id,
      targetType: 'SYMBOL',
      targetId: target?.id ?? null,
      targetKey,
      type,
      confidence: clampConfidence(relation.confidence),
    });

    if (target && FILE_DEPENDS_ON_FROM.has(type) && source.fileId !== target.fileId) {
      addEdge(edges, {
        sourceType: 'FILE',
        sourceId: source.fileId,
        targetType: 'FILE',
        targetId: target.fileId,
        targetKey: target.fileId,
        type: 'DEPENDS_ON',
        confidence: clampConfidence(relation.confidence),
      });
    }
  }

  return [...edges.values()];
}

function addEdge(edges: Map<string, GraphEdgeDraft>, draft: GraphEdgeDraft): void {
  const key = `${draft.sourceType}\0${draft.sourceId}\0${draft.type}\0${draft.targetType}\0${draft.targetKey}`;
  const existing = edges.get(key);
  if (!existing || draft.confidence > existing.confidence) {
    edges.set(key, draft);
  }
}

function asEdgeType(value: string): GraphEdgeKind | undefined {
  return EDGE_TYPES.has(value as GraphEdgeKind) ? (value as GraphEdgeKind) : undefined;
}

function clampConfidence(value: number): number {
  if (Number.isNaN(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}
