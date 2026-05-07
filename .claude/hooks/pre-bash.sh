#!/usr/bin/env bash
# PreToolUse hook — block destructive Bash commands before execution
set -euo pipefail

CMD=$(echo "$1" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('command',''))" 2>/dev/null || echo "")
[ -z "$CMD" ] && exit 0

BLOCKED_PATTERN=""

# Destructive DB operations
echo "$CMD" | grep -qiE "DROP\s+(TABLE|DATABASE|SCHEMA)" && BLOCKED_PATTERN="DROP TABLE/DATABASE"
echo "$CMD" | grep -qiE "TRUNCATE\s+TABLE?" && BLOCKED_PATTERN="TRUNCATE"

# DELETE without WHERE
if echo "$CMD" | grep -qiE "DELETE\s+FROM" && ! echo "$CMD" | grep -qi "WHERE"; then
  BLOCKED_PATTERN="DELETE FROM without WHERE"
fi

# Destructive git operations
echo "$CMD" | grep -qE "git push.*(--force|-f)(\s|$)" && BLOCKED_PATTERN="git push --force"
echo "$CMD" | grep -qE "git reset --hard" && BLOCKED_PATTERN="git reset --hard"
echo "$CMD" | grep -qE "git clean -[a-z]*f" && BLOCKED_PATTERN="git clean -f"
echo "$CMD" | grep -qE "git branch -[a-z]*D" && BLOCKED_PATTERN="git branch -D"

# Destructive filesystem
echo "$CMD" | grep -qE "rm\s+-[a-z]*r[a-z]*f|rm\s+-[a-z]*f[a-z]*r" && BLOCKED_PATTERN="rm -rf"

if [ -n "$BLOCKED_PATTERN" ]; then
  echo "🚨 BLOCKED: Destructive operation detected — '$BLOCKED_PATTERN'"
  echo "   Command: $CMD"
  echo "   Confirm with the user before running this command."
  exit 1
fi

exit 0