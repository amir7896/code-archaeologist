import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { secondaryButton } from '../ui';

export function AppShell() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-4">
          <nav className="flex items-center gap-4">
            <Link className="text-sm font-semibold tracking-tight text-zinc-950" to="/">
              Code Archaeologist
            </Link>
            <Link className="text-sm font-medium text-zinc-500 hover:text-zinc-800" to="/">
              Workspaces
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-zinc-500 sm:block">{user?.name}</span>
            <button className={secondaryButton} type="button" onClick={() => void logout()}>
              Sign out
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-4xl px-6 py-8">
        <Outlet />
      </div>
    </div>
  );
}
