/**
 * Git provider interface. Implementations (Git CLI) arrive in the repository/Git phases.
 * Analysis must never execute repository code — clone, inspect, and parse only.
 */
export interface GitCloneRequest {
  url: string;
  destination: string;
  credentialRef?: string;
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
  listCommits(repositoryPath: string, revision: string): Promise<GitCommitSummary[]>;
}

export class GitProviderNotImplementedError extends Error {
  constructor() {
    super('Git provider is not implemented yet. Repository ingestion is a later phase.');
    this.name = 'GitProviderNotImplementedError';
  }
}
