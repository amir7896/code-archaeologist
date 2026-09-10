import { Field, Form, Formik } from 'formik';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useConfirm } from '../components/ConfirmDialog';
import { PageFrame } from '../components/PageFrame';
import { RepositoriesPanel } from '../components/RepositoriesPanel';
import { useAuth } from '../hooks/useAuth';
import { errorMessage } from '../lib/errors';
import { formatActivity, formatProvider, formatRole, formatStatus, formatWhen } from '../lib/format';
import { homePath, repositoryPath, workspacePath, workspacePeoplePath } from '../lib/paths';
import { integrationApi } from '../api';
import { rememberGithubOAuthWorkspace } from './GithubCallbackPage';
import {
  useAiStatusQuery,
  useAuditLogsQuery,
  useConnectGithubMutation,
  useDeleteWorkspaceMutation,
  useDisconnectGithubMutation,
  useGithubIntegrationQuery,
  useInviteMemberMutation,
  useMembersQuery,
  useRemoveMemberMutation,
  useRepositoriesQuery,
  useSyncGithubMutation,
  useUpdateMemberMutation,
  useUpdateWorkspaceMutation,
  useWorkspaceQuery,
} from '../queries';
import {
  dangerButton,
  errorText,
  fieldClass,
  muted,
  primaryButton,
  secondaryButton,
} from '../ui';
import type { Repository } from '../api';
import { inviteMemberSchema, workspaceNameSchema } from '../validation';

const ASSIGNABLE = ['ADMIN', 'ANALYST', 'VIEWER'] as const;

const HOME_CARD = 'rounded-[1.75rem] bg-panel p-6';
const SETTINGS_PANEL = 'rounded-[1.75rem] bg-panel p-5';
const ACTIVITY_DOTS = ['#34d399', '#a78bfa', '#fb923c', '#38bdf8', '#e4e4e7'];
const SETTINGS_TABS = [
  { id: 'provider', label: 'AI Provider' },
  { id: 'rules', label: 'Analysis Rules' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'retention', label: 'Retention' },
  { id: 'members', label: 'Members' },
] as const;
type SettingsTab = (typeof SETTINGS_TABS)[number]['id'];

