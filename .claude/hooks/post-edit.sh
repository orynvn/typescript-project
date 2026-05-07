#!/usr/bin/env bash
# PostToolUse hook — auto-lint/format edited files based on detected stack
set -euo pipefail

FILE=$(echo "$1" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('file_path',''))" 2>/dev/null || echo "")
[ -z "$FILE" ] && exit 0
[ ! -f "$FILE" ] && exit 0

EXT="${FILE##*.}"

case "$EXT" in
  php)
    [ -f "vendor/bin/pint" ] && vendor/bin/pint "$FILE" --quiet || true
    ;;
  ts|tsx)
    [ -f "tsconfig.json" ] && npx tsc --noEmit --skipLibCheck 2>/dev/null || true
    # ESLint if configured
    [ -f ".eslintrc.js" ] || [ -f ".eslintrc.json" ] || [ -f "eslint.config.js" ] && \
      npx eslint "$FILE" --fix --quiet 2>/dev/null || true
    ;;
  js|jsx|mjs|cjs)
    [ -f ".eslintrc.js" ] || [ -f ".eslintrc.json" ] || [ -f "eslint.config.js" ] && \
      npx eslint "$FILE" --fix --quiet 2>/dev/null || true
    ;;
  py)
    command -v ruff &>/dev/null && ruff check --fix "$FILE" --quiet && ruff format "$FILE" --quiet || true
    ;;
  go)
    command -v gofmt &>/dev/null && gofmt -w "$FILE" 2>/dev/null || true
    command -v golangci-lint &>/dev/null && golangci-lint run "$FILE" --fix --quiet 2>/dev/null || true
    ;;
  rb)
    command -v rubocop &>/dev/null && rubocop --autocorrect "$FILE" --quiet 2>/dev/null || true
    ;;
esac

exit 0
