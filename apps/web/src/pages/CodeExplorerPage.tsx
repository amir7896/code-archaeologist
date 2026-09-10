import { useParams, useSearchParams } from 'react-router-dom';
import { FileTree } from '../components/FileTree';
import { ExplorerFrame } from '../components/PageFrame';
import { PaginationBar } from '../components/PaginationBar';
import { SourcePreview } from '../components/SourcePreview';
import type { EvolutionEvent, EvidenceItem, FileHistoryItem, SourceSymbol } from '../api';
import { errorMessage } from '../lib/errors';
import {
  complexityDisplay,
  formatIsoDate,
  innermostSymbolAtLine,
  pickBlameEvidence,
  symbolTableName,
  type ComplexityTone,
} from '../lib/explorer';
import { commitSubject, formatSymbolKind, repositorySlug, shortRevision } from '../lib/format';
import { repositoryCodePath } from '../lib/paths';
import {
  useEvidenceQuery,
  useFileHistoryQuery,
  useRepositoryQuery,
  useSourceFileQuery,
  useSourcePreviewQuery,
  useSourceTreeQuery,
  useSymbolHistoryQuery,
  useSymbolQuery,
  useSymbolsQuery,
} from '../queries';
import { muted } from '../ui';

type ExplorerTab = 'source' | 'symbols' | 'history';

const PANEL = 'flex min-h-0 flex-col overflow-hidden rounded-[1.75rem] bg-panel';

