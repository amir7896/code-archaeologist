import { indexGraph } from './index-graph';

describe('indexGraph', () => {
  it('skips a rebuild when the graph already matches this revision', async () => {
    const prisma = {
      repository: { findUnique: jest.fn().mockResolvedValue({ lastGraphRevision: 'abc123' }) },
      codeSymbol: { findMany: jest.fn() },
      symbolRelation: { findMany: jest.fn() },
      graphEdge: { deleteMany: jest.fn(), createMany: jest.fn() },
    };
    const onProgress = jest.fn();

    await indexGraph({
      prisma: prisma as never,
      repositoryId: 'repo-1',
      revision: 'abc123',
      onProgress,
    });

    expect(prisma.codeSymbol.findMany).not.toHaveBeenCalled();
    expect(prisma.graphEdge.deleteMany).not.toHaveBeenCalled();
    expect(onProgress).toHaveBeenCalledWith(94);
  });

  it('replaces derived edges and stamps the graph revision', async () => {
    const prisma = {
      repository: {
        findUnique: jest.fn().mockResolvedValue({ lastGraphRevision: null }),
        update: jest.fn(),
      },
      codeSymbol: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'sym-1', fileId: 'file-1', parentSymbolId: null, qualifiedName: 'a.ts' },
        ]),
      },
      symbolRelation: { findMany: jest.fn().mockResolvedValue([]) },
      graphEdge: { deleteMany: jest.fn(), createMany: jest.fn() },
    };

    await indexGraph({
      prisma: prisma as never,
      repositoryId: 'repo-1',
      revision: 'abc123',
    });

    expect(prisma.graphEdge.deleteMany).toHaveBeenCalledWith({ where: { repositoryId: 'repo-1' } });
    expect(prisma.graphEdge.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          repositoryId: 'repo-1',
          type: 'CONTAINS',
          sourceId: 'file-1',
          targetId: 'sym-1',
          lastRevision: 'abc123',
        }),
      ],
    });
    expect(prisma.repository.update).toHaveBeenCalledWith({
      where: { id: 'repo-1' },
      data: { lastGraphRevision: 'abc123' },
    });
  });
});
