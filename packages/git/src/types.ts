export interface GitCloneRequest {
  url: string;
  destination: string;
  branch?: string;
  credential?: { username: string; secret: string };
}

export interface GitCommitSummary {
  sha: string;
  message: string;
  authorName: string;
  authorEmail: string;
  committedAt: string;
  parentShas: string[];
}

export interface GitProvider {
  clone(request: GitCloneRequest): Promise<void>;
  fetch(repositoryPath: string): Promise<void>;
  detectDefaultBranch(repositoryPath: string): Promise<string>;
  resolveRevision(repositoryPath: string, revision?: string): Promise<string>;
  listCommits(repositoryPath: string, revision: string): Promise<GitCommitSummary[]>;
}

export class GitProviderNotImplementedError extends Error {
  constructor() {
    super('Git history listing is not implemented yet.');
    this.name = 'GitProviderNotImplementedError';
  }
}
