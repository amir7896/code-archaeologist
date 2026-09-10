import { type FormEvent, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ExplorerFrame } from '../components/PageFrame';
import { PaginationBar } from '../components/PaginationBar';
import { errorMessage } from '../lib/errors';
import {
  commitSubject,
  formatChange,
  formatDiffstat,
  formatWhen,
  shortRevision,
} from '../lib/format';
import { repositoryCodePath, repositoryDnaPath, repositoryEvolutionPath, repositoryImpactPath } from '../lib/paths';
import {
  useBranchesQuery,
  useCommitQuery,
  useCommitsQuery,
  useFileHistoryQuery,
  useSourcePreviewQuery,
} from '../queries';
import { fieldClass, muted, secondaryButton } from '../ui';
import type { RepoCommitFile } from '../api';

export function HistoryExplorerPage() {
  const { workspaceId = '', repositoryId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const branch = params.get('branch') ?? '';
  const commit = params.get('commit') ?? '';
  const path = params.get('path') ?? '';
  const selectedFile = params.get('file') ?? '';
  const page = Number(params.get('page') || '1') || 1;
  const [draft, setDraft] = useState(path);
  const selected = Boolean(commit || path);

  useEffect(() => {
    setDraft(path);
  }, [path]);

  function setQuery(next: { commit?: string; path?: string; file?: string; branch?: string; page?: number }) {
    const search = new URLSearchParams();
    const nextBranch = next.branch !== undefined ? next.branch : branch;
    const nextPath = next.path !== undefined ? next.path : path;
    const nextFile = next.file !== undefined ? next.file : selectedFile;
    const nextCommit = next.commit !== undefined ? next.commit : commit;
    if (nextBranch) {
      search.set('branch', nextBranch);
    }
    if (nextPath) {
      search.set('path', nextPath);
    }
    if (nextFile) {
      search.set('file', nextFile);
    }
    if (nextCommit) {
      search.set('commit', nextCommit);
    }
    if (next.page && next.page > 1) {
      search.set('page', String(next.page));
    }
    setParams(search);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    setQuery({ path: draft.trim() || undefined, branch: branch || undefined });
  }

  return (
    <ExplorerFrame>
      <div className="mb-3 shrink-0">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Commit Explorer</h1>
        <p className={`mt-1 ${muted}`}>Inspect commits, diffs and linked files.</p>
      </div>
      <div className="flex min-h-0 flex-1">
      <section
        className={`flex w-full flex-col rounded-3xl border border-white/10 bg-panel md:w-[22rem] md:shrink-0 ${selected ? 'hidden md:flex' : 'flex'}`}
      >
        <form className="space-y-2 border-b border-white/5 p-3" onSubmit={submit}>
          <BranchSelect
            workspaceId={workspaceId}
            repositoryId={repositoryId}
            branch={branch}
            onChange={(value) => setQuery({ branch: value, commit: '' })}
          />
          <input
            className={fieldClass()}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="File path for history"
            aria-label="File path"
          />
          <button className={`${secondaryButton} w-full`} type="submit">
            {draft.trim() ? 'Show file history' : 'Browse commits'}
          </button>
        </form>
        {path ? (
          <FileHistoryList
            workspaceId={workspaceId}
            repositoryId={repositoryId}
            path={path}
            page={page}
            selectedSha={commit}
            onSelect={(sha) => setQuery({ commit: sha, path, branch: branch || undefined })}
            onPage={(nextPage) => setQuery({ path, branch: branch || undefined, page: nextPage })}
          />
        ) : (
          <CommitList
            workspaceId={workspaceId}
            repositoryId={repositoryId}
            branch={branch}
            page={page}
            selectedSha={commit}
            onSelect={(sha) => setQuery({ commit: sha, branch: branch || undefined, path: path || undefined })}
            onPage={(nextPage) => setQuery({ branch: branch || undefined, page: nextPage })}
          />
        )}
      </section>

      <section className={`min-w-0 flex-1 overflow-y-auto rounded-3xl border border-white/10 bg-panel md:ml-4 ${selected ? 'block' : 'hidden md:block'}`}>
        {selected ? (
          <button
            className="m-4 text-sm font-medium text-brand hover:text-brand-2 md:hidden"
            type="button"
            onClick={() => setQuery({ commit: '' })}
          >
            ← Back to list
          </button>
        ) : null}
        {commit ? (
          <CommitDetail
            workspaceId={workspaceId}
            repositoryId={repositoryId}
            sha={commit}
            selectedPath={selectedFile}
            onOpenCommit={(sha) => setQuery({ commit: sha })}
            onOpenPath={(nextPath) => setQuery({ file: nextPath })}
          />
        ) : (
          <div className="flex h-full items-center justify-center p-8">
            <p className={muted}>Select a commit to inspect its changes here.</p>
          </div>
        )}
      </section>
      </div>
    </ExplorerFrame>
  );
}

function BranchSelect({
  workspaceId,
  repositoryId,
  branch,
  onChange,
}: {
  workspaceId: string;
  repositoryId: string;
  branch: string;
  onChange: (value: string) => void;
}) {
  const branchesQuery = useBranchesQuery(workspaceId, repositoryId);
  return (
    <select className={fieldClass()} value={branch} aria-label="Branch" onChange={(event) => onChange(event.target.value)}>
      <option value="">All branches</option>
      {(branchesQuery.data?.items ?? []).map((item) => (
        <option key={item.id} value={item.name}>
          {item.name}
          {item.isDefault ? ' (default)' : ''}
        </option>
      ))}
    </select>
  );
}

function CommitList({
  workspaceId,
  repositoryId,
  branch,
  page,
  selectedSha,
  onSelect,
  onPage,
}: {
  workspaceId: string;
  repositoryId: string;
  branch: string;
  page: number;
  selectedSha: string;
  onSelect: (sha: string) => void;
  onPage: (page: number) => void;
}) {
  const commitsQuery = useCommitsQuery(workspaceId, repositoryId, { branch: branch || undefined, page });
  const commits = commitsQuery.data?.items ?? [];
  return (
    <div className="flex-1 overflow-y-auto p-2">
      {commitsQuery.isPending ? <p className={`px-2 py-3 ${muted}`}>Loading commits…</p> : null}
      {commitsQuery.isError ? (
        <p className="px-2 py-3 text-sm text-red-300">{errorMessage(commitsQuery.error, 'Unable to load commits')}</p>
      ) : null}
      {!commitsQuery.isPending && commits.length === 0 ? (
        <p className={`px-2 py-3 ${muted}`}>No commits indexed yet. Sync the repository first.</p>
      ) : null}
      <ul>
        {commits.map((item) => (
          <li key={item.sha}>
            <button
              className={`w-full rounded-lg px-3 py-2 text-left ${item.sha === selectedSha ? 'bg-brand/15' : 'hover:bg-white/5'}`}
              type="button"
              onClick={() => onSelect(item.sha)}
            >
              <p className="text-sm font-medium text-white">{commitSubject(item.message)}</p>
              <p className={`mt-0.5 ${muted}`}>
                {item.authorName} · {formatWhen(item.committedAt)} · {shortRevision(item.sha)}
              </p>
            </button>
          </li>
        ))}
      </ul>
      <PaginationBar
        className="p-2"
        page={commitsQuery.data?.pagination.page ?? page}
        totalPages={commitsQuery.data?.pagination.totalPages ?? 1}
        onPage={onPage}
      />
    </div>
  );
}

function FileHistoryList({
  workspaceId,
  repositoryId,
  path,
  page,
  selectedSha,
  onSelect,
  onPage,
}: {
  workspaceId: string;
  repositoryId: string;
  path: string;
  page: number;
  selectedSha: string;
  onSelect: (sha: string) => void;
  onPage: (page: number) => void;
}) {
  const historyQuery = useFileHistoryQuery(workspaceId, repositoryId, path, page);
  const items = historyQuery.data?.items ?? [];
  return (
    <div className="flex-1 overflow-y-auto p-2">
      <p className="px-3 py-2 text-xs font-medium text-zinc-500">{path}</p>
      {historyQuery.isPending ? <p className={`px-2 py-3 ${muted}`}>Loading history…</p> : null}
      {historyQuery.isError ? (
        <p className="px-2 py-3 text-sm text-red-300">
          {errorMessage(historyQuery.error, 'Unable to load file history')}
        </p>
      ) : null}
      {!historyQuery.isPending && items.length === 0 ? (
        <p className={`px-2 py-3 ${muted}`}>No history for this path yet.</p>
      ) : null}
      <ul>
        {items.map((item) => (
          <li key={`${item.sha}-${item.path}-${item.changeType}`}>
            <button
              className={`w-full rounded-lg px-3 py-2 text-left ${item.sha === selectedSha ? 'bg-brand/15' : 'hover:bg-white/5'}`}
              type="button"
              onClick={() => onSelect(item.sha)}
            >
              <p className="text-sm font-medium text-white">{commitSubject(item.message)}</p>
              <p className={`mt-0.5 ${muted}`}>
                {formatChange(item.changeType)} · {shortRevision(item.sha)}
              </p>
            </button>
          </li>
        ))}
      </ul>
      <PaginationBar
        className="p-2"
        page={historyQuery.data?.pagination.page ?? page}
        totalPages={historyQuery.data?.pagination.totalPages ?? 1}
        onPage={onPage}
      />
    </div>
  );
}

function CommitDetail({
  workspaceId,
  repositoryId,
  sha,
  selectedPath,
  onOpenCommit,
  onOpenPath,
}: {
  workspaceId: string;
  repositoryId: string;
  sha: string;
  selectedPath: string;
  onOpenCommit: (sha: string) => void;
  onOpenPath: (path: string) => void;
}) {
  const commitQuery = useCommitQuery(workspaceId, repositoryId, sha);
  const commit = commitQuery.data;
  const subject = commit ? commitSubject(commit.message) : shortRevision(sha);
  const body = commit?.message.split('\n').slice(1).join('\n').trim();

  return (
    <div className="space-y-6 p-6">
      {commitQuery.isPending ? <p className={muted}>Loading commit…</p> : null}
      {commitQuery.isError ? (
        <p className="text-red-300">{errorMessage(commitQuery.error, 'Commit not found')}</p>
      ) : null}
      {commit ? (
        <>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-white">{subject}</h1>
            <p className={`mt-2 ${muted}`}>
              {commit.authorName} · {formatWhen(commit.committedAt)} · {commit.sha.slice(0, 12)}
              {commit.isMerge ? ' · Merge' : ''}
            </p>
            <p className={`mt-1 ${muted}`}>{formatDiffstat(commit.additions, commit.deletions)}</p>
          </div>
          {body ? (
            <pre className="whitespace-pre-wrap rounded-xl bg-panel p-4 text-sm text-zinc-200 ring-1 ring-white/10">
              {body}
            </pre>
          ) : null}
          {commit.parentShas.length ? (
            <div>
              <h2 className="text-sm font-semibold text-white">Parents</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {commit.parentShas.map((parent) => (
                  <li key={parent}>
                    <button
                      className="font-medium text-brand hover:text-brand-2"
                      type="button"
                      onClick={() => onOpenCommit(parent)}
                    >
                      {parent.slice(0, 12)}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <ChangedFilePreview
            workspaceId={workspaceId}
            repositoryId={repositoryId}
            selectedPath={selectedPath}
            files={commit.files}
          />
          <div>
            <h2 className="text-sm font-semibold text-white">Changed files</h2>
            {commit.files.length === 0 ? (
              <p className={`mt-3 ${muted}`}>No file changes recorded for this commit.</p>
            ) : (
              <ul className="mt-3 divide-y divide-zinc-100">
                {commit.files.map((file) => (
                  <li
                    key={`${file.changeType}-${file.path}`}
                    className={`flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 ${
                      selectedPath === file.path ? 'rounded-lg bg-brand/15 px-3' : ''
                    }`}
                  >
                    <div>
                      <button
                        className="font-medium text-brand hover:text-brand-2"
                        type="button"
                        onClick={() => onOpenPath(file.path)}
                      >
                        {file.path}
                      </button>
                      {file.oldPath && file.oldPath !== file.path ? (
                        <p className={muted}>Renamed from {file.oldPath}</p>
                      ) : null}
                    </div>
                    <p className={muted}>
                      {formatChange(file.changeType)} · {formatDiffstat(file.additions, file.deletions)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <p className={`mt-4 ${muted}`}>
              Click a file to preview the current tree and follow it through history.
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}

function ChangedFilePreview({
  workspaceId,
  repositoryId,
  selectedPath,
  files,
}: {
  workspaceId: string;
  repositoryId: string;
  selectedPath: string;
  files: RepoCommitFile[];
}) {
  const selected = files.find((file) => file.path === selectedPath);
  const fileId = selected?.fileId ?? '';
  const previewQuery = useSourcePreviewQuery(workspaceId, repositoryId, fileId);
  if (!selected) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-panel p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Selected change</p>
      <h2 className="mt-1 text-lg font-semibold text-white">{selected.path}</h2>
      <p className={`mt-1 ${muted}`}>
        {formatChange(selected.changeType)} · {formatDiffstat(selected.additions, selected.deletions)}
        {selected.language ? ` · ${selected.language}` : ''}
      </p>
      <div className="mt-3 flex flex-wrap gap-3 text-sm font-medium">
        {fileId ? (
          <>
            <Link
              className="text-brand hover:text-brand-2"
              to={repositoryCodePath(workspaceId, repositoryId, { file: fileId })}
            >
              Open in Code
            </Link>
            <Link
              className="text-brand hover:text-brand-2"
              to={repositoryDnaPath(workspaceId, repositoryId, { file: fileId })}
            >
              Code DNA
            </Link>
            <Link
              className="text-brand hover:text-brand-2"
              to={repositoryImpactPath(workspaceId, repositoryId, { file: fileId })}
            >
              Check impact
            </Link>
            <Link
              className="text-brand hover:text-brand-2"
              to={repositoryEvolutionPath(workspaceId, repositoryId, { file: fileId })}
            >
              Evolution
            </Link>
          </>
        ) : null}
      </div>
      {selected.changeType === 'DELETED' ? (
        <p className={`mt-4 ${muted}`}>This file was removed in this commit.</p>
      ) : previewQuery.isPending ? (
        <p className={`mt-4 ${muted}`}>Loading current source…</p>
      ) : previewQuery.isError ? (
        <p className={`mt-4 ${muted}`}>Current source is not available for this path.</p>
      ) : previewQuery.data ? (
        <>
          <p className={`mt-4 ${muted}`}>Current tree — not the exact patch from this commit.</p>
          <pre className="mt-2 overflow-x-auto rounded-xl bg-white/5 p-4 text-xs leading-5 text-zinc-100 ring-1 ring-white/10">
            {previewQuery.data.content}
          </pre>
          {previewQuery.data.truncated ? <p className={`mt-2 ${muted}`}>Preview is truncated.</p> : null}
        </>
      ) : null}
    </section>
  );
}
