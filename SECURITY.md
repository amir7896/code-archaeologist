# Security Policy

## Supported versions

This project is pre-release (`0.1.x`). Security reports are welcome for the current `main` branch.

## Reporting a vulnerability

Do not open a public issue for security problems.

Use GitHub private vulnerability reporting when the repository is on GitHub. If that is unavailable, email the maintainers privately.

Please include:

- A description of the issue
- Steps to reproduce
- Affected version or commit
- Any logs with secrets redacted

## Product rules that matter for security

- Repository credentials are stored only through an encrypted secret abstraction. The encryption key stays in environment configuration, not in the database.
- Tokens, passwords, and secrets must never be logged. API errors and request logs run through redaction.
- Analysis must not execute repository code. Parsing and static inspection are the default. Git clones are size-capped.
- Hosted AI providers must be disclosed when source leaves the machine. Local Ollama is the default. Prompt evidence is delimited as untrusted data.
- Workspace isolation and RBAC apply to every repository query. Daily sync and Ask quotas are per workspace.
- Webhooks require HMAC verification. Health and metrics probes skip the request throttle.

See [docs/security.md](docs/security.md), [docs/security-audit.md](docs/security-audit.md), [docs/privacy.md](docs/privacy.md), and [docs/operations.md](docs/operations.md).
