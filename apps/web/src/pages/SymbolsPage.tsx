import { FormEvent, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { PageNav } from '../components/PageNav';
import { PaginationBar } from '../components/PaginationBar';
import { errorMessage } from '../lib/errors';
import { formatSymbolKind } from '../lib/format';
import { useRepositoryQuery, useSymbolsQuery, useWorkspaceQuery } from '../queries';
import { card, fieldClass, muted, secondaryButton } from '../ui';

const KINDS = ['', 'CLASS', 'INTERFACE', 'FUNCTION', 'METHOD', 'ENUM', 'TYPE', 'CONSTANT', 'VARIABLE'];

export function SymbolsPage() {
  const { workspaceId = '', repositoryId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const kind = params.get('kind') ?? '';
  const page = Number(params.get('page') || '1') || 1;
  const [draft, setDraft] = useState(q);
  const workspaceQuery = useWorkspaceQuery(workspaceId);
  const repositoryQuery = useRepositoryQuery(workspaceId, repositoryId);
  const symbolsQuery = useSymbolsQuery(workspaceId, repositoryId, {
    q: q || undefined,
    kind: kind || undefined,
    page,
  });
  const repoPath = `/workspaces/${workspaceId}/repositories/${repositoryId}`;
  const symbols = symbolsQuery.data?.items ?? [];

  function submit(event: FormEvent) {
    event.preventDefault();
    const next = new URLSearchParams();
    if (draft.trim()) {
      next.set('q', draft.trim());
    }
    if (kind) {
      next.set('kind', kind);
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
            { label: 'Symbols' },
          ]}
        />
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">Symbols</h1>
        <p className={`mt-2 ${muted}`}>Search classes, functions, and other extracted names.</p>
      </div>

      <section className={card}>
        <form className="grid gap-3 md:grid-cols-[1fr_12rem_auto]" onSubmit={submit}>
          <label className="block text-sm">
            <span className="font-medium text-zinc-700">Search</span>
            <input
              className={`${fieldClass()} mt-1.5`}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="AuthService"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-zinc-700">Kind</span>
            <select
              className={`${fieldClass()} mt-1.5`}
              value={kind}
              onChange={(event) => {
                const next = new URLSearchParams(params);
                if (event.target.value) {
                  next.set('kind', event.target.value);
                } else {
                  next.delete('kind');
                }
                next.delete('page');
                setParams(next);
              }}
            >
              {KINDS.map((item) => (
                <option key={item || 'all'} value={item}>
                  {item ? formatSymbolKind(item) : 'All kinds'}
                </option>
              ))}
            </select>
          </label>
          <button className={`${secondaryButton} md:mt-6`} type="submit">
            Search
          </button>
        </form>

        {symbolsQuery.isPending ? <p className={`mt-4 ${muted}`}>Loading symbols…</p> : null}
        {symbolsQuery.isError ? (
          <p className="mt-4 text-sm text-red-600">
            {errorMessage(symbolsQuery.error, 'Unable to load symbols')}
          </p>
        ) : null}
        {!symbolsQuery.isPending && symbols.length === 0 ? (
          <p className={`mt-4 ${muted}`}>No symbols indexed yet. Sync the repository first.</p>
        ) : null}

        <ul className="mt-4 divide-y divide-zinc-100">
          {symbols.map((symbol) => (
            <li key={symbol.id} className="py-3 first:pt-0 last:pb-0">
              <Link
                className="block rounded-xl px-1 py-1 transition hover:bg-indigo-50/60"
                to={`${repoPath}/code/symbols/${symbol.id}`}
              >
                <p className="font-medium text-zinc-900">{symbol.name}</p>
                <p className={`mt-1 ${muted}`}>
                  {formatSymbolKind(symbol.kind)} · {symbol.path} · lines {symbol.startLine}–{symbol.endLine}
                </p>
              </Link>
            </li>
          ))}
        </ul>
        <PaginationBar
          className="mt-4"
          page={symbolsQuery.data?.pagination.page ?? page}
          totalPages={symbolsQuery.data?.pagination.totalPages ?? 1}
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
