#!/usr/bin/env bash
# Stop hook — remind to update context before closing
HISTORY=".context/HISTORY.md"
[ ! -f "$HISTORY" ] && exit 0

# Check if today's date appears in HISTORY.md (meaning it was already updated)
TODAY=$(date +%Y-%m-%d)
if grep -q "$TODAY" "$HISTORY" 2>/dev/null; then
  exit 0
fi

echo "⚠️  Session ended. Please update .context/HISTORY.md with the changes from this session before closing."
exit 1
