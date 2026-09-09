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
| Ollama | Optional local inference. Not used in Phase 1. |

## Packages

Provider implementations stay behind interfaces so they can change independently:

- `@code-archaeologist/git` — clone, fetch, history, blame
- `@code-archaeologist/parser` — `parse` / `normalize` / `compare`
- `@code-archaeologist/ai` — `LlmProvider.chat` / `embed` / `health` (Ollama first)

`@code-archaeologist/core` owns Prisma and domain constants. `@code-archaeologist/shared` owns environment validation, queue names, workspace roles, and the API prefix.

## NestJS modules (planned)

auth • users • workspaces • repositories • git • analysis • parsers • files • symbols • graph • metrics • risks • insights • investigations • ai • embeddings • integrations • webhooks • reports • notifications • audit

Phase 1 wires `auth`, `users`, `workspaces`, and `audit`. Remaining modules stay planned. Controllers stay thin. Business rules live in services and domain packages.

## Data

PostgreSQL tables are listed in the project scope. Phase 1 ships identity tables: `users`, `workspaces`, `workspace_members`, `sessions`, and `audit_logs`. Repository and analysis tables arrive later. `pgvector` is enabled only when semantic embeddings are on.

## Queues

`repository-sync`, `analysis-run`, `git-history`, `ast-parse`, `graph-build`, `metrics`, `risk`, `embedding`, `integration-sync`, `report-generation`, `cleanup`

## Principles

- Evidence before AI.
- AI never silently changes repositories in v1.
- Unsupported historical claims are labeled unknown or uncertain.
- Local/self-hosted operation is first-class.
