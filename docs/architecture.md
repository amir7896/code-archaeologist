# Architecture

Code Archaeologist is a **modular monolith plus workers**. Services are not extracted until scale requires it.

## Core flow

Git repository → ingestion → Git history + AST → normalized symbols → dependency graph → metrics/risk → evidence index → AI investigation → cited explanation.

## Runtime

| Process | Role |
|---|---|
| `apps/api` | NestJS REST API under `/api/v1`. Auth, orchestration, and policies. |
| `apps/worker` | Long-running BullMQ jobs. Retry, progress, and bounded concurrency. |
| `apps/web` | React dashboard, explorer, graph, and investigation UI. |
| PostgreSQL | System of record, graph edges, search, analytics. |
| Redis | Queue backend. |
| Ollama | Optional local inference for Ask explanations. Answers still require indexed citations. |

## Packages

Provider implementations stay behind interfaces so they can change independently:

- `@code-archaeologist/git` — clone, fetch, history, blame
- `@code-archaeologist/parser` — `parse` / `normalize` / `compare`
- `@code-archaeologist/ai` — `LlmProvider.chat` / `embed` / `health` (Ollama first)

`@code-archaeologist/core` owns Prisma and domain constants. `@code-archaeologist/shared` owns environment validation, queue names, workspace roles, and the API prefix.

## NestJS modules (planned)

auth • users • workspaces • repositories • git • analysis • parsers • files • symbols • graph • metrics • risks • insights • investigations • ai • embeddings • integrations • webhooks • reports • notifications • audit

Investigation wires `auth`, `users`, `workspaces`, `repositories`, history, source/symbols, graph, Code DNA/risk insights, deterministic impact, evidence, investigations, `audit`, the `repository-sync` worker, and the `investigation` worker. Remaining modules stay planned. Controllers stay thin. Business rules live in services and domain packages.

## Data

PostgreSQL tables are listed in the project scope. Investigation adds `investigations`, `investigation_evidence`, and `investigation_messages`. Retrieval is structured (SQL, graph, and historical evidence). `pgvector` stays off until semantic document embeddings are enabled.

## Queues

`repository-sync`, `analysis-run`, `git-history`, `ast-parse`, `graph-build`, `metrics`, `risk`, `embedding`, `integration-sync`, `report-generation`, `cleanup`, `investigation`

## Principles

- Evidence before AI.
- AI never silently changes repositories in v1.
- Unsupported historical claims are labeled unknown or uncertain.
- Local/self-hosted operation is first-class.
