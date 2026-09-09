import { afterEach, describe, expect, it } from 'vitest';
import { ApiError, isTransientApiError } from './api';
import { clearStoredSession, peekTokens, readStoredSession, writeStoredSession } from './session';

afterEach(() => {
  clearStoredSession();
});

describe('session storage', () => {
  it('persists the user with the tokens in localStorage', () => {
    writeStoredSession({
      user: {
        id: 'user-1',
        email: 'ada@example.com',
        name: 'Ada',
        status: 'ACTIVE',
        createdAt: '2026-09-10',
      },
      tokens: {
        accessToken: 'access',
        refreshToken: 'refresh',
        tokenType: 'Bearer',
        expiresIn: 900,
      },
    });

    expect(window.sessionStorage.getItem('ca.auth')).toBeNull();
    expect(readStoredSession().user?.email).toBe('ada@example.com');
    expect(peekTokens()?.refreshToken).toBe('refresh');
  });

  it('reads the older tokens-only sessionStorage format', () => {
    window.sessionStorage.setItem(
      'ca.auth',
      JSON.stringify({
        accessToken: 'access',
        refreshToken: 'refresh',
        tokenType: 'Bearer',
        expiresIn: 900,
      }),
    );

    expect(readStoredSession().tokens?.accessToken).toBe('access');
    expect(readStoredSession().user).toBeNull();
  });
});

describe('transient API errors', () => {
  it('treats API restarts as recoverable, not as a signed-out session', () => {
    expect(isTransientApiError(new ApiError(503, 'starting'))).toBe(true);
    expect(isTransientApiError(new ApiError(502, 'bad gateway'))).toBe(true);
    expect(isTransientApiError(new Error('network'))).toBe(true);
    expect(isTransientApiError(new ApiError(401, 'unauthorized'))).toBe(false);
  });
});
