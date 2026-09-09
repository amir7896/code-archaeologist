import { Field, Form, Formik } from 'formik';
import { useNavigate, useParams } from 'react-router-dom';
import { useConfirm } from '../components/ConfirmDialog';
import { PageFrame } from '../components/PageFrame';
import { StatusBadge } from '../components/StatusBadge';
import { errorMessage } from '../lib/errors';
import { formatTask, formatWhen, shortRevision } from '../lib/format';
import { repositoryCodePath, repositoryDnaPath, repositoryEvolutionPath, repositoryGraphPath, repositoryHistoryPath, repositoryImpactPath, workspacePath } from '../lib/paths';
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
  secondaryButton,
} from '../ui';
import { repositorySettingsSchema } from '../validation';

export function RepositoryOverviewPage() {
  const repo = useRepositoryContext();
  const navigate = useNavigate();
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
        <p className="text-red-600">{errorMessage(repo.error, 'This repository could not be found.')}</p>
      </PageFrame>
    );
  }

  const repository = repo.data;
  const run = repository.latestRun;
  const busy = repository.status === 'PENDING' || repository.status === 'SYNCING';
  const progress = Math.max(0, Math.min(100, run?.progress ?? (repository.status === 'READY' ? 100 : 0)));

  return (
    <PageFrame>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">{repository.name}</h1>
            <a
              className="mt-2 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-500"
              href={repository.url}
              target="_blank"
              rel="noreferrer"
            >
              {repository.url}
            </a>
            <p className={`mt-2 ${muted}`}>
              {repository.defaultBranch ?? 'No default branch'} · {shortRevision(repository.currentRevision)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={repository.status} />
            {repo.canSync ? (
              <button
                className={secondaryButton}
                type="button"
                disabled={busy || repo.syncRepository.isPending}
                onClick={() => void repo.syncRepository.mutate(undefined)}
              >
                {busy || repo.syncRepository.isPending ? 'Syncing…' : 'Sync now'}
              </button>
            ) : null}
          </div>
        </div>

        {repository.lastError ? <p className={errorText}>{repository.lastError}</p> : null}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <button
            className={`${card} p-5 text-left transition hover:border-indigo-200`}
            type="button"
            onClick={() => navigate(repositoryCodePath(repo.workspaceId, repo.repositoryId))}
          >
            <p className={muted}>Files</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-950">{repository.fileCount ?? 0}</p>
          </button>
          <button
            className={`${card} p-5 text-left transition hover:border-indigo-200`}
            type="button"
            onClick={() => navigate(repositoryCodePath(repo.workspaceId, repo.repositoryId, { view: 'symbols' }))}
          >
            <p className={muted}>Symbols</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-950">{repository.symbolCount ?? 0}</p>
          </button>
          <button
            className={`${card} p-5 text-left transition hover:border-indigo-200`}
            type="button"
            onClick={() => navigate(repositoryHistoryPath(repo.workspaceId, repo.repositoryId))}
          >
            <p className={muted}>Commits</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-950">{repository.commitCount ?? 0}</p>
          </button>
          <button
            className={`${card} p-5 text-left transition hover:border-indigo-200`}
            type="button"
            onClick={() => navigate(repositoryGraphPath(repo.workspaceId, repo.repositoryId))}
          >
            <p className={muted}>Architecture</p>
            <p className="mt-2 text-lg font-semibold text-zinc-950">Dependency map</p>
          </button>
          <button
            className={`${card} p-5 text-left transition hover:border-indigo-200`}
            type="button"
            onClick={() => navigate(repositoryDnaPath(repo.workspaceId, repo.repositoryId))}
          >
            <p className={muted}>Code DNA</p>
            <p className="mt-2 text-lg font-semibold text-zinc-950">Risk and history</p>
          </button>
          <button
            className={`${card} p-5 text-left transition hover:border-indigo-200`}
            type="button"
            onClick={() => navigate(repositoryImpactPath(repo.workspaceId, repo.repositoryId))}
          >
            <p className={muted}>Impact</p>
            <p className="mt-2 text-lg font-semibold text-zinc-950">What would change</p>
          </button>
          <button
            className={`${card} p-5 text-left transition hover:border-indigo-200`}
            type="button"
            onClick={() => navigate(repositoryEvolutionPath(repo.workspaceId, repo.repositoryId))}
          >
            <p className={muted}>Evolution</p>
            <p className="mt-2 text-lg font-semibold text-zinc-950">How it changed</p>
          </button>
        </div>

        <section className={card}>
          <h2 className="text-sm font-semibold text-zinc-900">Ingestion</h2>
          <div className="mt-4">
            <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
              <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className={`mt-2 ${muted}`}>
              {run ? `${run.progress}%` : repository.status}
              {run?.createdAt ? ` · ${formatWhen(run.createdAt)}` : ''}
            </p>
          </div>
          {run?.tasks.length ? (
            <ul className="mt-4 space-y-2 text-sm text-zinc-700">
              {run.tasks.map((task) => (
                <li key={task.id} className="flex justify-between gap-3">
                  <span>{formatTask(task.taskType)}</span>
                  <StatusBadge status={task.status} />
                </li>
              ))}
            </ul>
          ) : (
            <p className={`mt-4 ${muted}`}>Sync to copy the repository and index its history and source.</p>
          )}
        </section>
      </div>
    </PageFrame>
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
        <p className="text-red-600">{errorMessage(repo.error, 'This repository could not be found.')}</p>
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
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Settings</h1>
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
                <span className="font-medium text-zinc-700">Name</span>
                <Field
                  className={`${fieldClass(Boolean(touched.name && errors.name))} mt-1.5`}
                  name="name"
                />
                {touched.name && errors.name ? <p className={errorText}>{errors.name}</p> : null}
              </label>
              <label className="block text-sm">
                <span className="font-medium text-zinc-700">Branch</span>
                <Field className={`${fieldClass()} mt-1.5`} name="defaultBranch" placeholder="main" />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-zinc-700">Access token</span>
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
