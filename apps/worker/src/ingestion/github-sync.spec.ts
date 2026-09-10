import { syncGithubRepository } from './github-sync';

describe('syncGithubRepository', () => {
  it('upserts issues and pull requests and stores review and file links', async () => {
    const threads = new Map<string, { id: string }>();
    const reviews: unknown[] = [];
    const comments: unknown[] = [];
    const commits: unknown[] = [];
    const links: unknown[] = [];
    const prisma = {
      integration: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      repositoryThread: {
        findUnique: jest.fn(async ({ where }: { where: { repositoryId_kind_externalId: { kind: string; externalId: string } } }) => {
          return threads.get(`${where.repositoryId_kind_externalId.kind}:${where.repositoryId_kind_externalId.externalId}`) ?? null;
        }),
        create: jest.fn(async ({ data }: { data: { kind: string; externalId: string } }) => {
          const row = { id: `t-${data.externalId}` };
          threads.set(`${data.kind}:${data.externalId}`, row);
          return row;
        }),
        update: jest.fn(),
      },
      commit: {
        findMany: jest.fn().mockResolvedValue([{ id: 'c1', sha: 'abc1234deadbeef' }]),
      },
      threadReview: {
        upsert: jest.fn(async ({ create }: { create: unknown }) => {
          reviews.push(create);
        }),
      },
      threadComment: {
        upsert: jest.fn(async ({ create }: { create: unknown }) => {
          comments.push(create);
        }),
      },
      threadCommit: {
        upsert: jest.fn(async ({ create }: { create: unknown }) => {
          commits.push(create);
        }),
      },
      threadLink: {
        deleteMany: jest.fn(),
        createMany: jest.fn(async ({ data }: { data: unknown[] }) => {
          links.push(...data);
        }),
      },
      repoFile: {
        findMany: jest.fn().mockResolvedValue([{ id: 'f1', path: 'src/users.service.ts' }]),
      },
      codeSymbol: {
        findMany: jest.fn().mockResolvedValue([
          { id: 's1', name: 'UserService', fileId: 'f1', file: { path: 'src/users.service.ts' } },
        ]),
      },
    };
    const fetchImpl = jest.fn(async (url: string) => {
      if (url.includes('/issues?')) {
        return {
          ok: true,
          status: 200,
          json: async () => [
            {
              id: 11,
              number: 1,
              title: 'Bug in UserService',
              body: 'See src/users.service.ts',
              state: 'open',
              user: { login: 'ada' },
              html_url: 'https://github.com/acme/platform/issues/1',
              created_at: '2026-01-01T00:00:00Z',
              updated_at: '2026-01-01T00:00:00Z',
            },
            {
              id: 22,
              number: 2,
              title: 'Fix timeout',
              pull_request: {},
              body: 'patch',
              state: 'closed',
              merged_at: '2026-01-02T00:00:00Z',
              user: { login: 'linus' },
              html_url: 'https://github.com/acme/platform/pull/2',
              created_at: '2026-01-01T12:00:00Z',
              updated_at: '2026-01-02T00:00:00Z',
              merge_commit_sha: 'abc1234deadbeef',
            },
          ],
        };
      }
      if (url.includes('/pulls/2/commits')) {
        return { ok: true, status: 200, json: async () => [{ sha: 'abc1234deadbeef' }] };
      }
      if (url.includes('/pulls/2/files')) {
        return { ok: true, status: 200, json: async () => [{ filename: 'src/users.service.ts' }] };
      }
      if (url.includes('/pulls/2/reviews')) {
        return {
          ok: true,
          status: 200,
          json: async () => [{ id: 9, state: 'APPROVED', body: 'lgtm', user: { login: 'ada' } }],
        };
      }
      if (url.includes('/pulls/2/comments')) {
        return {
          ok: true,
          status: 200,
          json: async () => [{ id: 8, path: 'src/users.service.ts', body: 'nit', user: { login: 'ada' } }],
        };
      }
      return { ok: true, status: 200, json: async () => [] };
    });

    const counts = await syncGithubRepository({
      prisma: prisma as never,
      env: { CREDENTIALS_ENCRYPTION_KEY: 'local-dev-credentials-secret-change-me-32' } as never,
      repositoryId: 'repo-1',
      workspaceId: 'ws-1',
      url: 'https://github.com/acme/platform.git',
      fetchImpl: fetchImpl as never,
    });

    expect(counts.issueCount).toBe(1);
    expect(counts.pullRequestCount).toBe(1);
    expect(counts.reviewCount).toBe(1);
    expect(reviews).toHaveLength(1);
    expect(comments).toHaveLength(1);
    expect(commits).toEqual([expect.objectContaining({ sha: 'abc1234deadbeef', commitId: 'c1' })]);
    expect(links.some((link) => (link as { method: string }).method === 'PR_FILE')).toBe(true);
  });

  it('does not throw when GitHub returns an error', async () => {
    const counts = await syncGithubRepository({
      prisma: { integration: { findUnique: jest.fn().mockResolvedValue(null) } } as never,
      env: { CREDENTIALS_ENCRYPTION_KEY: 'x' } as never,
      repositoryId: 'repo-1',
      workspaceId: 'ws-1',
      url: 'https://github.com/acme/platform.git',
      fetchImpl: jest.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({}) }),
      logger: { log: jest.fn(), warn: jest.fn() },
    });
    expect(counts).toEqual({ issueCount: 0, pullRequestCount: 0, reviewCount: 0, linkCount: 0 });
  });
});
