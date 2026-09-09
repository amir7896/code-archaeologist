import { FormEvent, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { PageNav } from '../components/PageNav';
import { PaginationBar } from '../components/PaginationBar';
import { errorMessage } from '../lib/errors';
import { useRepositoryQuery, useSourceFilesQuery, useWorkspaceQuery } from '../queries';
import { card, fieldClass, muted, secondaryButton } from '../ui';

export function FilesPage() {
  const { workspaceId = '', repositoryId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const page = Number(params.get('page') || '1') || 1;
  const [draft, setDraft] = useState(q);
  const workspaceQuery = useWorkspaceQuery(workspaceId);
  const repositoryQuery = useRepositoryQuery(workspaceId, repositoryId);
  const filesQuery = useSourceFilesQuery(workspaceId, repositoryId, { q: q || undefined, page });
  const repoPath = `/workspaces/${workspaceId}/repositories/${repositoryId}`;
  const files = filesQuery.data?.items ?? [];

  function submit(event: FormEvent) {
    event.preventDefault();
    const next = new URLSearchParams();
    if (draft.trim()) {
      next.set('q', draft.trim());
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
            { to: `/workspaces/${workspaceId}`, label: workspaceQuery.data?.name ?? 'Workspace' },
            { to: repoPath, label: repositoryQuery.data?.name ?? 'Repository' },
            { label: 'Files' },
          ]}
        />
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">Files</h1>
        <p className={`mt-2 ${muted}`}>Browse indexed source files and their symbols.</p>
      </div>

      <section className={card}>
        <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={submit}>
          <label className="block flex-1 text-sm">
            <span className="font-medium text-zinc-700">Search path</span>
            <input
              className={`${fieldClass()} mt-1.5`}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="src/auth"
            />
          </label>
          <button className={secondaryButton} type="submit">
            Search
          </button>
        </form>

        {filesQuery.isPending ? <p className={`mt-4 ${muted}`}>Loading files…</p> : null}
        {filesQuery.isError ? (
          <p className="mt-4 text-sm text-red-600">
            {errorMessage(filesQuery.error, 'Unable to load files')}
          </p>
        ) : null}
        {!filesQuery.isPending && files.length === 0 ? (
          <p className={`mt-4 ${muted}`}>No files indexed yet. Sync the repository first.</p>
        ) : null}

        <ul className="mt-4 divide-y divide-zinc-100">
          {files.map((file) => (
            <li key={file.id} className="py-3 first:pt-0 last:pb-0">
              <Link
                className="block rounded-xl px-1 py-1 transition hover:bg-indigo-50/60"
                to={`${repoPath}/code/files/${file.id}`}
              >
                <p className="font-medium text-zinc-900">{file.path}</p>
                <p className={`mt-1 ${muted}`}>
                  {file.language ?? 'Unknown'}
                  {file.loc != null ? ` · ${file.loc} lines` : ''}
                  {` · ${file.symbolCount} symbols`}
                </p>
              </Link>
            </li>
          ))}
        </ul>
        <PaginationBar
          className="mt-4"
          page={filesQuery.data?.pagination.page ?? page}
          totalPages={filesQuery.data?.pagination.totalPages ?? 1}
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
