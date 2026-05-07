#!/usr/bin/env bash
# log.sh — Append to .context/HISTORY.md
#
# Usage:
#   ./log.sh "feat: User auth — src/auth/"
#   ./log.sh feat "User auth" "src/auth/"
#
# Automatically:
#   1. Appends the entry with today's date
#   2. Rotates old entries to history/YYYY.md when HISTORY.md > MAX_ENTRIES
#   3. Updates Recent Context (3 entries) in ACTIVE.md

set -euo pipefail

CONTEXT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HISTORY_FILE="$CONTEXT_DIR/HISTORY.md"
ACTIVE_FILE="$CONTEXT_DIR/ACTIVE.md"
HISTORY_DIR="$CONTEXT_DIR/history"
DATE=$(date +%Y-%m-%d)

MAX_ENTRIES=150   # rotate when file exceeds this many [entries]
KEEP_ENTRIES=100  # keep this many in HISTORY.md after rotation

# ── 1. Parse arguments ───────────────────────────────────────────────
if [[ $# -eq 0 ]]; then
  echo "Usage: ./log.sh \"<type>: <description> — <file>\""
  echo "       ./log.sh <type> <description> <file>"
  echo ""
  echo "Types: feat | fix | refactor | test | docs | chore | decision | migration | perf"
  exit 1
elif [[ $# -eq 1 ]]; then
  LOG_ENTRY="[${DATE}] $1"
elif [[ $# -eq 3 ]]; then
  LOG_ENTRY="[${DATE}] $1: $2 — $3"
else
  echo "❌ Invalid arguments. Use 1 or 3 arguments."
  exit 1
fi

# ── 2. Append entry ──────────────────────────────────────────────────
echo "$LOG_ENTRY" >> "$HISTORY_FILE"
echo "✅ Logged: $LOG_ENTRY"

# ── 3. Auto-rotate if HISTORY.md is too large ────────────────────────
ENTRY_COUNT=$(grep -c "^\[" "$HISTORY_FILE" 2>/dev/null || echo 0)

if [[ $ENTRY_COUNT -gt $MAX_ENTRIES ]]; then
  ARCHIVE_YEAR=$(date +%Y)
  ARCHIVE_FILE="$HISTORY_DIR/${ARCHIVE_YEAR}.md"
  mkdir -p "$HISTORY_DIR"

  ALL_ENTRIES=$(grep "^\[" "$HISTORY_FILE")
  TOTAL=$(echo "$ALL_ENTRIES" | wc -l | tr -d ' ')
  TO_ARCHIVE=$((TOTAL - KEEP_ENTRIES))

  # Append oldest entries to yearly archive
  echo "$ALL_ENTRIES" | head -n "$TO_ARCHIVE" >> "$ARCHIVE_FILE"

  # Rewrite HISTORY.md: preserve header lines + keep last KEEP_ENTRIES entries
  {
    grep "^[^[]" "$HISTORY_FILE" || true
    echo ""
    echo "$ALL_ENTRIES" | tail -n "$KEEP_ENTRIES"
  } > "${HISTORY_FILE}.tmp"
  mv "${HISTORY_FILE}.tmp" "$HISTORY_FILE"

  echo "📦 Archived $TO_ARCHIVE entries → history/${ARCHIVE_YEAR}.md (keeping last ${KEEP_ENTRIES})"
fi

# ── 4. Sync Recent Context in ACTIVE.md ─────────────────────────────
if [[ -f "$ACTIVE_FILE" ]] && command -v python3 &>/dev/null; then
  python3 - "$HISTORY_FILE" "$ACTIVE_FILE" <<'PYEOF'
import sys, re

history_path, active_path = sys.argv[1], sys.argv[2]

with open(history_path, 'r') as f:
    entries = [l.rstrip() for l in f if l.startswith('[')]

recent = entries[-3:] if len(entries) >= 3 else entries
bullets = '\n'.join(f'- {e}' for e in recent)

with open(active_path, 'r') as f:
    content = f.read()

new_section = f'## Recent Context (last 3 changes)\n\n{bullets}'
content = re.sub(
    r'## Recent Context \(last 3 changes\)\n.*?(?=\n---|\Z)',
    new_section,
    content,
    flags=re.DOTALL
)

with open(active_path, 'w') as f:
    f.write(content)
PYEOF
  echo "📌 Synced ACTIVE.md Recent Context"
fi
