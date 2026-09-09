import { Field, Form, Formik } from 'formik';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from './StatusBadge';
import { errorMessage } from '../lib/errors';
import { repositoryHost, repositorySummary } from '../lib/format';
import { repositoryPath } from '../lib/paths';
import { useCreateRepositoryMutation, useRepositoriesQuery } from '../queries';
import { card, errorText, fieldClass, muted, primaryButton } from '../ui';
import { createRepositorySchema } from '../validation';

export function RepositoriesPanel({
  workspaceId,
  canAdd,
  archived,
}: {
  workspaceId: string;
  canAdd: boolean;
  archived: boolean;
}) {
  const navigate = useNavigate();
  const repositoriesQuery = useRepositoriesQuery(workspaceId);
  const createRepository = useCreateRepositoryMutation(workspaceId);
  const repositories = repositoriesQuery.data?.items ?? [];

  return (
    <section className={card}>
      <h2 className="text-sm font-semibold text-zinc-900">Repositories in this workspace</h2>
      <p className={`mt-1 ${muted}`}>
        Each item is a Git repository. Add a public HTTPS URL, or include an access token for a
        private one.
      </p>

      {canAdd && !archived ? (
        <Formik
          initialValues={{ url: '', name: '', defaultBranch: '', token: '' }}
          validationSchema={createRepositorySchema}
          onSubmit={async (values, helpers) => {
            helpers.setStatus(undefined);
            try {
              const repository = await createRepository.mutateAsync({
                url: values.url.trim(),
                name: values.name.trim() || undefined,
                defaultBranch: values.defaultBranch.trim() || undefined,
                credential: values.token.trim()
                  ? { type: 'HTTPS_TOKEN', secret: values.token.trim() }
                  : undefined,
              });
              helpers.resetForm();
              navigate(repositoryPath(workspaceId, repository.id));
            } catch (cause) {
              helpers.setStatus(errorMessage(cause, 'Unable to add the repository'));
            }
          }}
        >
          {({ errors, touched, isSubmitting, status }) => (
            <Form className="mt-4 space-y-3" noValidate>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block text-sm md:col-span-2">
                  <span className="font-medium text-zinc-700">Repository URL</span>
                  <Field
                    className={`${fieldClass(Boolean(touched.url && errors.url))} mt-1.5`}
                    name="url"
                    placeholder="https://github.com/owner/repository.git"
                  />
                  {touched.url && errors.url ? <p className={errorText}>{errors.url}</p> : null}
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-zinc-700">Name</span>
                  <Field className={`${fieldClass()} mt-1.5`} name="name" placeholder="Optional" />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-zinc-700">Branch</span>
                  <Field
                    className={`${fieldClass()} mt-1.5`}
                    name="defaultBranch"
                    placeholder="Optional"
                  />
                </label>
                <label className="block text-sm md:col-span-2">
                  <span className="font-medium text-zinc-700">Access token</span>
                  <Field
                    className={`${fieldClass()} mt-1.5`}
                    type="password"
                    name="token"
                    placeholder="Optional for private repositories"
                    autoComplete="off"
                  />
                </label>
              </div>
              {status ? <p className={errorText}>{status}</p> : null}
              <button className={primaryButton} type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Adding…' : 'Add repository'}
              </button>
            </Form>
          )}
        </Formik>
      ) : null}

      {repositoriesQuery.isPending ? (
        <p className={`mt-4 ${muted}`}>Loading repositories…</p>
      ) : null}
      {repositoriesQuery.isError ? (
        <p className={`mt-4 ${errorText}`}>
          {errorMessage(repositoriesQuery.error, 'Unable to load repositories')}
        </p>
      ) : null}
      {!repositoriesQuery.isPending && repositories.length === 0 ? (
        <p className={`mt-4 ${muted}`}>No repositories yet.</p>
      ) : null}
      <ul className="mt-4 space-y-2">
        {repositories.map((repository) => (
          <li key={repository.id}>
            <button
              className="flex w-full items-center justify-between rounded-xl border border-zinc-200 px-4 py-3 text-left transition hover:border-indigo-200 hover:bg-indigo-50/50"
              type="button"
              onClick={() => navigate(repositoryPath(workspaceId, repository.id))}
            >
              <span className="min-w-0">
                <span className="block font-medium text-zinc-900">{repository.name}</span>
                <span className="mt-1 block truncate text-sm text-zinc-500">
                  {repositoryHost(repository.url)} · {repositorySummary(repository)}
                </span>
              </span>
              <StatusBadge status={repository.status} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
