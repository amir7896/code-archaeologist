# Security model

This is the product security model. Threat-to-control mapping is in [security-audit.md](security-audit.md). How to report a vulnerability is in [SECURITY.md](../SECURITY.md).

## Identity and access

- Email/password with Argon2id.
- Short-lived JWT access tokens and rotating refresh sessions with reuse detection.
- Workspace roles: Owner, Admin, Analyst, Viewer. Every repository query is scoped to membership.
- Login/register 5/min, refresh 10/min, global 60/min.
- Optional GitHub OAuth is instance-configured. A personal access token in Settings always works for workspace integration (that is not identity login).

## Secrets

- Repository and GitHub tokens are encrypted with `CREDENTIALS_ENCRYPTION_KEY`. The key is never stored in PostgreSQL.
- Tokens are written to `~/.config/code-archaeologist/config.json` (`0600`) for the CLI. Project `.code-archaeologist.json` has IDs only.
- Logs and API errors run through redaction. Request bodies are not logged.
- Webhook HMAC secrets are encrypted the same way.

## Untrusted repositories

- Isolated bare mirrors under `REPOSITORY_WORK_DIR`.
- `spawn('git')` only. No shell interpolation.
- Clone size cap (`GIT_CLONE_MAX_MB`).
- Parsers do not execute repository code.
- Graph and impact walks stop at 400 nodes.
- Daily workspace quotas on sync and Ask.

## AI

- Ollama is local and optional. Hosted providers are not enabled.
- Prompt-injection delimiters on question and evidence.
- Provider disclosure is required in the UI before a hosted model could be turned on later.

## Privacy

The product does not send telemetry. See [privacy](privacy.md).
