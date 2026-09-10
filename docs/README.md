# Documentation

Guides for running and extending Code Archaeologist. They describe what the product does today, not the full PDF vision.

## Start here

| Guide | Audience |
|---|---|
| [Quick start](../README.md#quick-start) | First checkout |
| [Development setup](development.md) | Contributors |
| [Installation / Docker](installation.md) | Self-hosting |
| [Configuration](configuration.md) | Operators |
| [CLI and SDK](cli.md) | CI and scripts |
| [REST / OpenAPI](api.md) | API clients |

## Product internals

| Guide | Topic |
|---|---|
| [Architecture](architecture.md) | Processes, packages, queues |
| [Parser adapters](parser.md) | `parse` / `normalize` / `compare` |
| [Git provider](git-provider.md) | Clone, history, isolation |
| [AI provider](ai-provider.md) | Ollama-first `LlmProvider` |
| [Evidence and Ask](evidence.md) | Retrieval, citations, confidence |
| [Security model](security.md) | Auth, secrets, threat model |
| [Operations](operations.md) | Backup, restore, metrics |
| [Security audit](security-audit.md) | Controls mapped to threats |

## Project

| Guide | Topic |
|---|---|
| [FAQ and limitations](faq.md) | Honest v1 cutoff |
| [Troubleshooting](troubleshooting.md) | Common failures |
| [Testing](testing.md) | Unit, load, evaluation |
| [Roadmap](roadmap.md) | Done, later, never-in-v1 |
| [Release notes](release-notes.md) | v1.0.0 |
| [Announcement draft](announcement.md) | Community post when tagged |
| [Screenshots](screenshots.md) | Capture list for the GitHub Release |
| [Privacy](privacy.md) | No product telemetry |
| [Contributing](../CONTRIBUTING.md) | PR standards |
| [ADR 0001](adr/0001-monorepo-and-modular-monolith.md) | Monorepo decision |

OpenAPI live docs: http://localhost:3000/api/docs after `pnpm dev`.
