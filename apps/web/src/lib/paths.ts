export function workspacePath(workspaceId: string): string {
  return `/work-space/${workspaceId}`;
}

export function workspacePeoplePath(workspaceId: string): string {
  return `/work-space/${workspaceId}/people`;
}

export function workspaceSettingsPath(workspaceId: string): string {
  return `/work-space/${workspaceId}/settings`;
}

export function repositoryPath(workspaceId: string, repositoryId: string): string {
  return `/work-space/${workspaceId}/repository/${repositoryId}`;
}

export function repositoryCodePath(
  workspaceId: string,
  repositoryId: string,
  query: { file?: string; symbol?: string; view?: 'files' | 'symbols'; q?: string; kind?: string } = {},
): string {
  return withQuery(`${repositoryPath(workspaceId, repositoryId)}/code`, {
    view: query.view === 'symbols' ? 'symbols' : undefined,
    file: query.file,
    symbol: query.symbol,
    q: query.q,
    kind: query.kind,
  });
}

export function repositoryHistoryPath(
  workspaceId: string,
  repositoryId: string,
  query: { commit?: string; path?: string; branch?: string } = {},
): string {
  return withQuery(`${repositoryPath(workspaceId, repositoryId)}/history`, {
    commit: query.commit,
    path: query.path,
    branch: query.branch,
  });
}

export function repositorySettingsPath(workspaceId: string, repositoryId: string): string {
  return `${repositoryPath(workspaceId, repositoryId)}/settings`;
}

export function withQuery(path: string, query: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value) {
      params.set(key, value);
    }
  }
  const encoded = params.toString();
  return encoded ? `${path}?${encoded}` : path;
}
