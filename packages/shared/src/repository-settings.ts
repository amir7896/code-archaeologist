export const REPOSITORY_SOURCES = ['GITHUB', 'GITLAB', 'BITBUCKET', 'LOCAL'] as const;
export type RepositorySourceName = (typeof REPOSITORY_SOURCES)[number];

export type RepositorySettings = {
  includePullRequests: boolean;
  respectGitignore: boolean;
};

export function parseRepositorySettings(value: unknown): RepositorySettings {
  const record = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    includePullRequests: record.includePullRequests !== false,
    respectGitignore: record.respectGitignore !== false,
  };
}

export function repositorySettingsFromInput(input: {
  includePullRequests?: boolean;
  respectGitignore?: boolean;
}): RepositorySettings {
  return {
    includePullRequests: input.includePullRequests !== false,
    respectGitignore: input.respectGitignore !== false,
  };
}
