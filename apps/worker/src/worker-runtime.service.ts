import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue, Worker, type Job } from 'bullmq';
import Redis from 'ioredis';
import { PrismaClient } from '@code-archaeologist/core';
import {
  INVESTIGATION_JOB,
  QUEUE_NAMES,
  REPOSITORY_SYNC_JOB,
  loadLocalEnv,
  validateEnv,
  type AppEnv,
  type InvestigationJobData,
  type RepositorySyncJobData,
} from '@code-archaeologist/shared';
import { processRepositorySync } from './ingestion/process-repository-sync';
import { processInvestigation } from './investigation/process-investigation';

@Injectable()
export class WorkerRuntimeService implements OnModuleDestroy {
  private readonly logger = new Logger(WorkerRuntimeService.name);
  private readonly env: AppEnv;
  private readonly prisma: PrismaClient;
  private readonly redis: Redis;
  private readonly queues: Queue[];
  private readonly syncQueue: Queue<RepositorySyncJobData>;
  private readonly investigationQueue: Queue<InvestigationJobData>;
  private syncWorker?: Worker<RepositorySyncJobData>;
  private investigationWorker?: Worker<InvestigationJobData>;
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
    this.investigationQueue = this.queues.find(
      (queue) => queue.name === QUEUE_NAMES.investigation,
    ) as Queue<InvestigationJobData>;
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
    this.investigationWorker = new Worker<InvestigationJobData>(
      QUEUE_NAMES.investigation,
      (job) => this.handleInvestigation(job),
      {
        connection: { url: this.env.REDIS_URL },
        concurrency: Math.max(1, Math.min(2, this.env.WORKER_CONCURRENCY)),
      },
    );
    this.investigationWorker.on('failed', (job, error) => {
      this.logger.warn(`Investigation job ${job?.id ?? 'unknown'} failed: ${error.message}`);
    });
    await this.dispatchQueuedRuns();
    await this.dispatchQueuedInvestigations();
    let tick = 0;
    this.dispatchTimer = setInterval(() => {
      void this.dispatchQueuedInvestigations();
      tick += 1;
      if (tick % 4 === 0) {
        void this.dispatchQueuedRuns();
      }
    }, 500);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.dispatchTimer) {
      clearInterval(this.dispatchTimer);
    }
    await this.syncWorker?.close();
    await this.investigationWorker?.close();
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

  private async handleInvestigation(job: Job<InvestigationJobData>): Promise<void> {
    await processInvestigation(job.data.investigationId, {
      prisma: this.prisma,
      env: this.env,
      logger: this.logger,
    });
  }

  private async dispatchQueuedInvestigations(): Promise<void> {
    const queued = await this.prisma.investigation.findMany({
      where: { status: 'QUEUED' },
      orderBy: { createdAt: 'asc' },
      take: 20,
      include: { repository: { select: { workspaceId: true, deletedAt: true } } },
    });
    for (const row of queued) {
      if (row.repository.deletedAt) {
        continue;
      }
      await this.investigationQueue.add(
        INVESTIGATION_JOB,
        {
          investigationId: row.id,
          repositoryId: row.repositoryId,
          workspaceId: row.repository.workspaceId,
        },
        {
          jobId: row.id,
          attempts: 2,
          backoff: { type: 'exponential', delay: 2_000 },
          removeOnComplete: 100,
          removeOnFail: 100,
        },
      );
    }
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
