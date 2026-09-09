import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { APP_NAME, APP_VERSION } from '@code-archaeologist/shared';

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
    .addTag('health', 'Liveness and readiness')
    .build();

  const document = SwaggerModule.createDocument(app, config);
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
