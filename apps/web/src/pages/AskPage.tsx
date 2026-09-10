import { type FormEvent, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { PageFrame } from '../components/PageFrame';
import { errorMessage } from '../lib/errors';
import { relatedEvidenceChips, uniqueEvidence } from '../lib/explorer';
import { formatStatus } from '../lib/format';
import {
  repositoryCodePath,
  repositoryEvolutionPath,
  repositoryHistoryPath,
  repositoryImpactPath,
} from '../lib/paths';
import {
  useAiStatusQuery,
  useCreateInvestigationMutation,
  useInvestigationQuery,
  useInvestigationsQuery,
  useWorkspaceQuery,
} from '../queries';
import { muted, primaryButton } from '../ui';
import type { Investigation, InvestigationEvidence } from '../api';

const PANEL = 'rounded-[1.75rem] bg-panel';

export function AskPage() {
  const { workspaceId = '', repositoryId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const fileId = params.get('file') ?? '';
  const symbolId = params.get('symbol') ?? '';
  const selectedId = params.get('ask') ?? '';
  const [draft, setDraft] = useState(params.get('question') ?? '');
  const workspaceQuery = useWorkspaceQuery(workspaceId);
  const statusQuery = useAiStatusQuery(workspaceId, repositoryId);
  const listQuery = useInvestigationsQuery(workspaceId, repositoryId);
  const currentQuery = useInvestigationQuery(workspaceId, repositoryId, selectedId);
  const create = useCreateInvestigationMutation(workspaceId, repositoryId);
  const canAsk = workspaceQuery.data?.role !== 'VIEWER';
  const current = currentQuery.data;
  const modelReady = Boolean(statusQuery.data?.available);

  function open(id: string) {
    const next = new URLSearchParams();
    if (fileId) next.set('file', fileId);
    if (symbolId) next.set('symbol', symbolId);
    next.set('ask', id);
    setParams(next);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const question = draft.trim();
    if (!canAsk || question.length < 8) {
      return;
    }
    const created = await create.mutateAsync({
      question,
      fileId: fileId || undefined,
      symbolId: symbolId || undefined,
    });
    setDraft('');
    open(created.id);
  }

  return (
    <PageFrame>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Investigation</h1>
          <p className={`mt-2 ${muted}`}>
            Ask questions about your codebase, get insights, and cited answers.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
          <section className={`${PANEL} p-5`}>
            <h2 className="text-sm font-semibold text-white">Earlier questions</h2>
            {listQuery.isLoading ? (
              <p className={`mt-3 ${muted}`}>Loading…</p>
            ) : (listQuery.data?.items.length ?? 0) === 0 ? (
              <p className={`mt-3 ${muted}`}>None yet</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {(listQuery.data?.items ?? []).map((item) => (
                  <li key={item.id}>
                    <button
                      className={`w-full rounded-2xl px-3 py-2.5 text-left text-sm ${
                        selectedId === item.id
                          ? 'bg-brand/20 text-white'
                          : 'text-zinc-300 hover:bg-white/5'
                      }`}
                      type="button"
                      onClick={() => open(item.id)}
                    >
                      <span className="block truncate font-medium">{item.question}</span>
                      <span className="mt-1 block text-xs text-zinc-500">{formatStatus(item.status)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="flex min-h-[28rem] flex-col gap-4">
            <div className="min-h-0 flex-1 space-y-4">
              {selectedId && currentQuery.isLoading ? (
                <p className={muted}>Gathering indexed evidence…</p>
              ) : selectedId && (currentQuery.isError || !current) ? (
                <p className="text-red-300">{errorMessage(currentQuery.error, 'This question could not be loaded.')}</p>
              ) : current ? (
                <Thread
                  workspaceId={workspaceId}
                  repositoryId={repositoryId}
                  investigation={current}
                  modelReady={modelReady}
                />
              ) : (
                <p className={muted}>Ask about a file, symbol, risk, or change. Answers list the evidence they used.</p>
              )}
            </div>

            {canAsk ? (
              <form className={`${PANEL} flex items-center gap-3 px-4 py-3`} onSubmit={(event) => void submit(event)}>
                <input
                  className="min-h-10 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-500"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Ask a question about your codebase..."
                  aria-label="Question"
                  disabled={create.isPending}
                />
                <button
                  className={primaryButton}
                  type="submit"
                  disabled={create.isPending || draft.trim().length < 8}
                >
                  {create.isPending ? 'Asking…' : 'Ask'}
                  {create.isPending ? null : <AskArrow />}
                </button>
              </form>
            ) : (
              <section className={`${PANEL} p-5`}>
                <p className={muted}>You can read answers here, but asking a new question needs a higher role.</p>
              </section>
            )}
            {create.isError ? (
              <p className="text-sm text-red-300">{errorMessage(create.error, 'Question could not be started.')}</p>
            ) : null}
          </div>
        </div>
      </div>
    </PageFrame>
  );
}

function Thread({
  workspaceId,
  repositoryId,
  investigation,
  modelReady,
}: {
  workspaceId: string;
  repositoryId: string;
  investigation: Investigation;
  modelReady: boolean;
}) {
  const assistant = [...(investigation.messages ?? [])].reverse().find((message) => message.role === 'assistant');
  const busy = investigation.status === 'QUEUED' || investigation.status === 'RUNNING';
  const chips = relatedEvidenceChips(investigation.evidence ?? []);
  const citations = uniqueEvidence(investigation.evidence ?? []).slice(0, 8);

  return (
    <>
      <article className={`${PANEL} flex gap-3 px-5 py-4`}>
        <Avatar />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-zinc-500">You asked</p>
          <p className="mt-1 text-sm font-medium text-white">{investigation.question}</p>
        </div>
      </article>

      <article className={`${PANEL} flex gap-3 px-5 py-4`}>
        <Avatar />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-zinc-500">{assistantHeading(investigation, busy, modelReady)}</p>
          {busy ? (
            <p className={`mt-3 ${muted}`}>Gathering indexed evidence…</p>
          ) : investigation.status === 'FAILED' ? (
            <p className="mt-3 text-sm text-red-300">{investigation.error || 'This question failed.'}</p>
          ) : assistant ? (
            <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-6 text-zinc-100">
              {assistant.content}
            </pre>
          ) : (
            <p className={`mt-3 ${muted}`}>No answer yet.</p>
          )}

          {chips.length > 0 ? (
            <div className="mt-4">
              <p className="text-xs font-medium text-zinc-500">Related evidence</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {chips.map((chip) => (
                  <span
                    key={chip.key}
                    className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300"
                  >
                    {chip.label}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <p className="mt-3 text-xs text-zinc-500">{confidenceLine(investigation)}</p>

          {citations.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {citations.map((item) => (
                <CitationLinks
                  key={item.id}
                  item={item}
                  workspaceId={workspaceId}
                  repositoryId={repositoryId}
                />
              ))}
            </ul>
          ) : null}
        </div>
      </article>
    </>
  );
}

function CitationLinks({
  item,
  workspaceId,
  repositoryId,
}: {
  item: InvestigationEvidence;
  workspaceId: string;
  repositoryId: string;
}) {
  const to = item.commitSha
    ? repositoryHistoryPath(workspaceId, repositoryId, { commit: item.commitSha, path: item.path ?? undefined })
    : item.fileId
      ? repositoryCodePath(workspaceId, repositoryId, { file: item.fileId, symbol: item.symbolId ?? undefined })
      : null;
  if (!to) {
    return null;
  }
  return (
    <li className="flex flex-wrap gap-3 text-xs font-medium">
      <Link className="text-brand hover:text-brand-2" to={to}>
        Open {item.citation}
      </Link>
      {item.fileId ? (
        <Link
          className="text-brand hover:text-brand-2"
          to={repositoryImpactPath(workspaceId, repositoryId, {
            file: item.fileId,
            symbol: item.symbolId ?? undefined,
          })}
        >
          Impact
        </Link>
      ) : null}
      {item.fileId ? (
        <Link
          className="text-brand hover:text-brand-2"
          to={repositoryEvolutionPath(workspaceId, repositoryId, {
            file: item.fileId,
            symbol: item.symbolId ?? undefined,
          })}
        >
          Evolution
        </Link>
      ) : null}
    </li>
  );
}

function assistantHeading(investigation: Investigation, busy: boolean, modelReady: boolean): string {
  if (busy) {
    return modelReady ? 'Local model · gathering evidence' : 'Indexed evidence · gathering';
  }
  if (investigation.usedModel) {
    return 'Local model';
  }
  return 'Indexed evidence';
}

function confidenceLine(investigation: Investigation): string {
  const confidence =
    investigation.confidence != null ? `Confidence: ${investigation.confidence.toFixed(2)}` : null;
  const source = investigation.usedModel
    ? 'Local model explained indexed facts; it cannot invent evidence.'
    : 'Indexed facts only; no generated explanation.';
  return [confidence, source].filter(Boolean).join(' · ');
}

function Avatar() {
  return <span className="mt-0.5 h-8 w-8 shrink-0 rounded-full bg-brand" aria-hidden="true" />;
}

function AskArrow() {
  return (
    <svg viewBox="0 0 16 16" className="ml-1.5 h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path strokeLinecap="round" d="M4 12 12 4M6.5 4H12v5.5" />
    </svg>
  );
}
