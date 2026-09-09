import { indexDna } from './index-dna';

describe('indexDna', () => {
  it('skips when DNA already matches this revision', async () => {
    const prisma = {
      repository: { findUnique: jest.fn().mockResolvedValue({ lastDnaRevision: 'abc' }) },
      repoFile: { findMany: jest.fn() },
    };
    const onProgress = jest.fn();
    await indexDna({ prisma: prisma as never, repositoryId: 'repo-1', revision: 'abc', onProgress });
    expect(prisma.repoFile.findMany).not.toHaveBeenCalled();
    expect(onProgress).toHaveBeenCalledWith(99);
  });

  it('writes risk scores and stamps the DNA revision', async () => {
    const prisma = {
      repository: {
        findUnique: jest.fn().mockResolvedValue({ lastDnaRevision: null }),
        update: jest.fn(),
      },
      repoFile: {
        findMany: jest.fn().mockResolvedValue([{ id: 'file-1', path: 'src/auth.ts', loc: 10, complexity: 3 }]),
      },
      codeSymbol: { findMany: jest.fn().mockResolvedValue([]) },
      graphEdge: { findMany: jest.fn().mockResolvedValue([]) },
      commitFile: { findMany: jest.fn().mockResolvedValue([]) },
      commit: { findUnique: jest.fn().mockResolvedValue({ id: 'commit-1' }) },
      symbolVersion: { findMany: jest.fn(), createMany: jest.fn() },
      riskScore: { deleteMany: jest.fn(), createMany: jest.fn() },
      metricsSnapshot: { deleteMany: jest.fn(), createMany: jest.fn() },
    };

    await indexDna({ prisma: prisma as never, repositoryId: 'repo-1', revision: 'abc' });

    expect(prisma.riskScore.deleteMany).toHaveBeenCalledWith({ where: { repositoryId: 'repo-1' } });
    expect(prisma.riskScore.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          repositoryId: 'repo-1',
          subjectType: 'FILE',
          subjectId: 'file-1',
          revision: 'abc',
        }),
        expect.objectContaining({
          subjectType: 'MODULE',
          subjectId: 'src/auth.ts',
        }),
      ],
    });
    expect(prisma.repository.update).toHaveBeenCalledWith({
      where: { id: 'repo-1' },
      data: { lastDnaRevision: 'abc' },
    });
  });
});
