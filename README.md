# Code Archaeologist

An open-source AI system that reconstructs not only what a codebase does, but why it evolved into its current architecture.

It turns a Git repository into an evidence-backed historical knowledge graph: Git history, AST symbols, dependency graph, Code DNA, impact analysis, and cited investigation. AI never silently changes repositories in v1.

This repository is at **CLI/SDK**: a typed client and `code-archaeologist` CLI talk to the self-hosted API for analyze, status, ask, impact, hotspots, and CI JSON reports. A local model is optional for Ask.

## Requirements

- Node.js 20+
- pnpm 10
- Docker and Docker Compose (for PostgreSQL and Redis)

Ollama is optional and not required yet. If you enable it later, plan for about 8 GB RAM for a 7B/8B model. 16 GB is more comfortable. This project is designed to run locally.

## Quick start

```bash
cp .env.example .env
pnpm install
pnpm docker:up
pnpm db:migrate:deploy
pnpm db:seed
pnpm dev
```

Then open:

- Web: http://localhost:5173
- API health: http://localhost:3000/api/v1/health
- API readiness: http://localhost:3000/api/v1/health/ready
- Swagger UI: http://localhost:3000/api/docs
- OpenAPI JSON: http://localhost:3000/api/docs/json

If host ports 5432 or 6379 are already taken, change `POSTGRES_PORT` and `REDIS_PORT` in `.env`. The app builds the database URL from `POSTGRES_HOST`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, and `POSTGRES_PORT`.

## Repository layout

```
apps/api          NestJS REST API (`/api/v1`)
apps/worker       NestJS worker (repository sync, Git history, and AST parse)
apps/web          React + TypeScript + Tailwind
packages/core     Prisma schema and domain constants
packages/shared   Env validation, queue names, API prefix
packages/parser   Language parser adapter contract
packages/git      Git provider interface
packages/ai       Ollama-first LLM provider interface
packages/sdk      Typed API client, pagination, webhook verify
packages/cli      `code-archaeologist` commands and CI exit codes
infra/docker      Containerfiles
docs/             Architecture, local development, and CLI
examples/         Example GitHub Action (demo repos later)
```

## Docker

PostgreSQL and Redis (local development):

```bash
pnpm docker:up
```

Full stack (API, worker, web as well):

```bash
docker compose --profile full up --build
```

Optional local Ollama:

```bash
docker compose --profile ai up -d ollama
```

## Principles

- Evidence before AI: deterministic facts are retrieved before language-model synthesis.
- Unsupported historical claims must be labeled unknown or uncertain.
- Local/self-hosted operation is first-class.
- Modular monolith plus workers first; extract services only when scale requires it.

## Documentation

- [Development setup](docs/development.md)
- [CLI and SDK](docs/cli.md)
- [Architecture](docs/architecture.md)
- [Installation / Docker](docs/installation.md)
- [Configuration](docs/configuration.md)
- [Security](SECURITY.md)
- [Contributing](CONTRIBUTING.md)

## License

MIT
