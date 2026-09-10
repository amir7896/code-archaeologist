# v1.0.0

First production-quality self-hosted release of Code Archaeologist.

## What you get

- NestJS API, worker, and React dashboard
- HTTPS Git ingest (always **Full**), history, TS/JS/Python symbols, architecture graph, Code DNA, deterministic impact, cited Ask
- GitHub issues/PRs/webhooks
- CLI and typed SDK
- Rate limits, quotas, request ids, backups, and operator docs

## What this release does not claim

- Incremental analysis
- Hosted AI
- GitLab / Bitbucket
- Operations dashboard (use `/health`, `/metrics`, and [operations](operations.md))
- `pgvector` embeddings
- A 50–200 question Ask benchmark (six golden questions live in `examples/demo-ts`)

## Install

See the [quick start](../README.md#quick-start) and [installation](installation.md).

## Tag and GitHub release

After this branch is on `main` and CI is green:

```bash
git tag -a v1.0.0 -m "v1.0.0"
git push origin v1.0.0
```

The [release workflow](../.github/workflows/release.yml) publishes a GitHub Release from this file. Do not force-push the tag.
