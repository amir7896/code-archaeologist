import { fileLinksFromImports } from '@code-archaeologist/shared';
import { PrismaService } from '../database/prisma.service';

export type FileDependencyLink = {
  sourceId: string;
  targetId: string;
  confidence: number;
};

/**
 * Stored FILE DEPENDS_ON plus import edges resolved onto indexed files.
 * Existing repos often have imports but no persisted file links.
 */
export async function loadFileDependencyLinks(
  prisma: PrismaService,
  repositoryId: string,
): Promise<FileDependencyLink[]> {
  const [stored, files, imports] = await Promise.all([
    prisma.graphEdge.findMany({
      where: {
        repositoryId,
        type: 'DEPENDS_ON',
        sourceType: 'FILE',
        targetType: 'FILE',
      },
      select: { sourceId: true, targetId: true, confidence: true },
    }),
    prisma.repoFile.findMany({
      where: { repositoryId },
      select: { id: true, path: true },
    }),
    prisma.graphEdge.findMany({
      where: { repositoryId, type: 'IMPORTS', sourceType: 'SYMBOL' },
      select: { sourceId: true, targetKey: true, confidence: true },
    }),
  ]);

  const sourceIds = [...new Set(imports.map((edge) => edge.sourceId))];
  const symbols =
    sourceIds.length === 0
      ? []
      : await prisma.codeSymbol.findMany({
          where: { id: { in: sourceIds } },
          select: { id: true, fileId: true },
        });

  const synthesized = fileLinksFromImports({
    files,
    symbols,
    imports: imports.map((edge) => ({
      sourceId: edge.sourceId,
      targetKey: edge.targetKey,
      confidence: edge.confidence,
    })),
  });

  const merged = new Map<string, FileDependencyLink>();
  for (const edge of stored) {
    if (!edge.targetId) {
      continue;
    }
    merged.set(`${edge.sourceId}\0${edge.targetId}`, {
      sourceId: edge.sourceId,
      targetId: edge.targetId,
      confidence: edge.confidence,
    });
  }
  for (const link of synthesized) {
    const key = `${link.from}\0${link.to}`;
    const existing = merged.get(key);
    if (!existing || link.confidence > existing.confidence) {
      merged.set(key, { sourceId: link.from, targetId: link.to, confidence: link.confidence });
    }
  }
  return [...merged.values()];
}
