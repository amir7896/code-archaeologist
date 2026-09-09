import { HttpException, HttpStatus } from '@nestjs/common';

export class ApiException extends HttpException {
  constructor(status: HttpStatus, code: string, message: string) {
    super({ code, message }, status);
  }
}

export const ApiErrors = {
  unauthorized: (message = 'Authentication required') =>
    new ApiException(HttpStatus.UNAUTHORIZED, 'AUTH_UNAUTHORIZED', message),
  invalidCredentials: () =>
    new ApiException(HttpStatus.UNAUTHORIZED, 'AUTH_INVALID_CREDENTIALS', 'Invalid email or password'),
  disabled: () => new ApiException(HttpStatus.FORBIDDEN, 'AUTH_DISABLED', 'This account is disabled'),
  forbidden: (message = 'You do not have permission to perform this action') =>
    new ApiException(HttpStatus.FORBIDDEN, 'AUTH_FORBIDDEN', message),
  notFound: (code: string, message: string) => new ApiException(HttpStatus.NOT_FOUND, code, message),
  conflict: (code: string, message: string) => new ApiException(HttpStatus.CONFLICT, code, message),
};
