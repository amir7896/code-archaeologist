import { resolveRequestId } from './request-id';

describe('resolveRequestId', () => {
  it('accepts a safe incoming request id', () => {
    expect(resolveRequestId('client-req-1234')).toBe('client-req-1234');
  });

  it('rejects header values that could inject logs', () => {
    expect(resolveRequestId('bad id\nAuthorization: Bearer abc')).not.toContain('Bearer');
    expect(resolveRequestId('x')).toMatch(/[0-9a-f-]{36}/);
  });
});
