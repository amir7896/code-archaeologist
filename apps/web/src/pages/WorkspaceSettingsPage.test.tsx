import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { ConfirmProvider } from '../components/ConfirmDialog';
import { WorkspaceSettingsPage } from './WorkspacePage';

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1', name: 'Amir' } }),
}));

vi.mock('../queries', () => ({
  useWorkspaceQuery: () => ({
    data: { id: 'ws-1', name: 'Test Work Space 1', role: 'OWNER', status: 'ACTIVE' },
    isPending: false,
    error: null,
  }),
  useMembersQuery: () => ({ data: { items: [] }, isPending: false, error: null }),
  useAuditLogsQuery: () => ({ data: { items: [] }, isPending: false, error: null }),
  useUpdateWorkspaceMutation: () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
    error: null,
  }),
  useDeleteWorkspaceMutation: () => ({ mutateAsync: vi.fn(), isPending: false, error: null }),
  useInviteMemberMutation: () => ({ mutateAsync: vi.fn(), error: null }),
  useUpdateMemberMutation: () => ({ mutate: vi.fn(), error: null }),
  useRemoveMemberMutation: () => ({ mutateAsync: vi.fn(), error: null }),
  useRepositoriesQuery: () => ({
    data: {
      items: [
        {
          id: 'repo-1',
          provider: 'GITHUB',
          settings: { respectGitignore: true, includePullRequests: true },
        },
      ],
    },
  }),
  useAiStatusQuery: () => ({ data: { available: true, provider: 'ollama', model: 'llama3.1:8b' } }),
}));

function renderSettings(search = '') {
  return render(
    <ConfirmProvider>
      <MemoryRouter initialEntries={[`/work-space/ws-1/settings${search}`]}>
        <Routes>
          <Route path="/work-space/:workspaceId/settings" element={<WorkspaceSettingsPage />} />
        </Routes>
      </MemoryRouter>
    </ConfirmProvider>,
  );
}

describe('WorkspaceSettingsPage', () => {
  it('matches the settings layout without inventing hosted AI or incremental sync', () => {
    renderSettings();
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeTruthy();
    expect(
      screen.getByText('AI provider, analysis rules, integrations, retention and members.'),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'AI Provider' })).toBeTruthy();
    expect(screen.getByText('Ollama (local)')).toBeTruthy();
    expect(screen.getByText('Active')).toBeTruthy();
    expect(screen.getByText('Hosted provider (opt-in)')).toBeTruthy();
    expect(screen.getByText('Disabled')).toBeTruthy();
    expect(screen.getByText('Ignore vendor/generated files')).toBeTruthy();
    expect(screen.getByText('Incremental sync')).toBeTruthy();
    expect(screen.getByText(/Every analysis run is Full/)).toBeTruthy();
    expect(screen.getByText('Webhooks')).toBeTruthy();
    expect(screen.getByText('Not available')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Archive Workspace' })).toBeTruthy();
  });

  it('opens the members tab', () => {
    renderSettings();
    fireEvent.click(screen.getByRole('button', { name: 'Members' }));
    expect(screen.getByLabelText('Email')).toBeTruthy();
  });
});
