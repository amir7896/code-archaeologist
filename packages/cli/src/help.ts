import { APP_NAME, APP_VERSION } from '@code-archaeologist/shared';
import { SDK_VERSION } from '@code-archaeologist/sdk';

export function helpText(): string {
  return `${APP_NAME} CLI ${APP_VERSION} (sdk ${SDK_VERSION})

Usage:
  code-archaeologist <command> [options]

Commands:
  init                 Sign in, pick or create a workspace, and connect a Git URL
  analyze              Queue a full analysis run (waits unless --no-wait)
  status               Show repository and latest-run status
  ask <question>       Ask a cited question about the indexed repository
  impact <path>        Deterministic blast radius for a file
  hotspots             High churn and complexity files
  report               Compose status, health, and hotspots (no extra API)
  doctor               Check API, readiness, auth, and local config

Global options:
  --api <url>          Self-hosted API (default http://127.0.0.1:3000)
  --workspace <id>     Workspace id
  --repository <id>    Repository id
  --json               Machine-readable JSON on stdout
  --format json|text   Output format (report defaults to json)
  --no-wait            Return after queueing analyze or ask
  -h, --help           Show this help
  -v, --version        Print versions

Exit codes:
  0  success
  1  request or runtime error
  2  usage
  3  analysis or readiness failed
  4  authentication
  5  not found

Environment:
  CA_API_URL  CA_ACCESS_TOKEN  CA_REFRESH_TOKEN
  CA_WORKSPACE_ID  CA_REPOSITORY_ID  CA_EMAIL  CA_PASSWORD
  CA_CONFIG

Tokens stay in the user config (~/.config/code-archaeologist/config.json).
Project files (.code-archaeologist.json) never store secrets.
Progress and errors that are not JSON go to stderr.
`;
}
