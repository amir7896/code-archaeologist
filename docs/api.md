# REST API

Base path: `/api/v1`. Interactive docs: [Swagger UI](http://localhost:3000/api/docs) and [OpenAPI JSON](http://localhost:3000/api/docs/json).

Long work (ingest, Ask) returns a row immediately. The worker finishes it. Poll status or the investigation resource.

## Conventions

- JSON bodies. Unknown fields are rejected (`VALIDATION_ERROR`).
- Errors: `{ code, message, requestId? }`. Validation adds `details`.
- `x-request-id` is echoed on every response.
- Collections use `page` / `limit` and a `pagination` object.
- Bearer access token on every workspace or repository route except auth, health, metrics, and GitHub webhooks.
- Object-level workspace membership is checked on every repository resource.

## Auth

| Method | Path | Notes |
|---|---|---|
| POST | `/auth/register` | Creates a personal workspace. 5/min |
| POST | `/auth/login` | 5/min |
| POST | `/auth/refresh` | Rotates the refresh session. 10/min |
| POST | `/auth/logout` | Bearer required |
| GET | `/me` | Current user |

## Workspaces

| Method | Path | Notes |
|---|---|---|
| GET/POST | `/workspaces` | List or create |
| GET/PATCH/DELETE | `/workspaces/:id` | Owner archives or deletes |
| GET/POST | `/workspaces/:id/members` | Invite is Admin+. Invitee must already have an account |
| PATCH/DELETE | `/workspaces/:id/members/:userId` | Owner role cannot be changed or removed |
| GET | `/workspaces/:id/audit-logs` | Admin+ |

## Repositories

| Method | Path | Notes |
|---|---|---|
| GET/POST | `/workspaces/:workspaceId/repositories` | Add is Admin+. HTTPS Git only |
| GET/PATCH/DELETE | `/workspaces/:workspaceId/repositories/:repositoryId` | Delete is Admin+ |
| GET | `.../status` | Ingestion progress and latest run |
| POST | `.../sync` | Analyst+. Daily workspace quota. Always a **Full** ingest |

## History, source, graph, insights

| Method | Path | Notes |
|---|---|---|
| GET | `.../branches` | Indexed branches |
| GET | `.../commits` | Optional `branch` |
| GET | `.../commits/:sha` | Changed files and linked symbols |
| GET | `.../files/history` | Requires `path` |
| GET | `.../code/tree` | One folder. Optional `prefix`, `q` |
| GET | `.../code/files` | Indexed files |
| GET | `.../code/files/:fileId` | Metadata |
| GET | `.../code/files/:fileId/preview` | Source preview |
| GET | `.../code/symbols` | Optional `q`, `kind`, `fileId` |
| GET | `.../code/symbols/:symbolId` | Relations |
| GET | `.../code/symbols/:symbolId/history` | Scored commit history |
| GET | `.../graph` | Architecture map. `group` = `auto`, `1`, `2`, `3` |
| GET | `.../graph/dependencies` | Requires `fileId`. `depth` 1–6 |
| GET | `.../graph/dependents` | Requires `fileId`. `depth` 1–6 |
| GET | `.../graph/cycles` | File and folder cycles |
| GET | `.../dna` | Requires `fileId`, `symbolId`, or `module` |
| GET | `.../insights/hotspots` | High churn and complexity |
| GET | `.../insights/risks` | Optional `level` |
| GET | `.../insights/health` | Risk summary |
| GET | `.../insights/evolution` | Timeline. Requires `fileId` or `symbolId` |
| GET | `.../impact` | Deterministic blast radius. Requires `fileId` or `symbolId` |
| GET | `.../evidence` | Scored historical links |
| GET | `.../evidence/resolve` | Optional `revision` |

## Investigation

| Method | Path | Notes |
|---|---|---|
| GET | `.../ai/status` | Whether Ollama is reachable |
| GET/POST | `.../investigations` | Ask is Analyst+. Daily quota |
| GET | `.../investigations/:id` | Answer, messages, citations |
| GET | `.../investigations/:id/messages` | Message list |
| GET | `.../investigations/:id/evidence` | Citations |

There is no report REST route. The CLI `report` command composes status, health, and hotspots.

## GitHub

| Method | Path | Notes |
|---|---|---|
| GET | `/workspaces/:workspaceId/integrations/github` | Connection status |
| GET | `.../integrations/github/authorize` | OAuth start when configured |
| POST | `.../integrations/github` | PAT connect |
| POST | `.../integrations/github/oauth` | OAuth finish |
| POST | `.../integrations/github/sync` | Pull issues/PRs/reviews |
| DELETE | `.../integrations/github` | Disconnect |
| GET | `.../repositories/:repositoryId/threads` | Issues and pull requests |
| GET | `.../threads/:threadId` | One thread and links |
| POST | `/webhooks/github/:workspaceId` | HMAC + delivery-id replay protection |

## Health

| Method | Path | Auth |
|---|---|---|
| GET | `/health` | None |
| GET | `/health/ready` | None. 503 when Postgres or Redis is down |
| GET | `/metrics` | None. In-memory counts for this process |

## Rate limits

Global 60 requests/minute except `/health` and `/metrics`. Login and register 5/min. Refresh 10/min. Workspace daily caps: sync 40, Ask 80 (env-overridable).

Use the [typed SDK](cli.md#sdk) instead of hand-rolling clients when you can.
