# ADR 0001: Monorepo and modular monolith

## Status

Accepted

## Context

The product needs a NestJS API, a background worker, a React app, Git/parser/AI adapters, a CLI, and an SDK. The scope forbids a microservice architecture in v1.

## Decision

- One pnpm workspace monorepo matching `apps/api`, `apps/worker`, `apps/web`, `packages/*`, `infra/docker`, `docs`, and `examples`.
- Modular monolith plus workers. Queue names are shared now; processors are added when those phases start.
- Git, parser, and LLM access go through interfaces in dedicated packages.
- PostgreSQL is the system of record. Prisma is the migration framework.
- Ollama is the first LLM provider and stays optional until the investigation phase.
- MIT license.

## Consequences

Phase 0 can boot API, worker, and web against Dockerized Postgres and Redis without implementing auth or analysis. Later phases fill NestJS modules and Prisma tables without changing the repository shape.
