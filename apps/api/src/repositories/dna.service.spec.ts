import { DnaService } from './dna.service';

describe('DnaService', () => {
  it('returns a file DNA profile', async () => {
    const service = new DnaService({
      repository: { findFirst: jest.fn().mockResolvedValue({ lastDnaRevision: 'abc' }) },
      repoFile: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'file-1',
          path: 'src/auth.ts',
          complexity: 4,
          loc: 20,
          firstRevision: 'aaa',
          lastRevision: 'abc',
        }),
      },
      riskScore: {
        findUnique: jest.fn().mockResolvedValue({
          score: 40,
          level: 'MEDIUM',
          evidenceConfidence: 0.8,
          factors: [],
        }),
      },
      graphEdge: { count: jest.fn().mockResolvedValue(2) },
      commitFile: { findMany: jest.fn().mockResolvedValue([]) },
      symbolVersion: { findMany: jest.fn().mockResolvedValue([]) },
    } as never);

    const profile = await service.getProfile('ws-1', 'repo-1', { fileId: 'file-1' });
    expect(profile).toMatchObject({
      subjectType: 'FILE',
      name: 'auth.ts',
      path: 'src/auth.ts',
      fanIn: 2,
      fanOut: 2,
      risk: { level: 'MEDIUM', score: 40 },
    });
  });

  it('requires a subject', async () => {
    const service = new DnaService({
      repository: { findFirst: jest.fn().mockResolvedValue({ lastDnaRevision: 'abc' }) },
    } as never);
    await expect(service.getProfile('ws-1', 'repo-1', {})).rejects.toMatchObject({
      response: { code: 'DNA_SUBJECT_REQUIRED' },
    });
  });
});
