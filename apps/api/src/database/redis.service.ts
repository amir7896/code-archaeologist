import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { type AppEnv } from '@code-archaeologist/shared';
import { APP_ENV } from '../config/env.service';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor(@Inject(APP_ENV) env: AppEnv) {
    this.client = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 3, lazyConnect: true });
  }

  async ping(): Promise<boolean> {
    if (this.client.status === 'wait' || this.client.status === 'end') {
      await this.client.connect();
    }
    const result = await this.client.ping();
    return result === 'PONG';
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}
