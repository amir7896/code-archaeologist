# Git provider

Git access lives behind `@code-archaeologist/git`. The worker implementation is `GitCliProvider` in `apps/worker/src/ingestion/git-cli.provider.ts`. It calls `spawn('git', args)` with no shell.

## Contract

```ts
interface GitProvider {
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
```

HTTPS remotes only. Embedded credentials in the URL are rejected. Private clones send `Authorization: Basic` through `GIT_CONFIG_*` extra headers, not through the remote URL.

## Isolation and limits

- Mirrors live under `REPOSITORY_WORK_DIR/mirrors/<repositoryId>` (default `<repo>/.data/repositories`).
- After clone or fetch, `GIT_CLONE_MAX_MB` (default 512) is enforced. An oversized mirror is deleted and the run fails.
- Git stderr is sanitized before it reaches logs or the UI.
- `HISTORY_COMMIT_LIMIT` caps how much history is indexed in one pass.

## What is indexed

Commit metadata, parents, added/modified/deleted/renamed/copied files, numstat, branches, and changed line spans for symbol linking. Authors are normalized. Merge commits use first-parent diffs when a regular name-status list is empty.

Every ingest is **Full**. `sinceSha` exists on the provider for history paging; the product does not advertise incremental analysis.

The CLI does not clone a local working tree into the API. `init` can read `origin` from a checkout and convert SSH to HTTPS; the worker still clones that HTTPS URL.
