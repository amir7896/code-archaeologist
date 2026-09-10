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
  useGithubIntegrationQuery: () => ({
    data: {
      connected: false,
      oauthAvailable: false,
      webhookConfigured: false,
      webhookUrl: 'http://localhost:3000/api/v1/webhooks/github/ws-1',
    },
  }),
  useConnectGithubMutation: () => ({ mutateAsync: vi.fn(), data: null, error: null, isPending: false }),
  useSyncGithubMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useDisconnectGithubMutation: () => ({ mutate: vi.fn(), isPending: false }),
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
  it('shows only the AI provider card on the default tab', () => {
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
    expect(screen.queryByText('Ignore vendor/generated files')).toBeNull();
    expect(screen.queryByText('Webhooks')).toBeNull();
    expect(screen.queryByLabelText('GitHub personal access token')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Archive Workspace' })).toBeNull();
  });

  it('opens the analysis rules tab without claiming incremental sync', () => {
    renderSettings();
    fireEvent.click(screen.getByRole('button', { name: 'Analysis Rules' }));
    expect(screen.getByText('Ignore vendor/generated files')).toBeTruthy();
    expect(screen.getByText('Incremental sync')).toBeTruthy();
    expect(screen.getByText(/Every analysis run is Full/)).toBeTruthy();
    expect(screen.queryByLabelText('GitHub personal access token')).toBeNull();
  });

  it('opens the integrations tab with GitHub connect controls', () => {
    renderSettings();
    fireEvent.click(screen.getByRole('button', { name: 'Integrations' }));
    expect(screen.getByRole('heading', { name: 'GitHub' })).toBeTruthy();
    expect(screen.getByText('Webhooks')).toBeTruthy();
    expect(screen.getByText('Not configured')).toBeTruthy();
    expect(screen.getByLabelText('GitHub personal access token')).toBeTruthy();
    expect(screen.queryByText('Ollama (local)')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Archive Workspace' })).toBeNull();
  });

  it('opens the retention tab with danger-zone actions', () => {
    renderSettings();
    fireEvent.click(screen.getByRole('button', { name: 'Retention' }));
    expect(screen.getByRole('button', { name: 'Archive Workspace' })).toBeTruthy();
    expect(screen.queryByLabelText('GitHub personal access token')).toBeNull();
  });

  it('opens the members tab', () => {
    renderSettings();
    fireEvent.click(screen.getByRole('button', { name: 'Members' }));
    expect(screen.getByLabelText('Email')).toBeTruthy();
  });

  it('deep-links to the integrations tab', () => {
    renderSettings('?tab=integrations');
    expect(screen.getByLabelText('GitHub personal access token')).toBeTruthy();
    expect(screen.queryByText('Ollama (local)')).toBeNull();
  });
});
