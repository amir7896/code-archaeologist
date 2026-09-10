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

  it('rejects a GitLab URL when GitHub is selected', async () => {
    const service = createService({
      workspace: { findFirst: jest.fn().mockResolvedValue(workspace) },
    });

    await expect(
      service.create('ws-1', actor, {
        url: 'https://gitlab.com/acme/platform.git',
        source: 'GITHUB',
      }),
    ).rejects.toMatchObject({ response: { code: 'PROVIDER_MISMATCH' } });
  });

  it('stores connect options and starts ingestion', async () => {
    const created = {
      id: 'repo-1',
      workspaceId: 'ws-1',
      name: 'platform',
      url: 'https://github.com/acme/platform.git',
      provider: 'GITHUB',
      defaultBranch: 'main',
      currentRevision: null,
      settings: { includePullRequests: true, respectGitignore: true },
      status: 'PENDING',
      lastError: null,
      lastSyncedAt: null,
      createdAt: new Date('2026-09-10T00:00:00Z'),
      updatedAt: new Date('2026-09-10T00:00:00Z'),
      credential: null,
      analysisRuns: [],
    };
    const repository = {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue(created),
      findFirst: jest.fn().mockResolvedValue(created),
      update: jest.fn(),
    };
    const service = createService({
      workspace: { findFirst: jest.fn().mockResolvedValue(workspace) },
      repository,
      analysisRun: { updateMany: jest.fn(), create: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      commit: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
      branch: { count: jest.fn().mockResolvedValue(0) },
      repoFile: {
        count: jest.fn().mockResolvedValue(0),
        aggregate: jest.fn().mockResolvedValue({ _avg: { complexity: null } }),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      codeSymbol: { count: jest.fn().mockResolvedValue(0) },
      repositoryThread: { count: jest.fn().mockResolvedValue(0) },
      developer: { count: jest.fn().mockResolvedValue(0) },
      riskScore: { count: jest.fn().mockResolvedValue(0) },
    });

    const result = await service.create('ws-1', actor, {
      url: 'https://github.com/acme/platform.git',
      defaultBranch: 'main',
      source: 'GITHUB',
      includePullRequests: true,
      respectGitignore: true,
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          settings: { includePullRequests: true, respectGitignore: true },
          provider: 'GITHUB',
        }),
      }),
    );
    expect(result.settings).toEqual({ includePullRequests: true, respectGitignore: true });
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
