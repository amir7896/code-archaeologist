import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { type AuthSession, type Tokens, type User } from '../api';
import { readStoredSession, writeStoredSession } from '../session';

export type AuthState = {
  user: User | null;
  tokens: Tokens | null;
  ready: boolean;
};

export function createAuthState(): AuthState {
  const stored = readStoredSession();
  return {
    user: stored.user,
    tokens: stored.tokens,
    ready: Boolean(stored.user) || !stored.tokens,
  };
}

function persist(state: AuthState): void {
  writeStoredSession(state.tokens ? { user: state.user, tokens: state.tokens } : null);
}

const authSlice = createSlice({
  name: 'auth',
  initialState: createAuthState(),
  reducers: {
    sessionEstablished(state, action: PayloadAction<AuthSession>) {
      const { user, ...tokens } = action.payload;
      state.user = user;
      state.tokens = tokens;
      state.ready = true;
      persist(state);
    },
    tokensUpdated(state, action: PayloadAction<Tokens | null>) {
      state.tokens = action.payload;
      if (!action.payload) {
        state.user = null;
        state.ready = true;
      }
      persist(state);
    },
    userLoaded(state, action: PayloadAction<User>) {
      state.user = action.payload;
      state.ready = true;
      persist(state);
    },
    sessionCleared(state) {
      state.user = null;
      state.tokens = null;
      state.ready = true;
      persist(state);
    },
    markedReady(state) {
      state.ready = true;
    },
  },
});

export const { sessionEstablished, tokensUpdated, userLoaded, sessionCleared, markedReady } = authSlice.actions;
export const authReducer = authSlice.reducer;
