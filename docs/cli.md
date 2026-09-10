# CLI and SDK

The CLI talks to a self-hosted API. It does not clone or analyze a tree by itself. Analysis stays on the worker, and every ingest is still Full.

```bash
pnpm --filter @code-archaeologist/shared --filter @code-archaeologist/sdk --filter @code-archaeologist/cli build
pnpm ca --help
```

`pnpm ca` and `pnpm code-archaeologist` run the built CLI from the repo root. The binary is not hoisted, so `pnpm exec code-archaeologist` is not used here.

## Commands

| Command | What it does |
|---|---|
| `init` | Sign in (or `--register`), select or create a workspace, connect a Git HTTPS URL |
| `analyze` | `POST .../sync`, then wait unless `--no-wait` |
| `status` | Latest repository and analysis-run status |
| `ask "…"` | Create an investigation and wait for the cited answer |
| `impact path/to/file.ts` | Deterministic blast radius (`--depth` 1–6) |
| `hotspots` | High churn and complexity files |
| `report --format json` | Compose status + health + hotspots. There is no report REST route |
| `doctor` | API liveness, readiness, auth, and config |

`init` in a Git checkout reads `origin` and converts `git@host:org/repo.git` to HTTPS. The API still accepts only HTTPS remotes.

## Output and exit codes

`--json` prints `{ ok, command, data | error }` on stdout. Progress stays on stderr so CI can parse stdout.

| Code | Meaning |
|---|---|
| 0 | Success |
| 1 | Request or runtime error |
| 2 | Usage |
| 3 | Analysis failed, or API readiness is degraded |
| 4 | Authentication |
| 5 | Workspace, repository, or file not found |

## Configuration

Precedence: flags → environment → `.code-archaeologist.json` → `~/.config/code-archaeologist/config.json`.

| Variable | Purpose |
|---|---|
| `CA_API_URL` | Self-hosted API, e.g. `http://127.0.0.1:3000` |
| `CA_ACCESS_TOKEN` / `CA_REFRESH_TOKEN` | Session tokens |
| `CA_WORKSPACE_ID` / `CA_REPOSITORY_ID` | Default scope |
| `CA_EMAIL` / `CA_PASSWORD` | CI login for `init` (prefer env over `--password`) |
| `CA_CONFIG` | Override user config path |

Tokens are written only to the user config (`0600`). The project file stores `apiUrl`, `workspaceId`, and `repositoryId` only.

## SDK

```ts
import { createClient, SDK_COMPATIBILITY } from '@code-archaeologist/sdk';
import { verifyGithubWebhookSignature } from '@code-archaeologist/shared';

const client = createClient({
  baseUrl: 'http://127.0.0.1:3000',
  accessToken: process.env.CA_ACCESS_TOKEN,
  refreshToken: process.env.CA_REFRESH_TOKEN,
  onTokens: (tokens) => {
    // persist rotated refresh tokens
  },
});

await client.auth.login({ email, password });
for await (const workspace of client.workspaces.iterate()) {
  // paginated
}
```

The client speaks `/api/v1` only. Additive JSON fields are ignored. Breaking route or auth changes require a new major SDK. Webhook helpers re-export `verifyGithubWebhookSignature` from `@code-archaeologist/shared`.

See `examples/github-action/analyze.yml` for CI JSON + exit codes. REST routes: [api.md](api.md). Limits and failures: [faq.md](faq.md) and [troubleshooting.md](troubleshooting.md).