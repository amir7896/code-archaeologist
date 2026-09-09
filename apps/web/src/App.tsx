import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { useAuth } from './hooks/useAuth';
import { ArchitectureMapPage } from './pages/ArchitectureMapPage';
import { CodeDnaPage } from './pages/CodeDnaPage';
import { AskPage } from './pages/AskPage';
import { EvolutionPage } from './pages/EvolutionPage';
import { ImpactPage } from './pages/ImpactPage';
import { CodeExplorerPage } from './pages/CodeExplorerPage';
import { DashboardPage } from './pages/DashboardPage';
import { HistoryExplorerPage } from './pages/HistoryExplorerPage';
import {
  LegacyCodeRedirect,
  LegacyCommitRedirect,
  LegacyFileHistoryRedirect,
  LegacyFileRedirect,
  LegacyHistoryRedirect,
  LegacyRepositoryRedirect,
  LegacyRepositorySettingsRedirect,
  LegacySymbolRedirect,
  LegacySymbolsRedirect,
  LegacyWorkspacePeopleRedirect,
  LegacyWorkspaceRedirect,
  LegacyWorkspaceSettingsRedirect,
} from './pages/LegacyRedirects';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { RegisterPage } from './pages/RegisterPage';
import { RepositoryOverviewPage, RepositorySettingsPage } from './pages/RepositoryPage';
import { WorkspacePeoplePage, WorkspaceReposPage, WorkspaceSettingsPage } from './pages/WorkspacePage';

function RequireAuth() {
  const { user, ready, hasSession } = useAuth();
  if (!ready || (hasSession && !user)) {
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
          <Route path="/work-space/:workspaceId" element={<WorkspaceReposPage />} />
          <Route path="/work-space/:workspaceId/people" element={<WorkspacePeoplePage />} />
          <Route path="/work-space/:workspaceId/settings" element={<WorkspaceSettingsPage />} />
          <Route
            path="/work-space/:workspaceId/repository/:repositoryId"
            element={<RepositoryOverviewPage />}
          />
          <Route
            path="/work-space/:workspaceId/repository/:repositoryId/code"
            element={<CodeExplorerPage />}
          />
          <Route
            path="/work-space/:workspaceId/repository/:repositoryId/graph"
            element={<ArchitectureMapPage />}
          />
          <Route
            path="/work-space/:workspaceId/repository/:repositoryId/dna"
            element={<CodeDnaPage />}
          />
          <Route
            path="/work-space/:workspaceId/repository/:repositoryId/impact"
            element={<ImpactPage />}
          />
          <Route
            path="/work-space/:workspaceId/repository/:repositoryId/evolution"
            element={<EvolutionPage />}
          />
          <Route
            path="/work-space/:workspaceId/repository/:repositoryId/ask"
            element={<AskPage />}
          />
          <Route
            path="/work-space/:workspaceId/repository/:repositoryId/history"
            element={<HistoryExplorerPage />}
          />
          <Route
            path="/work-space/:workspaceId/repository/:repositoryId/settings"
            element={<RepositorySettingsPage />}
          />

          <Route path="/w/:workspaceId" element={<LegacyWorkspaceRedirect />} />
          <Route path="/w/:workspaceId/people" element={<LegacyWorkspacePeopleRedirect />} />
          <Route path="/w/:workspaceId/settings" element={<LegacyWorkspaceSettingsRedirect />} />
          <Route path="/w/:workspaceId/:repositoryId" element={<LegacyRepositoryRedirect />} />
          <Route path="/w/:workspaceId/:repositoryId/code" element={<LegacyCodeRedirect />} />
          <Route path="/w/:workspaceId/:repositoryId/history" element={<LegacyHistoryRedirect />} />
          <Route path="/w/:workspaceId/:repositoryId/settings" element={<LegacyRepositorySettingsRedirect />} />
          <Route path="/workspaces/:workspaceId" element={<LegacyWorkspaceRedirect />} />
          <Route
            path="/workspaces/:workspaceId/repositories/:repositoryId"
            element={<LegacyRepositoryRedirect />}
          />
          <Route
            path="/workspaces/:workspaceId/repositories/:repositoryId/code"
            element={<LegacyCodeRedirect />}
          />
          <Route
            path="/workspaces/:workspaceId/repositories/:repositoryId/code/files/:fileId"
            element={<LegacyFileRedirect />}
          />
          <Route
            path="/workspaces/:workspaceId/repositories/:repositoryId/code/symbols"
            element={<LegacySymbolsRedirect />}
          />
          <Route
            path="/workspaces/:workspaceId/repositories/:repositoryId/code/symbols/:symbolId"
            element={<LegacySymbolRedirect />}
          />
          <Route
            path="/workspaces/:workspaceId/repositories/:repositoryId/commits"
            element={<LegacyHistoryRedirect />}
          />
          <Route
            path="/workspaces/:workspaceId/repositories/:repositoryId/commits/:sha"
            element={<LegacyCommitRedirect />}
          />
          <Route
            path="/workspaces/:workspaceId/repositories/:repositoryId/files"
            element={<LegacyFileHistoryRedirect />}
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
