import { Field, Form, Formik } from 'formik';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { errorMessage } from '../lib/errors';
import { formatActivity, formatRole, formatStatus, formatWhen } from '../lib/format';
import {
  useAuditLogsQuery,
  useDeleteWorkspaceMutation,
  useInviteMemberMutation,
  useMembersQuery,
  useRemoveMemberMutation,
  useUpdateMemberMutation,
  useUpdateWorkspaceMutation,
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
import { inviteMemberSchema, workspaceNameSchema } from '../validation';

const ASSIGNABLE = ['ADMIN', 'ANALYST', 'VIEWER'] as const;

export function WorkspacePage() {
  const { workspaceId = '' } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const workspaceQuery = useWorkspaceQuery(workspaceId);
  const membersQuery = useMembersQuery(workspaceId);
  const workspace = workspaceQuery.data;
  const canManage = workspace?.role === 'OWNER' || workspace?.role === 'ADMIN';
  const isOwner = workspace?.role === 'OWNER';
  const archived = workspace?.status === 'ARCHIVED';
  const canEdit = Boolean(canManage) && !archived;
  const auditQuery = useAuditLogsQuery(workspaceId, Boolean(canManage));
  const updateWorkspace = useUpdateWorkspaceMutation(workspaceId);
  const deleteWorkspace = useDeleteWorkspaceMutation(workspaceId);
  const inviteMember = useInviteMemberMutation(workspaceId);
  const updateMember = useUpdateMemberMutation(workspaceId);
  const removeMember = useRemoveMemberMutation(workspaceId);
  const members = membersQuery.data?.items ?? [];
  const activity = auditQuery.data?.items ?? [];
  const actionError = [
    workspaceQuery.error,
    membersQuery.error,
    auditQuery.error,
    updateWorkspace.error,
    deleteWorkspace.error,
    inviteMember.error,
    updateMember.error,
    removeMember.error,
  ].find(Boolean);

  if (workspaceQuery.isPending) {
    return <p className={muted}>Loading workspace…</p>;
  }

  if (!workspace) {
    return (
      <div>
        <p className="text-red-600">
          {errorMessage(workspaceQuery.error, 'This workspace could not be found.')}
        </p>
        <Link
          className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-500"
          to="/"
        >
          Back to workspaces
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link className="text-sm font-medium text-indigo-600 hover:text-indigo-500" to="/">
          Workspaces
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">
          {workspace.name}
        </h1>
        <p className={`mt-2 ${muted}`}>
          {formatStatus(workspace.status)} · {formatRole(workspace.role)}
        </p>
        {archived ? (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            This workspace is archived. Restore it to make changes.
          </p>
        ) : null}
        {actionError ? (
          <p className={`mt-3 ${errorText}`}>{errorMessage(actionError, 'Something went wrong')}</p>
        ) : null}
      </div>

      {canManage && (canEdit || isOwner) ? (
        <section className={card}>
          <h2 className="text-sm font-semibold text-zinc-900">Settings</h2>
          {canEdit ? (
            <Formik
              enableReinitialize
              initialValues={{ name: workspace.name }}
              validationSchema={workspaceNameSchema}
              onSubmit={async (values) => {
                try {
                  await updateWorkspace.mutateAsync({ name: values.name.trim() });
                } catch {
                  // Shown in the page-level error.
                }
              }}
            >
              {({ errors, touched, isSubmitting }) => (
                <Form className="mt-4 flex flex-col gap-3 sm:flex-row" noValidate>
                  <div className="flex-1">
                    <Field
                      className={fieldClass(Boolean(touched.name && errors.name))}
                      name="name"
                      aria-label="Workspace name"
                    />
                    {touched.name && errors.name ? (
                      <p className={errorText}>{errors.name}</p>
                    ) : null}
                  </div>
                  <button className={primaryButton} type="submit" disabled={isSubmitting}>
                    Save name
                  </button>
                </Form>
              )}
            </Formik>
          ) : null}
          {isOwner ? (
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                className={secondaryButton}
                type="button"
                disabled={updateWorkspace.isPending}
                onClick={() => {
                  if (archived) {
                    void updateWorkspace.mutate({ status: 'ACTIVE' });
                    return;
                  }
                  if (
                    !window.confirm(
                      'Archive this workspace? People will not be able to make changes until it is restored.',
                    )
                  ) {
                    return;
                  }
                  void updateWorkspace.mutate({ status: 'ARCHIVED' });
                }}
              >
                {archived ? 'Restore workspace' : 'Archive workspace'}
              </button>
              <button
                className={dangerButton}
                type="button"
                disabled={deleteWorkspace.isPending}
                onClick={() => {
                  if (!window.confirm('Delete this workspace? This cannot be undone.')) {
                    return;
                  }
                  void deleteWorkspace.mutateAsync().then(() => navigate('/', { replace: true }));
                }}
              >
                Delete workspace
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className={card}>
        <h2 className="text-sm font-semibold text-zinc-900">People</h2>
        {canEdit ? (
          <>
            <p className={`mt-1 ${muted}`}>Add someone who already has an account.</p>
            <Formik
              initialValues={{ email: '', role: 'VIEWER' }}
              validationSchema={inviteMemberSchema}
              onSubmit={async (values, helpers) => {
                try {
                  await inviteMember.mutateAsync({
                    email: values.email.trim(),
                    role: values.role as (typeof ASSIGNABLE)[number],
                  });
                  helpers.resetForm();
                } catch {
                  // Shown in the page-level error.
                }
              }}
            >
              {({ errors, touched, isSubmitting }) => (
                <Form className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_auto]" noValidate>
                  <div>
                    <Field
                      className={fieldClass(Boolean(touched.email && errors.email))}
                      type="email"
                      name="email"
                      aria-label="Email"
                      placeholder="name@company.com"
                    />
                    {touched.email && errors.email ? (
                      <p className={errorText}>{errors.email}</p>
                    ) : null}
                  </div>
                  <Field className={fieldClass()} as="select" name="role" aria-label="Role">
                    {ASSIGNABLE.map((role) => (
                      <option key={role} value={role}>
                        {formatRole(role)}
                      </option>
                    ))}
                  </Field>
                  <button className={primaryButton} type="submit" disabled={isSubmitting}>
                    Add
                  </button>
                </Form>
              )}
            </Formik>
          </>
        ) : null}
        {membersQuery.isPending ? <p className={`mt-4 ${muted}`}>Loading people…</p> : null}
        <ul className="mt-6 space-y-2 text-sm">
          {members.map((member) => (
            <li
              key={member.userId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 px-4 py-3"
            >
              <span>
                <span className="font-medium text-zinc-900">{member.name}</span>
                <span className="ml-2 text-zinc-500">{member.email}</span>
              </span>
              <span className="flex items-center gap-3">
                {canEdit && member.role !== 'OWNER' ? (
                  <select
                    className={fieldClass()}
                    aria-label={`Role for ${member.name}`}
                    value={member.role}
                    onChange={(event) =>
                      void updateMember.mutate({
                        userId: member.userId,
                        role: event.target.value as (typeof ASSIGNABLE)[number],
                      })
                    }
                  >
                    {ASSIGNABLE.map((role) => (
                      <option key={role} value={role}>
                        {formatRole(role)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-zinc-500">{formatRole(member.role)}</span>
                )}
                {!archived &&
                member.role !== 'OWNER' &&
                (canManage || member.userId === user?.id) ? (
                  <button
                    className="font-medium text-red-600 hover:text-red-500"
                    type="button"
                    onClick={() => {
                      const leaving = member.userId === user?.id;
                      if (
                        !window.confirm(
                          leaving
                            ? 'Leave this workspace?'
                            : `Remove ${member.name} from this workspace?`,
                        )
                      ) {
                        return;
                      }
                      void removeMember.mutateAsync(member.userId).then(() => {
                        if (leaving) {
                          navigate('/', { replace: true });
                        }
                      });
                    }}
                  >
                    {member.userId === user?.id ? 'Leave' : 'Remove'}
                  </button>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {canManage ? (
        <section className={card}>
          <h2 className="text-sm font-semibold text-zinc-900">Activity</h2>
          {auditQuery.isPending ? <p className={`mt-4 ${muted}`}>Loading activity…</p> : null}
          <ul className="mt-4 space-y-2 text-sm text-zinc-700">
            {activity.map((event) => {
              const when = formatWhen(event.createdAt);
              return (
                <li key={event.id}>
                  <span className="font-medium">{formatActivity(event.action)}</span>
                  {when ? <span className="ml-2 text-zinc-500">{when}</span> : null}
                </li>
              );
            })}
            {!auditQuery.isPending && activity.length === 0 ? (
              <li className="text-zinc-500">No activity yet.</li>
            ) : null}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
