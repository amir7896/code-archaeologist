import { Field, Form, Formik } from 'formik';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from './StatusBadge';
import { errorMessage } from '../lib/errors';
import { repositoryHost, repositorySummary } from '../lib/format';
import { repositoryPath } from '../lib/paths';
import { useCreateRepositoryMutation, useRepositoriesQuery } from '../queries';
import { errorText, fieldClass, muted } from '../ui';
import { createRepositorySchema } from '../validation';

const PANEL = 'rounded-[1.75rem] bg-panel p-6';

const SOURCES = [
  {
    id: 'github',
    label: 'GitHub — Connect your GitHub repository',
    placeholder: 'https://github.com/owner/repository.git',
  },
  {
    id: 'gitlab',
    label: 'GitLab — Connect your GitLab repository',
    placeholder: 'https://gitlab.com/owner/repository.git',
  },
  {
    id: 'bitbucket',
    label: 'Bitbucket — Connect your Bitbucket repository',
    placeholder: 'https://bitbucket.org/owner/repository.git',
  },
  {
    id: 'local',
    label: 'Local Repository — Upload or clone from local machine',
    placeholder: 'https://github.com/owner/repository.git',
  },
] as const;

const PIPELINE = [
  { n: '1', title: 'Clone & Detect', detail: 'Default branch, revision' },
  { n: '2', title: 'Git History', detail: 'Commits, authors, diffs' },
  { n: '3', title: 'AST Parse', detail: 'Symbols & relations' },
  { n: '4', title: 'Graph Build', detail: 'Dependency edges' },
  { n: '5', title: 'Risk & Metrics', detail: 'Churn, complexity, DNA' },
];

type SourceId = (typeof SOURCES)[number]['id'];

