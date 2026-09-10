import { join } from 'node:path';
import { decryptSecret, type PrismaClient } from '@code-archaeologist/core';
import { sanitizeGitError, type GitProvider } from '@code-archaeologist/git';
import { parseRepositorySettings, type AppEnv, type RepositorySyncJobData } from '@code-archaeologist/shared';
import { GitCliProvider } from './git-cli.provider';
import { fetchRepositoryThreads } from './fetch-issues';
import { syncGithubRepository } from './github-sync';
import { indexAst } from './index-ast';
import { indexGitHistory } from './index-git-history';
import { indexDna } from './index-dna';
import { indexEvidence } from './index-evidence';
import { indexGraph } from './index-graph';

type LoggerLike = {
  log(message: string): void;
  warn(message: string): void;
};

export async function processRepositorySync(
  data: RepositorySyncJobData,
  deps: {
    prisma: PrismaClient;
    env: AppEnv;
    git?: GitProvider;
    indexHistory?: typeof indexGitHistory;
    parseAst?: typeof indexAst;
    buildGraph?: typeof indexGraph;
    computeDna?: typeof indexDna;
    linkEvidence?: typeof indexEvidence;
    fetchThreads?: typeof fetchRepositoryThreads;
    syncGithub?: typeof syncGithubRepository;
    logger?: LoggerLike;
  },
): Promise<void> {
  const git = deps.git ?? new GitCliProvider();
  const indexHistory = deps.indexHistory ?? indexGitHistory;
  const parseAst = deps.parseAst ?? indexAst;
  const buildGraph = deps.buildGraph ?? indexGraph;
  const computeDna = deps.computeDna ?? indexDna;
  const linkEvidence = deps.linkEvidence ?? indexEvidence;
  const fetchThreads = deps.fetchThreads ?? fetchRepositoryThreads;
  const syncGithub = deps.syncGithub ?? syncGithubRepository;
  const { prisma, env } = deps;
  const run = await prisma.analysisRun.findUnique({
    where: { id: data.analysisRunId },
    include: {
      tasks: { orderBy: { createdAt: 'asc' } },
      repository: { include: { credential: true } },
    },
  });

  if (!run || run.repository.deletedAt || run.status === 'CANCELLED') {
    return;
  }

  const mirrorDir = join(env.REPOSITORY_WORK_DIR, 'mirrors', run.repositoryId);
  try {
    await prisma.repository.update({
      where: { id: run.repositoryId },
      data: { status: 'SYNCING', lastError: null },
    });
    await prisma.analysisRun.update({
      where: { id: run.id },
      data: { status: 'RUNNING', startedAt: new Date(), error: null, progress: 10 },
    });

    const credential = readCredential(run.repository.credential, env.CREDENTIALS_ENCRYPTION_KEY);
    const cloneTask = run.tasks.find((task) => task.taskType === 'CLONE');
    await markTask(prisma, cloneTask?.id, 'RUNNING');
    await git.ensureMirror({
      url: run.repository.url,
      destination: mirrorDir,
      branch: run.revision || run.repository.defaultBranch || undefined,
      credential,
    });
    await markTask(prisma, cloneTask?.id, 'SUCCEEDED');
    await prisma.analysisRun.update({ where: { id: run.id }, data: { progress: 40 } });

    const detectTask = run.tasks.find((task) => task.taskType === 'DETECT_REVISION');
    await markTask(prisma, detectTask?.id, 'RUNNING');
    const defaultBranch = run.repository.defaultBranch || (await git.detectDefaultBranch(mirrorDir));
    const currentRevision = await git.resolveRevision(mirrorDir, run.revision || defaultBranch);
    await markTask(prisma, detectTask?.id, 'SUCCEEDED');
    await prisma.analysisRun.update({ where: { id: run.id }, data: { progress: 70 } });

    const indexTask = run.tasks.find((task) => task.taskType === 'INDEX_HISTORY');
    await markTask(prisma, indexTask?.id, 'RUNNING');
    await indexHistory({
      prisma,
      git,
      gitDir: mirrorDir,
      repositoryId: run.repositoryId,
      defaultBranch,
      currentRevision,
      onProgress: async (progress) => {
        await prisma.analysisRun.update({ where: { id: run.id }, data: { progress } });
      },
    });
    await markTask(prisma, indexTask?.id, 'SUCCEEDED');

    const settings = parseRepositorySettings(run.repository.settings);
    if (settings.includePullRequests) {
      if (run.repository.provider === 'GITHUB') {
        await syncGithub({
          prisma,
          env,
          repositoryId: run.repositoryId,
          workspaceId: run.repository.workspaceId,
          url: run.repository.url,
          repoCredential: credential,
          logger: deps.logger,
        });
      } else {
        await fetchThreads({
          prisma,
          repositoryId: run.repositoryId,
          url: run.repository.url,
          provider: run.repository.provider,
          credential,
          logger: deps.logger,
        });
      }
    }

    const parseTask = run.tasks.find((task) => task.taskType === 'PARSE_AST');
    await markTask(prisma, parseTask?.id, 'RUNNING');
    await prisma.analysisRun.update({ where: { id: run.id }, data: { progress: 72 } });
    await parseAst({
      prisma,
      git,
      gitDir: mirrorDir,
      repositoryId: run.repositoryId,
      revision: currentRevision,
      respectGitignore: settings.respectGitignore,
      onProgress: async (progress) => {
        await prisma.analysisRun.update({ where: { id: run.id }, data: { progress } });
      },
    });
    await markTask(prisma, parseTask?.id, 'SUCCEEDED');

    const graphTask = run.tasks.find((task) => task.taskType === 'BUILD_GRAPH');
    await markTask(prisma, graphTask?.id, 'RUNNING');
    await prisma.analysisRun.update({ where: { id: run.id }, data: { progress: 96 } });
    await buildGraph({
      prisma,
      repositoryId: run.repositoryId,
      revision: currentRevision,
      onProgress: async (progress) => {
        await prisma.analysisRun.update({ where: { id: run.id }, data: { progress } });
      },
    });
    await markTask(prisma, graphTask?.id, 'SUCCEEDED');

    const dnaTask = run.tasks.find((task) => task.taskType === 'COMPUTE_DNA');
    await markTask(prisma, dnaTask?.id, 'RUNNING');
    await prisma.analysisRun.update({ where: { id: run.id }, data: { progress: 94 } });
    await computeDna({
      prisma,
      repositoryId: run.repositoryId,
      revision: currentRevision,
      onProgress: async (progress) => {
        await prisma.analysisRun.update({ where: { id: run.id }, data: { progress } });
      },
    });
    await markTask(prisma, dnaTask?.id, 'SUCCEEDED');

    const evidenceTask = run.tasks.find((task) => task.taskType === 'LINK_EVIDENCE');
    await markTask(prisma, evidenceTask?.id, 'RUNNING');
    await prisma.analysisRun.update({ where: { id: run.id }, data: { progress: 97 } });
    await linkEvidence({
      prisma,
      git,
      gitDir: mirrorDir,
      repositoryId: run.repositoryId,
      revision: currentRevision,
      onProgress: async (progress) => {
        await prisma.analysisRun.update({ where: { id: run.id }, data: { progress } });
      },
    });
    await markTask(prisma, evidenceTask?.id, 'SUCCEEDED');

    await prisma.repository.update({
      where: { id: run.repositoryId },
      data: {
        status: 'READY',
        defaultBranch,
        currentRevision,
        lastError: null,
        lastSyncedAt: new Date(),
      },
    });
    await prisma.analysisRun.update({
      where: { id: run.id },
      data: {
        status: 'SUCCEEDED',
        progress: 100,
        revision: currentRevision,
        finishedAt: new Date(),
        error: null,
      },
    });
    deps.logger?.log(`Ingestion finished for repository ${run.repositoryId}`);
  } catch (error) {
    const message = sanitizeGitError(error instanceof Error ? error.message : 'Ingestion failed');
    await failRun(prisma, run.id, run.repositoryId, message);
    if (isTransient(error)) {
      throw error;
    }
  }
}

