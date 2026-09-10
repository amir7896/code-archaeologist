# Roadmap

Public status against the v1.0 scope checklist (September 2026).

## Done (PDF final checklist 1–14)

1. Monorepo and infrastructure.
2. Auth and workspaces.
3. Repository and Git ingestion.
4. TS/JS AST and symbols.
5. Knowledge graph.
6. Code DNA and risk.
7. Deterministic impact.
8. Historical evidence.
9. Ollama / RAG investigation.
10. React explorer and architecture graph.
11. GitHub.
12. CLI and SDK.
13. Harden security / testing / operations.
14. Document everything (this tree).
15. v1.0.0 release candidate: version bump, `examples/demo-ts`, [release notes](release-notes.md), [announcement draft](announcement.md), tag workflow, issue templates.

Publish the GitHub Release by tagging `v1.0.0` on `main` after CI is green. Screenshots belong in the GitHub Release attachments when you capture them from a running instance — this repo does not ship invented product GIFs.

## Honest gaps inside “done”

These exist in the PDF or UI appendix and are **not** shipped as claimed features:

- Incremental ingest (every run is Full)
- Operations dashboard (nav disabled)
- Hosted AI
- GitLab / Bitbucket
- Configurable architecture rule engine
- `pgvector` embeddings
- Report REST resource
- Published Ask benchmark corpus
- Browser E2E in CI

## After v1

From the scope, still later: more language adapters, GitLab/Bitbucket, IDE extension, runtime evidence, custom architecture rules, ADR generation, cross-repo intelligence, human-approved change proposals, plugin marketplace, optional hosted SaaS on the same core.

## Labels

Use `good first issue` and `help wanted` on GitHub when an issue is genuinely scoped for a new contributor. Do not use those labels on “invent incremental analysis.”
