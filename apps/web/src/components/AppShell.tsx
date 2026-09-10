import { type FormEvent, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { BrandMark } from './BrandMark';
import { useAuth } from '../hooks/useAuth';
import { analysisContextLabel, isRepositoriesNavActive } from '../lib/explorer';
import { repositorySlug } from '../lib/format';
import {
  homePath,
  repositoryAskPath,
  repositoryCodePath,
  repositoryDnaPath,
  repositoryEvolutionPath,
  repositoryGraphPath,
  repositoryHistoryPath,
  repositoryImpactPath,
  repositoryPath,
  workspacePath,
  workspaceRepositoriesPath,
  workspaceSettingsPath,
} from '../lib/paths';
import { useRepositoriesQuery, useRepositoryQuery, useWorkspaceQuery } from '../queries';
import { iconButton, navItemActive, navItemIdle } from '../ui';

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen bg-ink text-zinc-100">
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-white/5 bg-sidebar xl:flex">
        <Brand />
        <SidebarNav />
        <UserFooter />
      </aside>

      {menuOpen ? (
        <div className="fixed inset-0 z-40 xl:hidden">
          <button
            className="absolute inset-0 bg-black/60"
            type="button"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col bg-sidebar shadow-2xl">
            <Brand />
            <SidebarNav />
            <UserFooter />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-white/5 bg-ink/90 px-4 backdrop-blur">
          <div className="flex min-w-0 items-center gap-3">
            <button
              className={`${iconButton} xl:hidden`}
              type="button"
              aria-label="Open menu"
              onClick={() => setMenuOpen(true)}
            >
              <MenuIcon />
            </button>
            <ContextBar />
          </div>
          <HeaderSearch />
          <div className="flex items-center justify-end gap-2">
            <RefreshButton />
            <SignOutButton />
            <UserDot />
          </div>
        </header>
        <main className="min-w-0 flex-1 bg-ink">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <div className="px-4 py-5">
      <BrandMark to={homePath} stacked />
    </div>
  );
}

function UserFooter() {
  const { user } = useAuth();
  const initials = (user?.name ?? 'U')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <div className="mt-auto border-t border-white/5 px-4 py-4">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-xs font-bold text-ink">
          {initials || 'CA'}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-white">{user?.name}</span>
          <span className="block truncate text-xs text-zinc-500">{user?.email}</span>
        </span>
      </div>
    </div>
  );
}

function SignOutButton() {
  const { logout } = useAuth();
  return (
    <button className={iconButton} type="button" aria-label="Sign out" onClick={() => void logout()}>
      <SignOutIcon />
    </button>
  );
}

function UserDot() {
  return <span className="hidden h-10 w-10 rounded-full bg-brand sm:block" aria-hidden="true" />;
}

function ContextBar() {
  const location = useLocation();
  const { workspaceId = '', repositoryId = '' } = useParams();
  const workspaceQuery = useWorkspaceQuery(workspaceId);
  const repositoryQuery = useRepositoryQuery(workspaceId, repositoryId);
  const workspace = workspaceQuery.data;
  const repository = repositoryQuery.data;

  if (!workspaceId) {
    return <p className="truncate text-sm font-medium text-zinc-300">Workspaces</p>;
  }

  if (location.pathname.endsWith('/settings')) {
    return (
      <p className="min-w-0 truncate text-sm text-zinc-400">
        <span>Settings</span>
        <span className="px-1.5 text-zinc-600">/</span>
        <span className="text-zinc-200">Workspace Settings</span>
      </p>
    );
  }

  if (location.pathname.endsWith('/repositories')) {
    return (
      <p className="min-w-0 truncate text-sm text-zinc-400">
        <span>Repositories</span>
        <span className="px-1.5 text-zinc-600">/</span>
        <span className="text-zinc-200">Connect New</span>
      </p>
    );
  }

  if (repositoryId) {
    const slug = repository ? repositorySlug(repository.url, repository.name) : 'Repository';
    const page = analysisContextLabel(location.pathname);
    return (
      <p className="min-w-0 truncate text-sm text-zinc-400">
        <span>Repositories</span>
        <span className="px-1.5 text-zinc-600">/</span>
        <span className="text-zinc-200">{page ?? slug}</span>
      </p>
    );
  }

  return (
    <p className="min-w-0 truncate text-sm text-zinc-400">
      <span className="text-zinc-200">{workspace?.name ?? 'Workspace'}</span>
      {repository ? (
        <>
          <span className="px-1.5 text-zinc-600">/</span>
          <span className="text-zinc-200">{repository.name}</span>
        </>
      ) : (
        <>
          <span className="px-1.5 text-zinc-600">/</span>
          <span>Workspace</span>
        </>
      )}
    </p>
  );
}

