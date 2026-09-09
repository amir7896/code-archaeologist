import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { formatRole, formatStatus, repositoryHost, repositorySummary } from '../lib/format';
import {
  repositoryPath,
  repositoryCodePath,
  repositoryDnaPath,
  repositoryGraphPath,
  repositoryEvolutionPath,
  repositoryImpactPath,
  repositoryHistoryPath,
  repositorySettingsPath,
  workspacePath,
  workspacePeoplePath,
  workspaceSettingsPath,
} from '../lib/paths';
import {
  useRepositoriesQuery,
  useRepositoryQuery,
  useWorkspaceQuery,
  useWorkspacesQuery,
} from '../queries';
import { muted, navItemActive, navItemIdle, secondaryButton } from '../ui';

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-zinc-200 bg-white lg:flex">
        <Brand />
        <SidebarNav />
      </aside>

      {menuOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            className="absolute inset-0 bg-zinc-950/30"
            type="button"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="relative flex h-full w-80 max-w-[85vw] flex-col bg-white shadow-xl">
            <Brand />
            <SidebarNav />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-zinc-200 bg-white/90 px-4 backdrop-blur">
          <div className="flex min-w-0 items-center gap-3">
            <button
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-700 lg:hidden"
              type="button"
              aria-label="Open menu"
              onClick={() => setMenuOpen(true)}
            >
              <MenuIcon />
            </button>
            <ContextBar />
          </div>
          <UserMenu />
        </header>
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <Link className="flex h-14 items-center gap-2 border-b border-zinc-100 px-4" to="/">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">
        CA
      </span>
      <span className="text-sm font-semibold tracking-tight text-zinc-950">Code Archaeologist</span>
    </Link>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  return (
    <div className="flex shrink-0 items-center gap-3">
      <span className={`hidden sm:block ${muted}`}>{user?.name}</span>
      <button className={secondaryButton} type="button" onClick={() => void logout()}>
        Sign out
      </button>
    </div>
  );
}

function ContextBar() {
  const { workspaceId = '', repositoryId = '' } = useParams();
  const workspaceQuery = useWorkspaceQuery(workspaceId);
  const repositoryQuery = useRepositoryQuery(workspaceId, repositoryId);
  const workspace = workspaceQuery.data;
  const repository = repositoryQuery.data;

  if (!workspaceId) {
    return <p className="text-sm font-semibold text-zinc-900">Workspaces</p>;
  }

  return (
    <div className="min-w-0 text-sm">
      <p className="truncate font-semibold text-zinc-900">
        {workspace?.name ?? 'Workspace'}
        {repository ? <span className="font-normal text-zinc-400"> / </span> : null}
        {repository ? <span>{repository.name}</span> : null}
      </p>
      {workspace ? (
        <p className="truncate text-xs text-zinc-500">{formatRole(workspace.role)}</p>
      ) : null}
    </div>
  );
}

