import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue, Worker, type Job } from 'bullmq';
import Redis from 'ioredis';
import { PrismaClient } from '@code-archaeologist/core';
import {
  QUEUE_NAMES,
  REPOSITORY_SYNC_JOB,
  loadLocalEnv,
  validateEnv,
  type AppEnv,
  type RepositorySyncJobData,
} from '@code-archaeologist/shared';
import { processRepositorySync } from './ingestion/process-repository-sync';

@Injectable()
export class WorkerRuntimeService implements OnModuleDestroy {
  private readonly logger = new Logger(WorkerRuntimeService.name);
  private readonly env: AppEnv;
  private readonly prisma: PrismaClient;
  private readonly redis: Redis;
  private readonly queues: Queue[];
  private readonly syncQueue: Queue<RepositorySyncJobData>;
  private syncWorker?: Worker<RepositorySyncJobData>;
  private dispatchTimer?: NodeJS.Timeout;

  constructor() {
    loadLocalEnv();
    this.env = validateEnv();
    this.prisma = new PrismaClient({
      datasources: { db: { url: this.env.DATABASE_URL } },
    });
    this.redis = new Redis(this.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
    });
    this.queues = Object.values(QUEUE_NAMES).map(
      (name) =>
        new Queue(name, {
          connection: { url: this.env.REDIS_URL },
        }),
    );
    this.syncQueue = this.queues.find(
      (queue) => queue.name === QUEUE_NAMES.repositorySync,
    ) as Queue<RepositorySyncJobData>;
  }

  async check(): Promise<{ postgres: boolean; redis: boolean }> {
    const postgres = await this.pingPostgres();
    const redis = await this.pingRedis();
    return { postgres, redis };
  }

  async start(): Promise<void> {
    this.syncWorker = new Worker<RepositorySyncJobData>(
      QUEUE_NAMES.repositorySync,
      (job) => this.handleSync(job),
      {
        connection: { url: this.env.REDIS_URL },
        concurrency: this.env.WORKER_CONCURRENCY,
      },
    );
    this.syncWorker.on('failed', (job, error) => {
      this.logger.warn(`Repository sync job ${job?.id ?? 'unknown'} failed: ${error.message}`);
    });
    await this.dispatchQueuedRuns();
    this.dispatchTimer = setInterval(() => {
      void this.dispatchQueuedRuns();
    }, 2000);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.dispatchTimer) {
      clearInterval(this.dispatchTimer);
    }
    await this.syncWorker?.close();
    await Promise.all(this.queues.map((queue) => queue.close()));
    await this.redis.quit();
    await this.prisma.$disconnect();
  }

  private async handleSync(job: Job<RepositorySyncJobData>): Promise<void> {
    await processRepositorySync(job.data, {
      prisma: this.prisma,
      env: this.env,
      logger: this.logger,
    });
  }

  private async dispatchQueuedRuns(): Promise<void> {
    const queued = await this.prisma.analysisRun.findMany({
      where: { status: 'QUEUED', type: 'INGESTION' },
      orderBy: { createdAt: 'asc' },
      take: 20,
      include: { repository: { select: { workspaceId: true, deletedAt: true } } },
    });
    for (const run of queued) {
      if (run.repository.deletedAt) {
        continue;
      }
      await this.syncQueue.add(
        REPOSITORY_SYNC_JOB,
        {
          repositoryId: run.repositoryId,
          analysisRunId: run.id,
          workspaceId: run.repository.workspaceId,
        },
        {
          jobId: run.id,
          attempts: 3,
          backoff: { type: 'exponential', delay: 2_000 },
          removeOnComplete: 100,
          removeOnFail: 100,
        },
      );
    }
  }

  private async pingPostgres(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.warn(
        `PostgreSQL is not reachable yet: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return false;
    }
  }

  private async pingRedis(): Promise<boolean> {
    try {
      if (this.redis.status === 'wait' || this.redis.status === 'end') {
        await this.redis.connect();
      }
      return (await this.redis.ping()) === 'PONG';
    } catch (error) {
      this.logger.warn(
        `Redis is not reachable yet: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return false;
    }
  }
}
