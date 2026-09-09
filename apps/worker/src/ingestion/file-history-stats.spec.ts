import { collectFileHistoryStats } from './file-history-stats';

describe('collectFileHistoryStats', () => {
  it('counts churn and author concentration', () => {
    const stats = collectFileHistoryStats([
      {
        fileId: 'file-1',
        additions: 10,
        deletions: 1,
        authorName: 'Ada',
        authorEmail: 'ada@example.com',
        committedAt: new Date('2026-01-01'),
        sha: 'a',
      },
      {
        fileId: 'file-1',
        additions: 2,
        deletions: 2,
        authorName: 'Ada',
        authorEmail: 'ada@example.com',
        committedAt: new Date('2026-02-01'),
        sha: 'b',
      },
      {
        fileId: 'file-1',
        additions: 1,
        deletions: 0,
        authorName: 'Grace',
        authorEmail: 'grace@example.com',
        committedAt: new Date('2026-03-01'),
        sha: 'c',
      },
    ]);

    expect(stats.get('file-1')).toMatchObject({
      changeCount: 3,
      additions: 13,
      deletions: 3,
      authorCount: 2,
      maxAuthorShare: 2 / 3,
      firstSha: 'a',
      lastSha: 'c',
    });
  });
});
