import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { redactSecrets, redactUnknown } from '@code-archaeologist/shared';
import { resolveRequestId } from './request-id';

type HttpRequest = {
  headers?: Record<string, string | string[] | undefined>;
  requestId?: string;
};

type HttpResponse = {
  status(code: number): HttpResponse;
  json(body: unknown): void;
};

@Catch()
export class RedactingExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(RedactingExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<HttpRequest>();
    const response = http.getResponse<HttpResponse>();
    const requestId = request.requestId ?? resolveRequestId(request.headers?.['x-request-id']);

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      if (body && typeof body === 'object') {
        response.status(status).json({ ...(redactUnknown(body) as Record<string, unknown>), requestId });
        return;
      }
      response.status(status).json({
        code: 'HTTP_ERROR',
        message: redactSecrets(String(body)),
        requestId,
      });
      return;
    }

    this.logger.error(redactSecrets(exception instanceof Error ? exception.message : 'unknown error'));
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      requestId,
    });
  }
}
