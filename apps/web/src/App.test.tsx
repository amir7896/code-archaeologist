import { render, screen } from '@testing-library/react';
import { App } from './App';

describe('App', () => {
  beforeEach(() => {
    globalThis.fetch = Object.assign(
      async () =>
        new Response(JSON.stringify({ status: 'ok', service: 'api', version: '0.1.0' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      { preconnect: () => undefined },
    ) as typeof fetch;
  });

  it('renders the product name', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Code Archaeologist' })).toBeTruthy();
  });
});
