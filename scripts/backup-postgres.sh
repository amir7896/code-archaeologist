#!/usr/bin/env bash
set -euo pipefail

# Dump the local Compose Postgres volume. Does not print passwords.
# Usage: ./scripts/backup-postgres.sh [output.sql]

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

OUTPUT="${1:-"$ROOT/.data/backups/postgres-$(date -u +%Y%m%dT%H%M%SZ).sql"}"
mkdir -p "$(dirname "$OUTPUT")"

USER_NAME="${POSTGRES_USER:-codearch}"
DB_NAME="${POSTGRES_DB:-code_archaeologist}"

docker compose exec -T postgres pg_dump -U "$USER_NAME" -d "$DB_NAME" --no-owner --no-acl > "$OUTPUT"
echo "Wrote $OUTPUT"
