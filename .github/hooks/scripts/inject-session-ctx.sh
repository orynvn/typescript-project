#!/usr/bin/env bash
# inject-session-ctx.sh
# VS Code Agent Hook — SessionStart event
# Reads .context/ and injects it into the conversation via additionalContext
# Docs: https://code.visualstudio.com/docs/copilot/customization/hooks

set -euo pipefail

# Read stdin (VS Code hook input JSON)
INPUT=$(cat)

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
CONTEXT_DIR="$ROOT/.context"

# Initialize .context/ if it does not exist
if [[ ! -d "$CONTEXT_DIR" ]]; then
  mkdir -p "$CONTEXT_DIR"/{decisions,errors,test-cases,plans}
  touch "$CONTEXT_DIR/HISTORY.md" "$CONTEXT_DIR/DECISIONS.md" "$CONTEXT_DIR/ERRORS.md" "$CONTEXT_DIR/FILE-INDEX.md"
  touch "$CONTEXT_DIR/ACTIVE.md" "$CONTEXT_DIR/PROJECT.md"
fi

# Collect context — ACTIVE.md injected in full (small by design, ~40 lines)
ACTIVE=$(cat "$CONTEXT_DIR/ACTIVE.md" 2>/dev/null || echo "(no active sprint — fill in .context/ACTIVE.md)")
OPEN_ERRORS=$(grep "^###" "$CONTEXT_DIR/ERRORS.md" 2>/dev/null | head -5 || echo "(no open errors)")
FILE_INDEX=$(grep "^|" "$CONTEXT_DIR/FILE-INDEX.md" 2>/dev/null | grep -v "^| Module" | grep -v "^|---" | grep -v "_empty_" | head -30 || echo "(no index yet)")

# Build context message — ACTIVE.md replaces HISTORY tail (more focused, lower token cost)
CTX="=== PROJECT CONTEXT ===
[ACTIVE SPRINT — .context/ACTIVE.md]
$ACTIVE

[FILE INDEX - module → files]
$FILE_INDEX

[OPEN ERRORS]
$OPEN_ERRORS
=== END CONTEXT ===

Read .context/PROJECT.md for stack, conventions, and module map."

# Escape for JSON
CTX_ESCAPED=$(echo "$CTX" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | awk '{printf "%s\\n", $0}' | tr -d '\n')

# Output VS Code hook JSON with additionalContext
printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"%s"}}' "$CTX_ESCAPED"
