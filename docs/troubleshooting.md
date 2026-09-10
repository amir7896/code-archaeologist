# Troubleshooting

## `pnpm dev` cannot start

- Postgres or Redis port already taken: set `POSTGRES_PORT` / `REDIS_PORT` in `.env`, then `pnpm docker:up`.
- Invalid env: the API and worker refuse to boot. Compare `.env` to `.env.example`. There is no `DATABASE_URL` in `.env`; it is built from `POSTGRES_*`.
- Do not run `pnpm install` while `pnpm dev` is already running.

## Readiness is degraded

`GET /api/v1/health/ready` checks Postgres and Redis. `pnpm docker:up` then `pnpm db:migrate:deploy`.

## Repository sync fails

- URL must be HTTPS. Embedded `user:token@` is rejected.
- Private repos need a PAT in repository settings or a GitHub workspace connection.
- `Repository exceeds GIT_CLONE_MAX_MB`: raise the env value or sync a smaller remote. The oversized mirror is deleted.
- Worker not running: start `pnpm dev` or the worker container. Queued runs dispatch again after a worker restart.

## Ask returns evidence only

Ollama is optional. `GET .../ai/status` shows `available: false` when the model is down. That is expected. Pull `OLLAMA_MODEL` after `docker compose --profile ai up -d ollama`.

## Ask or sync returns 429

Workspace daily caps (`WORKSPACE_SYNC_DAILY_LIMIT`, `WORKSPACE_ASK_DAILY_LIMIT`) or the global/auth throttle. Wait or raise the env on a private instance.

## CLI `pnpm exec code-archaeologist` is not found

Use `pnpm ca` or `pnpm code-archaeologist` from the repo root after the CLI package is built. The binary is not hoisted.

## CLI exit 5 on impact

The path is not an indexed file. Use a path from Explorer (for example `app/services/order_service.py`), not a placeholder.

## Tokens in logs

They should already be `[redacted]`. If you see a raw token, treat it as a bug and rotate the credential. See [security](security.md).

## Restore after a crash

Follow [operations](operations.md). Restarting the worker is safe. A Postgres dump without `CREDENTIALS_ENCRYPTION_KEY` cannot decrypt repository tokens.
