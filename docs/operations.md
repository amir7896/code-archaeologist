# Operations

Self-hosted runbook for backups, recovery, and observability. The dashboard Operations item stays disabled; this document is for operators.

## Health

| Probe | URL |
|---|---|
| Liveness | `GET /api/v1/health` |
| Readiness | `GET /api/v1/health/ready` |
| Process counters | `GET /api/v1/metrics` |

`/metrics` is an in-memory JSON count of HTTP statuses for the current API process. It does not include tokens, request bodies, or repository paths. Restarting the API resets the counters.

Every API response includes `x-request-id`. Error JSON also includes `requestId`.

## Volumes

Compose persists:

- `postgres_data` — system of record
- `redis_data` — BullMQ and Redis AOF
- `REPOSITORY_WORK_DIR` (default `<repo>/.data/repositories`) — isolated Git mirrors

Mirrors can be deleted and rebuilt by syncing the repository. Do not treat them as the source of truth.

## Backups

Dump Postgres from the Compose service:

```bash
./scripts/backup-postgres.sh
```

Files land under `.data/backups/` by default (gitignored).

Also copy, offline:

- `.env` or a secrets store that holds `JWT_*` and `CREDENTIALS_ENCRYPTION_KEY`
- Redis only if you need in-flight jobs. Jobs are re-dispatched from `QUEUED` database rows after a worker restart.

## Restore

1. Stop the API and worker (`Ctrl+C` on `pnpm dev`, or `docker compose --profile full stop api worker`).
2. Restore the dump:

```bash
./scripts/restore-postgres.sh .data/backups/postgres-YYYYMMDDTHHMMSSZ.sql
```

3. Apply migrations if the dump is older than the running schema: `pnpm db:migrate:deploy`.
4. Start the API and worker again.

A restore without `CREDENTIALS_ENCRYPTION_KEY` leaves repository tokens unreadable. Rotate those credentials in Settings after a key loss.

## Worker failure and queue drain

The worker polls `QUEUED` analysis runs, investigations, and GitHub webhook events and enqueues them with bounded retries.

- Restarting the worker is safe. In-flight jobs retry. Completed work is already in Postgres.
- To drain: wait until `GET .../repositories/:id/status` shows no `QUEUED` or `RUNNING` ingestion, and Ask history has no `QUEUED` rows.
- Failed clones that exceed `GIT_CLONE_MAX_MB` delete the oversized mirror and mark the run failed.

Audit logs older than `AUDIT_RETENTION_DAYS` are deleted by the worker about once a minute.

## Load and large repositories

k6 is optional and is not an npm dependency:

```bash
k6 run tests/load/api.js
```

Set `API_URL` if the API is not on `http://127.0.0.1:3000`. The script hits liveness and metrics only.

Architecture walks stop at 400 neighbors. Impact walks use the same cap. Parser input is skipped above `MAX_PARSE_BYTES` and symbol lists are capped per file.

## Dependency scanning

```bash
./scripts/security-check.sh
```

CI runs the same critical-level `pnpm audit`. Weekly Dependabot PRs cover npm updates.
