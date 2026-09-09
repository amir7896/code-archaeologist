import { indexEvidence } from './index-evidence';

describe('indexEvidence', () => {
  it('skips when evidence already matches this revision', async () => {
    const prisma = {
      repository: { findUnique: jest.fn().mockResolvedValue({ lastEvidenceRevision: 'abc' }) },
      commitFile: { findMany: jest.fn() },
    };
    const onProgress = jest.fn();
    await indexEvidence({
      prisma: prisma as never,
      git: { listChangedSpans: jest.fn() } as never,
      gitDir: '/tmp/mirror',
      repositoryId: 'repo-1',
      revision: 'abc',
      onProgress,
    });
    expect(prisma.commitFile.findMany).not.toHaveBeenCalled();
    expect(onProgress).toHaveBeenCalledWith(99);
  });

  it('writes file and symbol links and never stores certainty', async () => {
    const listChangedSpans = jest.fn().mockResolvedValue([{ startLine: 10, endLine: 20 }]);
    const prisma = {
      repository: {
        findUnique: jest.fn().mockResolvedValue({ lastEvidenceRevision: null }),
        update: jest.fn(),
      },
      repoFile: { findMany: jest.fn().mockResolvedValue([{ id: 'file-1', path: 'src/cart.ts' }]) },
      codeSymbol: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'fn-1', fileId: 'file-1', startLine: 10, endLine: 20, kind: 'FUNCTION' },
          { id: 'var-1', fileId: 'file-1', startLine: 1, endLine: 2, kind: 'VARIABLE' },
        ]),
      },
      commitFile: {
        findMany: jest.fn().mockResolvedValue([
          {
            fileId: 'file-1',
            changeType: 'MODIFIED',
            newPath: 'src/cart.ts',
            additions: 4,
            deletions: 1,
            commit: { id: 'c1', sha: 'abc', committedAt: new Date('2026-01-02') },
          },
        ]),
      },
      evidence: { deleteMany: jest.fn(), createMany: jest.fn() },
    };

    await indexEvidence({
      prisma: prisma as never,
      git: { listChangedSpans } as never,
      gitDir: '/tmp/mirror',
      repositoryId: 'repo-1',
      revision: 'abc',
    });

    expect(listChangedSpans).toHaveBeenCalledWith('/tmp/mirror', 'abc', 'src/cart.ts');
    expect(prisma.evidence.deleteMany).toHaveBeenCalledWith({ where: { repositoryId: 'repo-1' } });
    expect(prisma.evidence.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          kind: 'FILE_COMMIT',
          subjectId: 'file-1',
          method: 'FILE_TOUCH',
        }),
        expect.objectContaining({
          kind: 'COMMIT_SYMBOL',
          subjectId: 'fn-1',
          method: 'LINE_OVERLAP',
          symbolId: 'fn-1',
        }),
      ],
    });
    const rows = prisma.evidence.createMany.mock.calls[0][0].data as Array<{ confidence: number; subjectId: string }>;
    expect(rows.every((row) => row.confidence < 1)).toBe(true);
    expect(rows.some((row) => row.subjectId === 'var-1')).toBe(false);
    expect(prisma.repository.update).toHaveBeenCalledWith({
      where: { id: 'repo-1' },
      data: { lastEvidenceRevision: 'abc' },
    });
  });
});
