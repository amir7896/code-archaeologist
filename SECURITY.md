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

- Repository credentials are stored only through an encrypted secret abstraction (Phase 2).
- Tokens, passwords, and secrets must never be logged.
- Analysis must not execute repository code. Parsing and static inspection are the default.
- Hosted AI providers must be disclosed when source leaves the machine. Local Ollama is the default.
- Workspace isolation and RBAC are required before exposing repositories (Phase 1).
