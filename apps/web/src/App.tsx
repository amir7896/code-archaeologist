import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { useAuth } from './hooks/useAuth';
import { CommitPage } from './pages/CommitPage';
import { CommitsPage } from './pages/CommitsPage';
import { DashboardPage } from './pages/DashboardPage';
import { FileHistoryPage } from './pages/FileHistoryPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { RegisterPage } from './pages/RegisterPage';
import { RepositoryPage } from './pages/RepositoryPage';
import { WorkspacePage } from './pages/WorkspacePage';

function RequireAuth() {
  const { user, ready } = useAuth();
  if (!ready) {
    return <main className="p-8 text-sm text-zinc-500">Signing you in…</main>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/workspaces/:workspaceId" element={<WorkspacePage />} />
          <Route
            path="/workspaces/:workspaceId/repositories/:repositoryId"
            element={<RepositoryPage />}
          />
          <Route
            path="/workspaces/:workspaceId/repositories/:repositoryId/commits"
            element={<CommitsPage />}
          />
          <Route
            path="/workspaces/:workspaceId/repositories/:repositoryId/commits/:sha"
            element={<CommitPage />}
          />
          <Route
            path="/workspaces/:workspaceId/repositories/:repositoryId/files"
            element={<FileHistoryPage />}
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
