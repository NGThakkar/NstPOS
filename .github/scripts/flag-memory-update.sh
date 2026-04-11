#!/usr/bin/env bash
set -euo pipefail

# Stop hook: write sentinel so next session can remind about memory updates.
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PENDING_FLAG="$ROOT_DIR/.memory-pending"

date "+%Y-%m-%d %H:%M:%S" > "$PENDING_FLAG"
exit 0
