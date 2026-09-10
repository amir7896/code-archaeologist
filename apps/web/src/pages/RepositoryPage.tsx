import { Field, Form, Formik } from 'formik';
import { useNavigate, useParams } from 'react-router-dom';
import { BackButton } from '../components/BackButton';
import { useConfirm } from '../components/ConfirmDialog';
import { PageFrame } from '../components/PageFrame';
import { errorMessage } from '../lib/errors';
import {
  formatDuration,
  formatLanguage,
  formatProvider,
  formatRelativeTime,
  repositorySlug,
  shortRevision,
} from '../lib/format';
import { workspacePath, workspaceRepositoriesPath } from '../lib/paths';
import {
  useDeleteRepositoryMutation,
  useRepositoryQuery,
  useSyncRepositoryMutation,
  useUpdateRepositoryMutation,
  useWorkspaceQuery,
} from '../queries';
import {
  card,
  dangerButton,
  errorText,
  fieldClass,
  muted,
  primaryButton,
} from '../ui';
import { repositorySettingsSchema } from '../validation';
import type { AnalysisRun, LanguageShare, Repository } from '../api';

const PANEL = 'rounded-[1.75rem] bg-panel p-5';
const LANGUAGE_BAR = ['bg-brand', 'bg-brand-2', 'bg-white/40', 'bg-white/15'];

