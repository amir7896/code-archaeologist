import { useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { PageFrame } from '../components/PageFrame';
import { errorMessage } from '../lib/errors';
import { shortRevision } from '../lib/format';
import { repositoryCodePath, repositoryGraphPath, repositoryImpactPath } from '../lib/paths';
import {
  useGraphDependenciesQuery,
  useGraphDependentsQuery,
  useGraphMapQuery,
  useRepositoryQuery,
  useSyncRepositoryMutation,
  useWorkspaceQuery,
} from '../queries';
import { card, muted, secondaryButton } from '../ui';
import type { GraphMap, GraphMapEdge, GraphModule, GraphNeighbors } from '../api';

const MAX_MAP_NODES = 36;

export function ArchitectureMapPage() {
  const { workspaceId = '', repositoryId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('module') ?? '';
  const selectedFileId = params.get('file') ?? '';
  const mapQuery = useGraphMapQuery(workspaceId, repositoryId);
  const repositoryQuery = useRepositoryQuery(workspaceId, repositoryId);
  const workspaceQuery = useWorkspaceQuery(workspaceId);
  const sync = useSyncRepositoryMutation(workspaceId, repositoryId);
  const map = mapQuery.data;
  const repository = repositoryQuery.data;
  const canSync = workspaceQuery.data?.role !== 'VIEWER';
  const selected = map?.modules.find((module) => module.id === selectedId) ?? null;

  function open(next: { module?: string; file?: string }) {
    setParams(
      new URLSearchParams(
        repositoryGraphPath(workspaceId, repositoryId, {
          module: next.module,
          file: next.file,
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
        <p className="text-red-600">{errorMessage(mapQuery.error, 'The architecture map could not be loaded.')}</p>
      </PageFrame>
    );
  }

  const empty = map.stats.fileCount === 0;
  const needsSync = !repository?.lastGraphRevision && map.stats.edgeCount === 0;

  return (
    <PageFrame>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Architecture</h1>
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
            <p className="text-sm text-zinc-700">
              Sync this repository to read its source and build the architecture map.
            </p>
          </section>
        ) : (
          <>
            {needsSync ? (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
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
              <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
                <h2 className="text-sm font-semibold text-rose-900">Circular dependencies</h2>
                <ul className="mt-3 space-y-2 text-sm text-rose-800">
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

            <MostConnected modules={map.modules} onSelect={(id) => open({ module: id })} />

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <section className={`${card} overflow-hidden p-3 sm:p-5`}>
                <ArchitectureCanvas
                  modules={map.modules}
                  edges={map.edges}
                  selectedId={selectedId}
                  onSelect={(id) => open({ module: id })}
                />
                <ul className="mt-4 flex flex-wrap gap-2">
                  {map.modules.map((module) => (
                    <li key={module.id}>
                      <button
                        className={`rounded-full border px-2.5 py-1 text-xs ${
                          module.id === selectedId
                            ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                            : module.inCycle
                              ? 'border-rose-200 bg-rose-50 text-rose-800'
                              : 'border-zinc-200 bg-white text-zinc-600'
                        }`}
                        type="button"
                        onClick={() => open({ module: module.id })}
                      >
                        {module.path}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
              <ModuleDetail
                workspaceId={workspaceId}
                repositoryId={repositoryId}
                module={selected}
                selectedFileId={selectedFileId}
                map={map}
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
        className={`mt-2 text-2xl font-semibold ${tone === 'warn' ? 'text-rose-700' : 'text-zinc-950'}`}
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
      <h2 className="text-sm font-semibold text-zinc-900">Most connected folders</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {ranked.map((module) => (
          <li key={module.id} className="flex items-center justify-between gap-3">
            <button
              className="text-left text-indigo-600 hover:text-indigo-500"
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
  onSelectModule,
  onSelectFile,
}: {
  workspaceId: string;
  repositoryId: string;
  module: GraphModule | null;
  selectedFileId: string;
  map: GraphMap;
  onSelectModule: (id: string) => void;
  onSelectFile: (fileId: string) => void;
}) {
  const outgoing = module ? map.edges.filter((edge) => edge.sourceId === module.id) : [];
  const incoming = module ? map.edges.filter((edge) => edge.targetId === module.id) : [];

  if (!module) {
    return (
      <section className={card}>
        <h2 className="text-sm font-semibold text-zinc-900">Folder</h2>
        <p className={`mt-3 ${muted}`}>Select a folder on the map to see what it depends on.</p>
      </section>
    );
  }

  return (
    <section className={card}>
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Folder</p>
      <h2 className="mt-1 text-lg font-semibold text-zinc-950">{module.path}</h2>
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

      <h3 className="mt-5 text-sm font-semibold text-zinc-900">Files</h3>
      <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-sm">
        {module.files.map((file) => (
          <li key={file.id}>
            <button
              className={`text-left ${selectedFileId === file.id ? 'font-medium text-indigo-700' : 'text-indigo-600 hover:text-indigo-500'}`}
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
        />
      ) : null}
    </section>
  );
}

function FileNeighbors({
  workspaceId,
  repositoryId,
  fileId,
}: {
  workspaceId: string;
  repositoryId: string;
  fileId: string;
}) {
  const dependencies = useGraphDependenciesQuery(workspaceId, repositoryId, fileId, 2);
  const dependents = useGraphDependentsQuery(workspaceId, repositoryId, fileId, 2);

  return (
    <div className="mt-5 border-t border-zinc-100 pt-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-zinc-900">This file</h3>
        <div className="flex items-center gap-3">
          <Link
            className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
            to={repositoryCodePath(workspaceId, repositoryId, { file: fileId })}
          >
            Open in Code
          </Link>
          <Link
            className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
            to={repositoryImpactPath(workspaceId, repositoryId, { file: fileId })}
          >
            Check impact
          </Link>
        </div>
      </div>
      <NeighborList title="Depends on" query={dependencies} />
      <NeighborList title="Used by" query={dependents} />
    </div>
  );
}

function NeighborList({
  title,
  query,
}: {
  title: string;
  query: { data?: GraphNeighbors; isLoading: boolean; isError: boolean };
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
        <ul className="mt-2 space-y-1 text-sm text-zinc-700">
          {query.data.items.map((item) => (
            <li key={item.fileId}>
              {item.path}
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
      <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
      {edges.length === 0 ? (
        <p className={`mt-2 ${muted}`}>None</p>
      ) : (
        <ul className="mt-2 space-y-1 text-sm">
          {edges.map((edge) => {
            const id = getId(edge);
            return (
              <li key={`${edge.sourceId}-${edge.targetId}`}>
                <button
                  className="text-left text-indigo-600 hover:text-indigo-500"
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
              stroke={active ? '#4f46e5' : cyclic ? '#e11d48' : '#d4d4d8'}
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
                fill={selected ? '#eef2ff' : '#ffffff'}
                stroke={module.inCycle ? '#e11d48' : selected ? '#4f46e5' : '#a1a1aa'}
                strokeWidth={selected ? 2.5 : 1.5}
              />
              <text
                x={point.x}
                y={point.y + 42}
                textAnchor="middle"
                className="fill-zinc-700"
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
