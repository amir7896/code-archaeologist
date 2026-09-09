import { Link, useParams } from 'react-router-dom';
import { PageNav } from '../components/PageNav';
import { errorMessage } from '../lib/errors';
import { formatSymbolKind } from '../lib/format';
import {
  useRepositoryQuery,
  useSourceFileQuery,
  useSourcePreviewQuery,
  useSymbolsQuery,
  useWorkspaceQuery,
} from '../queries';
import { card, muted } from '../ui';

export function FilePage() {
  const { workspaceId = '', repositoryId = '', fileId = '' } = useParams();
  const workspaceQuery = useWorkspaceQuery(workspaceId);
  const repositoryQuery = useRepositoryQuery(workspaceId, repositoryId);
  const fileQuery = useSourceFileQuery(workspaceId, repositoryId, fileId);
  const previewQuery = useSourcePreviewQuery(workspaceId, repositoryId, fileId);
  const symbolsQuery = useSymbolsQuery(workspaceId, repositoryId, { fileId, page: 1 });
  const file = fileQuery.data;
  const repoPath = `/workspaces/${workspaceId}/repositories/${repositoryId}`;
  const symbols = (symbolsQuery.data?.items ?? []).filter((symbol) => symbol.kind !== 'MODULE');

  return (
    <div className="space-y-6">
      <div>
        <PageNav
          backTo={`${repoPath}/code`}
          backLabel="Back to files"
          crumbs={[
            { to: '/', label: 'Workspaces' },
            { to: `/workspaces/${workspaceId}`, label: workspaceQuery.data?.name ?? 'Workspace' },
            { to: repoPath, label: repositoryQuery.data?.name ?? 'Repository' },
            { to: `${repoPath}/code`, label: 'Files' },
            { label: file?.path ?? 'File' },
          ]}
        />
        {fileQuery.isPending ? <p className={`mt-6 ${muted}`}>Loading file…</p> : null}
        {fileQuery.isError ? (
          <p className="mt-6 text-red-600">{errorMessage(fileQuery.error, 'File not found')}</p>
        ) : null}
        {file ? (
          <>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">{file.path}</h1>
            <p className={`mt-2 ${muted}`}>
              {file.language ?? 'Unknown'}
              {file.loc != null ? ` · ${file.loc} lines` : ''}
              {file.complexity != null ? ` · complexity ${file.complexity}` : ''}
              {` · ${file.symbolCount} symbols`}
            </p>
          </>
        ) : null}
      </div>

      {symbols.length > 0 ? (
        <section className={card}>
          <h2 className="text-sm font-semibold text-zinc-900">Symbols</h2>
          <ul className="mt-3 divide-y divide-zinc-100">
            {symbols.map((symbol) => (
              <li key={symbol.id} className="py-3 first:pt-0 last:pb-0">
                <Link
                  className="block rounded-xl px-1 py-1 transition hover:bg-indigo-50/60"
                  to={`${repoPath}/code/symbols/${symbol.id}`}
                >
                  <p className="font-medium text-zinc-900">{symbol.name}</p>
                  <p className={`mt-1 ${muted}`}>
                    {formatSymbolKind(symbol.kind)} · lines {symbol.startLine}–{symbol.endLine} ·
                    complexity {symbol.complexity}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className={card}>
        <h2 className="text-sm font-semibold text-zinc-900">Source</h2>
        {previewQuery.isPending ? <p className={`mt-3 ${muted}`}>Loading source…</p> : null}
        {previewQuery.isError ? (
          <p className="mt-3 text-sm text-red-600">
            {errorMessage(previewQuery.error, 'Source is not available yet.')}
          </p>
        ) : null}
        {previewQuery.data ? (
          <>
            <pre className="mt-3 overflow-x-auto rounded-xl bg-zinc-50 p-4 text-xs leading-5 text-zinc-800">
              {previewQuery.data.content}
            </pre>
            {previewQuery.data.truncated ? (
              <p className={`mt-2 ${muted}`}>Preview is truncated.</p>
            ) : null}
          </>
        ) : null}
      </section>
    </div>
  );
}