export function WorkspaceReposPage() {
  const workspace = useWorkspaceContext();
  const [params] = useSearchParams();
  const query = (params.get('q') ?? '').trim().toLowerCase();
  const repositoriesQuery = useRepositoriesQuery(workspace.id);
  const repositories = repositoriesQuery.data?.items ?? [];

  if (workspace.loading) {
    return <WorkspaceLoading />;
  }
  if (!workspace.data) {
    return <WorkspaceMissing error={workspace.error} />;
  }

  const members = workspace.members.filter((member) =>
    query
      ? `${member.name} ${member.email} ${member.role}`.toLowerCase().includes(query)
      : true,
  );
  const visibleRepos = repositories.filter((repository) =>
    query
      ? `${repository.name} ${repository.provider} ${repository.defaultBranch ?? ''}`.toLowerCase().includes(query)
      : true,
  );
  const roleCount = new Set(workspace.members.map((member) => member.role)).size;
  const title = workspace.data.name.toLowerCase().endsWith('workspace')
    ? workspace.data.name
    : `${workspace.data.name} Workspace`;

  return (
    <PageFrame>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <Header
          title={title}
          subtitle="Members, repositories and recent activity for this workspace."
          archived={workspace.archived}
          error={workspace.actionError}
        />
        {workspace.canEdit ? (
          <Link className={primaryButton} to={workspacePeoplePath(workspace.id)}>
            + Invite Member
          </Link>
        ) : null}
      </div>
      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <section className={HOME_CARD}>
          <h2 className="text-[15px] font-semibold text-white">Members</h2>
          <p className="mt-1 text-xs text-zinc-500">
            {workspace.members.length} {workspace.members.length === 1 ? 'person' : 'people'}
            {roleCount ? ` · ${roleCount} ${roleCount === 1 ? 'role' : 'roles'}` : ''}
          </p>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <thead>
                <tr className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">
                  <th className="pb-3 font-medium">Name</th>
                  <th className="w-28 pb-3 font-medium">Role</th>
                  <th className="w-28 pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.userId} className="border-t border-white/5">
                    <td className="py-3 pr-4">
                      <span className="flex items-center gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/5 text-[10px] font-semibold text-zinc-300">
                          {initials(member.name)}
                        </span>
                        <span className="min-w-0 truncate text-zinc-200">
                          {member.name} · {member.email}
                        </span>
                      </span>
                    </td>
                    <td className="whitespace-nowrap py-3 pr-3">
                      <Pill>{formatRole(member.role)}</Pill>
                    </td>
                    <td className="whitespace-nowrap py-3">
                      <StatusPill status={member.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!workspace.membersQuery.isPending && members.length === 0 ? (
              <p className={`mt-4 ${muted}`}>No members match.</p>
            ) : null}
          </div>
        </section>

        <section className={HOME_CARD}>
          <h2 className="text-[15px] font-semibold text-white">Workspace Settings Snapshot</h2>
          <p className="mt-1 text-xs text-zinc-500">Quick reference</p>
          <dl className="mt-5 space-y-4 text-sm">
            <SnapshotRow label="Retention policy" value="Not configured" />
            <SnapshotRow label="Default AI provider" value="Ollama (local)" />
            <SnapshotRow label="Integrations" value="Not connected" />
            <SnapshotRow
              label="Audit log"
              value={workspace.canManage ? 'Enabled' : 'Restricted'}
              tone={workspace.canManage ? 'ok' : 'muted'}
            />
          </dl>
        </section>

        <section className={HOME_CARD}>
          <h2 className="text-[15px] font-semibold text-white">Repositories</h2>
          <p className="mt-1 text-xs text-zinc-500">
            {repositories.length} connected
          </p>
          {repositoriesQuery.isPending ? <p className={`mt-4 ${muted}`}>Loading repositories…</p> : null}
          {repositoriesQuery.isError ? (
            <p className={`mt-4 ${errorText}`}>
              {errorMessage(repositoriesQuery.error, 'Unable to load repositories')}
            </p>
          ) : null}
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead>
                <tr className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">
                  <th className="pb-3 font-medium">Name</th>
                  <th className="pb-3 font-medium">Provider</th>
                  <th className="pb-3 font-medium">Default branch</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {visibleRepos.map((repository) => (
                  <tr key={repository.id} className="border-t border-white/5">
                    <td className="py-3">
                      <Link
                        className="text-zinc-200 hover:text-white"
                        to={repositoryPath(workspace.id, repository.id)}
                      >
                        {repository.name}
                      </Link>
                    </td>
                    <td className="py-3 text-zinc-400">{formatProvider(repository.provider)}</td>
                    <td className="py-3 text-zinc-400">{repository.defaultBranch ?? '—'}</td>
                    <td className="py-3">
                      <RepoStatus status={repository.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!repositoriesQuery.isPending && visibleRepos.length === 0 ? (
              <p className={`mt-4 ${muted}`}>No repositories yet. Connect one from Repositories.</p>
            ) : null}
          </div>
        </section>

        <section className={HOME_CARD}>
          <h2 className="text-[15px] font-semibold text-white">Recent Activity</h2>
          <p className="mt-1 text-xs text-zinc-500">Workspace-wide audit feed</p>
          {workspace.canManage ? (
            <>
              {workspace.auditQuery.isPending ? <p className={`mt-4 ${muted}`}>Loading activity…</p> : null}
              <ul className="mt-5 space-y-3 text-sm">
                {workspace.activity.slice(0, 8).map((event, index) => (
                  <li key={event.id} className="flex items-start gap-3 text-zinc-300">
                    <span
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                      style={{ background: ACTIVITY_DOTS[index % ACTIVITY_DOTS.length] }}
                    />
                    <span>{formatActivity(event.action)}</span>
                  </li>
                ))}
                {!workspace.auditQuery.isPending && workspace.activity.length === 0 ? (
                  <li className="text-zinc-500">No activity yet.</li>
                ) : null}
              </ul>
            </>
          ) : (
            <p className={`mt-5 ${muted}`}>Activity is available to workspace owners and admins.</p>
          )}
        </section>
      </div>
    </PageFrame>
  );
}

export function WorkspaceRepositoriesPage() {
  const workspace = useWorkspaceContext();
  if (workspace.loading) {
    return <WorkspaceLoading />;
  }
  if (!workspace.data) {
    return <WorkspaceMissing error={workspace.error} />;
  }
  return (
    <PageFrame>
      <Link
        className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
        to={workspacePath(workspace.id)}
      >
        <BackArrow />
        Back
      </Link>
      {workspace.archived ? (
        <p className="mb-4 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          This workspace is archived. Restore it to make changes.
        </p>
      ) : null}
      {workspace.actionError ? (
        <p className={`mb-4 ${errorText}`}>{errorMessage(workspace.actionError, 'Something went wrong')}</p>
      ) : null}
      <RepositoriesPanel
        workspaceId={workspace.id}
        canAdd={workspace.canManage}
        archived={workspace.archived}
      />
    </PageFrame>
  );
}

export function WorkspacePeoplePage() {
  const { user } = useAuth();
  const workspace = useWorkspaceContext();
  if (workspace.loading) {
    return <WorkspaceLoading />;
  }
  if (!workspace.data) {
    return <WorkspaceMissing error={workspace.error} />;
  }

  return (
    <PageFrame>
      <Link
        className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
        to={workspacePath(workspace.id)}
      >
        <BackArrow />
        Back
      </Link>
      <Header
        title="People"
        subtitle="Invite teammates who already have an account."
        archived={workspace.archived}
        error={workspace.actionError}
      />
      <div className="mt-6">
        <MembersPanel workspace={workspace} userId={user?.id} />
      </div>
    </PageFrame>
  );
}

export function WorkspaceSettingsPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const workspace = useWorkspaceContext();
  const repositoriesQuery = useRepositoriesQuery(workspace.id);
  const repositories = repositoriesQuery.data?.items ?? [];
  const firstRepoId = repositories[0]?.id ?? '';
  const aiQuery = useAiStatusQuery(workspace.id, firstRepoId);
  const tab = parseSettingsTab(params.get('tab'));

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
        subtitle="AI provider, analysis rules, integrations, retention and members."
        archived={workspace.archived}
        error={workspace.actionError}
      />
      <div className="mt-5 flex flex-wrap gap-2">
        {SETTINGS_TABS.map((item) => (
          <button
            key={item.id}
            className={
              tab === item.id
                ? 'rounded-full bg-brand/20 px-3 py-1.5 text-sm font-medium text-white'
                : 'rounded-full px-3 py-1.5 text-sm text-zinc-400 hover:bg-white/5 hover:text-white'
            }
            type="button"
            onClick={() => setParams(item.id === 'provider' ? {} : { tab: item.id })}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="mt-6">
        {tab === 'members' ? (
          <MembersPanel workspace={workspace} userId={user?.id} />
        ) : (
          <SettingsOverview
            tab={tab}
            workspace={workspace}
            repositories={repositories}
            ollamaAvailable={aiQuery.data?.available}
            ollamaModel={aiQuery.data?.model}
          />
        )}
      </div>
    </PageFrame>
  );
}

function SettingsOverview({
  tab,
  workspace,
  repositories,
  ollamaAvailable,
  ollamaModel,
}: {
  tab: SettingsTab;
  workspace: ReturnType<typeof useWorkspaceContext>;
  repositories: Repository[];
  ollamaAvailable: boolean | undefined;
  ollamaModel: string | undefined;
}) {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const gitignoreOn =
    repositories.length === 0 || repositories.every((item) => item.settings?.respectGitignore !== false);

  if (tab === 'integrations') {
    return (
      <div className="space-y-6">
        <GithubSettingsCard workspaceId={workspace.id} canManage={Boolean(workspace.canEdit)} />
        <ActivityCard workspace={workspace} />
      </div>
    );
  }

  if (tab === 'rules') {
    return (
      <section className={SETTINGS_PANEL}>
        <h2 className="text-sm font-semibold text-white">Analysis Rules</h2>
        <ul className="mt-4 divide-y divide-white/5 text-sm">
          <SettingRow label="Ignore vendor/generated files" value="On" on />
          <SettingRow label="Respect .gitignore" value={gitignoreOn ? 'On' : 'Off'} on={gitignoreOn} />
          <SettingRow label="Incremental sync" value="Off" />
          <SettingRow label="Max analysis depth" value="6 levels" />
        </ul>
        <p className={`mt-3 text-xs ${muted}`}>
          Vendor paths are always skipped. Gitignore is chosen when you connect a repository. Every analysis
          run is Full. Impact walks up to 6 levels.
        </p>
      </section>
    );
  }

  if (tab === 'retention') {
    return (
      <section className={SETTINGS_PANEL}>
        <h2 className="text-sm font-semibold text-white">Retention & Danger Zone</h2>
        {workspace.canEdit && workspace.data ? (
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
        <ul className="mt-4 divide-y divide-white/5 text-sm">
          <SettingRow label="Data retention" value="Until you delete" />
          <SettingRow label="Audit log retention" value="Kept with this workspace" />
        </ul>
        {workspace.isOwner ? (
          <div className="mt-5 space-y-3">
            <button
              className="inline-flex w-full cursor-pointer items-center justify-center rounded-2xl border border-red-400/40 px-4 py-2.5 text-sm font-medium text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
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
              {workspace.archived ? 'Restore workspace' : 'Archive Workspace'}
            </button>
            <button
              className={`${dangerButton} w-full`}
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
                    void workspace.deleteWorkspace.mutateAsync().then(() => navigate(homePath, { replace: true }));
                  }
                });
              }}
            >
              Delete workspace
            </button>
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <section className={SETTINGS_PANEL}>
      <h2 className="text-sm font-semibold text-white">AI Provider</h2>
      <div className="mt-4 space-y-2">
        <div
          className={`flex items-center justify-between gap-3 rounded-2xl px-4 py-3 ${
            ollamaAvailable ? 'bg-brand/20' : 'bg-white/5'
          }`}
        >
          <div>
            <p className="text-sm font-medium text-white">Ollama (local)</p>
            {ollamaModel ? <p className={`mt-0.5 text-xs ${muted}`}>{ollamaModel}</p> : null}
          </div>
          <SettingStatus on={Boolean(ollamaAvailable)} onLabel="Active" offLabel="Unavailable" />
        </div>
        <div className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 bg-white/5">
          <p className="text-sm font-medium text-zinc-300">Hosted provider (opt-in)</p>
          <span className="text-sm text-zinc-500">Disabled</span>
        </div>
      </div>
      <p className={`mt-3 text-xs ${muted}`}>
        Provider disclosure required before source is ever sent to a hosted model.
      </p>
    </section>
  );
}

function ActivityCard({ workspace }: { workspace: ReturnType<typeof useWorkspaceContext> }) {
  return (
    <section className={SETTINGS_PANEL}>
      <h2 className="text-sm font-semibold text-white">Activity</h2>
      {workspace.auditQuery.isPending ? <p className={`mt-4 ${muted}`}>Loading activity…</p> : null}
      <ul className="mt-4 space-y-2 text-sm text-zinc-200">
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
  );
}

function MembersPanel({
  workspace,
  userId,
}: {
  workspace: ReturnType<typeof useWorkspaceContext>;
  userId?: string;
}) {
  const navigate = useNavigate();
  const confirm = useConfirm();
  return (
    <section className={SETTINGS_PANEL}>
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
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 px-4 py-3"
          >
            <span>
              <span className="font-medium text-white">{member.name}</span>
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
              (workspace.canManage || member.userId === userId) ? (
                <button
                  className="font-medium text-red-300 hover:text-red-200"
                  type="button"
                  onClick={() => {
                    const leaving = member.userId === userId;
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
                          navigate(homePath, { replace: true });
                        }
                      });
                    });
                  }}
                >
                  {member.userId === userId ? 'Leave' : 'Remove'}
                </button>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SettingRow({ label, value, on = false }: { label: string; value: string; on?: boolean }) {
  return (
    <li className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <span className="text-zinc-200">{label}</span>
      <SettingStatus on={on} onLabel={value} offLabel={value} />
    </li>
  );
}

function SettingStatus({
  on,
  onLabel,
  offLabel,
}: {
  on: boolean;
  onLabel: string;
  offLabel: string;
}) {
  return (
    <span className={`text-sm font-medium ${on ? 'text-emerald-300' : 'text-zinc-500'}`}>
      {on ? onLabel : offLabel}
    </span>
  );
}

function parseSettingsTab(value: string | null): SettingsTab {
  if (SETTINGS_TABS.some((item) => item.id === value)) {
    return value as SettingsTab;
  }
  return 'provider';
}

function BackArrow() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12.5 4.5 7 10l5.5 5.5M7 10h9" />
    </svg>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function Pill({ children }: { children: string }) {
  return (
    <span className="inline-flex rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-zinc-300">{children}</span>
  );
}

function StatusPill({ status }: { status: string }) {
  const active = status === 'ACTIVE' || status === 'READY';
  const invited = status === 'INVITED' || status === 'PENDING';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs ${
        active
          ? 'bg-emerald-500/10 text-emerald-300'
          : invited
            ? 'bg-amber-500/10 text-amber-200'
            : 'bg-white/5 text-zinc-400'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          active ? 'bg-emerald-400' : invited ? 'bg-amber-300' : 'bg-zinc-500'
        }`}
      />
      {formatStatus(status)}
    </span>
  );
}

function RepoStatus({ status }: { status: string }) {
  const ready = status === 'READY';
  const busy = status === 'SYNCING' || status === 'PENDING' || status === 'RUNNING';
  const label = ready ? 'Completed' : busy ? 'Analyzing' : formatStatus(status);
  return (
    <span className="inline-flex items-center gap-2 text-xs text-zinc-300">
      <span
        className={`h-2 w-2 rounded-full ${
          ready ? 'bg-emerald-400' : busy ? 'bg-amber-400' : status === 'FAILED' ? 'bg-red-400' : 'bg-zinc-500'
        }`}
      />
      {label}
    </span>
  );
}

function SnapshotRow({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'ok' | 'muted';
}) {
  const valueClass =
    tone === 'ok' ? 'text-emerald-300' : tone === 'muted' ? 'text-zinc-500' : 'text-zinc-200';
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-zinc-500">{label}</dt>
      <dd className={valueClass}>{value}</dd>
    </div>
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
      {title ? <h1 className="text-2xl font-semibold tracking-tight text-white">{title}</h1> : null}
      {subtitle ? <p className={`mt-2 ${muted}`}>{subtitle}</p> : null}
      {archived ? (
        <p className="mt-3 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
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
      <p className="text-red-300">{errorMessage(error, 'This workspace could not be found.')}</p>
    </PageFrame>
  );
}

function GithubSettingsCard({ workspaceId, canManage }: { workspaceId: string; canManage: boolean }) {
  const github = useGithubIntegrationQuery(workspaceId);
  const connect = useConnectGithubMutation(workspaceId);
  const sync = useSyncGithubMutation(workspaceId);
  const disconnect = useDisconnectGithubMutation(workspaceId);
  const confirm = useConfirm();
  const data = github.data;
  const secret = connect.data?.webhookSecret ?? null;

  return (
    <section className={SETTINGS_PANEL}>
      <h2 className="text-sm font-semibold text-white">GitHub</h2>
      <ul className="mt-4 divide-y divide-white/5 text-sm">
        <SettingRow
          label="Connection"
          value={data?.connected ? `Connected${data.accountLogin ? ` as @${data.accountLogin}` : ''}` : 'Not connected'}
          on={Boolean(data?.connected)}
        />
        <SettingRow
          label="Last synced"
          value={
            data?.lastSyncedAt
              ? formatWhen(data.lastSyncedAt) || 'Just now'
              : data?.connected
                ? 'Not yet — click Sync issues & PRs'
                : '—'
          }
        />
        <SettingRow
          label="Webhooks"
          value={data?.webhookConfigured ? 'Listening' : 'Not configured'}
          on={Boolean(data?.webhookConfigured)}
        />
        <SettingRow label="GitLab" value="Later" />
      </ul>
      {data?.lastError ? <p className={`mt-3 text-xs ${errorText}`}>{data.lastError}</p> : null}
      {data?.webhookUrl ? (
        <p className={`mt-3 break-all text-xs ${muted}`}>Webhook URL: {data.webhookUrl}</p>
      ) : null}
      {secret ? (
        <p className="mt-2 break-all text-xs text-amber-200">
          Webhook secret (copy now): {secret}
        </p>
      ) : null}
      {canManage ? (
        <Formik
          initialValues={{ token: '' }}
          onSubmit={async (values, helpers) => {
            try {
              await connect.mutateAsync(values.token.trim());
              helpers.resetForm();
            } catch {
              // Shown below.
            }
          }}
        >
          {({ isSubmitting }) => (
            <Form className="mt-4 space-y-3" noValidate>
              <Field
                className={fieldClass()}
                name="token"
                type="password"
                placeholder="GitHub personal access token"
                aria-label="GitHub personal access token"
                autoComplete="off"
              />
              {connect.error ? (
                <p className={errorText}>{errorMessage(connect.error, 'GitHub could not be connected.')}</p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <button className={primaryButton} type="submit" disabled={isSubmitting}>
                  {data?.connected ? 'Update token' : 'Connect GitHub'}
                </button>
                {data?.oauthAvailable ? (
                  <button
                    className={secondaryButton}
                    type="button"
                    onClick={() => {
                      rememberGithubOAuthWorkspace(workspaceId);
                      void integrationApi.authorizeGithub(workspaceId).then((result) => {
                        window.location.assign(result.url);
                      });
                    }}
                  >
                    Continue with GitHub
                  </button>
                ) : null}
                {data?.connected ? (
                  <>
                    <button
                      className={secondaryButton}
                      type="button"
                      disabled={sync.isPending}
                      onClick={() => sync.mutate()}
                    >
                      {sync.isPending ? 'Syncing…' : 'Sync issues & PRs'}
                    </button>
                    <button
                      className={dangerButton}
                      type="button"
                      disabled={disconnect.isPending}
                      onClick={() => {
                        void confirm({
                          title: 'Disconnect GitHub',
                          message: 'Stop syncing issues, pull requests, and webhooks for this workspace?',
                          confirmLabel: 'Disconnect',
                          danger: true,
                        }).then((ok) => {
                          if (ok) {
                            disconnect.mutate();
                          }
                        });
                      }}
                    >
                      Disconnect
                    </button>
                  </>
                ) : null}
              </div>
            </Form>
          )}
        </Formik>
      ) : null}
      <p className={`mt-3 text-xs ${muted}`}>
        A workspace token is used for issues, pull requests, reviews, and verified webhooks. Cloning a
        github.com URL is not the same as connecting GitHub. GitLab uses the same contract later.
      </p>
    </section>
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
