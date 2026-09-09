import { join } from 'node:path';
import { rm } from 'node:fs/promises';
import { decryptSecret, type PrismaClient } from '@code-archaeologist/core';
import { sanitizeGitError, type GitProvider } from '@code-archaeologist/git';
import { GitCliProvider } from './git-cli.provider';
import { type AppEnv, type RepositorySyncJobData } from '@code-archaeologist/shared';

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
    logger?: LoggerLike;
  },
): Promise<void> {
  const git = deps.git ?? new GitCliProvider();
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

  const workDir = join(env.REPOSITORY_WORK_DIR, run.repositoryId, run.id);
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
    await git.clone({
      url: run.repository.url,
      destination: workDir,
      branch: run.revision || run.repository.defaultBranch || undefined,
      credential,
    });
    await markTask(prisma, cloneTask?.id, 'SUCCEEDED');
    await prisma.analysisRun.update({ where: { id: run.id }, data: { progress: 60 } });

    const detectTask = run.tasks.find((task) => task.taskType === 'DETECT_REVISION');
    await markTask(prisma, detectTask?.id, 'RUNNING');
    const defaultBranch = run.repository.defaultBranch || (await git.detectDefaultBranch(workDir));
    const currentRevision = await git.resolveRevision(workDir, run.revision || defaultBranch);
    await markTask(prisma, detectTask?.id, 'SUCCEEDED');

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
  } finally {
    await rm(workDir, { recursive: true, force: true });
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
