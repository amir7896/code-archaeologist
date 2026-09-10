export const homePath = '/home';

export function workspacePath(workspaceId: string): string {
  return `/work-space/${workspaceId}`;
}

export function workspaceRepositoriesPath(workspaceId: string): string {
  return `/work-space/${workspaceId}/repositories`;
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
  query: {
    file?: string;
    symbol?: string;
    tab?: 'source' | 'symbols' | 'history';
    view?: 'files' | 'symbols';
    q?: string;
    kind?: string;
    line?: string;
  } = {},
): string {
  return withQuery(`${repositoryPath(workspaceId, repositoryId)}/code`, {
    view: query.view === 'symbols' ? 'symbols' : undefined,
    tab: query.tab && query.tab !== 'symbols' ? query.tab : undefined,
    file: query.file,
    symbol: query.symbol,
    q: query.q,
    kind: query.kind,
    line: query.line,
  });
}

export function repositoryGraphPath(
  workspaceId: string,
  repositoryId: string,
  query: { module?: string; file?: string; group?: string; view?: string; q?: string; depth?: string } = {},
): string {
  return withQuery(`${repositoryPath(workspaceId, repositoryId)}/graph`, {
    module: query.module,
    file: query.file,
    group: query.group && query.group !== 'auto' ? query.group : undefined,
    view: query.view && query.view !== 'all' ? query.view : undefined,
    q: query.q,
    depth: query.depth && query.depth !== '2' ? query.depth : undefined,
  });
}

export function repositoryDnaPath(
  workspaceId: string,
  repositoryId: string,
  query: { file?: string; symbol?: string } = {},
): string {
  return withQuery(`${repositoryPath(workspaceId, repositoryId)}/dna`, {
    file: query.file,
    symbol: query.symbol,
  });
}

export function repositoryImpactPath(
  workspaceId: string,
  repositoryId: string,
  query: { file?: string; symbol?: string; depth?: string } = {},
): string {
  return withQuery(`${repositoryPath(workspaceId, repositoryId)}/impact`, {
    file: query.file,
    symbol: query.symbol,
    depth: query.depth,
  });
}

export function repositoryEvolutionPath(
  workspaceId: string,
  repositoryId: string,
  query: { file?: string; symbol?: string } = {},
): string {
  return withQuery(`${repositoryPath(workspaceId, repositoryId)}/evolution`, {
    file: query.file,
    symbol: query.symbol,
  });
}

export function repositoryAskPath(
  workspaceId: string,
  repositoryId: string,
  query: { file?: string; symbol?: string; question?: string } = {},
): string {
  return withQuery(`${repositoryPath(workspaceId, repositoryId)}/ask`, {
    file: query.file,
    symbol: query.symbol,
    question: query.question,
  });
}

export function repositoryHistoryPath(
  workspaceId: string,
  repositoryId: string,
  query: { commit?: string; path?: string; branch?: string; file?: string } = {},
): string {
  return withQuery(`${repositoryPath(workspaceId, repositoryId)}/history`, {
    commit: query.commit,
    path: query.path,
    branch: query.branch,
    file: query.file,
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
