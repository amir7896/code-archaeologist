import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { APP_NAME, APP_VERSION } from '@code-archaeologist/shared';
import { AuthSessionSchema, AuthUserSchema } from '../auth/swagger/auth.schema';
import { RepositorySchema } from '../repositories/swagger/repository.schema';
import { WorkspaceSchema } from '../workspaces/swagger/workspace.schema';

export const SWAGGER_PATH = 'api/docs';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle(APP_NAME)
    .setDescription(
      'Evidence-backed repository intelligence API. Versioned under /api/v1. ' +
        'Request bodies and query DTOs are validated by the global ValidationPipe.',
    )
    .setVersion(APP_VERSION)
    .addBearerAuth()
    .addTag('health', 'Liveness, readiness, and process metrics')
    .addTag('auth', 'Email/password sessions')
    .addTag('users', 'Current user')
    .addTag('workspaces', 'Workspaces, members, and audit')
    .addTag('repositories', 'Repository ingestion and settings')
    .addTag('integrations', 'GitHub connection, issues, and pull requests')
    .addTag('webhooks', 'Verified GitHub webhook receiver')
    .addTag('history', 'Indexed Git history')
    .addTag('source', 'Indexed files and symbols')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [AuthUserSchema, AuthSessionSchema, WorkspaceSchema, RepositorySchema],
  });
  SwaggerModule.setup(SWAGGER_PATH, app, document, {
    jsonDocumentUrl: `${SWAGGER_PATH}/json`,
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}

export function swaggerUrl(host: string, port: number): string {
  return `http://${host === '0.0.0.0' ? 'localhost' : host}:${port}/${SWAGGER_PATH}`;
}