function SidebarNav() {
  const { workspaceId = '', repositoryId = '' } = useParams();
  const workspacesQuery = useWorkspacesQuery();
  const workspaceQuery = useWorkspaceQuery(workspaceId);
  const repositoriesQuery = useRepositoriesQuery(workspaceId);
  const repositoryQuery = useRepositoryQuery(workspaceId, repositoryId);
  const workspaces = workspacesQuery.data?.items ?? [];
  const repositories = repositoriesQuery.data?.items ?? [];
  const workspace = workspaceQuery.data;
  const canManage = workspace?.role === 'OWNER' || workspace?.role === 'ADMIN';

  if (!workspaceId) {
    return (
      <nav className="flex-1 overflow-y-auto p-3">
        <SectionLabel>Your workspaces</SectionLabel>
        <p className="mb-3 px-2.5 text-xs leading-5 text-zinc-500">
          A workspace holds people and the Git repositories you analyze.
        </p>
        <div className="space-y-1">
          {workspaces.map((item) => (
            <NavLink
              key={item.id}
              className={({ isActive }) => `${isActive ? navItemActive : navItemIdle} items-start`}
              to={workspacePath(item.id)}
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{item.name}</span>
                <span className="mt-0.5 block truncate text-xs font-normal text-zinc-500">
                  {formatRole(item.role)} · {formatStatus(item.status)}
                </span>
              </span>
            </NavLink>
          ))}
        </div>
      </nav>
    );
  }

  if (repositoryId) {
    const current = repositoryQuery.data;
    return (
      <nav className="flex-1 overflow-y-auto p-3">
        <Link className={`${navItemIdle} mb-3`} to={workspacePath(workspaceId)}>
          ← All repositories
        </Link>
        <div className="mb-4 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Now viewing</p>
          <p className="mt-1 truncate text-sm font-semibold text-zinc-900">
            {current?.name ?? 'Repository'}
          </p>
          {current ? (
            <p className="mt-1 truncate text-xs text-zinc-500">
              {repositoryHost(current.url)} · {repositorySummary(current)}
            </p>
          ) : null}
        </div>
        <SectionLabel>In this repository</SectionLabel>
        <div className="space-y-0.5">
          <SideLink to={repositoryPath(workspaceId, repositoryId)} end>
            Overview
          </SideLink>
          <SideLink to={repositoryCodePath(workspaceId, repositoryId)}>Code</SideLink>
          <SideLink to={repositoryGraphPath(workspaceId, repositoryId)}>Architecture</SideLink>
          <SideLink to={repositoryDnaPath(workspaceId, repositoryId)}>Code DNA</SideLink>
          <SideLink to={repositoryImpactPath(workspaceId, repositoryId)}>Impact</SideLink>
          <SideLink to={repositoryEvolutionPath(workspaceId, repositoryId)}>Evolution</SideLink>
          <SideLink to={repositoryHistoryPath(workspaceId, repositoryId)}>History</SideLink>
          {canManage ? (
            <SideLink to={repositorySettingsPath(workspaceId, repositoryId)}>Settings</SideLink>
          ) : null}
        </div>
      </nav>
    );
  }

  return (
    <nav className="flex-1 overflow-y-auto p-3">
      <Link className={`${navItemIdle} mb-3`} to="/">
        ← All workspaces
      </Link>
      <div className="mb-4 px-2.5">
        <p className="text-sm font-semibold text-zinc-900">{workspace?.name ?? 'Workspace'}</p>
        {workspace ? (
          <p className="mt-0.5 text-xs text-zinc-500">
            {formatRole(workspace.role)} · {formatStatus(workspace.status)}
          </p>
        ) : null}
      </div>
      <SectionLabel>Workspace</SectionLabel>
      <div className="space-y-0.5">
        <SideLink to={workspacePath(workspaceId)} end>
          Overview
        </SideLink>
        <SideLink to={workspacePeoplePath(workspaceId)}>People</SideLink>
        {canManage ? <SideLink to={workspaceSettingsPath(workspaceId)}>Settings</SideLink> : null}
      </div>
      <SectionLabel className="mt-6">Repositories in this workspace</SectionLabel>
      <p className="mb-2 px-2.5 text-xs leading-5 text-zinc-500">
        Open a repository to inspect its code and history.
      </p>
      {repositories.length > 0 ? (
        <div className="space-y-1">
          {repositories.map((repository) => (
            <NavLink
              key={repository.id}
              className={({ isActive }) => `${isActive ? navItemActive : navItemIdle} items-start`}
              to={repositoryPath(workspaceId, repository.id)}
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{repository.name}</span>
                <span className="mt-0.5 block truncate text-xs font-normal text-zinc-500">
                  {repositoryHost(repository.url)} · {repositorySummary(repository)}
                </span>
              </span>
            </NavLink>
          ))}
        </div>
      ) : (
        <p className="px-2.5 text-xs text-zinc-500">None yet. Add one from Overview.</p>
      )}
    </nav>
  );
}

function SectionLabel({ children, className = '' }: { children: string; className?: string }) {
  return (
    <p className={`px-2.5 pb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400 ${className}`}>
      {children}
    </p>
  );
}

function SideLink({
  to,
  end,
  children,
}: {
  to: string;
  end?: boolean;
  children: string;
}) {
  return (
    <NavLink className={({ isActive }) => (isActive ? navItemActive : navItemIdle)} to={to} end={end}>
      {children}
    </NavLink>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" d="M4 6h12M4 10h12M4 14h12" />
    </svg>
  );
}
