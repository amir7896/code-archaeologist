#!/usr/bin/env bash
set -euo pipefail

# Restore a pg_dump into the local Compose Postgres volume.
# This replaces objects in the target database. Stop the API and worker first.
# Usage: ./scripts/restore-postgres.sh path/to/backup.sql

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 path/to/backup.sql" >&2
  exit 2
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
INPUT="$1"

if [[ ! -f "$INPUT" ]]; then
  echo "Backup file not found: $INPUT" >&2
  exit 1
fi

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

USER_NAME="${POSTGRES_USER:-codearch}"
DB_NAME="${POSTGRES_DB:-code_archaeologist}"

docker compose exec -T postgres psql -U "$USER_NAME" -d "$DB_NAME" < "$INPUT"
echo "Restored $INPUT"
