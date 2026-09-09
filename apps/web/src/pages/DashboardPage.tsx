import { Field, Form, Formik } from 'formik';
import { Link } from 'react-router-dom';
import { errorMessage } from '../lib/errors';
import { formatRole, formatStatus } from '../lib/format';
import { useCreateWorkspaceMutation, useWorkspacesQuery } from '../queries';
import { card, errorText, fieldClass, muted, primaryButton } from '../ui';
import { workspaceNameSchema } from '../validation';

export function DashboardPage() {
  const workspacesQuery = useWorkspacesQuery();
  const workspaces = workspacesQuery.data?.items ?? [];
  const empty = !workspacesQuery.isPending && !workspacesQuery.isError && workspaces.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">Workspaces</h1>
        <p className={`mt-2 ${muted}`}>
          {empty ? 'Create a workspace to get started.' : 'Open a workspace or create a new one.'}
        </p>
      </div>

      {empty ? (
        <section className={card}>
          <h2 className="text-sm font-semibold text-zinc-900">Create a workspace</h2>
          <p className={`mt-1 ${muted}`}>Give it a name you and your team will recognize.</p>
          <CreateWorkspaceForm />
        </section>
      ) : (
        <section className={card}>
          <h2 className="text-sm font-semibold text-zinc-900">Your workspaces</h2>
          {workspacesQuery.isPending ? (
            <p className={`mt-4 ${muted}`}>Loading workspaces…</p>
          ) : null}
          {workspacesQuery.isError ? (
            <p className={`mt-4 ${errorText}`}>
              {errorMessage(workspacesQuery.error, 'Unable to load workspaces')}
            </p>
          ) : null}
          {workspaces.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {workspaces.map((workspace) => (
                <li key={workspace.id}>
                  <Link
                    className="flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3 transition hover:border-indigo-200 hover:bg-indigo-50/50"
                    to={`/workspaces/${workspace.id}`}
                  >
                    <span>
                      <span className="font-medium text-zinc-900">{workspace.name}</span>
                      <span className="ml-3 text-sm text-zinc-500">
                        {formatRole(workspace.role)}
                      </span>
                    </span>
                    <span className="text-sm text-zinc-500">{formatStatus(workspace.status)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      )}

      {!empty ? (
        <section className={card}>
          <h2 className="text-sm font-semibold text-zinc-900">Create a workspace</h2>
          <CreateWorkspaceForm />
        </section>
      ) : null}
    </div>
  );
}

function CreateWorkspaceForm() {
  const createWorkspace = useCreateWorkspaceMutation();

  return (
    <Formik
      initialValues={{ name: '' }}
      validationSchema={workspaceNameSchema}
      onSubmit={async (values, helpers) => {
        helpers.setStatus(undefined);
        try {
          await createWorkspace.mutateAsync(values.name.trim());
          helpers.resetForm();
        } catch (cause) {
          helpers.setStatus(errorMessage(cause, 'Unable to create the workspace'));
        }
      }}
    >
      {({ errors, touched, isSubmitting, status }) => (
        <Form className="mt-4 space-y-3" noValidate>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <Field
                className={fieldClass(Boolean(touched.name && errors.name))}
                name="name"
                aria-label="Workspace name"
                placeholder="Workspace name"
              />
              {touched.name && errors.name ? <p className={errorText}>{errors.name}</p> : null}
            </div>
            <button className={primaryButton} type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating…' : 'Create'}
            </button>
          </div>
          {status ? <p className={errorText}>{status}</p> : null}
        </Form>
      )}
    </Formik>
  );
}
