# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

### Added

- Hardening: refresh throttle, workspace daily sync/Ask quotas, graph walk cap, Git clone size limit, audit log retention, request ids, in-memory `/metrics`, secret redaction in API errors, Postgres backup/restore scripts, k6 health load script, and a critical-level `pnpm audit` in CI.
- CLI and typed SDK: `code-archaeologist` commands (init, analyze, status, ask, impact, hotspots, report, doctor), JSON/exit codes for CI, secret-safe config, and an example GitHub Action. The SDK covers auth, pagination, repository/investigation clients, and webhook signature verification.
- GitHub integration: workspace connection (token or optional OAuth), issue/PR/review ingest, verified webhooks with replay protection, and scored links from threads to commits, files, and symbols.
- React explorer/graph: folder tree in Code, source line highlighting, and Architecture filters (grouping, connected/cycles, depth) for large repositories.
- Ollama/RAG investigation: cited Ask answers from indexed code, history, and architecture. A local model is optional.
- Ask retrieval prefers subject tokens over filler (`introduced`), includes commit authors, and answers repository-overview questions from indexed repo facts.
- Historical evidence: commit-to-symbol links with confidence, a historical resolver, and an Evolution screen.
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
