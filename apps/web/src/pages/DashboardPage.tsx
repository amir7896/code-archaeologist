import { Field, Form, Formik } from 'formik';
import { useNavigate } from 'react-router-dom';
import { PageFrame } from '../components/PageFrame';
import { StatusBadge } from '../components/StatusBadge';
import { errorMessage } from '../lib/errors';
import { formatRole } from '../lib/format';
import { workspacePath } from '../lib/paths';
import { useCreateWorkspaceMutation, useWorkspacesQuery } from '../queries';
import { card, errorText, fieldClass, muted, primaryButton } from '../ui';
import { workspaceNameSchema } from '../validation';

export function DashboardPage() {
  const navigate = useNavigate();
  const workspacesQuery = useWorkspacesQuery();
  const workspaces = workspacesQuery.data?.items ?? [];
  const empty = !workspacesQuery.isPending && !workspacesQuery.isError && workspaces.length === 0;

  return (
    <PageFrame>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Workspaces</h1>
          <p className={`mt-2 ${muted}`}>
            {empty
              ? 'Create a workspace to start analyzing repositories.'
              : 'Open a workspace from the sidebar, or create another one.'}
          </p>
        </div>

        <section className={card}>
          <h2 className="text-sm font-semibold text-zinc-900">Create a workspace</h2>
          <p className={`mt-1 ${muted}`}>Give it a name you and your team will recognize.</p>
          <CreateWorkspaceForm
            onCreated={(id) => {
              navigate(workspacePath(id));
            }}
          />
        </section>

        {workspacesQuery.isError ? (
          <p className={errorText}>{errorMessage(workspacesQuery.error, 'Unable to load workspaces')}</p>
        ) : null}

        {workspaces.length > 0 ? (
          <section className="grid gap-3 sm:grid-cols-2">
            {workspaces.map((workspace) => (
              <button
                key={workspace.id}
                className={`${card} flex items-start justify-between gap-3 p-5 text-left transition hover:border-indigo-200 hover:shadow`}
                type="button"
                onClick={() => navigate(workspacePath(workspace.id))}
              >
                <span>
                  <span className="block font-medium text-zinc-900">{workspace.name}</span>
                  <span className={`mt-1 block ${muted}`}>{formatRole(workspace.role)}</span>
                </span>
                <StatusBadge status={workspace.status} />
              </button>
            ))}
          </section>
        ) : null}
      </div>
    </PageFrame>
  );
}

function CreateWorkspaceForm({ onCreated }: { onCreated: (id: string) => void }) {
  const createWorkspace = useCreateWorkspaceMutation();

  return (
    <Formik
      initialValues={{ name: '' }}
      validationSchema={workspaceNameSchema}
      onSubmit={async (values, helpers) => {
        helpers.setStatus(undefined);
        try {
          const workspace = await createWorkspace.mutateAsync(values.name.trim());
          helpers.resetForm();
          onCreated(workspace.id);
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
