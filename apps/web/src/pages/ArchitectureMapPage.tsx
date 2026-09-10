import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { PageFrame } from '../components/PageFrame';
import { errorMessage } from '../lib/errors';
import { shortRevision } from '../lib/format';
import { repositoryCodePath, repositoryEvolutionPath, repositoryGraphPath, repositoryImpactPath } from '../lib/paths';
import {
  useGraphDependenciesQuery,
  useGraphDependentsQuery,
  useGraphMapQuery,
  useRepositoryQuery,
  useSyncRepositoryMutation,
  useWorkspaceQuery,
} from '../queries';
import { card, fieldClass, muted, secondaryButton } from '../ui';
import type { GraphMap, GraphMapEdge, GraphModule, GraphNeighbors } from '../api';

const MAX_MAP_NODES = 36;

const GROUP_OPTIONS = [
  { value: 'auto', label: 'Auto folders' },
  { value: '1', label: '1 folder deep' },
  { value: '2', label: '2 folders deep' },
  { value: '3', label: '3 folders deep' },
];

const VIEW_OPTIONS = [
  { value: 'all', label: 'All folders' },
  { value: 'connected', label: 'Connected only' },
  { value: 'cycles', label: 'Cycles only' },
];

export function ArchitectureMapPage() {
  const { workspaceId = '', repositoryId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('module') ?? '';
  const selectedFileId = params.get('file') ?? '';
  const group = params.get('group') === '1' || params.get('group') === '2' || params.get('group') === '3'
    ? params.get('group') ?? 'auto'
    : 'auto';
  const view = params.get('view') === 'cycles' || params.get('view') === 'connected' ? params.get('view') ?? 'all' : 'all';
  const filter = params.get('q') ?? '';
  const depth = clampDepth(params.get('depth'));
  const [draft, setDraft] = useState(filter);
  const mapQuery = useGraphMapQuery(workspaceId, repositoryId, group);
  const repositoryQuery = useRepositoryQuery(workspaceId, repositoryId);
  const workspaceQuery = useWorkspaceQuery(workspaceId);
  const sync = useSyncRepositoryMutation(workspaceId, repositoryId);
  const map = mapQuery.data;
  const repository = repositoryQuery.data;
  const canSync = workspaceQuery.data?.role !== 'VIEWER';
  const selected = map?.modules.find((module) => module.id === selectedId) ?? null;

  function open(next: { module?: string; file?: string; group?: string; view?: string; q?: string; depth?: string }) {
    setParams(
      new URLSearchParams(
        repositoryGraphPath(workspaceId, repositoryId, {
          module: next.module,
          file: next.file,
          group: next.group ?? group,
          view: next.view ?? view,
          q: next.q !== undefined ? next.q : filter || undefined,
          depth: next.depth ?? String(depth),
        }).split('?')[1] ?? '',
      ),
    );
  }

  if (mapQuery.isLoading) {
    return (
      <PageFrame>
        <p className={muted}>Loading the architecture map…</p>
      </PageFrame>
    );
  }

  if (mapQuery.isError || !map) {
    return (
      <PageFrame>
        <p className="text-red-300">{errorMessage(mapQuery.error, 'The architecture map could not be loaded.')}</p>
      </PageFrame>
    );
  }

  const empty = map.stats.fileCount === 0;
  const needsSync = !repository?.lastGraphRevision && map.stats.edgeCount === 0;
  const visibleModules = filterGraphModules(map.modules, { q: filter, view });
  const visibleIds = new Set(visibleModules.map((module) => module.id));
  const visibleEdges = map.edges.filter(
    (edge) => visibleIds.has(edge.sourceId) && visibleIds.has(edge.targetId),
  );

  return (
    <PageFrame>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">Architecture</h1>
            <p className={`mt-2 ${muted}`}>
              How folders depend on each other
              {map.revision ? ` · ${shortRevision(map.revision)}` : ''}
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

        {empty ? (
          <section className={card}>
            <p className="text-sm text-zinc-200">
              Sync this repository to read its source and build the architecture map.
            </p>
          </section>
        ) : (
          <>
            {needsSync ? (
              <section className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-5 text-sm text-amber-900">
                Sync now to extract dependencies from the latest source.
              </section>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-4">
              <Stat label="Folders" value={map.stats.moduleCount} />
              <Stat label="Files" value={map.stats.fileCount} />
              <Stat label="Dependencies" value={map.stats.edgeCount} />
              <Stat label="Cycles" value={map.stats.cycleCount} tone={map.stats.cycleCount > 0 ? 'warn' : 'ok'} />
            </div>

            {map.cycles.length > 0 ? (
              <section className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-5">
                <h2 className="text-sm font-semibold text-rose-900">Circular dependencies</h2>
                <ul className="mt-3 space-y-2 text-sm text-rose-200">
                  {map.cycles.map((cycle) => (
                    <li key={cycle.id}>
                      {cycle.nodes.map((node, index) => (
                        <span key={node}>
                          {index > 0 ? ' → ' : null}
                          <button className="underline-offset-2 hover:underline" type="button" onClick={() => open({ module: node })}>
                            {node}
                          </button>
                        </span>
                      ))}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <MostConnected modules={visibleModules} onSelect={(id) => open({ module: id })} />

            <section className={card}>
              <h2 className="text-sm font-semibold text-white">Map controls</h2>
              <form
                className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  open({ q: draft.trim() || undefined, module: selectedId || undefined, file: selectedFileId || undefined });
                }}
              >
                <label className="block text-sm">
                  <span className={muted}>Group folders</span>
                  <select
                    className={`${fieldClass()} mt-1`}
                    value={group}
                    aria-label="Group folders"
                    onChange={(event) => open({ group: event.target.value, module: '', file: '' })}
                  >
                    {GROUP_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className={muted}>Show</span>
                  <select
                    className={`${fieldClass()} mt-1`}
                    value={view}
                    aria-label="Show folders"
                    onChange={(event) => open({ view: event.target.value, module: selectedId || undefined })}
                  >
                    {VIEW_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className={muted}>Neighbor depth</span>
                  <select
                    className={`${fieldClass()} mt-1`}
                    value={String(depth)}
                    aria-label="Neighbor depth"
                    onChange={(event) =>
                      open({
                        depth: event.target.value,
                        module: selectedId || undefined,
                        file: selectedFileId || undefined,
                      })
                    }
                  >
                    {[1, 2, 3, 4].map((value) => (
                      <option key={value} value={String(value)}>
                        {value} hop{value === 1 ? '' : 's'}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className={muted}>Filter folders</span>
                  <input
                    className={`${fieldClass()} mt-1`}
                    value={draft}
                    onChange={(event) => {
                      const value = event.target.value;
                      setDraft(value);
                      open({
                        q: value.trim() || undefined,
                        module: selectedId || undefined,
                        file: selectedFileId || undefined,
                      });
                    }}
                    placeholder="auth, payments…"
                    aria-label="Filter folders"
                  />
                </label>
              </form>
              <p className={`mt-2 ${muted}`}>
                Showing {visibleModules.length} of {map.modules.length} folders. Large repositories stay readable by
                grouping and hiding isolated nodes.
              </p>
            </section>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <section className={`${card} overflow-hidden p-3 sm:p-5`}>
                <ArchitectureCanvas
                  modules={visibleModules}
                  edges={visibleEdges}
                  selectedId={selectedId}
                  onSelect={(id) => open({ module: id })}
                />
                <ul className="mt-4 flex flex-wrap gap-2">
                  {visibleModules.slice(0, 24).map((module) => (
                    <li key={module.id}>
                      <button
                        className={`rounded-full border px-2.5 py-1 text-xs ${
                          module.id === selectedId
                            ? 'border-brand bg-brand/15 text-brand-2'
                            : module.inCycle
                              ? 'border-rose-400/30 bg-rose-500/10 text-rose-200'
                              : 'border-white/10 bg-panel text-zinc-400'
                        }`}
                        type="button"
                        onClick={() => open({ module: module.id })}
                      >
                        {module.path}
                      </button>
                    </li>
                  ))}
                </ul>
                {visibleModules.length > 24 ? (
                  <p className={`mt-2 ${muted}`}>
                    {visibleModules.length - 24} more folders match. Use the filter to narrow the list.
                  </p>
                ) : null}
              </section>
              <ModuleDetail
                workspaceId={workspaceId}
                repositoryId={repositoryId}
                module={selected}
                selectedFileId={selectedFileId}
                map={map}
                depth={depth}
                onSelectModule={(id) => open({ module: id })}
                onSelectFile={(fileId) => open({ module: selectedId || selected?.id, file: fileId })}
              />
            </div>
          </>
        )}
      </div>
    </PageFrame>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'ok' | 'warn' }) {
  return (
    <div className={card}>
      <p className={muted}>{label}</p>
      <p
        className={`mt-2 text-2xl font-semibold ${tone === 'warn' ? 'text-rose-300' : 'text-white'}`}
      >
        {value}
      </p>
    </div>
  );
}

function MostConnected({
  modules,
  onSelect,
}: {
  modules: GraphModule[];
  onSelect: (id: string) => void;
}) {
  const ranked = [...modules]
    .filter((module) => module.fanIn + module.fanOut > 0)
    .sort((left, right) => right.fanIn + right.fanOut - (left.fanIn + left.fanOut))
    .slice(0, 5);
  if (ranked.length === 0) {
    return null;
  }
  return (
    <section className={card}>
      <h2 className="text-sm font-semibold text-white">Most connected folders</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {ranked.map((module) => (
          <li key={module.id} className="flex items-center justify-between gap-3">
            <button
              className="text-left text-brand hover:text-brand-2"
              type="button"
              onClick={() => onSelect(module.id)}
            >
              {module.path}
            </button>
            <span className={muted}>
              {module.fanOut} out · {module.fanIn} in
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ModuleDetail({
  workspaceId,
  repositoryId,
  module,
  selectedFileId,
  map,
  depth,
  onSelectModule,
  onSelectFile,
}: {
  workspaceId: string;
  repositoryId: string;
  module: GraphModule | null;
  selectedFileId: string;
  map: GraphMap;
  depth: number;
  onSelectModule: (id: string) => void;
  onSelectFile: (fileId: string) => void;
}) {
  const outgoing = module ? map.edges.filter((edge) => edge.sourceId === module.id) : [];
  const incoming = module ? map.edges.filter((edge) => edge.targetId === module.id) : [];

  if (!module) {
    return (
      <section className={card}>
        <h2 className="text-sm font-semibold text-white">Folder</h2>
        <p className={`mt-3 ${muted}`}>Select a folder on the map to see what it depends on.</p>
      </section>
    );
  }

  return (
    <section className={card}>
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Folder</p>
      <h2 className="mt-1 text-lg font-semibold text-white">{module.path}</h2>
      <p className={`mt-2 ${muted}`}>
        {module.fileCount} files · {module.fanOut} depends on · {module.fanIn} used by
        {module.inCycle ? ' · in a cycle' : ''}
      </p>

      <RelationList
        title="Depends on"
        edges={outgoing}
        getId={(edge) => edge.targetId}
        onSelect={onSelectModule}
      />
      <RelationList
        title="Used by"
        edges={incoming}
        getId={(edge) => edge.sourceId}
        onSelect={onSelectModule}
      />

      <h3 className="mt-5 text-sm font-semibold text-white">Files</h3>
      <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-sm">
        {module.files.map((file) => (
          <li key={file.id}>
            <button
              className={`text-left ${selectedFileId === file.id ? 'font-medium text-brand-2' : 'text-brand hover:text-brand-2'}`}
              type="button"
              onClick={() => onSelectFile(file.id)}
            >
              {file.path}
            </button>
          </li>
        ))}
      </ul>

      {selectedFileId ? (
        <FileNeighbors
          workspaceId={workspaceId}
          repositoryId={repositoryId}
          fileId={selectedFileId}
          depth={depth}
          onSelectFile={onSelectFile}
        />
      ) : null}
    </section>
  );
}

function FileNeighbors({
  workspaceId,
  repositoryId,
  fileId,
  depth,
  onSelectFile,
}: {
  workspaceId: string;
  repositoryId: string;
  fileId: string;
  depth: number;
  onSelectFile: (fileId: string) => void;
}) {
  const dependencies = useGraphDependenciesQuery(workspaceId, repositoryId, fileId, depth);
  const dependents = useGraphDependentsQuery(workspaceId, repositoryId, fileId, depth);

  return (
    <div className="mt-5 border-t border-white/5 pt-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-white">This file</h3>
        <div className="flex items-center gap-3">
          <Link
            className="text-xs font-medium text-brand hover:text-brand-2"
            to={repositoryCodePath(workspaceId, repositoryId, { file: fileId })}
          >
            Open in Code
          </Link>
          <Link
            className="text-xs font-medium text-brand hover:text-brand-2"
            to={repositoryImpactPath(workspaceId, repositoryId, { file: fileId })}
          >
            Check impact
          </Link>
          <Link
            className="text-xs font-medium text-brand hover:text-brand-2"
            to={repositoryEvolutionPath(workspaceId, repositoryId, { file: fileId })}
          >
            Evolution
          </Link>
        </div>
      </div>
      <NeighborList title="Depends on" query={dependencies} onSelectFile={onSelectFile} />
      <NeighborList title="Used by" query={dependents} onSelectFile={onSelectFile} />
    </div>
  );
}

function NeighborList({
  title,
  query,
  onSelectFile,
}: {
  title: string;
  query: { data?: GraphNeighbors; isLoading: boolean; isError: boolean };
  onSelectFile: (fileId: string) => void;
}) {
  return (
    <div className="mt-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{title}</h4>
      {query.isLoading ? (
        <p className={`mt-2 ${muted}`}>Loading…</p>
      ) : query.isError ? (
        <p className={`mt-2 ${muted}`}>Could not load this list.</p>
      ) : !query.data?.items.length ? (
        <p className={`mt-2 ${muted}`}>None</p>
      ) : (
        <ul className="mt-2 space-y-1 text-sm text-zinc-200">
          {query.data.items.map((item) => (
            <li key={item.fileId}>
              <button
                className="text-left text-brand hover:text-brand-2"
                type="button"
                onClick={() => onSelectFile(item.fileId)}
              >
                {item.path}
              </button>
              <span className="ml-1 text-zinc-400">· {item.depth}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RelationList({
  title,
  edges,
  getId,
  onSelect,
}: {
  title: string;
  edges: GraphMapEdge[];
  getId: (edge: GraphMapEdge) => string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="mt-5">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      {edges.length === 0 ? (
        <p className={`mt-2 ${muted}`}>None</p>
      ) : (
        <ul className="mt-2 space-y-1 text-sm">
          {edges.map((edge) => {
            const id = getId(edge);
            return (
              <li key={`${edge.sourceId}-${edge.targetId}`}>
                <button
                  className="text-left text-brand hover:text-brand-2"
                  type="button"
                  onClick={() => onSelect(id)}
                >
                  {id}
                  <span className="ml-1 text-zinc-400">×{edge.weight}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ArchitectureCanvas({
  modules,
  edges,
  selectedId,
  onSelect,
}: {
  modules: GraphModule[];
  edges: GraphMapEdge[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const visible = useMemo(() => pickVisibleModules(modules), [modules]);
  const visibleIds = useMemo(() => new Set(visible.map((module) => module.id)), [visible]);
  const points = useMemo(() => layoutCircle(visible), [visible]);
  const drawnEdges = edges.filter((edge) => visibleIds.has(edge.sourceId) && visibleIds.has(edge.targetId));
  const hidden = modules.length - visible.length;

  return (
    <div>
      <svg viewBox="0 0 720 720" className="mx-auto block h-auto w-full max-w-[40rem]" role="img">
        <title>Architecture map</title>
        {drawnEdges.map((edge) => {
          const from = points.get(edge.sourceId);
          const to = points.get(edge.targetId);
          if (!from || !to) {
            return null;
          }
          const active = selectedId === edge.sourceId || selectedId === edge.targetId;
          const cyclic = Boolean(
            modules.find((module) => module.id === edge.sourceId)?.inCycle &&
              modules.find((module) => module.id === edge.targetId)?.inCycle,
          );
          return (
            <path
              key={`${edge.sourceId}-${edge.targetId}`}
              d={`M ${from.x} ${from.y} Q 360 360 ${to.x} ${to.y}`}
              fill="none"
              stroke={active ? '#8b8cff' : cyclic ? '#fb7185' : '#3f3f4a'}
              strokeWidth={active ? 2.4 : 1.4}
              opacity={selectedId && !active ? 0.25 : 0.9}
            />
          );
        })}
        {visible.map((module) => {
          const point = points.get(module.id);
          if (!point) {
            return null;
          }
          const selected = module.id === selectedId;
          return (
            <g key={module.id} className="cursor-pointer" onClick={() => onSelect(module.id)}>
              <circle
                cx={point.x}
                cy={point.y}
                r={selected ? 28 : 24}
                fill={selected ? '#2a2a44' : '#141625'}
                stroke={module.inCycle ? '#fb7185' : selected ? '#8b8cff' : '#52525b'}
                strokeWidth={selected ? 2.5 : 1.5}
              />
              <text
                x={point.x}
                y={point.y + 42}
                textAnchor="middle"
                className="fill-zinc-300"
                fontSize="11"
              >
                {truncateLabel(module.path)}
              </text>
            </g>
          );
        })}
      </svg>
      {hidden > 0 ? (
        <p className={`mt-2 text-center ${muted}`}>
          Showing the {visible.length} most connected folders. {hidden} more are in the lists.
        </p>
      ) : null}
    </div>
  );
}

function pickVisibleModules(modules: GraphModule[]): GraphModule[] {
  if (modules.length <= MAX_MAP_NODES) {
    return modules;
  }
  return [...modules]
    .sort((left, right) => {
      if (left.inCycle !== right.inCycle) {
        return left.inCycle ? -1 : 1;
      }
      return right.fanIn + right.fanOut - (left.fanIn + left.fanOut);
    })
    .slice(0, MAX_MAP_NODES);
}

function layoutCircle(modules: GraphModule[]): Map<string, { x: number; y: number }> {
  const points = new Map<string, { x: number; y: number }>();
  const count = Math.max(modules.length, 1);
  const radius = modules.length <= 2 ? 0 : 240;
  modules.forEach((module, index) => {
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
    points.set(module.id, {
      x: 360 + radius * Math.cos(angle),
      y: 360 + radius * Math.sin(angle),
    });
  });
  return points;
}

function truncateLabel(value: string): string {
  return value.length > 22 ? `${value.slice(0, 20)}…` : value;
}

function clampDepth(value: string | null): number {
  const parsed = Number(value || '2');
  if (!Number.isFinite(parsed)) {
    return 2;
  }
  return Math.min(4, Math.max(1, Math.round(parsed)));
}

function filterGraphModules(
  modules: GraphModule[],
  input: { q: string; view: string },
): GraphModule[] {
  const needle = input.q.trim().toLowerCase();
  return modules.filter((module) => {
    if (needle && !module.path.toLowerCase().includes(needle)) {
      return false;
    }
    if (input.view === 'cycles' && !module.inCycle) {
      return false;
    }
    if (input.view === 'connected' && module.fanIn + module.fanOut === 0) {
      return false;
    }
    return true;
  });
}
