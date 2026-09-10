#!/usr/bin/env bash
set -euo pipefail

# Dependency scan used by CI. Critical findings fail the job.
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
pnpm audit --audit-level=critical
