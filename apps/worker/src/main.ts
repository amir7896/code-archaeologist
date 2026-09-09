import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { APP_NAME, QUEUE_NAMES, loadLocalEnv, validateEnv } from '@code-archaeologist/shared';
import { WorkerModule } from './worker.module';
import { WorkerRuntimeService } from './worker-runtime.service';

async function bootstrap(): Promise<void> {
  loadLocalEnv();
  const env = validateEnv();
  const app = await NestFactory.createApplicationContext(WorkerModule);
  const runtime = app.get(WorkerRuntimeService);
  const health = await runtime.check();
  await runtime.start();
  const logger = new Logger('Worker');
  logger.log(
    `${APP_NAME} worker ready (concurrency=${env.WORKER_CONCURRENCY}). Queues registered: ${Object.values(QUEUE_NAMES).join(', ')}`,
  );
  logger.log(`Dependency checks: postgres=${health.postgres} redis=${health.redis}`);
}

bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