export function CodeExplorerPage() {
  const { workspaceId = '', repositoryId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const fileId = params.get('file') ?? '';
  const symbolId = params.get('symbol') ?? '';
  const q = params.get('q') ?? '';
  const tab = parseTab(params.get('tab'));
  const line = Number(params.get('line') || '') || 0;
  const selected = Boolean(fileId);
  const repositoryQuery = useRepositoryQuery(workspaceId, repositoryId);
  const repository = repositoryQuery.data;
  const slug = repository ? repositorySlug(repository.url, repository.name) : 'this repository';

  function open(next: {
    file?: string;
    symbol?: string;
    tab?: ExplorerTab;
    q?: string;
    line?: number;
  }) {
    const nextTab = next.tab ?? tab;
    const nextLine = next.line ?? line;
    setParams(
      new URLSearchParams(
        repositoryCodePath(workspaceId, repositoryId, {
          file: next.file,
          symbol: next.symbol,
          tab: nextTab,
          q: next.q,
          line: nextLine > 0 ? String(nextLine) : undefined,
        }).split('?')[1] ?? '',
      ),
    );
  }

  return (
    <ExplorerFrame>
      <div className="mb-4 shrink-0">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Explorer</h1>
        <p className={`mt-1 ${muted}`}>Browse files, symbols and history for {slug}.</p>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
        <section className={`${PANEL} w-full lg:w-64 lg:shrink-0 ${selected ? 'hidden lg:flex' : 'flex'}`}>
          <p className="px-4 pb-2 pt-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            File tree
          </p>
          <FileTreePanel
            workspaceId={workspaceId}
            repositoryId={repositoryId}
            q={q}
            selectedId={fileId}
            onSelect={(id) =>
              open({
                file: id,
                symbol: id === fileId ? symbolId : undefined,
                tab,
                line: id === fileId ? line : undefined,
              })
            }
          />
        </section>

        <section className={`${PANEL} min-w-0 flex-1 ${selected ? 'flex' : 'hidden lg:flex'}`}>
          {selected ? (
            <button
              className="mx-4 mt-4 text-sm font-medium text-brand hover:text-brand-2 lg:hidden"
              type="button"
              onClick={() => open({ tab, q: q || undefined })}
            >
              ← Files
            </button>
          ) : null}
          {fileId ? (
            <FileWorkspace
              workspaceId={workspaceId}
              repositoryId={repositoryId}
              fileId={fileId}
              symbolId={symbolId}
              tab={tab}
              line={line}
              onTab={(next) => open({ file: fileId, symbol: symbolId, tab: next, line: line || undefined })}
              onSelectSymbol={(symbol) => {
                const nextLine =
                  line >= symbol.startLine && line <= symbol.endLine ? line : symbol.startLine;
                open({ file: fileId, symbol: symbol.id, tab, line: nextLine });
              }}
              onSelectLine={(nextLine, nextSymbolId) =>
                open({
                  file: fileId,
                  symbol: nextSymbolId ?? symbolId,
                  tab: 'source',
                  line: nextLine,
                })
              }
              onPage={(page) => {
                const next = new URLSearchParams(params);
                if (page > 1) {
                  next.set('page', String(page));
                } else {
                  next.delete('page');
                }
                setParams(next);
              }}
              page={Number(params.get('page') || '1') || 1}
            />
          ) : (
            <div className="flex h-full items-center justify-center p-8">
              <p className={muted}>Select a file from the tree to inspect source, symbols and history.</p>
            </div>
          )}
        </section>

        <section className={`${PANEL} w-full lg:w-72 lg:shrink-0 ${selected ? 'flex' : 'hidden lg:flex'}`}>
          <SymbolHistoryPanel
            workspaceId={workspaceId}
            repositoryId={repositoryId}
            symbolId={symbolId}
            line={line}
          />
        </section>
      </div>
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
  const selectedFile = useSourceFileQuery(workspaceId, repositoryId, selectedId);
  const selectedPath = selectedFile.data?.path ?? '';

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
      {q ? (
        searchQuery.isPending ? (
          <p className={`px-2 py-3 ${muted}`}>Searching files…</p>
        ) : searchQuery.isError ? (
          <p className="px-2 py-3 text-sm text-red-300">
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
                    item.fileId === selectedId ? 'bg-brand/20 text-white' : 'hover:bg-white/5'
                  }`}
                  type="button"
                  onClick={() => item.fileId && onSelect(item.fileId)}
                >
                  <p className="truncate text-sm font-medium">{item.name}</p>
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
          selectedPath={selectedPath}
          onSelect={onSelect}
        />
      )}
    </div>
  );
}

function FileWorkspace({
  workspaceId,
  repositoryId,
  fileId,
  symbolId,
  tab,
  line,
  page,
  onTab,
  onSelectSymbol,
  onSelectLine,
  onPage,
}: {
  workspaceId: string;
  repositoryId: string;
  fileId: string;
  symbolId: string;
  tab: ExplorerTab;
  line: number;
  page: number;
  onTab: (tab: ExplorerTab) => void;
  onSelectSymbol: (symbol: SourceSymbol) => void;
  onSelectLine: (line: number, symbolId?: string) => void;
  onPage: (page: number) => void;
}) {
  const fileQuery = useSourceFileQuery(workspaceId, repositoryId, fileId);
  const previewQuery = useSourcePreviewQuery(workspaceId, repositoryId, fileId);
  const symbolsQuery = useSymbolsQuery(workspaceId, repositoryId, { fileId, page: 1, limit: 100 });
  const file = fileQuery.data;
  const symbols = (symbolsQuery.data?.items ?? []).filter((symbol) => symbol.kind !== 'MODULE');
  const selectedSymbol = symbols.find((symbol) => symbol.id === symbolId);

  function selectLine(nextLine: number) {
    const match = innermostSymbolAtLine(symbols, nextLine);
    onSelectLine(nextLine, match?.id);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 px-5 py-4">
        <p className="min-w-0 truncate text-sm text-zinc-400">
          {fileQuery.isPending ? 'Loading file…' : (file?.path ?? 'File')}
        </p>
        <div className="flex rounded-full bg-white/5 p-1">
          <TabButton active={tab === 'source'} onClick={() => onTab('source')}>
            Source
          </TabButton>
          <TabButton active={tab === 'symbols'} onClick={() => onTab('symbols')}>
            Symbols
          </TabButton>
          <TabButton active={tab === 'history'} onClick={() => onTab('history')}>
            History
          </TabButton>
        </div>
      </div>

      {fileQuery.isError ? (
        <p className="px-5 text-sm text-red-300">{errorMessage(fileQuery.error, 'File not found')}</p>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
        {tab === 'source' ? (
          previewQuery.isPending ? (
            <p className={muted}>Loading source…</p>
          ) : previewQuery.isError ? (
            <p className="text-sm text-red-300">
              {errorMessage(previewQuery.error, 'Source is not available yet.')}
            </p>
          ) : previewQuery.data ? (
            <SourcePreview
              content={previewQuery.data.content}
              startLine={selectedSymbol?.startLine}
              endLine={selectedSymbol?.endLine}
              selectedLine={line || undefined}
              truncated={previewQuery.data.truncated}
              onSelectLine={selectLine}
            />
          ) : (
            <p className={muted}>Source is not available yet.</p>
          )
        ) : null}

        {tab === 'symbols' ? (
          symbolsQuery.isPending ? (
            <p className={muted}>Loading symbols…</p>
          ) : symbolsQuery.isError ? (
            <p className="text-sm text-red-300">{errorMessage(symbolsQuery.error, 'Unable to load symbols')}</p>
          ) : symbols.length === 0 ? (
            <p className={muted}>No symbols indexed in this file yet.</p>
          ) : (
            <SymbolsTable symbols={symbols} selectedId={symbolId} onSelect={onSelectSymbol} />
          )
        ) : null}

        {tab === 'history' && file ? (
          <FileHistoryList
            workspaceId={workspaceId}
            repositoryId={repositoryId}
            path={file.path}
            page={page}
            onPage={onPage}
          />
        ) : null}
      </div>
    </div>
  );
}

function SymbolsTable({
  symbols,
  selectedId,
  onSelect,
}: {
  symbols: SourceSymbol[];
  selectedId: string;
  onSelect: (symbol: SourceSymbol) => void;
}) {
  return (
    <table className="w-full text-left">
      <thead>
        <tr className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
          <th className="pb-3 font-semibold">Symbol</th>
          <th className="pb-3 font-semibold">Kind</th>
          <th className="pb-3 font-semibold">Lines</th>
          <th className="pb-3 text-right font-semibold">Complexity</th>
        </tr>
      </thead>
      <tbody>
        {symbols.map((symbol) => {
          const selected = symbol.id === selectedId;
          return (
            <tr
              key={symbol.id}
              className={`cursor-pointer border-t border-white/5 text-sm ${selected ? 'bg-brand/10' : 'hover:bg-white/5'}`}
              onClick={() => onSelect(symbol)}
            >
              <td className="py-3 pr-3">
                <button
                  className="text-left font-medium text-white"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelect(symbol);
                  }}
                >
                  {symbolTableName(symbol.name, symbol.kind)}
                </button>
              </td>
              <td className="py-3 pr-3 text-zinc-400">{formatSymbolKind(symbol.kind).toLowerCase()}</td>
              <td className="py-3 pr-3 text-zinc-400">
                {symbol.startLine}–{symbol.endLine}
              </td>
              <td className="py-3 text-right">
                <ComplexityBadge complexity={symbol.complexity} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function FileHistoryList({
  workspaceId,
  repositoryId,
  path,
  page,
  onPage,
}: {
  workspaceId: string;
  repositoryId: string;
  path: string;
  page: number;
  onPage: (page: number) => void;
}) {
  const historyQuery = useFileHistoryQuery(workspaceId, repositoryId, path, page);
  const items = historyQuery.data?.items ?? [];

  if (historyQuery.isPending) {
    return <p className={muted}>Loading history…</p>;
  }
  if (historyQuery.isError) {
    return <p className="text-sm text-red-300">{errorMessage(historyQuery.error, 'Unable to load file history')}</p>;
  }
  if (items.length === 0) {
    return <p className={muted}>No commits recorded for this path yet.</p>;
  }

  return (
    <div>
      <HistoryList items={items} />
      <PaginationBar
        className="pt-4"
        page={historyQuery.data?.pagination.page ?? page}
        totalPages={historyQuery.data?.pagination.totalPages ?? 1}
        onPage={onPage}
      />
    </div>
  );
}

function SymbolHistoryPanel({
  workspaceId,
  repositoryId,
  symbolId,
  line,
}: {
  workspaceId: string;
  repositoryId: string;
  symbolId: string;
  line: number;
}) {
  const symbolQuery = useSymbolQuery(workspaceId, repositoryId, symbolId);
  const historyQuery = useSymbolHistoryQuery(workspaceId, repositoryId, symbolId);
  const evidenceQuery = useEvidenceQuery(workspaceId, repositoryId, { symbolId: symbolId || undefined });
  const symbol = symbolQuery.data;
  const selectedName = symbol
    ? symbolTableName(symbol.name, symbol.kind)
    : historyQuery.data?.origin.name;
  const timeline = historyQuery.data?.timeline ?? [];
  const blame = pickBlameEvidence(evidenceQuery.data?.items ?? []);

  return (
    <div className="flex min-h-0 flex-1 flex-col p-5">
      <h2 className="text-sm font-semibold text-white">Symbol History</h2>
      {!symbolId ? (
        <p className={`mt-4 ${muted}`}>Select a symbol to see the commits scored against it.</p>
      ) : historyQuery.isPending ? (
        <p className={`mt-4 ${muted}`}>Loading history…</p>
      ) : historyQuery.isError ? (
        <p className="mt-4 text-sm text-red-300">
          {errorMessage(historyQuery.error, 'Unable to load symbol history')}
        </p>
      ) : (
        <>
          <p className="mt-3 truncate text-sm font-medium text-zinc-200">{selectedName ?? 'Symbol'}</p>
          {timeline.length === 0 ? (
            <p className={`mt-4 ${muted}`}>No scored history for this symbol yet.</p>
          ) : (
            <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
              <HistoryList items={timeline} />
            </div>
          )}
        </>
      )}
      <BlameFooter line={line} item={blame} ready={Boolean(symbolId)} />
    </div>
  );
}

function HistoryList({ items }: { items: Array<EvolutionEvent | FileHistoryItem> }) {
  return (
    <ul className="space-y-3">
      {items.map((item, index) => (
        <li key={`${item.sha}-${index}`} className="text-sm">
          <p className="text-zinc-200">
            <span className="text-zinc-500">{formatIsoDate(item.committedAt)}</span>
            <span className="px-2 text-zinc-600"> </span>
            <span>{commitSubject(item.message)}</span>
          </p>
        </li>
      ))}
    </ul>
  );
}

function BlameFooter({
  line,
  item,
  ready,
}: {
  line: number;
  item: EvidenceItem | undefined;
  ready: boolean;
}) {
  return (
    <div className="mt-auto border-t border-white/5 pt-4">
      <p className="text-sm text-zinc-300">
        Blame{line > 0 ? ` (selected line ${line})` : ''}
      </p>
      {!ready ? (
        <p className="mt-1 text-xs text-zinc-500">Select a symbol to score a commit against it.</p>
      ) : item?.commit ? (
        <p className="mt-1 text-xs text-zinc-400">
          {item.commit.authorName} · commit {shortRevision(item.commit.sha)} · confidence{' '}
          {item.confidence.toFixed(2)}
        </p>
      ) : (
        <p className="mt-1 text-xs text-zinc-500">No scored commit for this symbol yet.</p>
      )}
      <p className="mt-2 text-[11px] leading-4 text-zinc-600">
        Scored from overlapping commit ranges, not git blame.
      </p>
    </div>
  );
}

function ComplexityBadge({ complexity }: { complexity: number }) {
  const display = complexityDisplay(complexity);
  if (display.tone === 'empty') {
    return <span className="text-zinc-500">—</span>;
  }
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${complexityClass(display.tone)}`}>
      {display.text}
    </span>
  );
}

function complexityClass(tone: ComplexityTone): string {
  if (tone === 'high') {
    return 'bg-red-500/20 text-red-300';
  }
  if (tone === 'medium') {
    return 'bg-orange-500/20 text-orange-300';
  }
  return 'bg-emerald-500/20 text-emerald-300';
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      className={
        active
          ? 'rounded-full bg-brand/25 px-3 py-1 text-sm font-medium text-white'
          : 'rounded-full px-3 py-1 text-sm text-zinc-400 hover:text-white'
      }
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function parseTab(value: string | null): ExplorerTab {
  if (value === 'source' || value === 'history') {
    return value;
  }
  return 'symbols';
}
