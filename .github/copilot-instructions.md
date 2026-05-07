# GitHub Copilot — Project Instructions

> Thin adapter — project context lives in `.context/PROJECT.md`.
> Read it at the start of every complex task.

**Language:** Respond in the same language the user writes in. Default: **Vietnamese**. Code, commits, variable names always **English**. Override in `.context/PROJECT.md` §Language & Communication.

---

## 1. Context Loading

**Complex or multi-step tasks** (architecture, refactor, full pipeline):
1. Read `.context/ACTIVE.md` — sprint status, blockers, recent 3 changes _(always)_
2. Read `.context/PROJECT.md` — stack, conventions, module map, key constraints _(always)_
3. Search DECISIONS on-demand: `grep -i "<keyword>" .context/DECISIONS.md`
4. Search ERRORS on-demand: `grep -i "<keyword>" .context/ERRORS.md`

**Simple tasks** (single-file edit, docs, config, quick fix): skip context reads.

> ACTIVE.md (including Recent Context) is injected automatically at session start
> via `.github/hooks/scripts/inject-session-ctx.sh`.
>
> For deeper history: `tail -20 .context/HISTORY.md` (recent 20 entries) or
> `grep -i "<keyword>" .context/HISTORY.md .context/history/*.md 2>/dev/null` (keyword search).
> Never read HISTORY.md in full.

---

## 2. Stack Detection

Identify the stack from project files and load the matching instructions:

| File present | Stack | Instructions |
|---|---|---|
| `composer.json` + `artisan` | Laravel | `.github/instructions/laravel.instructions.md` |
| `package.json` → `"next"` dep | Next.js | `.github/instructions/nextjs.instructions.md` |
| `package.json` → `"vite"` + `"react"` | React | `.github/instructions/react.instructions.md` |
| `package.json` → `"vue"` | Vue 3 | `.github/instructions/vue.instructions.md` |
| `package.json` → `"@nestjs/core"` | NestJS | `.github/instructions/nestjs.instructions.md` |
| `pyproject.toml` / `requirements.txt` → `django` | Django | `.github/instructions/django.instructions.md` |
| `pyproject.toml` / `requirements.txt` → `fastapi` | FastAPI | `.github/instructions/fastapi.instructions.md` |

Conventions and code rules → `.context/PROJECT.md` (do not duplicate here).

---

## 3. Workflow Routing

Route by task complexity — the primary token optimization gate:

| Task type | VI triggers | Route | Pipeline |
|---|---|---|---|
| Docs, config, single-file fix | sửa nhanh, chỉnh, cập nhật docs | `quick` | Direct → LOG |
| Small feature, 1-2 files | thêm tính năng, tạo API, viết service | `planner` + `implementer` | PLAN → IMPL → LOG |
| Feature with tests | viết test, thêm unit test, cần coverage | + `tc-writer` + `qa-tester` | + TEST |
| Phase file exists | implement phase, chạy phase | `oryn-dev` phase-first | Read phase → IMPL → TEST → COMMIT → LOG |
| Need phases, arch known | lên phases, viết kế hoạch | `phase-writer` | Analyze → Write phase-N.md |
| Complex / multi-module | thiết kế, refactor toàn bộ, kiến trúc | `architect` | DESIGN → system-design.md + phase-N.md → **stop, wait** |

Default to the lightest sufficient tier. Full agent logic → `.github/agents/oryn-dev.agent.md`

---

## 4. Post-Task Writes

After completing any task:
- Append to `.context/HISTORY.md`: `[YYYY-MM-DD] <type>: <desc> — <file>`
- Update `.context/ACTIVE.md`: mark In Progress items complete, update Recent Context
- Update `.context/FILE-INDEX.md` if files changed — use `file-indexer` skill
- Architectural decision made → run `log-decision` prompt
- Bug fixed → append to `.context/ERRORS.md`
