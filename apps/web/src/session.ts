import { type Tokens, type User } from './api';

const STORAGE_KEY = 'ca.auth';

export type StoredSession = {
  user: User | null;
  tokens: Tokens | null;
};

type TokenStore = {
  get(): Tokens | null;
  set(tokens: Tokens | null): void;
};

let liveStore: TokenStore | null = null;

export function configureTokenStore(store: TokenStore): void {
  liveStore = store;
}

export function peekTokens(): Tokens | null {
  return liveStore?.get() ?? readStoredSession().tokens;
}

export function putTokens(tokens: Tokens | null): void {
  if (liveStore) {
    liveStore.set(tokens);
    return;
  }
  const current = readStoredSession();
  writeStoredSession(tokens ? { tokens, user: current.user } : null);
}

export function readStoredSession(): StoredSession {
  const raw = window.localStorage.getItem(STORAGE_KEY) ?? window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { user: null, tokens: null };
  }
  try {
    const value = JSON.parse(raw) as Partial<Tokens> & { user?: User | null; tokens?: Tokens | null };
    const tokens = parseTokens(value);
    if (!tokens) {
      clearStoredSession();
      return { user: null, tokens: null };
    }
    return { user: value.user ?? null, tokens };
  } catch {
    clearStoredSession();
    return { user: null, tokens: null };
  }
}

export function writeStoredSession(session: StoredSession | null): void {
  window.sessionStorage.removeItem(STORAGE_KEY);
  if (!session?.tokens) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      user: session.user,
      tokens: {
        accessToken: session.tokens.accessToken,
        refreshToken: session.tokens.refreshToken,
        tokenType: session.tokens.tokenType,
        expiresIn: session.tokens.expiresIn,
      },
    }),
  );
}

export function clearStoredSession(): void {
  window.localStorage.removeItem(STORAGE_KEY);
  window.sessionStorage.removeItem(STORAGE_KEY);
}

function parseTokens(value: Partial<Tokens> & { tokens?: Tokens | null }): Tokens | null {
  const source = value.tokens ?? value;
  if (!source.accessToken || !source.refreshToken) {
    return null;
  }
  return {
    accessToken: source.accessToken,
    refreshToken: source.refreshToken,
    tokenType: source.tokenType === 'Bearer' ? 'Bearer' : 'Bearer',
    expiresIn: typeof source.expiresIn === 'number' ? source.expiresIn : 0,
  };
}
