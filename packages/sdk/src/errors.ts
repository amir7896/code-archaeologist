import { redactSecrets, redactUnknown } from './redact';

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(redactSecrets(message));
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details === undefined ? undefined : redactUnknown(details);
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function isAuthError(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 401 || Boolean(error.code?.startsWith('AUTH_')));
}

export function isNotFoundError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

export function exitCodeForError(error: unknown): number {
  if (!(error instanceof ApiError)) {
    return 1;
  }
  if (error.status === 401 || error.code?.startsWith('AUTH_')) {
    return 4;
  }
  if (error.status === 404) {
    return 5;
  }
  if (error.status === 400 || error.status === 422) {
    return 2;
  }
  return 1;
}

type ErrorBody = {
  code?: string;
  message?: unknown;
  details?: unknown;
  statusCode?: number;
};

export function errorFromResponse(status: number, body: unknown): ApiError {
  const parsed = (body && typeof body === 'object' ? body : {}) as ErrorBody;
  const nested = parsed.message;
  const message =
    typeof nested === 'string'
      ? nested
      : nested && typeof nested === 'object' && 'message' in nested && typeof nested.message === 'string'
        ? nested.message
        : status === 0
          ? 'Unable to reach the API'
          : `Request failed (${status})`;
  const code = typeof parsed.code === 'string' ? parsed.code : undefined;
  return new ApiError(status, message, code, parsed.details ?? nested);
}