export function RepositoryOverviewPage() {
  const repo = useRepositoryContext();
  if (repo.loading) {
    return (
      <PageFrame>
        <p className={muted}>Loading repository…</p>
      </PageFrame>
    );
  }
  if (!repo.data) {
    return (
      <PageFrame>
        <p className="text-red-300">{errorMessage(repo.error, 'This repository could not be found.')}</p>
      </PageFrame>
    );
  }

  const repository = repo.data;
  const slug = repositorySlug(repository.url, repository.name);
  const run = repository.latestRun;
  const busy = repository.status === 'PENDING' || repository.status === 'SYNCING';
  const duration = formatDuration(run?.startedAt, run?.finishedAt);
  const syncing = busy || repo.syncRepository.isPending;

  function runAnalysis() {
    void repo.syncRepository.mutate(undefined);
  }

  return (
    <PageFrame>
      <BackButton fallback={workspaceRepositoriesPath(repo.workspaceId)} />
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">{slug}</h1>
            <p className={`mt-2 ${muted}`}>
              Repository overview — health, languages, revision and analysis status.
            </p>
          </div>
          {repo.canSync ? (
            <div className="flex items-center gap-3">
              <button
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-panel px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
                disabled={syncing}
                onClick={runAnalysis}
              >
                <SyncIcon />
                {syncing ? 'Syncing…' : 'Re-sync'}
              </button>
              <button
                className={`${primaryButton} gap-2`}
                type="button"
                disabled={syncing}
                onClick={runAnalysis}
              >
                <PlayIcon />
                {syncing ? 'Running…' : 'Run Analysis'}
              </button>
            </div>
          ) : null}
        </div>

        {repository.lastError ? <p className={errorText}>{repository.lastError}</p> : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <section className={PANEL}>
            <p className="text-sm text-zinc-400">Health Score</p>
            <p className="mt-3 text-4xl font-semibold text-emerald-300">
              {repository.healthScore == null ? '—' : repository.healthScore}
            </p>
            <p className="mt-3 text-xs text-zinc-500">
              Composite of complexity, coupling, and hotspot density.
            </p>
          </section>
          <section className={PANEL}>
            <p className="text-sm text-zinc-400">Default Branch</p>
            <p className="mt-3 text-2xl font-semibold text-white">
              {repository.defaultBranch ?? '—'}
            </p>
            <p className="mt-3 text-xs text-zinc-500">
              HEAD {shortRevision(repository.currentRevision)}
              {repository.lastCommitAt ? ` · ${formatRelativeTime(repository.lastCommitAt)}` : ''}
            </p>
          </section>
          <section className={PANEL}>
            <p className="text-sm text-zinc-400">Provider</p>
            <p className="mt-3 text-2xl font-semibold text-white">{formatProvider(repository.provider)}</p>
            <p className="mt-3 text-xs text-zinc-500">
              {repository.hasCredential ? 'Private repository' : 'Public repository'}
            </p>
          </section>
          <section className={PANEL}>
            <p className="text-sm text-zinc-400">Analysis Status</p>
            <div className="mt-3">
              <AnalysisStatusPill repository={repository} />
            </div>
            <p className="mt-3 text-xs text-zinc-500">
              {syncing
                ? 'Analysis is running'
                : duration
                  ? `Last run finished in ${duration}`
                  : run?.createdAt
                    ? 'Last run recorded'
                    : 'No analysis run yet'}
            </p>
          </section>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <LanguageBreakdown languages={repository.languages ?? []} />
          <RepositoryStats repository={repository} />
          <RecentRuns runs={repository.analysisRuns ?? (run ? [run] : [])} />
        </div>
      </div>
    </PageFrame>
  );
}

function LanguageBreakdown({ languages }: { languages: LanguageShare[] }) {
  return (
    <section className={PANEL}>
      <h2 className="text-[15px] font-semibold text-white">Language Breakdown</h2>
      {languages.length === 0 ? (
        <p className={`mt-6 ${muted}`}>Languages appear after source files are parsed.</p>
      ) : (
        <>
          <ul className="mt-5 space-y-3">
            {languages.map((item) => (
              <li key={item.language} className="flex items-center justify-between text-sm">
                <span className="text-zinc-300">{formatLanguage(item.language)}</span>
                <span className="font-medium text-white">{item.percent}%</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex h-2 overflow-hidden rounded-full bg-white/10">
            {languages.map((item, index) => (
              <span
                key={item.language}
                className={LANGUAGE_BAR[index] ?? 'bg-white/10'}
                style={{ width: `${item.percent}%` }}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function RepositoryStats({ repository }: { repository: Repository }) {
  const rows = [
    { label: 'Files analyzed', value: formatCount(repository.fileCount) },
    { label: 'Symbols indexed', value: formatCount(repository.symbolCount) },
    { label: 'Commits', value: formatCount(repository.commitCount) },
    { label: 'Contributors', value: formatCount(repository.contributorCount) },
    {
      label: 'Open PRs / Issues',
      value: `${formatCount(repository.openPullRequestCount)} / ${formatCount(repository.issueCount)}`,
    },
  ];
  return (
    <section className={PANEL}>
      <h2 className="text-[15px] font-semibold text-white">Repository Stats</h2>
      <dl className="mt-5 space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4 text-sm">
            <dt className="text-zinc-400">{row.label}</dt>
            <dd className="font-medium tabular-nums text-white">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function RecentRuns({ runs }: { runs: AnalysisRun[] }) {
  return (
    <section className={PANEL}>
      <h2 className="text-[15px] font-semibold text-white">Recent Analysis Runs</h2>
      {runs.length === 0 ? (
        <p className={`mt-6 ${muted}`}>Run analysis to index this repository.</p>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-[1fr_auto_auto] gap-x-4 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
            <span>Revision</span>
            <span>Type</span>
            <span className="text-right">Status</span>
          </div>
          <ul className="mt-3 space-y-3">
            {runs.map((run) => (
              <li key={run.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 text-sm">
                <span className="font-mono text-zinc-200">{shortRevision(run.revision)}</span>
                <span className="text-zinc-400">{run.type === 'INGESTION' ? 'Full' : run.type}</span>
                <span className="text-right">
                  <RunStatusBadge status={run.status} />
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function AnalysisStatusPill({ repository }: { repository: Repository }) {
  const status = repository.latestRun?.status ?? repository.status;
  const label =
    status === 'SUCCEEDED' || repository.status === 'READY'
      ? 'Completed'
      : status === 'FAILED' || repository.status === 'FAILED'
        ? 'Failed'
        : status === 'RUNNING' || status === 'SYNCING' || status === 'QUEUED' || status === 'PENDING'
          ? 'In progress'
          : 'Waiting';
  const tone =
    label === 'Completed'
      ? 'bg-emerald-500/15 text-emerald-300'
      : label === 'Failed'
        ? 'bg-red-500/15 text-red-300'
        : 'bg-brand/15 text-brand-2';
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${tone}`}>
      <span
        className={`h-2 w-2 rounded-full ${
          label === 'Completed' ? 'bg-emerald-400' : label === 'Failed' ? 'bg-red-400' : 'bg-brand'
        }`}
      />
      {label}
    </span>
  );
}

function RunStatusBadge({ status }: { status: string }) {
  if (status === 'SUCCEEDED') {
    return <span className="inline-flex rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-300">Done</span>;
  }
  if (status === 'FAILED') {
    return <span className="inline-flex rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-300">Failed</span>;
  }
  if (status === 'RUNNING' || status === 'QUEUED') {
    return <span className="inline-flex rounded-full bg-brand/15 px-2 py-0.5 text-xs font-medium text-brand-2">In progress</span>;
  }
  return <span className="inline-flex rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-zinc-400">Waiting</span>;
}

function formatCount(value?: number): string {
  return new Intl.NumberFormat().format(value ?? 0);
}

function SyncIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10a5.5 5.5 0 0 1 9.3-4m1.7 4a5.5 5.5 0 0 1-9.3 4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 3.5v3h-3M6 16.5v-3h3" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
      <path d="M7.2 4.8v10.4L16 10 7.2 4.8Z" />
    </svg>
  );
}

export function RepositorySettingsPage() {
  const repo = useRepositoryContext();
  const navigate = useNavigate();
  const confirm = useConfirm();
  if (repo.loading) {
    return (
      <PageFrame>
        <p className={muted}>Loading repository…</p>
      </PageFrame>
    );
  }
  if (!repo.data) {
    return (
      <PageFrame>
        <p className="text-red-300">{errorMessage(repo.error, 'This repository could not be found.')}</p>
      </PageFrame>
    );
  }
  if (!repo.canManage) {
    return (
      <PageFrame>
        <p className={muted}>You do not have access to repository settings.</p>
      </PageFrame>
    );
  }

  const repository = repo.data;
  return (
    <PageFrame>
      <BackButton fallback={workspaceRepositoriesPath(repo.workspaceId)} />
      <h1 className="text-2xl font-semibold tracking-tight text-white">Settings</h1>
      <p className={`mt-2 ${muted}`}>Rename the repository or update its access token.</p>
      <section className={`${card} mt-6`}>
        <Formik
          enableReinitialize
          initialValues={{
            name: repository.name,
            defaultBranch: repository.defaultBranch ?? '',
            token: '',
          }}
          validationSchema={repositorySettingsSchema}
          onSubmit={async (values, helpers) => {
            helpers.setStatus(undefined);
            try {
              await repo.updateRepository.mutateAsync({
                name: values.name.trim(),
                defaultBranch: values.defaultBranch.trim() || undefined,
                credential: values.token.trim()
                  ? { type: 'HTTPS_TOKEN', secret: values.token.trim() }
                  : undefined,
              });
              helpers.setFieldValue('token', '');
            } catch (cause) {
              helpers.setStatus(errorMessage(cause, 'Unable to save the repository'));
            }
          }}
        >
          {({ errors, touched, isSubmitting, status }) => (
            <Form className="space-y-3" noValidate>
              <label className="block text-sm">
                <span className="font-medium text-zinc-300">Name</span>
                <Field
                  className={`${fieldClass(Boolean(touched.name && errors.name))} mt-1.5`}
                  name="name"
                />
                {touched.name && errors.name ? <p className={errorText}>{errors.name}</p> : null}
              </label>
              <label className="block text-sm">
                <span className="font-medium text-zinc-300">Branch</span>
                <Field className={`${fieldClass()} mt-1.5`} name="defaultBranch" placeholder="main" />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-zinc-300">Access token</span>
                <Field
                  className={`${fieldClass()} mt-1.5`}
                  type="password"
                  name="token"
                  placeholder={
                    repository.hasCredential
                      ? 'Replace access token'
                      : 'Optional for private repositories'
                  }
                  autoComplete="off"
                />
              </label>
              {status ? <p className={errorText}>{status}</p> : null}
              <div className="flex flex-wrap gap-3">
                <button className={primaryButton} type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving…' : 'Save'}
                </button>
                <button
                  className={dangerButton}
                  type="button"
                  disabled={repo.deleteRepository.isPending}
                  onClick={() => {
                    void confirm({
                      title: 'Remove repository',
                      message: 'Remove this repository from the workspace?',
                      confirmLabel: 'Remove',
                      danger: true,
                    }).then((ok) => {
                      if (ok) {
                        void repo.deleteRepository
                          .mutateAsync()
                          .then(() => navigate(workspacePath(repo.workspaceId), { replace: true }));
                      }
                    });
                  }}
                >
                  Remove repository
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </section>
    </PageFrame>
  );
}

function useRepositoryContext() {
  const { workspaceId = '', repositoryId = '' } = useParams();
  const workspaceQuery = useWorkspaceQuery(workspaceId);
  const repositoryQuery = useRepositoryQuery(workspaceId, repositoryId);
  const updateRepository = useUpdateRepositoryMutation(workspaceId, repositoryId);
  const syncRepository = useSyncRepositoryMutation(workspaceId, repositoryId);
  const deleteRepository = useDeleteRepositoryMutation(workspaceId, repositoryId);
  const role = workspaceQuery.data?.role;
  const archived = workspaceQuery.data?.status === 'ARCHIVED';

  return {
    workspaceId,
    repositoryId,
    loading: repositoryQuery.isPending || workspaceQuery.isPending,
    error: repositoryQuery.error,
    data: repositoryQuery.data,
    canManage: (role === 'OWNER' || role === 'ADMIN') && !archived,
    canSync: (role === 'OWNER' || role === 'ADMIN' || role === 'ANALYST') && !archived,
    updateRepository,
    syncRepository,
    deleteRepository,
  };
}
