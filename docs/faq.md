# FAQ and limitations

Honest answers for v1. If a PDF mock shows something that is not here, the code wins.

## What works

- Self-hosted Nest API, worker, and React dashboard.
- HTTPS Git ingest (public or token), Git history, TS/JS/Python and generic-language symbols, architecture graph, Code DNA, deterministic impact, scored historical evidence, cited Ask.
- GitHub issues/PRs/reviews and webhooks on the same integration contract.
- CLI and typed SDK against the self-hosted API.
- Rate limits, workspace quotas, request ids, backups, and operator docs.

## What does not work yet (and is not faked)

| Topic | Reality |
|---|---|
| Incremental analysis | Every ingest is **Full**. Settings copy must not claim incremental sync. |
| GitLab / Bitbucket | Same contract later. Connect UI is GitHub. |
| Hosted AI | Disabled. Ollama only. |
| `pgvector` / embeddings | Off. Ask is structured retrieval. |
| Report REST API | None. CLI `report` composes existing endpoints. |
| Operations screen | Nav item is disabled. Use [operations](operations.md) and `/health`, `/metrics`. |
| Configurable architecture rules | Graph cycles and coupling exist. A user-authored rule engine does not. |
| Local folder upload | CLI can read `origin` and send the HTTPS URL. The worker clones that URL. |
| Autonomous code edits | Explicitly out of scope. |
| Marketplace / plugins | Deferred until a contract exists. |
| Kubernetes | Compose is the v1 path. |
| 50–200 question AI benchmark corpus | Not published. Six golden questions live in `examples/demo-ts`. |
| E2E browser suite | Unit and service tests exist. Playwright E2E is not in CI. |

## Why does Ask work without Ollama?

Indexed evidence is enough for a cited answer. The model only writes prose over those facts.

## Why is “Continue with GitHub” on login disabled?

That button is identity login. Workspace GitHub connect lives in Settings → Integrations and is implemented.

## Can I point the CLI at a folder on disk?

Not as a substitute for clone. Point it at a self-hosted API and an HTTPS remote.

## Is source sent anywhere?

Only to your API, worker, Postgres, Redis, and optional local Ollama. See [privacy](privacy.md).
