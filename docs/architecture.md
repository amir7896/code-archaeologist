# Architecture

Code Archaeologist is a **modular monolith plus workers**. Services are not extracted until scale requires it.

## Core flow

Git repository → ingestion → Git history + AST → normalized symbols → dependency graph → metrics/risk → evidence index → AI investigation → cited explanation.

## Runtime

| Process | Role |
|---|---|
| `apps/api` | NestJS REST API under `/api/v1`. Auth, orchestration, and policies. |
| `apps/worker` | Long-running BullMQ jobs. Retry, progress, and bounded concurrency. |
| `apps/web` | React dashboard, folder-tree explorer, filterable architecture map, and investigation UI. |
| PostgreSQL | System of record, graph edges, search, analytics. |
| Redis | Queue backend. |
| Ollama | Optional local inference for Ask explanations. Answers still require indexed citations. |

## Packages

Provider implementations stay behind interfaces so they can change independently:

- `@code-archaeologist/git` — clone, fetch, history, blame
- `@code-archaeologist/parser` — `parse` / `normalize` / `compare`
- `@code-archaeologist/ai` — `LlmProvider.chat` / `embed` / `health` (Ollama first)
- `@code-archaeologist/sdk` — typed `/api/v1` client, pagination, webhook verify
- `@code-archaeologist/cli` — `code-archaeologist` commands over the SDK

`@code-archaeologist/core` owns Prisma and domain constants. `@code-archaeologist/shared` owns environment validation, queue names, workspace roles, and the API prefix.

## NestJS modules

Wired today: `auth`, `users`, `workspaces`, `repositories` (history, source, graph, DNA, impact, evidence), `investigations`, `integrations` / `webhooks`, `audit`, `health`.

Queue names for `analysis-run`, `embedding`, `report-generation`, and similar stay reserved. Processors that do not exist yet are not implied by the name. Controllers stay thin. Business rules live in services and domain packages.

Provider guides: [parser](parser.md), [git](git-provider.md), [AI](ai-provider.md), [evidence](evidence.md).

## Data

PostgreSQL tables are listed in the project scope. Investigation adds `investigations`, `investigation_evidence`, and `investigation_messages`. Retrieval is structured (SQL, graph, and historical evidence). `pgvector` stays off until semantic document embeddings are enabled.

## Queues

`repository-sync`, `analysis-run`, `git-history`, `ast-parse`, `graph-build`, `metrics`, `risk`, `embedding`, `integration-sync`, `report-generation`, `cleanup`, `investigation`

## Principles

- Evidence before AI.
- AI never silently changes repositories in v1.
- Unsupported historical claims are labeled unknown or uncertain.
- Local/self-hosted operation is first-class.
- Request ids, redacted logs, quotas, clone size caps, and audit retention are operator concerns; see [operations](operations.md).
