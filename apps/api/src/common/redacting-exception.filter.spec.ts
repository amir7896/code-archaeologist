import { HttpException, HttpStatus } from '@nestjs/common';
import { RedactingExceptionFilter } from './redacting-exception.filter';

describe('RedactingExceptionFilter', () => {
  it('keeps API error codes and adds a request id', () => {
    const json = jest.fn();
    const response = { status: jest.fn().mockReturnValue({ json }) };
    const filter = new RedactingExceptionFilter();
    filter.catch(new HttpException({ code: 'AUTH_UNAUTHORIZED', message: 'Missing' }, HttpStatus.UNAUTHORIZED), {
      switchToHttp: () => ({
        getRequest: () => ({ requestId: 'req-1', headers: {} }),
        getResponse: () => response,
      }),
    } as never);
    expect(response.status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'AUTH_UNAUTHORIZED', requestId: 'req-1' }),
    );
  });

  it('redacts token-shaped values in error payloads', () => {
    const json = jest.fn();
    const response = { status: jest.fn().mockReturnValue({ json }) };
    const filter = new RedactingExceptionFilter();
    filter.catch(
      new HttpException({ code: 'BAD', message: 'Bearer abc.def.ghi-secret', token: 'secret' }, HttpStatus.BAD_REQUEST),
      {
        switchToHttp: () => ({
          getRequest: () => ({ requestId: 'req-2', headers: {} }),
          getResponse: () => response,
        }),
      } as never,
    );
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('[redacted]'),
        token: '[redacted]',
        requestId: 'req-2',
      }),
    );
  });

  it('hides unexpected errors', () => {
    const json = jest.fn();
    const response = { status: jest.fn().mockReturnValue({ json }) };
    const filter = new RedactingExceptionFilter();
    filter.catch(new Error('Bearer leaked-token-value'), {
      switchToHttp: () => ({
        getRequest: () => ({ headers: {} }),
        getResponse: () => response,
      }),
    } as never);
    expect(response.status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' }),
    );
  });
});
