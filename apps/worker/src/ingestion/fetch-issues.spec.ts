import { fetchRepositoryThreads } from './fetch-issues';

describe('fetchRepositoryThreads', () => {
  it('stores GitHub issues and pull requests from the REST API', async () => {
    const created: unknown[] = [];
    const prisma = {
      repositoryThread: {
        upsert: jest.fn(async ({ create }: { create: unknown }) => {
          created.push(create);
        }),
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
              title: 'Bug',
              body: 'broken',
              state: 'open',
              user: { login: 'ada' },
              html_url: 'https://github.com/acme/platform/issues/1',
              created_at: '2026-01-01T00:00:00Z',
            },
            {
              id: 12,
              number: 2,
              title: 'PR as issue',
              pull_request: { url: 'https://api.github.com/repos/acme/platform/pulls/2' },
            },
          ],
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => [
          {
            id: 22,
            number: 2,
            title: 'Fix bug',
            body: 'patch',
            state: 'closed',
            merged_at: '2026-01-02T00:00:00Z',
            user: { login: 'linus' },
            html_url: 'https://github.com/acme/platform/pull/2',
            created_at: '2026-01-01T12:00:00Z',
          },
        ],
      };
    });

    const counts = await fetchRepositoryThreads({
      prisma: prisma as never,
      repositoryId: 'repo-1',
      url: 'https://github.com/acme/platform.git',
      provider: 'GITHUB',
      fetchImpl: fetchImpl as never,
    });

    expect(counts).toEqual({ issueCount: 1, pullRequestCount: 1 });
    expect(created).toHaveLength(2);
    expect(created).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'ISSUE', title: 'Bug', number: 1 }),
        expect.objectContaining({ kind: 'PULL_REQUEST', title: 'Fix bug', number: 2 }),
      ]),
    );
  });

  it('does not fail ingestion when the provider API errors', async () => {
    const prisma = {
      repositoryThread: {
        upsert: jest.fn(),
      },
    };
    const counts = await fetchRepositoryThreads({
      prisma: prisma as never,
      repositoryId: 'repo-1',
      url: 'https://github.com/acme/platform.git',
      provider: 'GITHUB',
      fetchImpl: jest.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({}) }),
      logger: { log: jest.fn(), warn: jest.fn() },
    });
    expect(counts).toEqual({ issueCount: 0, pullRequestCount: 0 });
    expect(prisma.repositoryThread.upsert).not.toHaveBeenCalled();
  });
});
