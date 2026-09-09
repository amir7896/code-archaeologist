import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import {
  repositoryCodePath,
  repositoryHistoryPath,
  repositoryPath,
  repositorySettingsPath,
  workspacePath,
  workspacePeoplePath,
  workspaceSettingsPath,
} from '../lib/paths';

export function LegacyWorkspaceRedirect() {
  const { workspaceId = '' } = useParams();
  return <Navigate to={workspacePath(workspaceId)} replace />;
}

export function LegacyWorkspacePeopleRedirect() {
  const { workspaceId = '' } = useParams();
  return <Navigate to={workspacePeoplePath(workspaceId)} replace />;
}

export function LegacyWorkspaceSettingsRedirect() {
  const { workspaceId = '' } = useParams();
  return <Navigate to={workspaceSettingsPath(workspaceId)} replace />;
}

export function LegacyRepositorySettingsRedirect() {
  const { workspaceId = '', repositoryId = '' } = useParams();
  return <Navigate to={repositorySettingsPath(workspaceId, repositoryId)} replace />;
}

export function LegacyRepositoryRedirect() {
  const { workspaceId = '', repositoryId = '' } = useParams();
  return <Navigate to={repositoryPath(workspaceId, repositoryId)} replace />;
}

export function LegacyCodeRedirect() {
  const { workspaceId = '', repositoryId = '' } = useParams();
  const [params] = useSearchParams();
  return (
    <Navigate
      to={repositoryCodePath(workspaceId, repositoryId, {
        file: params.get('file') ?? undefined,
        symbol: params.get('symbol') ?? undefined,
        view: params.get('view') === 'symbols' ? 'symbols' : undefined,
        q: params.get('q') ?? undefined,
        kind: params.get('kind') ?? undefined,
      })}
      replace
    />
  );
}

export function LegacySymbolsRedirect() {
  const { workspaceId = '', repositoryId = '' } = useParams();
  return <Navigate to={repositoryCodePath(workspaceId, repositoryId, { view: 'symbols' })} replace />;
}

export function LegacyFileRedirect() {
  const { workspaceId = '', repositoryId = '', fileId = '' } = useParams();
  return <Navigate to={repositoryCodePath(workspaceId, repositoryId, { file: fileId })} replace />;
}

export function LegacySymbolRedirect() {
  const { workspaceId = '', repositoryId = '', symbolId = '' } = useParams();
  return <Navigate to={repositoryCodePath(workspaceId, repositoryId, { symbol: symbolId })} replace />;
}

export function LegacyHistoryRedirect() {
  const { workspaceId = '', repositoryId = '' } = useParams();
  const [params] = useSearchParams();
  return (
    <Navigate
      to={repositoryHistoryPath(workspaceId, repositoryId, {
        commit: params.get('commit') ?? undefined,
        path: params.get('path') ?? undefined,
        branch: params.get('branch') ?? undefined,
      })}
      replace
    />
  );
}

export function LegacyCommitRedirect() {
  const { workspaceId = '', repositoryId = '', sha = '' } = useParams();
  return <Navigate to={repositoryHistoryPath(workspaceId, repositoryId, { commit: sha })} replace />;
}

export function LegacyFileHistoryRedirect() {
  const { workspaceId = '', repositoryId = '' } = useParams();
  const [params] = useSearchParams();
  return (
    <Navigate
      to={repositoryHistoryPath(workspaceId, repositoryId, { path: params.get('path') ?? undefined })}
      replace
    />
  );
}
