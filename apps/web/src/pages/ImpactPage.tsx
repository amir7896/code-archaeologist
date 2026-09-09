import { type FormEvent, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { PageFrame } from '../components/PageFrame';
import { errorMessage } from '../lib/errors';
import { formatRiskLevel, shortRevision } from '../lib/format';
import {
  repositoryCodePath,
  repositoryDnaPath,
  repositoryEvolutionPath,
  repositoryGraphPath,
  repositoryImpactPath,
} from '../lib/paths';
import {
  useHotspotsQuery,
  useImpactQuery,
  useRepositoryQuery,
  useSourceFilesQuery,
  useSyncRepositoryMutation,
  useWorkspaceQuery,
} from '../queries';
import { card, fieldClass, muted, secondaryButton } from '../ui';
import type { ImpactAnalysis, ImpactNode, InsightItem } from '../api';

const DEPTHS = ['1', '2', '3', '4', '5', '6'];

export function ImpactPage() {
  const { workspaceId = '', repositoryId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const fileId = params.get('file') ?? '';
  const symbolId = params.get('symbol') ?? '';
  const depth = clampDepthParam(params.get('depth'));
  const [draft, setDraft] = useState('');
  const search = draft.trim();
  const filesQuery = useSourceFilesQuery(
    workspaceId,
    repositoryId,
    { q: search || undefined },
    search.length >= 2,
  );
  const hotspotsQuery = useHotspotsQuery(workspaceId, repositoryId);
  const impactQuery = useImpactQuery(workspaceId, repositoryId, {
    fileId: fileId || undefined,
    symbolId: symbolId || undefined,
    depth,
  });
  const repositoryQuery = useRepositoryQuery(workspaceId, repositoryId);
  const workspaceQuery = useWorkspaceQuery(workspaceId);
  const sync = useSyncRepositoryMutation(workspaceId, repositoryId);
  const repository = repositoryQuery.data;
  const canSync = workspaceQuery.data?.role !== 'VIEWER';
  const impact = impactQuery.data;
  const selected = Boolean(fileId || symbolId);

  function open(next: { file?: string; symbol?: string; depth?: string }) {
    setParams(
      new URLSearchParams(
        repositoryImpactPath(workspaceId, repositoryId, {
          file: next.file,
          symbol: next.symbol,
          depth: next.depth ?? String(depth),
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
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Impact</h1>
            <p className={`mt-2 ${muted}`}>
              What would change if you touch this file — from the architecture map, not a guess
              {impact?.revision ? ` · ${shortRevision(impact.revision)}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-zinc-600">
              Depth
              <select
                className={`${fieldClass()} w-20 py-2`}
                value={String(depth)}
                onChange={(event) => open({ file: fileId || undefined, symbol: symbolId || undefined, depth: event.target.value })}
              >
                {DEPTHS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
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
        </div>

        {!repository?.lastGraphRevision ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
            Sync now so impact can walk the architecture map.
          </section>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
          <div className="space-y-4">
            <section className={card}>
              <h2 className="text-sm font-semibold text-zinc-900">Choose a file</h2>
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
              <h2 className="text-sm font-semibold text-zinc-900">What would change</h2>
              <p className={`mt-3 ${muted}`}>
                Select a file to see what depends on it, what it depends on, and which tests or HTTP entry files sit in that set.
              </p>
            </section>
          ) : impactQuery.isLoading ? (
            <section className={card}>
              <p className={muted}>Walking the architecture map…</p>
            </section>
          ) : impactQuery.isError || !impact ? (
            <section className={card}>
              <p className="text-red-600">{errorMessage(impactQuery.error, 'Impact could not be calculated.')}</p>
            </section>
          ) : (
            <ImpactResult workspaceId={workspaceId} repositoryId={repositoryId} impact={impact} />
          )}
        </div>
      </div>
    </PageFrame>
  );
}

function ImpactResult({
  workspaceId,
  repositoryId,
  impact,
}: {
  workspaceId: string;
  repositoryId: string;
  impact: ImpactAnalysis;
}) {
  return (
    <div className="space-y-4">
      <section className={card}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              {impact.origin.subjectType === 'SYMBOL' ? 'Symbol' : 'File'}
            </p>
            <h2 className="mt-1 text-lg font-semibold text-zinc-950">{impact.origin.name}</h2>
            <p className={`mt-1 ${muted}`}>{impact.origin.path}</p>
          </div>
          <RiskBadge level={impact.origin.riskLevel} score={impact.origin.riskScore} />
        </div>
        <div className="mt-4 flex flex-wrap gap-3 text-sm font-medium">
          <Link className="text-indigo-600 hover:text-indigo-500" to={repositoryCodePath(workspaceId, repositoryId, {
            file: impact.origin.fileId,
            symbol: impact.origin.symbolId ?? undefined,
          })}>
            Open in Code
          </Link>
          <Link className="text-indigo-600 hover:text-indigo-500" to={repositoryDnaPath(workspaceId, repositoryId, {
            file: impact.origin.fileId,
            symbol: impact.origin.symbolId ?? undefined,
          })}>
            Code DNA
          </Link>
          <Link
            className="text-indigo-600 hover:text-indigo-500"
            to={repositoryGraphPath(workspaceId, repositoryId, { file: impact.origin.fileId })}
          >
            Architecture
          </Link>
          <Link
            className="text-indigo-600 hover:text-indigo-500"
            to={repositoryEvolutionPath(workspaceId, repositoryId, {
              file: impact.origin.fileId,
              symbol: impact.origin.symbolId ?? undefined,
            })}
          >
            Evolution
          </Link>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Would be affected" value={impact.stats.consumerCount} tone={impact.stats.consumerCount > 0 ? 'warn' : undefined} />
        <Stat label="Depends on" value={impact.stats.dependencyCount} />
        <Stat label="Higher risk" value={impact.stats.highRiskCount} tone={impact.stats.highRiskCount > 0 ? 'warn' : undefined} />
      </div>

      {impact.stats.truncated ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          This walk hit the size limit. The lists show the closest, riskiest files first.
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <NodeList
          title="Would be affected"
          empty="Nothing depends on this file at this depth."
          items={impact.consumers}
          workspaceId={workspaceId}
          repositoryId={repositoryId}
        />
        <NodeList
          title="This depends on"
          empty="This file does not depend on other indexed files."
          items={impact.dependencies}
          workspaceId={workspaceId}
          repositoryId={repositoryId}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <NodeList
          title="Tests in range"
          empty="No test files in this walk."
          items={impact.tests}
          workspaceId={workspaceId}
          repositoryId={repositoryId}
        />
        <NodeList
          title="HTTP entry files"
          empty="No controllers or routers in this walk."
          items={impact.endpoints}
          workspaceId={workspaceId}
          repositoryId={repositoryId}
        />
      </div>

      <section className={card}>
        <h2 className="text-sm font-semibold text-zinc-900">Folders</h2>
        {impact.modules.length === 0 ? (
          <p className={`mt-3 ${muted}`}>No other folders in this walk.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm text-zinc-700">
            {impact.modules.map((module) => (
              <li key={module.id} className="flex justify-between gap-3">
                <Link
                  className="text-indigo-600 hover:text-indigo-500"
                  to={repositoryGraphPath(workspaceId, repositoryId, { module: module.id })}
                >
                  {module.path}
                </Link>
                <span className={muted}>
                  {module.consumerCount} affected · {module.dependencyCount} deps
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function NodeList({
  title,
  empty,
  items,
  workspaceId,
  repositoryId,
}: {
  title: string;
  empty: string;
  items: ImpactNode[];
  workspaceId: string;
  repositoryId: string;
}) {
  return (
    <section className={card}>
      <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
      {items.length === 0 ? (
        <p className={`mt-3 ${muted}`}>{empty}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li key={`${title}-${item.fileId}-${item.direction}`}>
              <Link
                className="block rounded-xl border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50"
                to={repositoryImpactPath(workspaceId, repositoryId, { file: item.fileId, depth: '2' })}
              >
                <span className="block truncate font-medium text-zinc-900">{item.path}</span>
                <span className="mt-1 block text-xs text-zinc-500">
                  Depth {item.depth} · {formatRiskLevel(item.riskLevel)} · {item.riskScore}
                  {item.role !== 'file' ? ` · ${item.role}` : ''}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
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
                ? 'border-indigo-200 bg-indigo-50 text-indigo-800'
                : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'
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
      <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
      {items.length === 0 ? (
        <p className={`mt-3 ${muted}`}>None yet</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.slice(0, 8).map((item) => (
            <li key={item.subjectId}>
              <button
                className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${
                  selectedId === item.subjectId
                    ? 'border-indigo-200 bg-indigo-50 text-indigo-800'
                    : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                }`}
                type="button"
                onClick={() => onSelect(item)}
              >
                <span className="block truncate font-medium">{item.path ?? item.name}</span>
                <span className="mt-1 block text-xs text-zinc-500">
                  {formatRiskLevel(item.level)} · {item.score}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'warn' }) {
  return (
    <div className={card}>
      <p className={muted}>{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${tone === 'warn' ? 'text-rose-700' : 'text-zinc-950'}`}>{value}</p>
    </div>
  );
}

function RiskBadge({ level, score }: { level: string; score: number }) {
  const tone =
    level === 'CRITICAL' || level === 'HIGH'
      ? 'border-rose-200 bg-rose-50 text-rose-800'
      : level === 'MEDIUM'
        ? 'border-amber-200 bg-amber-50 text-amber-900'
        : 'border-zinc-200 bg-zinc-50 text-zinc-700';
  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${tone}`}>
      {formatRiskLevel(level)} · {score}
    </span>
  );
}

function clampDepthParam(value: string | null): number {
  const parsed = Number(value || '2');
  if (!Number.isFinite(parsed)) {
    return 2;
  }
  return Math.min(6, Math.max(1, Math.trunc(parsed)));
}
