import { type FormEvent, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { PageNav } from '../components/PageNav';
import { PaginationBar } from '../components/PaginationBar';
import { errorMessage } from '../lib/errors';
import { commitSubject, formatChange, formatDiffstat, formatWhen, shortRevision } from '../lib/format';
import { useFileHistoryQuery, useRepositoryQuery, useWorkspaceQuery } from '../queries';
import { card, fieldClass, muted, secondaryButton } from '../ui';

export function FileHistoryPage() {
  const { workspaceId = '', repositoryId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const path = params.get('path') ?? '';
  const page = Number(params.get('page') || '1') || 1;
  const [draft, setDraft] = useState(path);
  useEffect(() => {
    setDraft(path);
  }, [path]);
  const workspaceQuery = useWorkspaceQuery(workspaceId);
  const repositoryQuery = useRepositoryQuery(workspaceId, repositoryId);
  const historyQuery = useFileHistoryQuery(workspaceId, repositoryId, path, page);
  const workspace = workspaceQuery.data;
  const repository = repositoryQuery.data;
  const repoPath = `/workspaces/${workspaceId}/repositories/${repositoryId}`;
  const items = historyQuery.data?.items ?? [];

  function submit(event: FormEvent) {
    event.preventDefault();
    const next = new URLSearchParams();
    if (draft.trim()) {
      next.set('path', draft.trim());
    }
    setParams(next);
  }

  return (
    <div className="space-y-6">
      <div>
        <PageNav
          backTo={repoPath}
          backLabel="Back to repository"
          crumbs={[
            { to: '/', label: 'Workspaces' },
            { to: `/workspaces/${workspaceId}`, label: workspace?.name ?? 'Workspace' },
            { to: repoPath, label: repository?.name ?? 'Repository' },
            { label: path || 'File history' },
          ]}
        />
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">File history</h1>
        <p className={`mt-2 ${muted}`}>See which commits changed a path in this repository.</p>
      </div>

      <section className={card}>
        <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={submit}>
          <label className="block flex-1 text-sm">
            <span className="font-medium text-zinc-700">Path</span>
            <input
              className={`${fieldClass()} mt-1.5`}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="src/auth.ts"
            />
          </label>
          <button className={secondaryButton} type="submit">
            Show history
          </button>
        </form>

        {!path ? <p className={`mt-4 ${muted}`}>Enter a file path to see its history.</p> : null}
        {path && historyQuery.isPending ? <p className={`mt-4 ${muted}`}>Loading history…</p> : null}
        {path && historyQuery.isError ? (
          <p className="mt-4 text-sm text-red-600">
            {errorMessage(historyQuery.error, 'Unable to load file history')}
          </p>
        ) : null}
        {path && !historyQuery.isPending && items.length === 0 ? (
          <p className={`mt-4 ${muted}`}>No history for this path yet.</p>
        ) : null}

        <ul className="mt-4 divide-y divide-zinc-100">
          {items.map((item) => (
            <li key={`${item.sha}-${item.path}-${item.changeType}`} className="py-3 first:pt-0 last:pb-0">
              <Link
                className="block rounded-xl px-1 py-1 transition hover:bg-indigo-50/60"
                to={`${repoPath}/commits/${item.sha}`}
              >
                <p className="font-medium text-zinc-900">{commitSubject(item.message)}</p>
                <p className={`mt-1 ${muted}`}>
                  {item.authorName} · {formatWhen(item.committedAt)} · {shortRevision(item.sha)} ·{' '}
                  {formatChange(item.changeType)} · {formatDiffstat(item.additions, item.deletions)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
        <PaginationBar
          className="mt-4"
          page={historyQuery.data?.pagination.page ?? page}
          totalPages={historyQuery.data?.pagination.totalPages ?? 1}
          onPage={(nextPage) => {
            const next = new URLSearchParams(params);
            if (nextPage > 1) {
              next.set('page', String(nextPage));
            } else {
              next.delete('page');
            }
            setParams(next);
          }}
        />
      </section>
    </div>
  );
}
