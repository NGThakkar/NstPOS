#!/usr/bin/env bash
set -euo pipefail

# SessionStart hook: if a previous session flagged pending memory work,
# print a reminder and clear the sentinel.
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "$ROOT_DIR/.." && pwd)"
PENDING_FLAG="$ROOT_DIR/.memory-pending"
MEMORY_PATH="$REPO_ROOT/memory.md"

if [[ -f "$PENDING_FLAG" ]]; then
	TIMESTAMP="$(head -n 1 "$PENDING_FLAG" 2>/dev/null || true)"

	if [[ -z "$TIMESTAMP" ]]; then
		echo "[auto-memory] Reminder: Review and update memory.md with any new project rules or decisions from the previous session."
	else
		echo "[auto-memory] Reminder: Pending memory update from $TIMESTAMP. Review and update memory.md with any new project rules or decisions."
	fi

	if [[ -f "$MEMORY_PATH" ]]; then
		echo "[auto-memory] Source of truth: $MEMORY_PATH"
	fi

	rm -f "$PENDING_FLAG"
fi

exit 0
