# Contributing

Thank you for contributing to Code Archaeologist.

## Development sequence

Follow the project scope. Do not start with the chatbot. The graph and evidence engine are the product; the AI layer is an interface over that foundation.

Current work is **hardening** (PDF checklist 13). Docs and the v1 release come next. The CLI talks to the self-hosted API; it does not invent a second analysis path. GitLab stays later on the same integration contract.

## Setup

1. Fork and clone the repository.
2. `cp .env.example .env`
3. `pnpm install`
4. `pnpm docker:up`
5. `pnpm db:migrate:deploy`
6. `pnpm dev`

## Checks

Run before opening a pull request:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
./scripts/security-check.sh
```

## Pull requests

- Keep changes focused on one phase or one concern.
- Keep NestJS controllers thin. Business rules live in services and domain packages.
- Git, parser, and AI providers stay behind interfaces in `packages/git`, `packages/parser`, and `packages/ai`.
- Do not add autonomous code modification.
- Do not log tokens, passwords, or repository credentials.
- Never execute repository code during analysis.

## License

By contributing, you agree that your contributions are licensed under the MIT License.
