import { Link, useParams, useSearchParams } from 'react-router-dom';
import { PageFrame } from '../components/PageFrame';
import { errorMessage } from '../lib/errors';
import { commitSubject, formatChange, formatRiskLevel, formatWhen, shortRevision } from '../lib/format';
import { repositoryCodePath, repositoryDnaPath, repositoryEvolutionPath, repositoryHistoryPath, repositoryImpactPath } from '../lib/paths';
import {
  useDnaHealthQuery,
  useDnaProfileQuery,
  useHotspotsQuery,
  useRepositoryQuery,
  useRisksQuery,
  useSyncRepositoryMutation,
  useWorkspaceQuery,
} from '../queries';
import { card, muted, secondaryButton } from '../ui';
import type { DnaProfile, InsightItem } from '../api';

export function CodeDnaPage() {
  const { workspaceId = '', repositoryId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const fileId = params.get('file') ?? '';
  const symbolId = params.get('symbol') ?? '';
  const healthQuery = useDnaHealthQuery(workspaceId, repositoryId);
  const hotspotsQuery = useHotspotsQuery(workspaceId, repositoryId);
  const risksQuery = useRisksQuery(workspaceId, repositoryId);
  const profileQuery = useDnaProfileQuery(workspaceId, repositoryId, { fileId, symbolId });
  const repositoryQuery = useRepositoryQuery(workspaceId, repositoryId);
  const workspaceQuery = useWorkspaceQuery(workspaceId);
  const sync = useSyncRepositoryMutation(workspaceId, repositoryId);
  const repository = repositoryQuery.data;
  const canSync = workspaceQuery.data?.role !== 'VIEWER';
  const health = healthQuery.data;
  const profile = profileQuery.data;

  function open(file?: string, symbol?: string) {
    setParams(
      new URLSearchParams(
        repositoryDnaPath(workspaceId, repositoryId, { file, symbol }).split('?')[1] ?? '',
      ),
    );
  }

  if (healthQuery.isLoading) {
    return (
      <PageFrame>
        <p className={muted}>Loading profiles…</p>
      </PageFrame>
    );
  }

  if (healthQuery.isError) {
    return (
      <PageFrame>
        <p className="text-red-300">{errorMessage(healthQuery.error, 'Profiles could not be loaded.')}</p>
      </PageFrame>
    );
  }

  return (
    <PageFrame>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">Code DNA</h1>
            <p className={`mt-2 ${muted}`}>
              History, coupling, and risk for files
              {health?.revision ? ` · ${shortRevision(health.revision)}` : ''}
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

        {!repository?.lastDnaRevision ? (
          <section className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-5 text-sm text-amber-900">
            Sync now to compute risk and history profiles from Git and the architecture map.
          </section>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-4">
          <Stat label="Files" value={health?.fileCount ?? 0} />
          <Stat label="Hotspots" value={health?.hotspotCount ?? 0} tone={health && health.hotspotCount > 0 ? 'warn' : undefined} />
          <Stat label="Higher risk" value={health?.highRiskCount ?? 0} tone={health && health.highRiskCount > 0 ? 'warn' : undefined} />
          <Stat label="Avg complexity" value={health?.averageComplexity ?? 0} />
        </div>

        <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
          <div className="space-y-4">
            <InsightList
              title="Hotspots"
              items={hotspotsQuery.data?.items ?? []}
              selectedId={fileId}
              onSelect={(item) => open(item.subjectId)}
            />
            <InsightList
              title="Highest risk"
              items={risksQuery.data?.items ?? []}
              selectedId={fileId}
              onSelect={(item) => open(item.subjectId)}
            />
          </div>
          {fileId || symbolId ? (
            profileQuery.isLoading ? (
              <section className={card}>
                <p className={muted}>Loading this profile…</p>
              </section>
            ) : profileQuery.isError || !profile ? (
              <section className={card}>
                <p className="text-red-300">{errorMessage(profileQuery.error, 'This profile could not be loaded.')}</p>
              </section>
            ) : (
              <ProfileCard workspaceId={workspaceId} repositoryId={repositoryId} profile={profile} />
            )
          ) : (
            <section className={card}>
              <h2 className="text-sm font-semibold text-white">Profile</h2>
              <p className={`mt-3 ${muted}`}>Select a hotspot or risky file to see why it looks that way.</p>
            </section>
          )}
        </div>
      </div>
    </PageFrame>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'warn' }) {
  return (
    <div className={card}>
      <p className={muted}>{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${tone === 'warn' ? 'text-rose-300' : 'text-white'}`}>{value}</p>
    </div>
  );
}

function InsightList({
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
          {items.map((item) => (
            <li key={`${title}-${item.subjectId}`}>
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
                  {formatRiskLevel(item.level)} · {item.score} · {item.changeCount} changes
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ProfileCard({
  workspaceId,
  repositoryId,
  profile,
}: {
  workspaceId: string;
  repositoryId: string;
  profile: DnaProfile;
}) {
  return (
    <section className={card}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">{profile.subjectType.toLowerCase()}</p>
          <h2 className="mt-1 text-lg font-semibold text-white">{profile.name}</h2>
          {profile.path ? <p className={`mt-1 ${muted}`}>{profile.path}</p> : null}
        </div>
        <RiskBadge level={profile.risk.level} score={profile.risk.score} />
      </div>

      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        <Fact label="First seen" value={shortRevision(profile.firstRevision)} />
        <Fact label="Last changed" value={shortRevision(profile.lastRevision)} />
        <Fact label="Changes" value={String(profile.changeCount)} />
        <Fact label="Authors" value={String(profile.contributors.length)} />
        <Fact label="Consumers" value={String(profile.fanIn)} />
        <Fact label="Dependencies" value={String(profile.dependencyCount)} />
        <Fact label="Complexity" value={`${profile.complexityLabel} · ${profile.complexity}`} />
        <Fact label="Coupling" value={profile.coupling} />
        <Fact label="Evidence" value={`${Math.round(profile.risk.evidenceConfidence * 100)}%`} />
        <Fact label="Lines" value={String(profile.loc)} />
      </dl>

      <div className="mt-5 flex flex-wrap gap-2">
        {profile.subjectType === 'FILE' ? (
          <Link
            className="text-sm font-medium text-brand hover:text-brand-2"
            to={repositoryCodePath(workspaceId, repositoryId, { file: profile.subjectId })}
          >
            Open in Code
          </Link>
        ) : null}
        {profile.subjectType === 'SYMBOL' ? (
          <Link
            className="text-sm font-medium text-brand hover:text-brand-2"
            to={repositoryCodePath(workspaceId, repositoryId, { symbol: profile.subjectId })}
          >
            Open in Code
          </Link>
        ) : null}
        {profile.path ? (
          <Link
            className="text-sm font-medium text-brand hover:text-brand-2"
            to={repositoryHistoryPath(workspaceId, repositoryId, { path: profile.path })}
          >
            File history
          </Link>
        ) : null}
        <Link
          className="text-sm font-medium text-brand hover:text-brand-2"
          to={repositoryImpactPath(workspaceId, repositoryId, {
            file: profile.subjectType === 'FILE' ? profile.subjectId : undefined,
            symbol: profile.subjectType === 'SYMBOL' ? profile.subjectId : undefined,
          })}
        >
          Check impact
        </Link>
        <Link
          className="text-sm font-medium text-brand hover:text-brand-2"
          to={repositoryEvolutionPath(workspaceId, repositoryId, {
            file: profile.subjectType === 'FILE' ? profile.subjectId : undefined,
            symbol: profile.subjectType === 'SYMBOL' ? profile.subjectId : undefined,
          })}
        >
          Evolution
        </Link>
      </div>

      <h3 className="mt-6 text-sm font-semibold text-white">Why this risk</h3>
      <ul className="mt-3 space-y-2 text-sm text-zinc-200">
        {profile.risk.factors.map((factor) => (
          <li key={factor.key} className="flex items-center justify-between gap-3">
            <span>{factor.label}</span>
            <span className={muted}>{Math.round(factor.contribution * 100)} / {Math.round(factor.weight * 100)}</span>
          </li>
        ))}
      </ul>

      <h3 className="mt-6 text-sm font-semibold text-white">Authors</h3>
      {profile.contributors.length === 0 ? (
        <p className={`mt-2 ${muted}`}>No commit authors yet</p>
      ) : (
        <ul className="mt-2 space-y-1 text-sm text-zinc-200">
          {profile.contributors.map((author) => (
            <li key={author.email}>
              {author.name} <span className={muted}>· {author.commits}</span>
            </li>
          ))}
        </ul>
      )}

      <h3 className="mt-6 text-sm font-semibold text-white">Related commits</h3>
      {profile.relatedCommits.length === 0 ? (
        <p className={`mt-2 ${muted}`}>None yet</p>
      ) : (
        <ul className="mt-2 space-y-2 text-sm">
          {profile.relatedCommits.map((commit) => (
            <li key={commit.sha}>
              <Link
                className="text-brand hover:text-brand-2"
                to={repositoryHistoryPath(workspaceId, repositoryId, { commit: commit.sha })}
              >
                {commitSubject(commit.message)}
              </Link>
              <span className={`ml-2 ${muted}`}>
                {shortRevision(commit.sha)} · {formatWhen(commit.committedAt)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {profile.versions.length > 0 ? (
        <>
          <h3 className="mt-6 text-sm font-semibold text-white">Symbol versions</h3>
          <ul className="mt-2 space-y-1 text-sm text-zinc-200">
            {profile.versions.map((version) => (
              <li key={`${version.revision}-${version.changeType}-${version.loc}`}>
                {formatChange(version.changeType)} · {shortRevision(version.revision)} · complexity {version.complexity}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-zinc-400">{label}</dt>
      <dd className="mt-1 text-sm text-zinc-100">{value}</dd>
    </div>
  );
}

function RiskBadge({ level, score }: { level: string; score: number }) {
  const tone =
    level === 'CRITICAL' || level === 'HIGH'
      ? 'border-rose-400/30 bg-rose-500/10 text-rose-200'
      : level === 'MEDIUM'
        ? 'border-amber-400/30 bg-amber-500/10 text-amber-900'
        : 'border-white/10 bg-white/5 text-zinc-200';
  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${tone}`}>
      {formatRiskLevel(level)} · {score}
    </span>
  );
}
