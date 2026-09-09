import { HistoryService } from './history.service';

describe('HistoryService', () => {
  it('returns commit details with changed files', async () => {
    const prisma = {
      repository: { findFirst: jest.fn().mockResolvedValue({ id: 'repo-1' }) },
      commit: {
        findUnique: jest.fn().mockResolvedValue({
          sha: 'abc123',
          message: 'Add auth',
          authorName: 'Ada',
          authorEmail: 'ada@example.com',
          authoredAt: new Date('2026-01-01T00:00:00.000Z'),
          committedAt: new Date('2026-01-01T00:00:00.000Z'),
          parentShas: [],
          isMerge: false,
          files: [
            {
              fileId: 'file-1',
              newPath: 'src/auth.ts',
              oldPath: null,
              changeType: 'ADDED',
              additions: 12,
              deletions: 0,
              similarity: null,
              file: { id: 'file-1', language: 'typescript' },
            },
          ],
        }),
      },
    };
    const service = new HistoryService(prisma as never);
    const commit = await service.getCommit('ws-1', 'repo-1', 'abc123');
    expect(commit.sha).toBe('abc123');
    expect(commit.additions).toBe(12);
    expect(commit.files[0]).toMatchObject({ path: 'src/auth.ts', changeType: 'ADDED', fileId: 'file-1' });
  });

  it('404s when a commit is missing', async () => {
    const service = new HistoryService({
      repository: { findFirst: jest.fn().mockResolvedValue({ id: 'repo-1' }) },
      commit: { findUnique: jest.fn().mockResolvedValue(null) },
    } as never);

    await expect(service.getCommit('ws-1', 'repo-1', 'missing')).rejects.toMatchObject({
      response: { code: 'COMMIT_NOT_FOUND' },
    });
  });
});
