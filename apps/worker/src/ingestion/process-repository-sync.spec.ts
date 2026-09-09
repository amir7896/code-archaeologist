import { processRepositorySync } from './process-repository-sync';

describe('processRepositorySync', () => {
  it('marks the repository ready after clone and revision detection', async () => {
    const git = {
      clone: jest.fn().mockResolvedValue(undefined),
      detectDefaultBranch: jest.fn().mockResolvedValue('main'),
      resolveRevision: jest.fn().mockResolvedValue('abc123'),
    };
    const updates: unknown[] = [];
    const prisma = {
      analysisRun: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'run-1',
          repositoryId: 'repo-1',
          revision: null,
          status: 'QUEUED',
          tasks: [
            { id: 't1', taskType: 'CLONE' },
            { id: 't2', taskType: 'DETECT_REVISION' },
          ],
          repository: {
            id: 'repo-1',
            url: 'https://github.com/acme/platform.git',
            defaultBranch: null,
            deletedAt: null,
            credential: null,
          },
        }),
        update: jest.fn(async ({ data }: { data: unknown }) => {
          updates.push(data);
        }),
      },
      analysisTask: { update: jest.fn() },
      repository: { update: jest.fn() },
    };

    await processRepositorySync(
      { repositoryId: 'repo-1', analysisRunId: 'run-1', workspaceId: 'ws-1' },
      {
        prisma: prisma as never,
        env: {
          REPOSITORY_WORK_DIR: '/tmp/ca-test',
          CREDENTIALS_ENCRYPTION_KEY: 'local-dev-credentials-secret-change-me-32',
        } as never,
        git: git as never,
      },
    );

    expect(git.clone).toHaveBeenCalled();
    expect(prisma.repository.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'READY', currentRevision: 'abc123' }),
      }),
    );
  });

  it('skips cancelled or deleted work', async () => {
    const prisma = {
      analysisRun: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'run-1',
          status: 'CANCELLED',
          tasks: [],
          repository: { deletedAt: null },
        }),
      },
    };

    await processRepositorySync(
      { repositoryId: 'repo-1', analysisRunId: 'run-1', workspaceId: 'ws-1' },
      {
        prisma: prisma as never,
        env: { REPOSITORY_WORK_DIR: '/tmp/ca-test' } as never,
        git: { clone: jest.fn() } as never,
      },
    );

    expect(prisma.analysisRun.findUnique).toHaveBeenCalled();
  });
});
