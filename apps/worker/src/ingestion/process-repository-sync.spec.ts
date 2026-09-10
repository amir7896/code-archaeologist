import { processRepositorySync } from './process-repository-sync';

describe('processRepositorySync', () => {
  it('marks the repository ready after clone, history, parse, graph, DNA, and evidence', async () => {
    const git = {
      ensureMirror: jest.fn().mockResolvedValue(undefined),
      detectDefaultBranch: jest.fn().mockResolvedValue('main'),
      resolveRevision: jest.fn().mockResolvedValue('abc123'),
    };
    const indexHistory = jest.fn().mockResolvedValue(undefined);
    const parseAst = jest.fn().mockResolvedValue(undefined);
    const buildGraph = jest.fn().mockResolvedValue(undefined);
    const computeDna = jest.fn().mockResolvedValue(undefined);
    const linkEvidence = jest.fn().mockResolvedValue(undefined);
    const fetchThreads = jest.fn().mockResolvedValue({ issueCount: 2, pullRequestCount: 1 });
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
            { id: 't3', taskType: 'INDEX_HISTORY' },
            { id: 't4', taskType: 'PARSE_AST' },
            { id: 't5', taskType: 'BUILD_GRAPH' },
            { id: 't6', taskType: 'COMPUTE_DNA' },
            { id: 't7', taskType: 'LINK_EVIDENCE' },
          ],
          repository: {
            id: 'repo-1',
            url: 'https://github.com/acme/platform.git',
            provider: 'GITHUB',
            defaultBranch: null,
            deletedAt: null,
            credential: null,
            settings: {},
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
        indexHistory,
        parseAst,
        buildGraph,
        computeDna,
        linkEvidence,
        fetchThreads,
      },
    );

    expect(git.ensureMirror).toHaveBeenCalledWith(
      expect.objectContaining({
        destination: '/tmp/ca-test/mirrors/repo-1',
        url: 'https://github.com/acme/platform.git',
      }),
    );
    expect(parseAst).toHaveBeenCalledWith(
      expect.objectContaining({
        repositoryId: 'repo-1',
        revision: 'abc123',
        gitDir: '/tmp/ca-test/mirrors/repo-1',
        respectGitignore: true,
      }),
    );
    expect(buildGraph).toHaveBeenCalledWith(
      expect.objectContaining({
        repositoryId: 'repo-1',
        revision: 'abc123',
      }),
    );
    expect(computeDna).toHaveBeenCalledWith(
      expect.objectContaining({
        repositoryId: 'repo-1',
        revision: 'abc123',
      }),
    );
    expect(linkEvidence).toHaveBeenCalledWith(
      expect.objectContaining({
        repositoryId: 'repo-1',
        revision: 'abc123',
        gitDir: '/tmp/ca-test/mirrors/repo-1',
      }),
    );
    expect(indexHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        repositoryId: 'repo-1',
        defaultBranch: 'main',
        currentRevision: 'abc123',
        gitDir: '/tmp/ca-test/mirrors/repo-1',
      }),
    );
    expect(fetchThreads).toHaveBeenCalledWith(
      expect.objectContaining({
        repositoryId: 'repo-1',
        url: 'https://github.com/acme/platform.git',
        provider: 'GITHUB',
      }),
    );
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
        git: { ensureMirror: jest.fn() } as never,
      },
    );

    expect(prisma.analysisRun.findUnique).toHaveBeenCalled();
  });

  it('skips issue fetch when the connect option is off', async () => {
    const fetchThreads = jest.fn();
    const parseAst = jest.fn().mockResolvedValue(undefined);
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
            { id: 't3', taskType: 'INDEX_HISTORY' },
            { id: 't4', taskType: 'PARSE_AST' },
            { id: 't5', taskType: 'BUILD_GRAPH' },
            { id: 't6', taskType: 'COMPUTE_DNA' },
            { id: 't7', taskType: 'LINK_EVIDENCE' },
          ],
          repository: {
            id: 'repo-1',
            url: 'https://github.com/acme/platform.git',
            provider: 'GITHUB',
            defaultBranch: 'main',
            deletedAt: null,
            credential: null,
            settings: { includePullRequests: false, respectGitignore: false },
          },
        }),
        update: jest.fn(),
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
        git: {
          ensureMirror: jest.fn().mockResolvedValue(undefined),
          detectDefaultBranch: jest.fn().mockResolvedValue('main'),
          resolveRevision: jest.fn().mockResolvedValue('abc123'),
        } as never,
        indexHistory: jest.fn().mockResolvedValue(undefined),
        parseAst,
        buildGraph: jest.fn().mockResolvedValue(undefined),
        computeDna: jest.fn().mockResolvedValue(undefined),
        linkEvidence: jest.fn().mockResolvedValue(undefined),
        fetchThreads,
      },
    );

    expect(fetchThreads).not.toHaveBeenCalled();
    expect(parseAst).toHaveBeenCalledWith(expect.objectContaining({ respectGitignore: false }));
  });
});
