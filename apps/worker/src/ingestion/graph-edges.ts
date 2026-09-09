import { resolveImportPath } from '@code-archaeologist/shared';

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

export type GraphFile = {
  id: string;
  path: string;
};

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
  files?: GraphFile[];
}): GraphEdgeDraft[] {
  const symbolsById = new Map(input.symbols.map((symbol) => [symbol.id, symbol]));
  const files = input.files ?? inferFiles(input.symbols);
  const pathByFileId = new Map(files.map((file) => [file.id, file.path]));
  const fileIdByPath = new Map(files.map((file) => [file.path, file.id]));
  const knownPaths = new Set(files.map((file) => file.path));
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

    if (FILE_DEPENDS_ON_FROM.has(type)) {
      const targetFileId =
        target && target.fileId !== source.fileId
          ? target.fileId
          : resolveImportedFileId(
              source.fileId,
              pathByFileId,
              fileIdByPath,
              knownPaths,
              relation.targetQualifiedName,
            );
      if (targetFileId && targetFileId !== source.fileId) {
        addEdge(edges, {
          sourceType: 'FILE',
          sourceId: source.fileId,
          targetType: 'FILE',
          targetId: targetFileId,
          targetKey: targetFileId,
          type: 'DEPENDS_ON',
          confidence: clampConfidence(relation.confidence),
        });
      }
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

function inferFiles(symbols: GraphSymbol[]): GraphFile[] {
  const files = new Map<string, GraphFile>();
  for (const symbol of symbols) {
    if (!symbol.parentSymbolId && (symbol.qualifiedName.includes('/') || symbol.qualifiedName.includes('.'))) {
      files.set(symbol.fileId, { id: symbol.fileId, path: symbol.qualifiedName });
    }
  }
  return [...files.values()];
}

function resolveImportedFileId(
  sourceFileId: string,
  pathByFileId: Map<string, string>,
  fileIdByPath: Map<string, string>,
  knownPaths: Set<string>,
  spec: string,
): string | undefined {
  const sourcePath = pathByFileId.get(sourceFileId);
  if (!sourcePath) {
    return undefined;
  }
  const targetPath = resolveImportPath(spec, sourcePath, knownPaths);
  return targetPath ? fileIdByPath.get(targetPath) : undefined;
}
