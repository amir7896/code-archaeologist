import { RepositoriesService } from './repositories.service';

describe('RepositoriesService', () => {
  const actor = { id: 'owner-1', email: 'owner@example.com', name: 'Owner', sessionId: 'sid' };
  const workspace = {
    id: 'ws-1',
    name: 'Platform',
    status: 'ACTIVE',
    deletedAt: null,
  };

  function createService(prisma: Record<string, unknown>) {
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const env = { CREDENTIALS_ENCRYPTION_KEY: 'local-dev-credentials-secret-change-me-32' };
    return new RepositoriesService(prisma as never, audit as never, env as never);
  }

  it('rejects credentials embedded in the repository URL', async () => {
    const service = createService({
      workspace: { findFirst: jest.fn().mockResolvedValue(workspace) },
    });

    await expect(
      service.create('ws-1', actor, {
        url: 'https://user:token@github.com/acme/platform.git',
      }),
    ).rejects.toMatchObject({ response: { code: 'INVALID_GIT_URL' } });
  });

  it('blocks mutations on archived workspaces', async () => {
    const service = createService({
      workspace: { findFirst: jest.fn().mockResolvedValue({ ...workspace, status: 'ARCHIVED' }) },
    });

    await expect(
      service.create('ws-1', actor, { url: 'https://github.com/acme/platform.git' }),
    ).rejects.toMatchObject({ response: { code: 'WORKSPACE_ARCHIVED' } });
  });

  it('refuses a second sync while one is already running', async () => {
    const service = createService({
      workspace: { findFirst: jest.fn().mockResolvedValue(workspace) },
      repository: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'repo-1',
          workspaceId: 'ws-1',
          status: 'SYNCING',
          defaultBranch: 'main',
          credential: null,
          analysisRuns: [],
        }),
      },
    });

    await expect(service.sync('ws-1', 'repo-1', actor, {}, 'OWNER')).rejects.toMatchObject({
      response: { code: 'REPOSITORY_SYNCING' },
    });
  });
});
