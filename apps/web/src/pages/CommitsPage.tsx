import { Link, useParams, useSearchParams } from 'react-router-dom';
import { PageNav } from '../components/PageNav';
import { PaginationBar } from '../components/PaginationBar';
import { errorMessage } from '../lib/errors';
import { commitSubject, formatDiffstat, formatWhen, shortRevision } from '../lib/format';
import { useBranchesQuery, useCommitsQuery, useRepositoryQuery, useWorkspaceQuery } from '../queries';
import { card, fieldClass, muted } from '../ui';

export function CommitsPage() {
  const { workspaceId = '', repositoryId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const branch = params.get('branch') ?? '';
  const page = Number(params.get('page') || '1') || 1;
  const workspaceQuery = useWorkspaceQuery(workspaceId);
  const repositoryQuery = useRepositoryQuery(workspaceId, repositoryId);
  const branchesQuery = useBranchesQuery(workspaceId, repositoryId);
  const commitsQuery = useCommitsQuery(workspaceId, repositoryId, {
    branch: branch || undefined,
    page,
  });
  const workspace = workspaceQuery.data;
  const repository = repositoryQuery.data;
  const repoPath = `/workspaces/${workspaceId}/repositories/${repositoryId}`;
  const commits = commitsQuery.data?.items ?? [];

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
            { label: 'Commits' },
          ]}
        />
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">Commits</h1>
        <p className={`mt-2 ${muted}`}>
          Browse the indexed history{repository?.name ? ` for ${repository.name}` : ''}.
        </p>
      </div>

      <section className={card}>
        <label className="block text-sm">
          <span className="font-medium text-zinc-700">Branch</span>
          <select
            className={`${fieldClass()} mt-1.5`}
            value={branch}
            onChange={(event) => {
              const next = new URLSearchParams(params);
              if (event.target.value) {
                next.set('branch', event.target.value);
              } else {
                next.delete('branch');
              }
              next.delete('page');
              setParams(next);
            }}
          >
            <option value="">All branches</option>
            {(branchesQuery.data?.items ?? []).map((item) => (
              <option key={item.id} value={item.name}>
                {item.name}
                {item.isDefault ? ' (default)' : ''}
              </option>
            ))}
          </select>
        </label>

        {commitsQuery.isPending ? <p className={`mt-4 ${muted}`}>Loading commits…</p> : null}
        {commitsQuery.isError ? (
          <p className="mt-4 text-sm text-red-600">
            {errorMessage(commitsQuery.error, 'Unable to load commits')}
          </p>
        ) : null}
        {!commitsQuery.isPending && commits.length === 0 ? (
          <p className={`mt-4 ${muted}`}>No commits indexed yet. Sync the repository first.</p>
        ) : null}

        <ul className="mt-4 divide-y divide-zinc-100">
          {commits.map((commit) => (
            <li key={commit.sha} className="py-3 first:pt-0 last:pb-0">
              <Link
                className="block rounded-xl px-1 py-1 transition hover:bg-indigo-50/60"
                to={`${repoPath}/commits/${commit.sha}`}
              >
                <p className="font-medium text-zinc-900">{commitSubject(commit.message)}</p>
                <p className={`mt-1 ${muted}`}>
                  {commit.authorName} · {formatWhen(commit.committedAt)} · {shortRevision(commit.sha)}
                  {commit.isMerge ? ' · Merge' : ''} · {formatDiffstat(commit.additions, commit.deletions)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
        <PaginationBar
          className="mt-4"
          page={commitsQuery.data?.pagination.page ?? page}
          totalPages={commitsQuery.data?.pagination.totalPages ?? 1}
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
