# Security audit

This note maps the v1 threat model to controls that are already in the product. It is a checklist, not a penetration-test report.

## Trust boundaries

| Boundary | Trust |
|---|---|
| Browser / CLI | Untrusted. Sessions, CORS, and rate limits apply. |
| API process | Trusted for the instance. Workspace RBAC still applies to every query. |
| Worker | Trusted for the instance. Git commands never go through a shell. |
| PostgreSQL / Redis | Trusted local or operator-controlled services. |
| Git remotes | Untrusted source. Clone size is capped. Repository code is never executed. |
| GitHub webhooks | Untrusted until HMAC and delivery-id checks pass. |
| Ollama | Optional local model. Repository text is untrusted prompt data. |

## Controls

| Threat | Control |
|---|---|
| Password stuffing | Argon2id hashes. Login/register 5/min. Refresh 10/min. Global 60/min. |
| Session theft / reuse | Short-lived access tokens. Rotating refresh sessions. Reuse detection. |
| Cross-workspace reads | Object-level workspace membership on every repository query. |
| Leaked Git tokens | Encrypted credential store. `CREDENTIALS_ENCRYPTION_KEY` stays out of the database. Logs redact tokens. |
| Command injection via Git URL | `spawn('git')` with argument arrays. Errors are sanitized. |
| Oversized clone | `GIT_CLONE_MAX_MB` after clone/fetch. The mirror is deleted when over the cap. |
| Graph / impact blow-up | `GRAPH_WALK_CAP` and `IMPACT_WALK_CAP` (400 nodes). |
| Prompt injection | System prompt treats repository text as data. Question and evidence are wrapped in `<<<QUESTION` / `<<<EVIDENCE` delimiters. |
| Webhook forgery / replay | HMAC verification and delivery-id uniqueness. |
| Quota exhaustion | Per-workspace daily sync and Ask limits. |
| Audit growth | Worker purge after `AUDIT_RETENTION_DAYS` (default 90). |
| Probe noise on health | `/health` and `/metrics` skip the request throttle. |

## Operator duties

- Replace JWT and credential encryption placeholders before any shared environment.
- Back up `CREDENTIALS_ENCRYPTION_KEY` with the database. A dump without the key cannot decrypt repository tokens.
- Keep Git mirrors on a volume you can delete (`REPOSITORY_WORK_DIR`).
- Run `scripts/security-check.sh` (or `pnpm audit --audit-level=critical`) before release.

See [operations](operations.md) for backup, restore, and worker recovery.
