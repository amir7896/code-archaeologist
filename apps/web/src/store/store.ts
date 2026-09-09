import { configureStore } from '@reduxjs/toolkit';
import { configureTokenStore } from '../api';
import { authReducer, createAuthState, tokensUpdated } from './auth-slice';

export function createStore() {
  const store = configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: {
      auth: createAuthState(),
    },
  });

  configureTokenStore({
    get: () => store.getState().auth.tokens,
    set: (tokens) => {
      store.dispatch(tokensUpdated(tokens));
    },
  });

  return store;
}

export const store = createStore();

export type AppStore = ReturnType<typeof createStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
