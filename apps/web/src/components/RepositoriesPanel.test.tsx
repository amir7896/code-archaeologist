import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { RepositoriesPanel } from './RepositoriesPanel';

vi.mock('../queries', () => ({
  useRepositoriesQuery: () => ({ data: { items: [] }, isPending: false }),
  useCreateRepositoryMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

describe('RepositoriesPanel', () => {
  it('enables the connect-screen analysis options', () => {
    render(
      <MemoryRouter>
        <RepositoriesPanel workspaceId="ws-1" canAdd archived={false} />
      </MemoryRouter>,
    );

    const pullRequests = screen.getByRole('checkbox', { name: /Include pull requests and issues/i });
    const gitignore = screen.getByRole('checkbox', { name: /Respect \.gitignore/i });
    expect((pullRequests as HTMLInputElement).disabled).toBe(false);
    expect((gitignore as HTMLInputElement).disabled).toBe(false);
    expect((pullRequests as HTMLInputElement).checked).toBe(true);
    expect((gitignore as HTMLInputElement).checked).toBe(true);
    expect(screen.getByRole('button', { name: 'Connect & Analyze' })).toBeTruthy();
  });
});
