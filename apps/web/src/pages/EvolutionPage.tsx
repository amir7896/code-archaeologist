import { type FormEvent, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { PageFrame } from '../components/PageFrame';
import { errorMessage } from '../lib/errors';
import {
  commitSubject,
  formatChange,
  formatConfidenceLabel,
  formatDiffstat,
  formatEvidenceMethod,
  formatWhen,
  shortRevision,
} from '../lib/format';
import {
  repositoryAskPath,
  repositoryCodePath,
  repositoryDnaPath,
  repositoryEvolutionPath,
  repositoryHistoryPath,
  repositoryImpactPath,
} from '../lib/paths';
import {
  useEvolutionQuery,
  useHotspotsQuery,
  useRepositoryQuery,
  useSourceFilesQuery,
  useSyncRepositoryMutation,
  useWorkspaceQuery,
} from '../queries';
import { card, fieldClass, muted, secondaryButton } from '../ui';
import type { EvolutionEvent, EvolutionTimeline, InsightItem } from '../api';

export function EvolutionPage() {
  const { workspaceId = '', repositoryId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const fileId = params.get('file') ?? '';
  const symbolId = params.get('symbol') ?? '';
  const [draft, setDraft] = useState('');
  const search = draft.trim();
  const filesQuery = useSourceFilesQuery(
    workspaceId,
    repositoryId,
    { q: search || undefined },
    search.length >= 2,
  );
  const hotspotsQuery = useHotspotsQuery(workspaceId, repositoryId);
  const evolutionQuery = useEvolutionQuery(workspaceId, repositoryId, {
    fileId: fileId || undefined,
    symbolId: symbolId || undefined,
  });
  const repositoryQuery = useRepositoryQuery(workspaceId, repositoryId);
  const workspaceQuery = useWorkspaceQuery(workspaceId);
  const sync = useSyncRepositoryMutation(workspaceId, repositoryId);
  const repository = repositoryQuery.data;
  const canSync = workspaceQuery.data?.role !== 'VIEWER';
  const evolution = evolutionQuery.data;
  const selected = Boolean(fileId || symbolId);

  function open(next: { file?: string; symbol?: string }) {
    setParams(
      new URLSearchParams(
        repositoryEvolutionPath(workspaceId, repositoryId, {
          file: next.file,
          symbol: next.symbol,
        }).split('?')[1] ?? '',
      ),
    );
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const first = filesQuery.data?.items[0];
    if (first) {
      open({ file: first.id });
    }
  }

  return (
    <PageFrame>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">Evolution</h1>
            <p className={`mt-2 ${muted}`}>
              How this code changed — scored from commits and line ranges, never certain
              {evolution?.revision ? ` · ${shortRevision(evolution.revision)}` : ''}
            </p>
          </div>
          {canSync && repository ? (
            <button
              className={secondaryButton}
              type="button"
              disabled={repository.status === 'SYNCING' || sync.isPending}
              onClick={() => void sync.mutate(undefined)}
            >
              {repository.status === 'SYNCING' || sync.isPending ? 'Syncing…' : 'Sync now'}
            </button>
          ) : null}
        </div>

        {!repository?.lastEvidenceRevision ? (
          <section className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-5 text-sm text-amber-900">
            Sync now to link commits to symbols. File history is still available until then.
          </section>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
          <div className="space-y-4">
            <section className={card}>
              <h2 className="text-sm font-semibold text-white">Choose a file</h2>
              <form className="mt-3 space-y-2" onSubmit={submit}>
                <input
                  className={fieldClass()}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Search path"
                  aria-label="Search path"
                />
              </form>
              {search.length >= 2 ? (
                filesQuery.isLoading ? (
                  <p className={`mt-3 ${muted}`}>Searching…</p>
                ) : (
                  <FilePickList
                    items={(filesQuery.data?.items ?? []).map((file) => ({
                      id: file.id,
                      path: file.path,
                    }))}
                    selectedId={fileId}
                    onSelect={(id) => open({ file: id })}
                    empty="No matching files"
                  />
                )
              ) : (
                <p className={`mt-3 ${muted}`}>Search a path, or pick a hotspot.</p>
              )}
            </section>
            <InsightPickList
              title="Hotspots"
              items={hotspotsQuery.data?.items ?? []}
              selectedId={fileId}
              onSelect={(item) => open({ file: item.subjectId })}
            />
          </div>

          {!selected ? (
            <section className={card}>
              <h2 className="text-sm font-semibold text-white">How it changed</h2>
              <p className={`mt-3 ${muted}`}>
                Select a file to see the commits that likely touched it, and how strongly each link is
                scored.
              </p>
            </section>
          ) : evolutionQuery.isLoading ? (
            <section className={card}>
              <p className={muted}>Reading historical links…</p>
            </section>
          ) : evolutionQuery.isError || !evolution ? (
            <section className={card}>
              <p className="text-red-300">{errorMessage(evolutionQuery.error, 'Evolution could not be loaded.')}</p>
            </section>
          ) : (
            <EvolutionResult workspaceId={workspaceId} repositoryId={repositoryId} evolution={evolution} />
          )}
        </div>
      </div>
    </PageFrame>
  );
}

function EvolutionResult({
  workspaceId,
  repositoryId,
  evolution,
}: {
  workspaceId: string;
  repositoryId: string;
  evolution: EvolutionTimeline;
}) {
  return (
    <div className="space-y-4">
      <section className={card}>
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
          {evolution.origin.subjectType === 'SYMBOL' ? 'Symbol' : 'File'}
        </p>
        <h2 className="mt-1 text-lg font-semibold text-white">{evolution.origin.name}</h2>
        <p className={`mt-1 ${muted}`}>{evolution.origin.path}</p>
        <p className={`mt-3 text-sm ${muted}`}>{evolution.note}</p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm font-medium">
          <Link
            className="text-brand hover:text-brand-2"
            to={repositoryCodePath(workspaceId, repositoryId, {
              file: evolution.origin.fileId,
              symbol: evolution.origin.symbolId ?? undefined,
            })}
          >
            Open in Code
          </Link>
          <Link
            className="text-brand hover:text-brand-2"
            to={repositoryDnaPath(workspaceId, repositoryId, {
              file: evolution.origin.fileId,
              symbol: evolution.origin.symbolId ?? undefined,
            })}
          >
            Code DNA
          </Link>
          <Link
            className="text-brand hover:text-brand-2"
            to={repositoryImpactPath(workspaceId, repositoryId, {
              file: evolution.origin.fileId,
              symbol: evolution.origin.symbolId ?? undefined,
            })}
          >
            Check impact
          </Link>
          <Link
            className="text-brand hover:text-brand-2"
            to={repositoryHistoryPath(workspaceId, repositoryId, { path: evolution.origin.path })}
          >
            File history
          </Link>
          <Link
            className="text-brand hover:text-brand-2"
            to={repositoryAskPath(workspaceId, repositoryId, {
              file: evolution.origin.fileId,
              symbol: evolution.origin.symbolId ?? undefined,
            })}
          >
            Ask
          </Link>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Commits" value={evolution.stats.commitCount} />
        <Stat label="Strong" value={evolution.stats.strongCount} />
        <Stat label="Likely" value={evolution.stats.likelyCount} />
        <Stat label="Possible" value={evolution.stats.possibleCount} />
      </div>

      <section className={card}>
        <h3 className="text-sm font-semibold text-white">Timeline</h3>
        {evolution.timeline.length === 0 ? (
          <p className={`mt-3 ${muted}`}>No linked commits yet.</p>
        ) : (
          <ol className="mt-3 space-y-3">
            {evolution.timeline.map((event) => (
              <TimelineItem
                key={event.sha}
                event={event}
                workspaceId={workspaceId}
                repositoryId={repositoryId}
                path={evolution.origin.path}
              />
            ))}
          </ol>
        )}
      </section>

      {evolution.versions.length > 0 ? (
        <section className={card}>
          <h3 className="text-sm font-semibold text-white">Recorded versions</h3>
          <ul className="mt-3 space-y-2 text-sm text-zinc-200">
            {evolution.versions.map((version) => (
              <li key={`${version.revision}-${version.contentHash}`} className="flex flex-wrap justify-between gap-2">
                <span>
                  {shortRevision(version.revision)} · {formatChange(version.changeType)} · lines{' '}
                  {version.startLine}–{version.endLine}
                </span>
                <span className={muted}>{version.contentHash.slice(0, 8)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function TimelineItem({
  event,
  workspaceId,
  repositoryId,
  path,
}: {
  event: EvolutionEvent;
  workspaceId: string;
  repositoryId: string;
  path: string;
}) {
  return (
    <li className="rounded-xl border border-white/10 px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <Link
          className="font-medium text-white hover:text-brand"
          to={repositoryHistoryPath(workspaceId, repositoryId, { commit: event.sha, path })}
        >
          {commitSubject(event.message)}
        </Link>
        <ConfidenceBadge label={event.confidenceLabel} />
      </div>
      <p className={`mt-1 ${muted}`}>
        {event.authorName} · {formatWhen(event.committedAt)} · {shortRevision(event.sha)}
      </p>
      <p className={`mt-1 ${muted}`}>
        {formatEvidenceMethod(event.method)}
        {event.changeType ? ` · ${formatChange(event.changeType)}` : ''}
        {event.additions || event.deletions ? ` · ${formatDiffstat(event.additions, event.deletions)}` : ''}
        {event.overlapLines > 0 ? ` · ${event.overlapLines} overlapping lines` : ''}
      </p>
    </li>
  );
}

function ConfidenceBadge({ label }: { label: string }) {
  const tone =
    label === 'strong'
      ? 'bg-emerald-50 text-emerald-800'
      : label === 'likely'
        ? 'bg-amber-500/10 text-amber-800'
        : 'bg-white/10 text-zinc-200';
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>{formatConfidenceLabel(label)}</span>
  );
}

function FilePickList({
  items,
  selectedId,
  onSelect,
  empty,
}: {
  items: Array<{ id: string; path: string }>;
  selectedId: string;
  onSelect: (id: string) => void;
  empty: string;
}) {
  if (items.length === 0) {
    return <p className={`mt-3 ${muted}`}>{empty}</p>;
  }
  return (
    <ul className="mt-3 space-y-2">
      {items.slice(0, 12).map((item) => (
        <li key={item.id}>
          <button
            className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${
              selectedId === item.id
                ? 'border-brand/40 bg-brand/15 text-brand-2'
                : 'border-white/10 text-zinc-200 hover:bg-white/5'
            }`}
            type="button"
            onClick={() => onSelect(item.id)}
          >
            <span className="block truncate">{item.path}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function InsightPickList({
  title,
  items,
  selectedId,
  onSelect,
}: {
  title: string;
  items: InsightItem[];
  selectedId: string;
  onSelect: (item: InsightItem) => void;
}) {
  return (
    <section className={card}>
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      {items.length === 0 ? (
        <p className={`mt-3 ${muted}`}>None yet</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.slice(0, 8).map((item) => (
            <li key={item.subjectId}>
              <button
                className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${
                  selectedId === item.subjectId
                    ? 'border-brand/40 bg-brand/15 text-brand-2'
                    : 'border-white/10 text-zinc-200 hover:bg-white/5'
                }`}
                type="button"
                onClick={() => onSelect(item)}
              >
                <span className="block truncate font-medium">{item.path ?? item.name}</span>
                <span className="mt-1 block text-xs text-zinc-500">
                  {item.level} · {item.score}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <section className={card}>
      <p className={muted}>{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </section>
  );
}
