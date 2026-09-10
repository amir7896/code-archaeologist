import { renderApp } from './test-utils';
import { screen } from '@testing-library/react';
import { App } from './App';

describe('App', () => {
  it('renders the public landing page when logged out', () => {
    renderApp(<App />, { route: '/' });
    expect(screen.getByRole('heading', { name: 'Understand the why behind your code.' })).toBeTruthy();
  });

  it('renders sign in when logged out', () => {
    renderApp(<App />, { route: '/login' });
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeTruthy();
  });
});
