import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { API_PREFIX, APP_NAME, loadLocalEnv, validateEnv } from '@code-archaeologist/shared';
import { AppModule } from './app.module';
import { setupSwagger, swaggerUrl } from './common/swagger';
import { createValidationPipe } from './common/validation.pipe';

async function bootstrap(): Promise<void> {
  loadLocalEnv();
  const env = validateEnv();
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix(API_PREFIX);
  app.enableCors({ origin: env.WEB_ORIGIN, credentials: true });
  app.useGlobalPipes(createValidationPipe());
  setupSwagger(app);
  await app.listen(env.API_PORT, env.API_HOST);
  Logger.log(`${APP_NAME} API listening on http://${env.API_HOST}:${env.API_PORT}/${API_PREFIX}`);
  Logger.log(`Swagger UI ${swaggerUrl(env.API_HOST, env.API_PORT)}`);
}

bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