const SOURCE_API: Record<SourceId, 'GITHUB' | 'GITLAB' | 'BITBUCKET' | 'LOCAL'> = {
  github: 'GITHUB',
  gitlab: 'GITLAB',
  bitbucket: 'BITBUCKET',
  local: 'LOCAL',
};

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
  const [source, setSource] = useState<SourceId>('github');
  const selected = SOURCES.find((item) => item.id === source) ?? SOURCES[0];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Connect Repository</h1>
        <p className="mt-2 text-sm text-zinc-400">Step 2 of 3 — Repository Analysis</p>
        <ol className="mt-4 flex flex-wrap gap-2">
          <StepPill n="1" label="Repository" active />
          <StepPill n="2" label="Analysis" />
          <StepPill n="3" label="Complete" />
        </ol>
      </div>

      {canAdd && !archived ? (
        <Formik
          initialValues={{
            url: '',
            name: '',
            defaultBranch: 'main',
            token: '',
            includePullRequests: true,
            respectGitignore: true,
          }}
          validationSchema={createRepositorySchema}
          onSubmit={async (values, helpers) => {
            helpers.setStatus(undefined);
            try {
              const repository = await createRepository.mutateAsync({
                url: values.url.trim(),
                name: values.name.trim() || undefined,
                defaultBranch: values.defaultBranch.trim() || undefined,
                source: SOURCE_API[source],
                includePullRequests: values.includePullRequests,
                respectGitignore: values.respectGitignore,
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
          {({ isSubmitting, status }) => (
            <Form noValidate>
              <div className="grid gap-5 xl:grid-cols-2">
                <section className={PANEL}>
                  <h2 className="text-[15px] font-semibold text-white">Select Repository Source</h2>
                  <div className="mt-4 space-y-2">
                    {SOURCES.map((item) => {
                      const active = item.id === source;
                      return (
                        <button
                          key={item.id}
                          className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition ${
                            active
                              ? 'border-brand/50 bg-brand/10 text-white'
                              : 'border-white/10 bg-transparent text-zinc-300 hover:bg-white/5'
                          }`}
                          type="button"
                          onClick={() => setSource(item.id)}
                        >
                          <span>{item.label}</span>
                          {active ? (
                            <span className="h-2.5 w-2.5 rounded-full bg-brand" />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                  {source === 'local' ? (
                    <p className={`mt-4 ${muted}`}>
                      Uploading a folder is not available yet. Paste an HTTPS Git URL to clone it.
                    </p>
                  ) : null}
                </section>

                <section className={PANEL}>
                  <h2 className="text-[15px] font-semibold text-white">Repository Details</h2>
                  <div className="mt-4 space-y-4">
                    <label className="block text-sm">
                      <span className="text-zinc-400">Repository URL</span>
                      <Field name="url">
                        {({
                          field,
                          meta,
                        }: {
                          field: { name: string; value: string; onChange: (event: unknown) => void; onBlur: (event: unknown) => void };
                          meta: { touched: boolean; error?: string };
                        }) => (
                          <>
                            <input
                              {...field}
                              className={`${fieldClass(Boolean(meta.touched && meta.error))} mt-1.5`}
                              placeholder={selected.placeholder}
                              onBlur={(event) => {
                                field.onBlur(event);
                                const next = detectSource(event.target.value);
                                if (next) {
                                  setSource(next);
                                }
                              }}
                            />
                            {meta.touched && meta.error ? <p className={errorText}>{meta.error}</p> : null}
                          </>
                        )}
                      </Field>
                    </label>
                    <label className="block text-sm">
                      <span className="text-zinc-400">Branch</span>
                      <Field
                        className={`${fieldClass()} mt-1.5`}
                        name="defaultBranch"
                        placeholder="main"
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="text-zinc-400">Access token</span>
                      <Field
                        className={`${fieldClass()} mt-1.5`}
                        type="password"
                        name="token"
                        placeholder="Optional for private repositories"
                        autoComplete="off"
                      />
                    </label>
                    <label className="flex items-start gap-2 text-sm text-zinc-300">
                      <Field className="mt-0.5" type="checkbox" name="includePullRequests" />
                      <span>Include pull requests and issues</span>
                    </label>
                    <label className="flex items-start gap-2 text-sm text-zinc-300">
                      <Field className="mt-0.5" type="checkbox" name="respectGitignore" />
                      <span>Respect .gitignore + skip vendor/binary files</span>
                    </label>
                    {status ? <p className={errorText}>{status}</p> : null}
                    <button
                      className="inline-flex w-full cursor-pointer items-center justify-center rounded-full bg-brand py-3 text-sm font-semibold text-ink transition hover:bg-brand-2 disabled:cursor-not-allowed disabled:opacity-50"
                      type="submit"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Connecting…' : 'Connect & Analyze'}
                    </button>
                  </div>
                </section>
              </div>
            </Form>
          )}
        </Formik>
      ) : (
        <p className={muted}>You do not have access to add a repository here.</p>
      )}

      <section className={PANEL}>
        <h2 className="text-[15px] font-semibold text-white">Analysis Pipeline</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Clone → Git history → AST parse → Graph build → Metrics/Risk
        </p>
        <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {PIPELINE.map((step) => (
            <li key={step.n}>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand/15 text-xs font-semibold text-brand-2">
                {step.n}
              </span>
              <p className="mt-3 text-sm font-medium text-white">{step.title}</p>
              <p className="mt-1 text-xs text-zinc-500">{step.detail}</p>
            </li>
          ))}
        </ol>
      </section>

      {repositories.length > 0 ? (
        <section className={PANEL}>
          <h2 className="text-[15px] font-semibold text-white">Connected</h2>
          {repositoriesQuery.isPending ? <p className={`mt-4 ${muted}`}>Loading repositories…</p> : null}
          <ul className="mt-4 space-y-2">
            {repositories.map((repository) => (
              <li key={repository.id}>
                <button
                  className="flex w-full items-center justify-between rounded-2xl border border-white/10 px-4 py-3 text-left transition hover:border-brand/40"
                  type="button"
                  onClick={() => navigate(repositoryPath(workspaceId, repository.id))}
                >
                  <span className="min-w-0">
                    <span className="block font-medium text-white">{repository.name}</span>
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
      ) : null}
    </div>
  );
}

function StepPill({ n, label, active = false }: { n: string; label: string; active?: boolean }) {
  return (
    <li
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${
        active ? 'bg-brand/15 text-brand-2' : 'bg-white/5 text-zinc-400'
      }`}
    >
      <span>{n}</span>
      {label}
    </li>
  );
}

function detectSource(url: string): SourceId | null {
  const value = url.toLowerCase();
  if (value.includes('gitlab')) {
    return 'gitlab';
  }
  if (value.includes('bitbucket')) {
    return 'bitbucket';
  }
  if (value.includes('github')) {
    return 'github';
  }
  return null;
}
