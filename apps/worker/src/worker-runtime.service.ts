import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { PrismaClient } from '@code-archaeologist/core';
import { QUEUE_NAMES, loadLocalEnv, validateEnv } from '@code-archaeologist/shared';
import type { AppEnv } from '@code-archaeologist/shared';

@Injectable()
export class WorkerRuntimeService implements OnModuleDestroy {
  private readonly logger = new Logger(WorkerRuntimeService.name);
  private readonly env: AppEnv;
  private readonly prisma: PrismaClient;
  private readonly redis: Redis;
  private readonly queues: Queue[];

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
  }

  async check(): Promise<{ postgres: boolean; redis: boolean }> {
    const postgres = await this.pingPostgres();
    const redis = await this.pingRedis();
    return { postgres, redis };
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all(this.queues.map((queue) => queue.close()));
    await this.redis.quit();
    await this.prisma.$disconnect();
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
