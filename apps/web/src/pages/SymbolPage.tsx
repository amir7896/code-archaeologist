import { Link, useParams } from 'react-router-dom';
import { PageNav } from '../components/PageNav';
import { errorMessage } from '../lib/errors';
import { formatRelation, formatSymbolKind } from '../lib/format';
import { useRepositoryQuery, useSymbolQuery, useWorkspaceQuery } from '../queries';
import { card, muted } from '../ui';

export function SymbolPage() {
  const { workspaceId = '', repositoryId = '', symbolId = '' } = useParams();
  const workspaceQuery = useWorkspaceQuery(workspaceId);
  const repositoryQuery = useRepositoryQuery(workspaceId, repositoryId);
  const symbolQuery = useSymbolQuery(workspaceId, repositoryId, symbolId);
  const symbol = symbolQuery.data;
  const repoPath = `/workspaces/${workspaceId}/repositories/${repositoryId}`;

  return (
    <div className="space-y-6">
      <div>
        <PageNav
          backTo={`${repoPath}/code/symbols`}
          backLabel="Back to symbols"
          crumbs={[
            { to: '/', label: 'Workspaces' },
            { to: `/workspaces/${workspaceId}`, label: workspaceQuery.data?.name ?? 'Workspace' },
            { to: repoPath, label: repositoryQuery.data?.name ?? 'Repository' },
            { to: `${repoPath}/code/symbols`, label: 'Symbols' },
            { label: symbol?.name ?? 'Symbol' },
          ]}
        />
        {symbolQuery.isPending ? <p className={`mt-6 ${muted}`}>Loading symbol…</p> : null}
        {symbolQuery.isError ? (
          <p className="mt-6 text-red-600">{errorMessage(symbolQuery.error, 'Symbol not found')}</p>
        ) : null}
        {symbol ? (
          <>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">{symbol.name}</h1>
            <p className={`mt-2 ${muted}`}>
              {formatSymbolKind(symbol.kind)} · {symbol.path} · lines {symbol.startLine}–{symbol.endLine}
            </p>
            <p className={`mt-1 ${muted}`}>
              {symbol.loc} lines · complexity {symbol.complexity} · nesting {symbol.nesting}
            </p>
          </>
        ) : null}
      </div>

      {symbol ? (
        <section className={card}>
          <h2 className="text-sm font-semibold text-zinc-900">Location</h2>
          <p className="mt-3 text-sm text-zinc-700">{symbol.qualifiedName}</p>
          <Link
            className="mt-3 inline-flex text-sm font-medium text-indigo-600 hover:text-indigo-500"
            to={`${repoPath}/code/files/${symbol.fileId}`}
          >
            Open file
          </Link>
        </section>
      ) : null}

      {symbol ? (
        <section className={card}>
          <h2 className="text-sm font-semibold text-zinc-900">Relations</h2>
          {symbol.relations.length === 0 ? (
            <p className={`mt-3 ${muted}`}>No imports, calls, or heritage recorded for this symbol.</p>
          ) : (
            <ul className="mt-3 divide-y divide-zinc-100">
              {symbol.relations.map((relation, index) => (
                <li key={`${relation.type}-${relation.targetQualifiedName}-${index}`} className="py-3 first:pt-0 last:pb-0">
                  {relation.targetSymbolId ? (
                    <Link
                      className="font-medium text-indigo-600 hover:text-indigo-500"
                      to={`${repoPath}/code/symbols/${relation.targetSymbolId}`}
                    >
                      {formatRelation(relation.type)} {relation.targetQualifiedName}
                    </Link>
                  ) : (
                    <p className="text-sm text-zinc-800">
                      {formatRelation(relation.type)} {relation.targetQualifiedName}
                    </p>
                  )}
                  <p className={`mt-1 ${muted}`}>Confidence {Math.round(relation.confidence * 100)}%</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
