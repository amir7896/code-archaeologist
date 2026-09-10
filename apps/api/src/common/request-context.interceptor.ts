import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { redactSecrets } from '@code-archaeologist/shared';
import { Observable, tap } from 'rxjs';
import { recordHttpResult } from './metrics';
import { resolveRequestId } from './request-id';

type HttpRequest = {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
  requestId?: string;
};

type HttpResponse = {
  statusCode: number;
  setHeader(name: string, value: string): void;
};

@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestContextInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<HttpRequest>();
    const response = context.switchToHttp().getResponse<HttpResponse>();
    const requestId = resolveRequestId(request.headers['x-request-id']);
    request.requestId = requestId;
    response.setHeader('x-request-id', requestId);
    const started = Date.now();

    return next.handle().pipe(
      tap({
        next: () => this.finish(request, requestId, started, response.statusCode),
        error: (error: { status?: number }) =>
          this.finish(request, requestId, started, error.status ?? 500),
      }),
    );
  }

  private finish(request: HttpRequest, requestId: string, started: number, status: number): void {
    recordHttpResult(status);
    this.logger.log(
      JSON.stringify({
        requestId,
        method: request.method ?? 'GET',
        path: redactSecrets(String(request.url ?? '')),
        status,
        ms: Date.now() - started,
      }),
    );
  }
}
