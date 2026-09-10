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

The workspace shape is stable. Auth, ingest, graph, Ask, GitHub, CLI/SDK, and hardening filled modules without splitting into microservices. Ollama remains optional. `pgvector` stays off.
