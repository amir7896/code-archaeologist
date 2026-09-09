export type FileChangeTypeName = 'ADDED' | 'MODIFIED' | 'DELETED' | 'RENAMED' | 'COPIED';

export type GitCredential = { username: string; secret: string };

export interface GitCloneRequest {
  url: string;
  destination: string;
  branch?: string;
  credential?: GitCredential;
}

export interface GitBranchSummary {
  name: string;
  sha: string;
  isDefault: boolean;
}

export interface GitCommitSummary {
  sha: string;
  message: string;
  authorName: string;
  authorEmail: string;
  authoredAt: string;
  committedAt: string;
  parentShas: string[];
}

export interface GitCommitChange {
  changeType: FileChangeTypeName;
  oldPath: string | null;
  newPath: string;
  additions: number;
  deletions: number;
  similarity: number | null;
}

export type GitLineSpan = {
  startLine: number;
  endLine: number;
};

export interface GitHistoryQuery {
  revision: string;
  sinceSha?: string;
  maxCount: number;
}

export interface GitHistoryPage {
  commits: GitCommitSummary[];
  changes: Record<string, GitCommitChange[]>;
}

export interface GitProvider {
  ensureMirror(request: GitCloneRequest): Promise<void>;
  fetch(repositoryPath: string, credential?: GitCredential): Promise<void>;
  detectDefaultBranch(repositoryPath: string): Promise<string>;
  resolveRevision(repositoryPath: string, revision?: string): Promise<string>;
  listBranches(repositoryPath: string): Promise<GitBranchSummary[]>;
  isAncestor(repositoryPath: string, maybeAncestor: string, revision: string): Promise<boolean>;
  listHistory(repositoryPath: string, query: GitHistoryQuery): Promise<GitHistoryPage>;
  listCommitChanges(repositoryPath: string, sha: string): Promise<GitCommitChange[]>;
  listChangedSpans?(repositoryPath: string, sha: string, path: string): Promise<GitLineSpan[]>;
  listTree(repositoryPath: string, revision: string): Promise<GitTreeEntry[]>;
  readBlob(repositoryPath: string, revision: string, path: string): Promise<string>;
}

export interface GitTreeEntry {
  path: string;
  hash: string;
  size: number;
}