async function markTask(
  prisma: PrismaClient,
  taskId: string | undefined,
  status: 'RUNNING' | 'SUCCEEDED' | 'FAILED',
  error?: string,
): Promise<void> {
  if (!taskId) {
    return;
  }
  await prisma.analysisTask.update({
    where: { id: taskId },
    data:
      status === 'RUNNING'
        ? { status, attempts: { increment: 1 }, startedAt: new Date(), error: null }
        : { status, finishedAt: new Date(), error: error ?? null },
  });
}

async function failRun(
  prisma: PrismaClient,
  runId: string,
  repositoryId: string,
  message: string,
): Promise<void> {
  await prisma.analysisTask.updateMany({
    where: { analysisRunId: runId, status: { in: ['PENDING', 'RUNNING'] } },
    data: { status: 'FAILED', error: message, finishedAt: new Date() },
  });
  await prisma.analysisRun.update({
    where: { id: runId },
    data: { status: 'FAILED', progress: 100, error: message, finishedAt: new Date() },
  });
  await prisma.repository.update({
    where: { id: repositoryId },
    data: { status: 'FAILED', lastError: message },
  });
}

function readCredential(
  record: { encryptedPayload: string } | null,
  key: string,
): { username: string; secret: string } | undefined {
  if (!record) {
    return undefined;
  }
  const parsed = JSON.parse(decryptSecret(record.encryptedPayload, key)) as {
    username?: string;
    secret?: string;
  };
  if (!parsed.secret) {
    return undefined;
  }
  return { username: parsed.username || 'x-access-token', secret: parsed.secret };
}

function isTransient(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  return (
    message.includes('timed out') ||
    message.includes('econnreset') ||
    message.includes('temporarily')
  );
}
