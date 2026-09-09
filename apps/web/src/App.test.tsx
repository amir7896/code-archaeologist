import { renderApp } from './test-utils';
import { screen } from '@testing-library/react';
import { App } from './App';

describe('App', () => {
  it('renders sign in when logged out', () => {
    renderApp(<App />, { route: '/login' });
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeTruthy();
  });
});
