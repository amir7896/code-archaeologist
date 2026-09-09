import { Field, Form, Formik } from 'formik';
import { useNavigate, useParams } from 'react-router-dom';
import { useConfirm } from '../components/ConfirmDialog';
import { PageFrame } from '../components/PageFrame';
import { RepositoriesPanel } from '../components/RepositoriesPanel';
import { useAuth } from '../hooks/useAuth';
import { errorMessage } from '../lib/errors';
import { formatActivity, formatRole, formatWhen } from '../lib/format';
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

export function WorkspaceReposPage() {
  const workspace = useWorkspaceContext();
  if (workspace.loading) {
    return <WorkspaceLoading />;
  }
  if (!workspace.data) {
    return <WorkspaceMissing error={workspace.error} />;
  }
  return (
    <PageFrame>
      <Header
        title="Workspace overview"
        subtitle="Add a Git repository here, then open it from the sidebar to inspect code and history."
        archived={workspace.archived}
        error={workspace.actionError}
      />
      <div className="mt-6">
        <RepositoriesPanel
          workspaceId={workspace.id}
          canAdd={workspace.canManage}
          archived={workspace.archived}
        />
      </div>
    </PageFrame>
  );
}

export function WorkspacePeoplePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const workspace = useWorkspaceContext();
  if (workspace.loading) {
    return <WorkspaceLoading />;
  }
  if (!workspace.data) {
    return <WorkspaceMissing error={workspace.error} />;
  }

  return (
    <PageFrame>
      <Header
        title="People"
        subtitle="Invite teammates who already have an account."
        archived={workspace.archived}
        error={workspace.actionError}
      />
      <section className={`${card} mt-6`}>
        {workspace.canEdit ? (
          <Formik
            initialValues={{ email: '', role: 'VIEWER' }}
            validationSchema={inviteMemberSchema}
            onSubmit={async (values, helpers) => {
              try {
                await workspace.inviteMember.mutateAsync({
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
              <Form className="grid gap-3 md:grid-cols-[1fr_auto_auto]" noValidate>
                <div>
                  <Field
                    className={fieldClass(Boolean(touched.email && errors.email))}
                    type="email"
                    name="email"
                    aria-label="Email"
                    placeholder="name@company.com"
                  />
                  {touched.email && errors.email ? <p className={errorText}>{errors.email}</p> : null}
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
        ) : null}
        {workspace.membersQuery.isPending ? <p className={`mt-4 ${muted}`}>Loading people…</p> : null}
        <ul className="mt-6 space-y-2 text-sm">
          {workspace.members.map((member) => (
            <li
              key={member.userId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 px-4 py-3"
            >
              <span>
                <span className="font-medium text-zinc-900">{member.name}</span>
                <span className="ml-2 text-zinc-500">{member.email}</span>
              </span>
              <span className="flex items-center gap-3">
                {workspace.canEdit && member.role !== 'OWNER' ? (
                  <select
                    className={fieldClass()}
                    aria-label={`Role for ${member.name}`}
                    value={member.role}
                    onChange={(event) =>
                      void workspace.updateMember.mutate({
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
                {!workspace.archived &&
                member.role !== 'OWNER' &&
                (workspace.canManage || member.userId === user?.id) ? (
                  <button
                    className="font-medium text-red-600 hover:text-red-500"
                    type="button"
                    onClick={() => {
                      const leaving = member.userId === user?.id;
                      void confirm({
                        title: leaving ? 'Leave workspace' : 'Remove member',
                        message: leaving
                          ? 'Leave this workspace? You will lose access until someone invites you again.'
                          : `Remove ${member.name} from this workspace?`,
                        confirmLabel: leaving ? 'Leave' : 'Remove',
                        danger: true,
                      }).then((ok) => {
                        if (!ok) {
                          return;
                        }
                        void workspace.removeMember.mutateAsync(member.userId).then(() => {
                          if (leaving) {
                            navigate('/', { replace: true });
                          }
                        });
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
    </PageFrame>
  );
}

export function WorkspaceSettingsPage() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const workspace = useWorkspaceContext();
  if (workspace.loading) {
    return <WorkspaceLoading />;
  }
  if (!workspace.data) {
    return <WorkspaceMissing error={workspace.error} />;
  }
  if (!workspace.canManage) {
    return (
      <PageFrame>
        <p className={muted}>You do not have access to workspace settings.</p>
      </PageFrame>
    );
  }

  return (
    <PageFrame>
      <Header
        title="Settings"
        subtitle="Rename, archive, or review recent activity."
        archived={workspace.archived}
        error={workspace.actionError}
      />
      <div className="mt-6 space-y-6">
        {workspace.canEdit || workspace.isOwner ? (
          <section className={card}>
            <h2 className="text-sm font-semibold text-zinc-900">Workspace</h2>
            {workspace.canEdit ? (
              <Formik
                enableReinitialize
                initialValues={{ name: workspace.data.name }}
                validationSchema={workspaceNameSchema}
                onSubmit={async (values) => {
                  try {
                    await workspace.updateWorkspace.mutateAsync({ name: values.name.trim() });
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
                      {touched.name && errors.name ? <p className={errorText}>{errors.name}</p> : null}
                    </div>
                    <button className={primaryButton} type="submit" disabled={isSubmitting}>
                      Save name
                    </button>
                  </Form>
                )}
              </Formik>
            ) : null}
            {workspace.isOwner ? (
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  className={secondaryButton}
                  type="button"
                  disabled={workspace.updateWorkspace.isPending}
                  onClick={() => {
                    if (workspace.archived) {
                      void workspace.updateWorkspace.mutate({ status: 'ACTIVE' });
                      return;
                    }
                    void confirm({
                      title: 'Archive workspace',
                      message:
                        'Archive this workspace? People will not be able to make changes until it is restored.',
                      confirmLabel: 'Archive',
                      danger: true,
                    }).then((ok) => {
                      if (ok) {
                        void workspace.updateWorkspace.mutate({ status: 'ARCHIVED' });
                      }
                    });
                  }}
                >
                  {workspace.archived ? 'Restore workspace' : 'Archive workspace'}
                </button>
                <button
                  className={dangerButton}
                  type="button"
                  disabled={workspace.deleteWorkspace.isPending}
                  onClick={() => {
                    void confirm({
                      title: 'Delete workspace',
                      message: 'Delete this workspace? This cannot be undone.',
                      confirmLabel: 'Delete',
                      danger: true,
                    }).then((ok) => {
                      if (ok) {
                        void workspace.deleteWorkspace
                          .mutateAsync()
                          .then(() => navigate('/', { replace: true }));
                      }
                    });
                  }}
                >
                  Delete workspace
                </button>
              </div>
            ) : null}
          </section>
        ) : null}

        <section className={card}>
          <h2 className="text-sm font-semibold text-zinc-900">Activity</h2>
          {workspace.auditQuery.isPending ? <p className={`mt-4 ${muted}`}>Loading activity…</p> : null}
          <ul className="mt-4 space-y-2 text-sm text-zinc-700">
            {workspace.activity.map((event) => {
              const when = formatWhen(event.createdAt);
              return (
                <li key={event.id}>
                  <span className="font-medium">{formatActivity(event.action)}</span>
                  {when ? <span className="ml-2 text-zinc-500">{when}</span> : null}
                </li>
              );
            })}
            {!workspace.auditQuery.isPending && workspace.activity.length === 0 ? (
              <li className="text-zinc-500">No activity yet.</li>
            ) : null}
          </ul>
        </section>
      </div>
    </PageFrame>
  );
}

function Header({
  title,
  subtitle,
  archived,
  error,
}: {
  title: string;
  subtitle: string;
  archived: boolean;
  error?: unknown;
}) {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">{title}</h1>
      <p className={`mt-2 ${muted}`}>{subtitle}</p>
      {archived ? (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          This workspace is archived. Restore it to make changes.
        </p>
      ) : null}
      {error ? <p className={`mt-3 ${errorText}`}>{errorMessage(error, 'Something went wrong')}</p> : null}
    </div>
  );
}

function WorkspaceLoading() {
  return (
    <PageFrame>
      <p className={muted}>Loading workspace…</p>
    </PageFrame>
  );
}

function WorkspaceMissing({ error }: { error: unknown }) {
  return (
    <PageFrame>
      <p className="text-red-600">{errorMessage(error, 'This workspace could not be found.')}</p>
    </PageFrame>
  );
}

function useWorkspaceContext() {
  const { workspaceId = '' } = useParams();
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

  return {
    id: workspaceId,
    loading: workspaceQuery.isPending,
    error: workspaceQuery.error,
    data: workspace,
    canManage: Boolean(canManage),
    isOwner: Boolean(isOwner),
    archived,
    canEdit,
    membersQuery,
    members: membersQuery.data?.items ?? [],
    auditQuery,
    activity: auditQuery.data?.items ?? [],
    updateWorkspace,
    deleteWorkspace,
    inviteMember,
    updateMember,
    removeMember,
    actionError,
  };
}
