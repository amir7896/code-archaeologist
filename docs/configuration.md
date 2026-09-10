# Configuration reference

Copy `.env.example` to `.env`. The API and worker validate environment variables at startup and refuse to boot with an invalid config.

| Variable | Default | Purpose |
|---|---|---|
| `NODE_ENV` | `development` | `development`, `test`, or `production` |
| `LOG_LEVEL` | `info` | `fatal`, `error`, `warn`, `info`, `debug` |
| `API_HOST` | `0.0.0.0` | API bind address |
| `API_PORT` | `3000` | API port |
| `WEB_ORIGIN` | `http://localhost:5173` | CORS origin |
| `POSTGRES_HOST` | `localhost` | Postgres hostname (`postgres` inside Compose) |
| `POSTGRES_USER` | `codearch` | Postgres user |
| `POSTGRES_PASSWORD` | `codearch` | Postgres password (local only) |
| `POSTGRES_DB` | `code_archaeologist` | Database name |
| `POSTGRES_PORT` | `5432` | Host port for Compose Postgres. Change if 5432 is already in use. |
| `REDIS_URL` | `redis://localhost:6379` | Redis / BullMQ connection |
| `REDIS_PORT` | `6379` | Host port for Compose Redis. Change if 6379 is already in use. |
| `WORKER_CONCURRENCY` | `2` | Worker concurrency |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Optional local LLM |
| `OLLAMA_MODEL` | `llama3.1:8b` | Default local model name |
| `JWT_ACCESS_SECRET` | local-dev placeholder (32+ chars) | Access-token signing secret |
| `JWT_REFRESH_SECRET` | local-dev placeholder (32+ chars) | Refresh-token signing secret |
| `JWT_ACCESS_TTL` | `15m` | Access token lifetime |
| `JWT_REFRESH_TTL_DAYS` | `7` | Refresh session lifetime in days |
| `CREDENTIALS_ENCRYPTION_KEY` | local-dev placeholder (32+ chars) | Encrypts repository tokens. Keep this out of the database. |
| `REPOSITORY_WORK_DIR` | OS temp dir | Isolated clone directory for the worker |
| `GITHUB_CLIENT_ID` | unset | Optional GitHub OAuth app client id |
| `GITHUB_CLIENT_SECRET` | unset | Optional GitHub OAuth app client secret |
| `GITHUB_OAUTH_CALLBACK` | unset | Frontend callback, e.g. `http://localhost:5173/oauth/github/callback` |

A personal access token in Settings always works. Do not log tokens, webhook secrets, or repository credentials.
