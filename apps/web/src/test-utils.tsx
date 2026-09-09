import { render, type RenderOptions } from '@testing-library/react';
import { type ReactElement, type ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AppProviders, createTestProviders } from './store/providers';

export function renderApp(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'> & { route?: string }) {
  const { store, queryClient } = createTestProviders();
  const route = options?.route ?? '/';

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[route]}>
        <AppProviders appStore={store} queryClient={queryClient}>
          {children}
        </AppProviders>
      </MemoryRouter>
    );
  }

  return render(ui, { wrapper: Wrapper, ...options });
}
