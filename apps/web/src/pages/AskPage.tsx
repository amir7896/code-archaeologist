import { type FormEvent, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { PageFrame } from '../components/PageFrame';
import { errorMessage } from '../lib/errors';
import { formatConfidenceLabel, formatStatus, formatWhen } from '../lib/format';
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
import { card, fieldClass, muted, primaryButton } from '../ui';
import type { Investigation, InvestigationEvidence } from '../api';

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
  const status = statusQuery.data;

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
    if (question.length < 8) {
      return;
    }
    const created = await create.mutateAsync({
      question,
      fileId: fileId || undefined,
      symbolId: symbolId || undefined,
    });
    open(created.id);
  }

  return (
    <PageFrame>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Ask</h1>
          <p className={`mt-2 ${muted}`}>
            Answers come from indexed code, history, and architecture. A local model can explain them; it
            cannot invent the evidence.
          </p>
        </div>

        <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-700">
          {status?.available
            ? 'A local model is connected and may write the explanation. Citations still come from the index.'
            : 'No local model is connected. You still get the indexed evidence, without a generated explanation.'}
        </section>

        <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
          <div className="space-y-4">
            {canAsk ? (
              <section className={card}>
                <h2 className="text-sm font-semibold text-zinc-900">New question</h2>
                <form className="mt-3 space-y-3" onSubmit={(event) => void submit(event)}>
                  <textarea
                    className={`${fieldClass()} min-h-28`}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Who introduced Stripe payments? What is this repository?"
                    aria-label="Question"
                  />
                  <button className={primaryButton} type="submit" disabled={create.isPending || draft.trim().length < 8}>
                    {create.isPending ? 'Asking…' : 'Ask'}
                  </button>
                </form>
                {create.isError ? (
                  <p className="mt-3 text-sm text-red-600">{errorMessage(create.error, 'Question could not be started.')}</p>
                ) : null}
              </section>
            ) : (
              <section className={card}>
                <p className={muted}>You can read answers here, but asking a new question needs a higher role.</p>
              </section>
            )}
            <section className={card}>
              <h2 className="text-sm font-semibold text-zinc-900">Earlier questions</h2>
              {listQuery.isLoading ? (
                <p className={`mt-3 ${muted}`}>Loading…</p>
              ) : (listQuery.data?.items.length ?? 0) === 0 ? (
                <p className={`mt-3 ${muted}`}>None yet</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {(listQuery.data?.items ?? []).map((item) => (
                    <li key={item.id}>
                      <button
                        className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${
                          selectedId === item.id
                            ? 'border-indigo-200 bg-indigo-50 text-indigo-800'
                            : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'
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
          </div>

          {!selectedId ? (
            <section className={card}>
              <h2 className="text-sm font-semibold text-zinc-900">Cited answer</h2>
              <p className={`mt-3 ${muted}`}>
                Ask about a file, symbol, risk, or change. The answer will list the evidence it used.
              </p>
            </section>
          ) : currentQuery.isLoading ? (
            <section className={card}>
              <p className={muted}>Gathering indexed evidence…</p>
            </section>
          ) : currentQuery.isError || !current ? (
            <section className={card}>
              <p className="text-red-600">{errorMessage(currentQuery.error, 'This question could not be loaded.')}</p>
            </section>
          ) : (
            <AnswerCard workspaceId={workspaceId} repositoryId={repositoryId} investigation={current} />
          )}
        </div>
      </div>
    </PageFrame>
  );
}

function AnswerCard({
  workspaceId,
  repositoryId,
  investigation,
}: {
  workspaceId: string;
  repositoryId: string;
  investigation: Investigation;
}) {
  const assistant = [...(investigation.messages ?? [])].reverse().find((message) => message.role === 'assistant');
  return (
    <div className="space-y-4">
      <section className={card}>
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Question</p>
        <h2 className="mt-1 text-lg font-semibold text-zinc-950">{investigation.question}</h2>
        <p className={`mt-2 ${muted}`}>
          {formatStatus(investigation.status)}
          {investigation.confidenceLabel ? ` · ${formatConfidenceLabel(investigation.confidenceLabel)}` : ''}
          {investigation.usedModel ? ' · local model explained this' : ' · indexed evidence only'}
          {` · ${formatWhen(investigation.updatedAt)}`}
        </p>
        {investigation.status === 'QUEUED' || investigation.status === 'RUNNING' ? (
          <p className={`mt-4 ${muted}`}>Gathering indexed evidence…</p>
        ) : investigation.status === 'FAILED' ? (
          <p className="mt-4 text-red-600">{investigation.error || 'This question failed.'}</p>
        ) : assistant ? (
          <pre className="mt-4 whitespace-pre-wrap font-sans text-sm leading-6 text-zinc-800">{assistant.content}</pre>
        ) : (
          <p className={`mt-4 ${muted}`}>No answer yet.</p>
        )}
      </section>

      <section className={card}>
        <h3 className="text-sm font-semibold text-zinc-900">Citations</h3>
        {(investigation.evidence ?? []).length === 0 ? (
          <p className={`mt-3 ${muted}`}>No citations yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {(investigation.evidence ?? []).map((item) => (
              <CitationItem
                key={item.id}
                item={item}
                workspaceId={workspaceId}
                repositoryId={repositoryId}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function CitationItem({
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
  return (
    <li className="rounded-xl border border-zinc-200 px-3 py-2 text-sm">
      <p className="font-medium text-zinc-900">{item.citation}</p>
      <p className={`mt-1 ${muted}`}>{item.excerpt}</p>
      {to ? (
        <div className="mt-2 flex flex-wrap gap-3 text-sm font-medium">
          <Link className="text-indigo-600 hover:text-indigo-500" to={to}>
            Open evidence
          </Link>
          {item.fileId ? (
            <Link
              className="text-indigo-600 hover:text-indigo-500"
              to={repositoryImpactPath(workspaceId, repositoryId, {
                file: item.fileId,
                symbol: item.symbolId ?? undefined,
              })}
            >
              Check impact
            </Link>
          ) : null}
          {item.fileId ? (
            <Link
              className="text-indigo-600 hover:text-indigo-500"
              to={repositoryEvolutionPath(workspaceId, repositoryId, {
                file: item.fileId,
                symbol: item.symbolId ?? undefined,
              })}
            >
              Evolution
            </Link>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
