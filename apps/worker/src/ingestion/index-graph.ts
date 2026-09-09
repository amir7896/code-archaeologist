import { type PrismaClient } from '@code-archaeologist/core';
import { collectGraphEdges } from './graph-edges';

const WRITE_BATCH = 400;

export async function indexGraph(input: {
  prisma: PrismaClient;
  repositoryId: string;
  revision: string;
  onProgress?: (progress: number) => Promise<void>;
}): Promise<void> {
  const { prisma, repositoryId, revision } = input;
  const current = await prisma.repository.findUnique({
    where: { id: repositoryId },
    select: { lastGraphRevision: true },
  });
  if (current?.lastGraphRevision === revision) {
    await input.onProgress?.(94);
    return;
  }

  await input.onProgress?.(90);
  const [symbols, relations] = await Promise.all([
    prisma.codeSymbol.findMany({
      where: { file: { repositoryId } },
      select: { id: true, fileId: true, parentSymbolId: true, qualifiedName: true },
    }),
    prisma.symbolRelation.findMany({
      where: { source: { file: { repositoryId } } },
      select: {
        sourceSymbolId: true,
        targetSymbolId: true,
        targetQualifiedName: true,
        type: true,
        confidence: true,
      },
    }),
  ]);

  await input.onProgress?.(92);
  const edges = collectGraphEdges({ symbols, relations });
  await prisma.graphEdge.deleteMany({ where: { repositoryId } });

  for (let offset = 0; offset < edges.length; offset += WRITE_BATCH) {
    const chunk = edges.slice(offset, offset + WRITE_BATCH);
    await prisma.graphEdge.createMany({
      data: chunk.map((edge) => ({
        repositoryId,
        sourceType: edge.sourceType,
        sourceId: edge.sourceId,
        targetType: edge.targetType,
        targetId: edge.targetId,
        targetKey: edge.targetKey,
        type: edge.type,
        confidence: edge.confidence,
        evidence: 'AST',
        firstRevision: revision,
        lastRevision: revision,
      })),
    });
  }

  await prisma.repository.update({
    where: { id: repositoryId },
    data: { lastGraphRevision: revision },
  });
  await input.onProgress?.(94);
}
