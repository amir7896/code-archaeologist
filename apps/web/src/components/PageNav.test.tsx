import { screen } from '@testing-library/react';
import { renderApp } from '../test-utils';
import { PageNav } from './PageNav';

describe('PageNav', () => {
  it('shows a back link a user can follow', () => {
    renderApp(<PageNav backTo="/" backLabel="Back to workspaces" />, { route: '/workspaces/ws-1' });
    expect(screen.getByRole('link', { name: 'Back to workspaces' })).toBeTruthy();
  });
});