function HeaderSearch() {
  const { workspaceId = '', repositoryId = '' } = useParams();
  const navigate = useNavigate();
  const [value, setValue] = useState('');

  function submit(event: FormEvent) {
    event.preventDefault();
    const query = value.trim();
    if (!query || !workspaceId) {
      return;
    }
    if (repositoryId) {
      navigate(repositoryCodePath(workspaceId, repositoryId, { q: query }));
      return;
    }
    navigate(`${workspacePath(workspaceId)}?q=${encodeURIComponent(query)}`);
  }

  return (
    <form className="hidden min-w-0 sm:block" onSubmit={submit}>
      <label className="sr-only" htmlFor="product-search">
        Search
      </label>
      <input
        id="product-search"
        className="h-10 w-56 rounded-full border border-white/10 bg-panel px-4 text-center text-sm text-white outline-none placeholder:text-zinc-500 focus:border-brand md:w-72"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search anything…"
        disabled={!workspaceId}
      />
    </form>
  );
}

function RefreshButton() {
  const queryClient = useQueryClient();
  return (
    <button
      className={iconButton}
      type="button"
      aria-label="Refresh"
      onClick={() => void queryClient.invalidateQueries()}
    >
      <RefreshIcon />
    </button>
  );
}

function SidebarNav() {
  const location = useLocation();
  const { workspaceId = '', repositoryId = '' } = useParams();
  const workspaceQuery = useWorkspaceQuery(workspaceId);
  const repositoriesQuery = useRepositoriesQuery(workspaceId);
  const workspace = workspaceQuery.data;
  const canManage = workspace?.role === 'OWNER' || workspace?.role === 'ADMIN';
  const firstRepoId = repositoriesQuery.data?.items[0]?.id ?? '';
  const analysisRepoId = repositoryId || firstRepoId;

  if (!workspaceId) {
    return (
      <nav className="flex-1 overflow-y-auto px-3">
        <SectionLabel>Workspace</SectionLabel>
        <div className="space-y-0.5">
          <SideLink to={homePath} end>
            Home
          </SideLink>
        </div>
      </nav>
    );
  }

  return (
    <nav className="flex-1 overflow-y-auto px-3">
      <SectionLabel>Workspace</SectionLabel>
      <div className="space-y-0.5">
        <SideLink to={workspacePath(workspaceId)} end>
          Home
        </SideLink>
        <NavLink
          className={isRepositoriesNavActive(location.pathname) ? navItemActive : navItemIdle}
          to={
            repositoryId
              ? repositoryPath(workspaceId, repositoryId)
              : workspaceRepositoriesPath(workspaceId)
          }
        >
          <NavDot active={isRepositoriesNavActive(location.pathname)} />
          Repositories
        </NavLink>
      </div>

      <SectionLabel className="mt-6">Analysis</SectionLabel>
      <div className="space-y-0.5">
        <AnalysisLink
          enabled={Boolean(analysisRepoId)}
          to={analysisRepoId ? repositoryCodePath(workspaceId, analysisRepoId) : workspacePath(workspaceId)}
        >
          Explorer
        </AnalysisLink>
        <AnalysisLink
          enabled={Boolean(analysisRepoId)}
          to={analysisRepoId ? repositoryHistoryPath(workspaceId, analysisRepoId) : workspacePath(workspaceId)}
        >
          Commit Explorer
        </AnalysisLink>
        <AnalysisLink
          enabled={Boolean(analysisRepoId)}
          to={analysisRepoId ? repositoryGraphPath(workspaceId, analysisRepoId) : workspacePath(workspaceId)}
        >
          Architecture
        </AnalysisLink>
        <AnalysisLink
          enabled={Boolean(analysisRepoId)}
          to={analysisRepoId ? repositoryDnaPath(workspaceId, analysisRepoId) : workspacePath(workspaceId)}
        >
          Code DNA
        </AnalysisLink>
        <AnalysisLink
          enabled={Boolean(analysisRepoId)}
          to={analysisRepoId ? repositoryEvolutionPath(workspaceId, analysisRepoId) : workspacePath(workspaceId)}
        >
          Evolution
        </AnalysisLink>
        <AnalysisLink
          enabled={Boolean(analysisRepoId)}
          to={analysisRepoId ? repositoryImpactPath(workspaceId, analysisRepoId) : workspacePath(workspaceId)}
        >
          Impact Analysis
        </AnalysisLink>
        <AnalysisLink
          enabled={Boolean(analysisRepoId)}
          to={analysisRepoId ? repositoryAskPath(workspaceId, analysisRepoId) : workspacePath(workspaceId)}
        >
          Investigation
        </AnalysisLink>
        {analysisRepoId ? (
          <Link className={navItemIdle} to={repositoryDnaPath(workspaceId, analysisRepoId)}>
            <NavDot />
            Hotspots
          </Link>
        ) : (
          <DisabledLink>Hotspots</DisabledLink>
        )}
      </div>

      <SectionLabel className="mt-6">Admin</SectionLabel>
      <div className="space-y-0.5">
        {canManage ? (
          <SideLink to={workspaceSettingsPath(workspaceId)}>Settings</SideLink>
        ) : (
          <DisabledLink>Settings</DisabledLink>
        )}
        <DisabledLink title="Operations is not available yet">Operations</DisabledLink>
      </div>
    </nav>
  );
}

