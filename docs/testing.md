# Testing and evaluation

## Commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
./scripts/security-check.sh
```

CI (`.github/workflows/ci.yml`) runs the same plus a critical-level `pnpm audit`.

## What the suite covers

| Layer | Where |
|---|---|
| Shared algorithms | `packages/shared/src/*.test.ts` (graph cap, impact, evidence, env, redact) |
| Parser fixtures | `apps/worker/src/ingestion/typescript-parser.spec.ts` (TS/JS, Python, generic, malformed, oversized) |
| Git CLI | `apps/worker/src/ingestion/git-cli.provider.spec.ts` |
| Ingest / GitHub / Ask workers | `apps/worker/src/**/*.spec.ts` |
| API services, quotas, errors | `apps/api/src/**/*.spec.ts` |
| Web screens | `apps/web/src/**/*.test.tsx` |
| SDK / CLI | `packages/sdk`, `packages/cli` |

These are unit and service tests. There is no Playwright E2E job and no published 50–200 question Ask benchmark yet. Do not claim coverage percentages.

## Load and large graphs

```bash
k6 run tests/load/api.js
```

k6 is not an npm dependency and is not required in CI. The script hits liveness and metrics. Graph walks are unit-tested against a 2_000-edge star and must stop at `GRAPH_WALK_CAP`.

## Security tests that exist

- Webhook HMAC and OAuth state helpers
- RBAC / archived workspace / object access in API services
- Token redaction
- Quota and request-id helpers

When you add a route, add a service test that another workspace cannot read it.

## Ask evaluation (later)

Keep expected evidence references (commit, path, symbol), not only natural-language match. Unsupported-claim rate matters more than fluency. A public fixture repo belongs in the v1 release step, not here.
