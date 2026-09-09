import { Field, Form, Formik } from 'formik';
import { useNavigate, useParams } from 'react-router-dom';
import { PageNav } from '../components/PageNav';
import { errorMessage } from '../lib/errors';
import { formatStatus, formatTask, formatWhen, shortRevision } from '../lib/format';
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

export function RepositoryPage() {
  const { workspaceId = '', repositoryId = '' } = useParams();
  const navigate = useNavigate();
  const workspaceQuery = useWorkspaceQuery(workspaceId);
  const repositoryQuery = useRepositoryQuery(workspaceId, repositoryId);
  const updateRepository = useUpdateRepositoryMutation(workspaceId, repositoryId);
  const syncRepository = useSyncRepositoryMutation(workspaceId, repositoryId);
  const deleteRepository = useDeleteRepositoryMutation(workspaceId, repositoryId);
  const workspace = workspaceQuery.data;
  const repository = repositoryQuery.data;
  const role = workspace?.role;
  const archived = workspace?.status === 'ARCHIVED';
  const canManage = (role === 'OWNER' || role === 'ADMIN') && !archived;
  const canSync = (role === 'OWNER' || role === 'ADMIN' || role === 'ANALYST') && !archived;
  const run = repository?.latestRun;
  const busy = repository?.status === 'PENDING' || repository?.status === 'SYNCING';

  const workspacePath = `/workspaces/${workspaceId}`;

  if (repositoryQuery.isPending || workspaceQuery.isPending) {
    return (
      <div>
        <PageNav backTo={workspacePath} backLabel="Back to workspace" />
        <p className={`mt-6 ${muted}`}>Loading repository…</p>
      </div>
    );
  }

  if (!repository) {
    return (
      <div>
        <PageNav backTo={workspacePath} backLabel="Back to workspace" />
        <p className="mt-6 text-red-600">
          {errorMessage(repositoryQuery.error, 'This repository could not be found.')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <PageNav
          backTo={workspacePath}
          backLabel="Back to workspace"
          crumbs={[
            { to: '/', label: 'Workspaces' },
            { to: workspacePath, label: workspace?.name ?? 'Workspace' },
            { label: repository.name },
          ]}
        />
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">
          {repository.name}
        </h1>
        <p className={`mt-2 ${muted}`}>{repository.url}</p>
        <p className={`mt-1 ${muted}`}>
          {formatStatus(repository.status)}
          {repository.defaultBranch ? ` · ${repository.defaultBranch}` : ''}
          {` · ${shortRevision(repository.currentRevision)}`}
        </p>
        {repository.lastError ? (
          <p className={`mt-3 ${errorText}`}>{repository.lastError}</p>
        ) : null}
      </div>

      <section className={card}>
        <h2 className="text-sm font-semibold text-zinc-900">Ingestion</h2>
        <div className="mt-4">
          <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all"
              style={{
                width: `${Math.max(0, Math.min(100, run?.progress ?? (repository.status === 'READY' ? 100 : 0)))}%`,
              }}
            />
          </div>
          <p className={`mt-2 ${muted}`}>
            {run
              ? `${formatStatus(run.status)} · ${run.progress}%`
              : formatStatus(repository.status)}
            {run?.createdAt ? ` · ${formatWhen(run.createdAt)}` : ''}
          </p>
        </div>
        {run?.tasks.length ? (
          <ul className="mt-4 space-y-2 text-sm text-zinc-700">
            {run.tasks.map((task) => (
              <li key={task.id} className="flex justify-between gap-3">
                <span>{formatTask(task.taskType)}</span>
                <span className="text-zinc-500">{formatStatus(task.status)}</span>
              </li>
            ))}
          </ul>
        ) : null}
        {canSync ? (
          <button
            className={`${secondaryButton} mt-4`}
            type="button"
            disabled={busy || syncRepository.isPending}
            onClick={() => void syncRepository.mutate(undefined)}
          >
            {busy || syncRepository.isPending ? 'Syncing…' : 'Sync now'}
          </button>
        ) : null}
      </section>

      {canManage ? (
        <section className={card}>
          <h2 className="text-sm font-semibold text-zinc-900">Settings</h2>
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
                await updateRepository.mutateAsync({
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
              <Form className="mt-4 space-y-3" noValidate>
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
                  <Field
                    className={`${fieldClass()} mt-1.5`}
                    name="defaultBranch"
                    placeholder="main"
                  />
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
                    disabled={deleteRepository.isPending}
                    onClick={() => {
                      if (!window.confirm('Remove this repository from the workspace?')) {
                        return;
                      }
                      void deleteRepository
                        .mutateAsync()
                        .then(() => navigate(`/workspaces/${workspaceId}`, { replace: true }));
                    }}
                  >
                    Remove repository
                  </button>
                </div>
              </Form>
            )}
          </Formik>
        </section>
      ) : null}

      <PageNav backTo={workspacePath} backLabel="Back to workspace" />
    </div>
  );
}
