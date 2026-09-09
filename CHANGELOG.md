# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

### Added

- Phase 7 deterministic impact: blast-radius walk from the architecture graph, risk overlays, and an Impact screen.
- Phase 6 Code DNA: symbol versions, metrics snapshots, explainable risk scores, hotspots, and a DNA profile screen.
- Phase 5 graph engine: derived `graph_edges`, dependency walk, cycle detection, and an interactive architecture map.
- Phase 2 repository ingestion: HTTPS Git repository CRUD, encrypted credentials, clone/fetch worker, analysis runs/tasks, and status UI.
- Entity primary keys and foreign keys use PostgreSQL UUIDs.
- Phase 1 identity: email/password auth with Argon2id, refresh-session revocation, workspaces, RBAC, audit log, and a basic dashboard.
- Phase 0 foundation: pnpm monorepo, NestJS API, NestJS worker, React web app.
- Docker Compose for PostgreSQL and Redis, with optional full-stack and Ollama profiles.
- Zod environment validation, Prisma migration framework, and `/api/v1/health` endpoints.
- Provider interfaces for Git, parser, and Ollama-first LLM adapters.
- Open-source governance files: license, contributing, code of conduct, security, CI.
