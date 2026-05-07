#!/usr/bin/env bash
# session-stop.sh — VS Code Agent Hook (Stop event)
# Reminds Copilot agents to update shared context before ending session.

set -euo pipefail

INPUT=$(cat)

# Avoid infinite loops when this hook itself triggers a stop
if command -v jq &>/dev/null; then
  if echo "$INPUT" | jq -e '.stop_hook_active == true' &>/dev/null 2>&1; then
    echo '{}'
    exit 0
  fi
fi

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
HISTORY="$ROOT/.context/HISTORY.md"
TODAY=$(date +%Y-%m-%d)

# Allow stop if HISTORY.md already has an entry for today
if [[ -f "$HISTORY" ]] && grep -q "^\[$TODAY\]" "$HISTORY" 2>/dev/null; then
  echo '{}'
  exit 0
fi

MSG="Session ended. Append a one-line entry to .context\/HISTORY.md for today, then update Recent Context in .context\/ACTIVE.md with the last 3 HISTORY entries."
printf '{"hookSpecificOutput":{"hookEventName":"Stop","decision":"block","reason":"%s"}}' "$MSG"