function SectionLabel({ children, className = '' }: { children: string; className?: string }) {
  return (
    <p className={`px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 ${className}`}>
      {children}
    </p>
  );
}

function SideLink({
  to,
  end = true,
  children,
}: {
  to: string;
  end?: boolean;
  children: string;
}) {
  return (
    <NavLink className={({ isActive }) => (isActive ? navItemActive : navItemIdle)} to={to} end={end}>
      {({ isActive }) => (
        <>
          <NavDot active={isActive} />
          {children}
        </>
      )}
    </NavLink>
  );
}

function AnalysisLink({
  to,
  enabled,
  children,
}: {
  to: string;
  enabled: boolean;
  children: string;
}) {
  if (!enabled) {
    return <DisabledLink>{children}</DisabledLink>;
  }
  return <SideLink to={to}>{children}</SideLink>;
}

function DisabledLink({
  children,
  title = 'Open a repository first',
}: {
  children: string;
  title?: string;
}) {
  return (
    <span className={`${navItemIdle} cursor-not-allowed opacity-40`} title={title}>
      <NavDot />
      {children}
    </span>
  );
}

function NavDot({ active = false }: { active?: boolean }) {
  return (
    <span
      className={`h-2.5 w-2.5 shrink-0 rounded-full ${active ? 'bg-brand' : 'bg-zinc-600'}`}
      aria-hidden="true"
    />
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" d="M4 6h12M4 10h12M4 14h12" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" d="M16 10a6 6 0 1 1-1.7-4.2M16 4v4h-4" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" d="M8 4h8v12H8M11 10H3m0 0 3-3M3 10l3 3" />
    </svg>
  );
}
