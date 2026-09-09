import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { type AuthSession, type Tokens, type User } from '../api';
import { readTokens, writeTokens } from '../session';

export type AuthState = {
  user: User | null;
  tokens: Tokens | null;
  ready: boolean;
};

export function createAuthState(): AuthState {
  const tokens = readTokens();
  return {
    user: null,
    tokens,
    ready: !tokens,
  };
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
      writeTokens(tokens);
    },
    tokensUpdated(state, action: PayloadAction<Tokens | null>) {
      state.tokens = action.payload;
      writeTokens(action.payload);
      if (!action.payload) {
        state.user = null;
        state.ready = true;
      }
    },
    userLoaded(state, action: PayloadAction<User>) {
      state.user = action.payload;
      state.ready = true;
    },
    sessionCleared(state) {
      state.user = null;
      state.tokens = null;
      state.ready = true;
      writeTokens(null);
    },
    markedReady(state) {
      state.ready = true;
    },
  },
});

export const { sessionEstablished, tokensUpdated, userLoaded, sessionCleared, markedReady } = authSlice.actions;
export const authReducer = authSlice.reducer;
