# Privacy and telemetry

Code Archaeologist does not collect product analytics, crash reports, or usage pings. There is no phone-home endpoint.

## What stays on the instance

- Account emails and password hashes
- Git remotes, encrypted tokens, indexed source, commits, graphs, Ask questions
- Audit logs until `AUDIT_RETENTION_DAYS` (default 90)

A self-hosted operator sees that data in their own Postgres. The project maintainers do not.

## What leaves the machine

Nothing, unless the operator:

- Points the app at a remote Git host (clone/fetch)
- Connects GitHub (API + optional webhooks)
- Enables a future hosted LLM (not implemented; UI requires disclosure first)

Optional Ollama is local.

## CLI and SDK

Tokens live in the user config file. Do not commit `.env` or `.code-archaeologist.json`. JSON CLI output redacts bearer tokens.

## Reporting

Security issues: [SECURITY.md](../SECURITY.md). Do not attach unredacted logs.
