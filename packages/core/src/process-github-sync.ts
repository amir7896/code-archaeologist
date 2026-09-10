import { type AppEnv, type IntegrationSyncJobData } from '@code-archaeologist/shared';
import { decryptSecret } from './secrets';
import { type PrismaClient } from './prisma';
import { parseGithubRepo, syncGithubRepository, type FetchLike } from './github-sync';

type LoggerLike = {
  log(message: string): void;
  warn(message: string): void;
};

export async function processGithubSync(
  data: IntegrationSyncJobData,
  deps: {
    prisma: PrismaClient;
    env: AppEnv;
    fetchImpl?: FetchLike;
    logger?: LoggerLike;
  },
): Promise<void> {
  const integration = await deps.prisma.integration.findUnique({
    where: { id: data.integrationId },
  });
  if (!integration || integration.status !== 'ACTIVE' || integration.workspaceId !== data.workspaceId) {
    return;
  }

  if (data.webhookEventId) {
    await processWebhookEvent(data.webhookEventId, { ...deps, workspaceId: data.workspaceId });
    return;
  }

  const repositories = await deps.prisma.repository.findMany({
    where: {
      workspaceId: data.workspaceId,
      provider: 'GITHUB',
      deletedAt: null,
      ...(data.repositoryId ? { id: data.repositoryId } : {}),
    },
    include: { credential: true },
  });

  try {
    for (const repository of repositories) {
      await syncGithubRepository({
        prisma: deps.prisma,
        env: deps.env,
        repositoryId: repository.id,
        workspaceId: data.workspaceId,
        url: repository.url,
        repoCredential: readRepoCredential(repository.credential, deps.env.CREDENTIALS_ENCRYPTION_KEY),
        since: integration.lastSyncedAt,
        fetchImpl: deps.fetchImpl,
        logger: deps.logger,
      });
    }
    await deps.prisma.integration.update({
      where: { id: integration.id },
      data: { lastSyncedAt: new Date(), lastError: null },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'GitHub sync failed';
    await deps.prisma.integration.update({
      where: { id: integration.id },
      data: { lastError: message },
    });
    deps.logger?.warn(`GitHub workspace sync failed: ${message}`);
  }
}

async function processWebhookEvent(
  webhookEventId: string,
  deps: {
    prisma: PrismaClient;
    env: AppEnv;
    workspaceId: string;
    fetchImpl?: FetchLike;
    logger?: LoggerLike;
  },
): Promise<void> {
  const event = await deps.prisma.webhookEvent.findUnique({ where: { id: webhookEventId } });
  if (!event || event.status !== 'RECEIVED') {
    return;
  }
  try {
    if (event.type === 'ping' || !event.repositoryId || !event.externalNumber) {
      await deps.prisma.webhookEvent.update({
        where: { id: event.id },
        data: { status: event.type === 'ping' ? 'IGNORED' : 'PROCESSED', processedAt: new Date() },
      });
      return;
    }
    const repository = await deps.prisma.repository.findFirst({
      where: { id: event.repositoryId, workspaceId: deps.workspaceId, deletedAt: null },
      include: { credential: true },
    });
    if (!repository) {
      await deps.prisma.webhookEvent.update({
        where: { id: event.id },
        data: { status: 'IGNORED', processedAt: new Date() },
      });
      return;
    }
    await syncGithubRepository({
      prisma: deps.prisma,
      env: deps.env,
      repositoryId: repository.id,
      workspaceId: deps.workspaceId,
      url: repository.url,
      repoCredential: readRepoCredential(repository.credential, deps.env.CREDENTIALS_ENCRYPTION_KEY),
      onlyNumber: event.externalNumber,
      fetchImpl: deps.fetchImpl,
      logger: deps.logger,
    });
    await deps.prisma.webhookEvent.update({
      where: { id: event.id },
      data: { status: 'PROCESSED', processedAt: new Date() },
    });
    await deps.prisma.integration.update({
      where: { id: event.integrationId },
      data: { lastSyncedAt: new Date(), lastError: null },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook processing failed';
    await deps.prisma.webhookEvent.update({
      where: { id: event.id },
      data: { status: 'FAILED', error: message, processedAt: new Date() },
    });
    deps.logger?.warn(`GitHub webhook ${event.id} failed: ${message}`);
  }
}

export function matchGithubRepositoryUrl(url: string, fullName: string): boolean {
  try {
    const parsed = parseGithubRepo(url);
    return `${parsed.owner}/${parsed.name}`.toLowerCase() === fullName.toLowerCase();
  } catch {
    return false;
  }
}

function readRepoCredential(
  record: { encryptedPayload: string } | null,
  key: string,
): { username: string; secret: string } | undefined {
  if (!record) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(decryptSecret(record.encryptedPayload, key)) as {
      username?: string;
      secret?: string;
    };
    if (!parsed.secret) {
      return undefined;
    }
    return { username: parsed.username || 'x-access-token', secret: parsed.secret };
  } catch {
    return undefined;
  }
}
