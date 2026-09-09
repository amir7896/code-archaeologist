import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { useEffect, type ReactNode } from 'react';
import { Provider } from 'react-redux';
import { ConfirmProvider } from '../components/ConfirmDialog';
import { authApi, isTransientApiError } from '../api';
import { queryKeys } from '../queries';
import { markedReady, sessionCleared, userLoaded } from './auth-slice';
import { useAppDispatch, useAppSelector } from './hooks';
import { createStore, store, type AppStore } from './store';

const defaultQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function SessionBootstrap({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const tokens = useAppSelector((state) => state.auth.tokens);
  const user = useAppSelector((state) => state.auth.user);

  const me = useQuery({
    queryKey: queryKeys.me,
    queryFn: authApi.me,
    enabled: Boolean(tokens) && !user,
    retry: (count, error) => isTransientApiError(error) && count < 8,
    retryDelay: 1_000,
  });

  useEffect(() => {
    if (!tokens) {
      dispatch(markedReady());
      return;
    }
    if (user) {
      dispatch(markedReady());
      return;
    }
    if (me.isSuccess) {
      dispatch(userLoaded(me.data));
    }
    if (me.isError && !isTransientApiError(me.error)) {
      dispatch(sessionCleared());
    }
    if (me.isError && isTransientApiError(me.error)) {
      dispatch(markedReady());
    }
  }, [dispatch, me.data, me.error, me.isError, me.isSuccess, tokens, user]);

  return children;
}

export function AppProviders({
  children,
  appStore = store,
  queryClient = defaultQueryClient,
}: {
  children: ReactNode;
  appStore?: AppStore;
  queryClient?: QueryClient;
}) {
  return (
    <Provider store={appStore}>
      <QueryClientProvider client={queryClient}>
        <SessionBootstrap>
          <ConfirmProvider>{children}</ConfirmProvider>
        </SessionBootstrap>
      </QueryClientProvider>
    </Provider>
  );
}

export function createTestProviders() {
  return {
    store: createStore(),
    queryClient: new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    }),
  };
}
