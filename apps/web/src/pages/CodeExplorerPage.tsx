import { type FormEvent, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { FileTree } from '../components/FileTree';
import { ExplorerFrame } from '../components/PageFrame';
import { PaginationBar } from '../components/PaginationBar';
import { SourcePreview } from '../components/SourcePreview';
import { errorMessage } from '../lib/errors';
import { formatRelation, formatSymbolKind } from '../lib/format';
import {
  repositoryAskPath,
  repositoryCodePath,
  repositoryEvolutionPath,
  repositoryGraphPath,
  repositoryHistoryPath,
  repositoryImpactPath,
} from '../lib/paths';
import {
  useSourceFileQuery,
  useSourcePreviewQuery,
  useSourceTreeQuery,
  useSymbolQuery,
  useSymbolsQuery,
} from '../queries';
import { fieldClass, muted, secondaryButton } from '../ui';

const KINDS = ['', 'CLASS', 'INTERFACE', 'FUNCTION', 'METHOD', 'ENUM', 'TYPE', 'CONSTANT', 'VARIABLE'];

export function CodeExplorerPage() {
  const { workspaceId = '', repositoryId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const view = params.get('view') === 'symbols' ? 'symbols' : 'files';
  const fileId = params.get('file') ?? '';
  const symbolId = params.get('symbol') ?? '';
  const q = params.get('q') ?? '';
  const kind = params.get('kind') ?? '';
  const page = Number(params.get('page') || '1') || 1;
  const [draft, setDraft] = useState(q);
  const selected = Boolean(fileId || symbolId);

  function open(next: { file?: string; symbol?: string; view?: 'files' | 'symbols'; q?: string; kind?: string }) {
    setParams(
      new URLSearchParams(
        repositoryCodePath(workspaceId, repositoryId, {
          view: next.view ?? view,
          file: next.file,
          symbol: next.symbol,
          q: next.q ?? (q || undefined),
          kind: next.kind ?? (kind || undefined),
        }).split('?')[1] ?? '',
      ),
    );
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    open({ q: draft.trim() || undefined, view, kind: kind || undefined });
  }

  return (
    <ExplorerFrame>
      <section
        className={`flex w-full flex-col border-r border-zinc-200 bg-white md:w-80 md:shrink-0 ${selected ? 'hidden md:flex' : 'flex'}`}
      >
        <div className="flex gap-1 border-b border-zinc-100 p-3">
          <button
            className={view === 'files' ? tabActive : tabIdle}
            type="button"
            onClick={() => open({ view: 'files', q: draft.trim() || undefined })}
          >
            Files
          </button>
          <button
            className={view === 'symbols' ? tabActive : tabIdle}
            type="button"
            onClick={() => open({ view: 'symbols', q: draft.trim() || undefined, kind: kind || undefined })}
          >
            Symbols
          </button>
        </div>
        <form className="space-y-2 border-b border-zinc-100 p-3" onSubmit={submit}>
          <input
            className={fieldClass()}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={view === 'files' ? 'Search path' : 'Search symbols'}
            aria-label={view === 'files' ? 'Search path' : 'Search symbols'}
          />
          {view === 'symbols' ? (
            <select
              className={fieldClass()}
              value={kind}
              aria-label="Kind"
              onChange={(event) =>
                open({
                  view: 'symbols',
                  kind: event.target.value || undefined,
                  q: draft.trim() || undefined,
                })
              }
            >
              {KINDS.map((item) => (
                <option key={item || 'all'} value={item}>
                  {item ? formatSymbolKind(item) : 'All kinds'}
                </option>
              ))}
            </select>
          ) : null}
          <button className={`${secondaryButton} w-full`} type="submit">
            Search
          </button>
        </form>
        {view === 'files' ? (
          <FileTreePanel
            workspaceId={workspaceId}
            repositoryId={repositoryId}
            q={q}
            selectedId={fileId}
            onSelect={(id) => open({ view: 'files', file: id, q: q || undefined })}
          />
        ) : (
          <SymbolList
            workspaceId={workspaceId}
            repositoryId={repositoryId}
            q={q}
            kind={kind}
            page={page}
            selectedId={symbolId}
            onSelect={(symbol) =>
              open({
                view: 'symbols',
                symbol: symbol.id,
                file: symbol.fileId,
                q: q || undefined,
                kind: kind || undefined,
              })
            }
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
        )}
      </section>

      <section className={`min-w-0 flex-1 overflow-y-auto ${selected ? 'block' : 'hidden md:block'}`}>
        {selected ? (
          <button
            className="m-4 text-sm font-medium text-indigo-600 hover:text-indigo-500 md:hidden"
            type="button"
            onClick={() => open({ view, q: q || undefined, kind: kind || undefined })}
          >
            ← Back to list
          </button>
        ) : null}
        {symbolId ? (
          <SymbolDetail
            workspaceId={workspaceId}
            repositoryId={repositoryId}
            symbolId={symbolId}
            onOpenFile={(id) => open({ view: 'files', file: id, symbol: symbolId })}
            onOpenSymbol={(id, nextFileId) =>
              open({ view, symbol: id, file: nextFileId ?? fileId, q: q || undefined, kind: kind || undefined })
            }
          />
        ) : fileId ? (
          <FileDetail
            workspaceId={workspaceId}
            repositoryId={repositoryId}
            fileId={fileId}
            onOpenSymbol={(id) => open({ view: 'files', file: fileId, symbol: id })}
          />
        ) : (
          <div className="flex h-full items-center justify-center p-8">
            <p className={muted}>Select a file or symbol to inspect it here.</p>
          </div>
        )}
      </section>
    </ExplorerFrame>
  );
}

function FileTreePanel({
  workspaceId,
  repositoryId,
  q,
  selectedId,
  onSelect,
}: {
  workspaceId: string;
  repositoryId: string;
  q: string;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const searchQuery = useSourceTreeQuery(workspaceId, repositoryId, { q }, Boolean(q));
  return (
    <div className="flex-1 overflow-y-auto p-2">
      {q ? (
        searchQuery.isPending ? (
          <p className={`px-2 py-3 ${muted}`}>Searching files…</p>
        ) : searchQuery.isError ? (
          <p className="px-2 py-3 text-sm text-red-600">
            {errorMessage(searchQuery.error, 'Unable to search files')}
          </p>
        ) : (searchQuery.data?.items.length ?? 0) === 0 ? (
          <p className={`px-2 py-3 ${muted}`}>No paths match that search.</p>
        ) : (
          <ul>
            {(searchQuery.data?.items ?? []).map((item) => (
              <li key={item.fileId ?? item.path}>
                <button
                  className={`w-full rounded-lg px-3 py-2 text-left ${
                    item.fileId === selectedId ? 'bg-indigo-50' : 'hover:bg-zinc-50'
                  }`}
                  type="button"
                  onClick={() => item.fileId && onSelect(item.fileId)}
                >
                  <p className="truncate text-sm font-medium text-zinc-900">{item.name}</p>
                  <p className={`mt-0.5 truncate ${muted}`}>{item.path}</p>
                </button>
              </li>
            ))}
          </ul>
        )
      ) : (
        <FileTree
          workspaceId={workspaceId}
          repositoryId={repositoryId}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      )}
    </div>
  );
}

function SymbolList({
  workspaceId,
  repositoryId,
  q,
  kind,
  page,
  selectedId,
  onSelect,
  onPage,
}: {
  workspaceId: string;
  repositoryId: string;
  q: string;
  kind: string;
  page: number;
  selectedId: string;
  onSelect: (symbol: { id: string; fileId: string }) => void;
  onPage: (page: number) => void;
}) {
  const symbolsQuery = useSymbolsQuery(workspaceId, repositoryId, {
    q: q || undefined,
    kind: kind || undefined,
    page,
  });
  const symbols = (symbolsQuery.data?.items ?? []).filter((item) => item.kind !== 'MODULE');
  return (
    <div className="flex-1 overflow-y-auto p-2">
      {symbolsQuery.isPending ? <p className={`px-2 py-3 ${muted}`}>Loading symbols…</p> : null}
      {symbolsQuery.isError ? (
        <p className="px-2 py-3 text-sm text-red-600">
          {errorMessage(symbolsQuery.error, 'Unable to load symbols')}
        </p>
      ) : null}
      {!symbolsQuery.isPending && symbols.length === 0 ? (
        <p className={`px-2 py-3 ${muted}`}>No symbols indexed yet. Sync the repository first.</p>
      ) : null}
      <ul>
        {symbols.map((symbol) => (
          <li key={symbol.id}>
            <button
              className={`w-full rounded-lg px-3 py-2 text-left ${symbol.id === selectedId ? 'bg-indigo-50' : 'hover:bg-zinc-50'}`}
              type="button"
              onClick={() => onSelect(symbol)}
            >
              <p className="truncate text-sm font-medium text-zinc-900">{symbol.name}</p>
              <p className={`mt-0.5 ${muted}`}>
                {formatSymbolKind(symbol.kind)} · {symbol.path}
              </p>
            </button>
          </li>
        ))}
      </ul>
      <PaginationBar
        className="p-2"
        page={symbolsQuery.data?.pagination.page ?? page}
        totalPages={symbolsQuery.data?.pagination.totalPages ?? 1}
        onPage={onPage}
      />
    </div>
  );
}

function FileDetail({
  workspaceId,
  repositoryId,
  fileId,
  onOpenSymbol,
}: {
  workspaceId: string;
  repositoryId: string;
  fileId: string;
  onOpenSymbol: (id: string) => void;
}) {
  const fileQuery = useSourceFileQuery(workspaceId, repositoryId, fileId);
  const previewQuery = useSourcePreviewQuery(workspaceId, repositoryId, fileId);
  const symbolsQuery = useSymbolsQuery(workspaceId, repositoryId, { fileId, page: 1 });
  const file = fileQuery.data;
  const symbols = (symbolsQuery.data?.items ?? []).filter((symbol) => symbol.kind !== 'MODULE');

  return (
    <div className="space-y-6 p-6">
      {fileQuery.isPending ? <p className={muted}>Loading file…</p> : null}
      {fileQuery.isError ? (
        <p className="text-red-600">{errorMessage(fileQuery.error, 'File not found')}</p>
      ) : null}
      {file ? (
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-950">{file.path}</h1>
          <p className={`mt-2 ${muted}`}>
            {file.language ?? 'Unknown'}
            {file.loc != null ? ` · ${file.loc} lines` : ''}
            {file.complexity != null ? ` · complexity ${file.complexity}` : ''}
            {` · ${file.symbolCount} symbols`}
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-sm font-medium">
            <Link className="text-indigo-600 hover:text-indigo-500" to={repositoryHistoryPath(workspaceId, repositoryId, { path: file.path })}>
              History
            </Link>
            <Link className="text-indigo-600 hover:text-indigo-500" to={repositoryGraphPath(workspaceId, repositoryId, { file: file.id })}>
              Architecture
            </Link>
            <Link className="text-indigo-600 hover:text-indigo-500" to={repositoryImpactPath(workspaceId, repositoryId, { file: file.id })}>
              Impact
            </Link>
            <Link className="text-indigo-600 hover:text-indigo-500" to={repositoryEvolutionPath(workspaceId, repositoryId, { file: file.id })}>
              Evolution
            </Link>
            <Link className="text-indigo-600 hover:text-indigo-500" to={repositoryAskPath(workspaceId, repositoryId, { file: file.id })}>
              Ask
            </Link>
          </div>
        </div>
      ) : null}
      {symbols.length > 0 ? (
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Symbols</h2>
          <ul className="mt-3 divide-y divide-zinc-100">
            {symbols.map((symbol) => (
              <li key={symbol.id} className="py-2 first:pt-0 last:pb-0">
                <button
                  className="text-left text-sm font-medium text-indigo-600 hover:text-indigo-500"
                  type="button"
                  onClick={() => onOpenSymbol(symbol.id)}
                >
                  {symbol.name}
                  <span className={`ml-2 font-normal ${muted}`}>{formatSymbolKind(symbol.kind)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div>
        <h2 className="text-sm font-semibold text-zinc-900">Source</h2>
        {previewQuery.isPending ? <p className={`mt-3 ${muted}`}>Loading source…</p> : null}
        {previewQuery.isError ? (
          <p className="mt-3 text-sm text-red-600">
            {errorMessage(previewQuery.error, 'Source is not available yet.')}
          </p>
        ) : null}
        {previewQuery.data ? (
          <SourcePreview content={previewQuery.data.content} truncated={previewQuery.data.truncated} />
        ) : null}
      </div>
    </div>
  );
}

function SymbolDetail({
  workspaceId,
  repositoryId,
  symbolId,
  onOpenFile,
  onOpenSymbol,
}: {
  workspaceId: string;
  repositoryId: string;
  symbolId: string;
  onOpenFile: (fileId: string) => void;
  onOpenSymbol: (symbolId: string, fileId?: string) => void;
}) {
  const symbolQuery = useSymbolQuery(workspaceId, repositoryId, symbolId);
  const previewQuery = useSourcePreviewQuery(workspaceId, repositoryId, symbolQuery.data?.fileId ?? '');
  const symbol = symbolQuery.data;

  return (
    <div className="space-y-6 p-6">
      {symbolQuery.isPending ? <p className={muted}>Loading symbol…</p> : null}
      {symbolQuery.isError ? (
        <p className="text-red-600">{errorMessage(symbolQuery.error, 'Symbol not found')}</p>
      ) : null}
      {symbol ? (
        <>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-950">{symbol.name}</h1>
            <p className={`mt-2 ${muted}`}>
              {formatSymbolKind(symbol.kind)} · {symbol.path} · lines {symbol.startLine}–{symbol.endLine}
            </p>
            <p className={`mt-1 ${muted}`}>
              {symbol.loc} lines · complexity {symbol.complexity} · nesting {symbol.nesting}
            </p>
            <div className="mt-3 flex flex-wrap gap-3 text-sm font-medium">
              <button
                className="text-indigo-600 hover:text-indigo-500"
                type="button"
                onClick={() => onOpenFile(symbol.fileId)}
              >
                Open file
              </button>
              <Link
                className="text-indigo-600 hover:text-indigo-500"
                to={repositoryHistoryPath(workspaceId, repositoryId, { path: symbol.path })}
              >
                History
              </Link>
              <Link
                className="text-indigo-600 hover:text-indigo-500"
                to={repositoryAskPath(workspaceId, repositoryId, { file: symbol.fileId, symbol: symbol.id })}
              >
                Ask
              </Link>
            </div>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Relations</h2>
            {symbol.relations.length === 0 ? (
              <p className={`mt-3 ${muted}`}>No imports, calls, or heritage recorded for this symbol.</p>
            ) : (
              <ul className="mt-3 divide-y divide-zinc-100">
                {symbol.relations.map((relation, index) => (
                  <li key={`${relation.type}-${relation.targetQualifiedName}-${index}`} className="py-3 first:pt-0 last:pb-0">
                    {relation.targetSymbolId ? (
                      <button
                        className="text-left font-medium text-indigo-600 hover:text-indigo-500"
                        type="button"
                        onClick={() => onOpenSymbol(relation.targetSymbolId as string)}
                      >
                        {formatRelation(relation.type)} {relation.targetQualifiedName}
                      </button>
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
          </div>
          {previewQuery.data ? (
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">Source</h2>
              <p className={`mt-1 ${muted}`}>
                Lines {symbol.startLine}–{symbol.endLine} are highlighted from the current tree.
              </p>
              <SourcePreview
                content={previewQuery.data.content}
                startLine={symbol.startLine}
                endLine={symbol.endLine}
                truncated={previewQuery.data.truncated}
              />
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

const tabActive = 'flex-1 rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700';
const tabIdle = 'flex-1 rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50';
