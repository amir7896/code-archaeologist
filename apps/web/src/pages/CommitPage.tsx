import { Link, useParams } from 'react-router-dom';
import { PageNav } from '../components/PageNav';
import { errorMessage } from '../lib/errors';
import {
  commitSubject,
  formatChange,
  formatDiffstat,
  formatWhen,
  shortRevision,
} from '../lib/format';
import { useCommitQuery, useRepositoryQuery, useWorkspaceQuery } from '../queries';
import { card, muted } from '../ui';

export function CommitPage() {
  const { workspaceId = '', repositoryId = '', sha = '' } = useParams();
  const workspaceQuery = useWorkspaceQuery(workspaceId);
  const repositoryQuery = useRepositoryQuery(workspaceId, repositoryId);
  const commitQuery = useCommitQuery(workspaceId, repositoryId, sha);
  const workspace = workspaceQuery.data;
  const repository = repositoryQuery.data;
  const commit = commitQuery.data;
  const repoPath = `/workspaces/${workspaceId}/repositories/${repositoryId}`;
  const commitsPath = `${repoPath}/commits`;
  const subject = commit ? commitSubject(commit.message) : shortRevision(sha);
  const body = commit?.message.split('\n').slice(1).join('\n').trim();

  return (
    <div className="space-y-6">
      <div>
        <PageNav
          backTo={commitsPath}
          backLabel="Back to commits"
          crumbs={[
            { to: '/', label: 'Workspaces' },
            { to: `/workspaces/${workspaceId}`, label: workspace?.name ?? 'Workspace' },
            { to: repoPath, label: repository?.name ?? 'Repository' },
            { to: commitsPath, label: 'Commits' },
            { label: subject },
          ]}
        />
        {commitQuery.isPending ? <p className={`mt-6 ${muted}`}>Loading commit…</p> : null}
        {commitQuery.isError ? (
          <p className="mt-6 text-red-600">{errorMessage(commitQuery.error, 'Commit not found')}</p>
        ) : null}
        {commit ? (
          <>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">{subject}</h1>
            <p className={`mt-2 ${muted}`}>
              {commit.authorName} · {formatWhen(commit.committedAt)} · {commit.sha.slice(0, 12)}
              {commit.isMerge ? ' · Merge' : ''}
            </p>
            <p className={`mt-1 ${muted}`}>{formatDiffstat(commit.additions, commit.deletions)}</p>
          </>
        ) : null}
      </div>

      {commit && body ? (
        <section className={card}>
          <h2 className="text-sm font-semibold text-zinc-900">Message</h2>
          <pre className="mt-3 whitespace-pre-wrap text-sm text-zinc-700">{body}</pre>
        </section>
      ) : null}

      {commit?.parentShas.length ? (
        <section className={card}>
          <h2 className="text-sm font-semibold text-zinc-900">Parents</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {commit.parentShas.map((parent) => (
              <li key={parent}>
                <Link className="text-indigo-600 hover:text-indigo-500" to={`${repoPath}/commits/${parent}`}>
                  {parent.slice(0, 12)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {commit ? (
        <section className={card}>
          <h2 className="text-sm font-semibold text-zinc-900">Changed files</h2>
          {commit.files.length === 0 ? (
            <p className={`mt-3 ${muted}`}>No file changes recorded for this commit.</p>
          ) : (
            <ul className="mt-3 divide-y divide-zinc-100">
              {commit.files.map((file) => (
                <li key={`${file.changeType}-${file.path}`} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div>
                    <Link
                      className="font-medium text-indigo-600 hover:text-indigo-500"
                      to={`${repoPath}/files?path=${encodeURIComponent(file.path)}`}
                    >
                      {file.path}
                    </Link>
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
        </section>
      ) : null}
    </div>
  );
}
