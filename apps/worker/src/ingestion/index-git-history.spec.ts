import { indexGitHistory } from './index-git-history';

describe('indexGitHistory', () => {
  it('upserts authors, commits, files, and branch heads', async () => {
    const git = {
      listBranches: jest.fn().mockResolvedValue([{ name: 'main', sha: 'abc123', isDefault: true }]),
      isAncestor: jest.fn().mockResolvedValue(false),
      listHistory: jest.fn().mockResolvedValue({
        commits: [
          {
            sha: 'abc123',
            message: 'Add auth',
            authorName: 'Ada Lovelace',
            authorEmail: 'ada@example.com',
            authoredAt: '2026-01-01T00:00:00.000Z',
            committedAt: '2026-01-01T00:00:00.000Z',
            parentShas: [],
          },
        ],
        changes: {
          abc123: [
            {
              changeType: 'ADDED',
              oldPath: null,
              newPath: 'src/auth.ts',
              additions: 12,
              deletions: 0,
              similarity: null,
            },
          ],
        },
      }),
    };
    const prisma = {
      branch: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue({ id: 'branch-1' }),
        upsert: jest.fn(),
        updateMany: jest.fn(),
      },
      developer: {
        upsert: jest.fn().mockResolvedValue({ id: 'dev-1' }),
      },
      commit: {
        upsert: jest.fn().mockResolvedValue({ id: 'commit-1' }),
        findUnique: jest.fn().mockResolvedValue({ id: 'commit-1' }),
        findMany: jest.fn().mockResolvedValue([{ id: 'commit-1' }]),
      },
      repoFile: {
        upsert: jest.fn().mockResolvedValue({ id: 'file-1' }),
      },
      commitFile: {
        upsert: jest.fn(),
      },
      branchCommit: {
        createMany: jest.fn(),
      },
      repository: {
        update: jest.fn(),
      },
    };

    await indexGitHistory({
      prisma: prisma as never,
      git: git as never,
      gitDir: '/tmp/mirror',
      repositoryId: 'repo-1',
      defaultBranch: 'main',
      currentRevision: 'abc123',
    });

    expect(prisma.developer.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          canonicalEmail: 'ada@example.com',
          canonicalName: 'Ada Lovelace',
        }),
      }),
    );
    expect(prisma.commit.upsert).toHaveBeenCalled();
    expect(prisma.repoFile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ path: 'src/auth.ts', language: 'typescript' }),
      }),
    );
    expect(prisma.repository.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { lastIndexedRevision: 'abc123' },
      }),
    );
  });

  it('walks only new commits when the previous head is still an ancestor', async () => {
    const git = {
      listBranches: jest.fn().mockResolvedValue([{ name: 'main', sha: 'def456', isDefault: true }]),
      isAncestor: jest.fn().mockResolvedValue(true),
      listHistory: jest.fn().mockResolvedValue({
        commits: [
          {
            sha: 'def456',
            message: 'Follow up',
            authorName: 'Ada',
            authorEmail: 'ada@example.com',
            authoredAt: '2026-01-02T00:00:00.000Z',
            committedAt: '2026-01-02T00:00:00.000Z',
            parentShas: ['abc123'],
          },
        ],
        changes: { def456: [] },
      }),
    };
    const prisma = {
      branch: {
        findMany: jest.fn().mockResolvedValue([{ name: 'main', headCommit: { sha: 'abc123' } }]),
        findUnique: jest.fn().mockResolvedValue({ id: 'branch-1' }),
        upsert: jest.fn(),
        updateMany: jest.fn(),
      },
      developer: { upsert: jest.fn().mockResolvedValue({ id: 'dev-1' }) },
      commit: {
        upsert: jest.fn().mockResolvedValue({ id: 'commit-2' }),
        findUnique: jest.fn().mockResolvedValue({ id: 'commit-2' }),
        findMany: jest.fn().mockResolvedValue([{ id: 'commit-2' }]),
      },
      repoFile: { upsert: jest.fn() },
      commitFile: { upsert: jest.fn() },
      branchCommit: { createMany: jest.fn() },
      repository: { update: jest.fn() },
    };

    await indexGitHistory({
      prisma: prisma as never,
      git: git as never,
      gitDir: '/tmp/mirror',
      repositoryId: 'repo-1',
      defaultBranch: 'main',
      currentRevision: 'def456',
    });

    expect(git.listHistory).toHaveBeenCalledWith(
      '/tmp/mirror',
      expect.objectContaining({ revision: 'def456', sinceSha: 'abc123' }),
    );
  });
});
