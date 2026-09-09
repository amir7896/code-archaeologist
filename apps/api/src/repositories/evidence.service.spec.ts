import { EvidenceService } from './evidence.service';

describe('EvidenceService', () => {
  function createService(overrides: Record<string, unknown> = {}) {
    const prisma = {
      repository: {
        findFirst: jest.fn().mockResolvedValue({
          lastEvidenceRevision: 'abc',
          currentRevision: 'abc',
        }),
      },
      repoFile: {
        findFirst: jest.fn().mockResolvedValue({ id: 'file-1', path: 'src/cart.ts' }),
      },
      codeSymbol: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'sym-1',
          name: 'addItem',
          qualifiedName: 'Cart.addItem',
          file: { id: 'file-1', path: 'src/cart.ts' },
        }),
      },
      evidence: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'ev-1',
            kind: 'COMMIT_SYMBOL',
            method: 'LINE_OVERLAP',
            subjectType: 'SYMBOL',
            subjectId: 'sym-1',
            confidence: 0.82,
            excerpt: null,
            details: { changeType: 'MODIFIED', overlapLines: 4, additions: 6, deletions: 1 },
            commit: {
              sha: 'abc',
              message: 'Tighten cart totals',
              authorName: 'Ada',
              committedAt: new Date('2026-01-02'),
            },
          },
        ]),
      },
      symbolVersion: {
        findMany: jest.fn().mockResolvedValue([
          {
            revision: 'abc',
            contentHash: 'hash-1',
            changeType: 'MODIFIED',
            startLine: 10,
            endLine: 20,
            commit: { sha: 'abc' },
          },
        ]),
      },
      commitFile: { findMany: jest.fn() },
      ...overrides,
    };
    return { service: new EvidenceService(prisma as never), prisma };
  }

  it('lists scored evidence and never labels it certain', async () => {
    const { service } = createService();
    const result = await service.list('ws-1', 'repo-1', { symbolId: 'sym-1' });
    expect(result.origin.name).toBe('Cart.addItem');
    expect(result.items[0]).toMatchObject({
      method: 'LINE_OVERLAP',
      confidenceLabel: 'strong',
      commit: { sha: 'abc' },
    });
    expect(result.note).toMatch(/never certain/);
    expect(result.items[0].confidence).toBeLessThan(1);
  });

  it('resolves a revision from stored links, not a checkout', async () => {
    const { service } = createService();
    const result = await service.resolve('ws-1', 'repo-1', { symbolId: 'sym-1', revision: 'abc' });
    expect(result.matched).toBe(true);
    expect(result.requestedRevision).toBe('abc');
    expect(result.versions[0]?.contentHash).toBe('hash-1');
    expect(result.note).toMatch(/current tree/);
  });

  it('builds an evolution timeline with confidence labels', async () => {
    const { service } = createService();
    const result = await service.evolution('ws-1', 'repo-1', { fileId: 'file-1' });
    expect(result.stats).toMatchObject({ commitCount: 1, strongCount: 1, versionCount: 1 });
    expect(result.timeline[0]).toMatchObject({
      sha: 'abc',
      method: 'LINE_OVERLAP',
      confidenceLabel: 'strong',
      overlapLines: 4,
    });
  });

  it('falls back to file commits when evidence has not been linked yet', async () => {
    const { service } = createService({
      evidence: { findMany: jest.fn().mockResolvedValue([]) },
      commitFile: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'cf-1',
            changeType: 'ADDED',
            additions: 20,
            deletions: 0,
            commit: {
              id: 'c1',
              sha: 'def',
              message: 'Add cart',
              authorName: 'Ada',
              committedAt: new Date('2026-01-01'),
            },
          },
        ]),
      },
    });
    const result = await service.list('ws-1', 'repo-1', { fileId: 'file-1' });
    expect(result.items[0]).toMatchObject({
      kind: 'FILE_COMMIT',
      method: 'FILE_ADDED',
      details: expect.objectContaining({ fallback: true }),
    });
  });
});
