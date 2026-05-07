# CLAUDE.md

> Thin adapter — read by Claude Code at every session start.
> Project context lives in `.context/PROJECT.md`. Do not duplicate it here.

**Language:** Respond in the same language the user writes in. Default: **Vietnamese**. Code, commits, variable names always **English**. Override in `.context/PROJECT.md` §Language & Communication.

---

## Context Loading

Read in this order at the start of every session:

1. **`.context/ACTIVE.md`** — current sprint, today's focus, recent 3 changes _(always)_
2. **`.context/PROJECT.md`** — stack, conventions, module map, key constraints _(always)_

For complex or multi-step tasks, also read on-demand:
- `.context/DECISIONS.md` — before proposing architecture changes
- `.context/ERRORS.md` — before implementing fixes
- `.context/FILE-INDEX.md` — before locating module files
- `.context/plans/<PLAN-NNN>.md` — when a plan reference is given

> Do NOT re-read PROJECT.md mid-session. It does not change during a session.

---

## Agent Routing

Dispatch to sub-agents based on user intent:

| Type | Keywords (VI / EN) | Agent |
|------|--------------------|-------|
| New feature / fix / test | thêm, xây, tạo, sửa / add, build, fix, implement | `@analyst` |
| Task commands (list / run / done) | list tasks, run task N, done task N | `@analyst` |
| Quick edit | đổi, dịch, cập nhật / rename, translate, update | `@quick` |
| Code review | review, xem lại / review, check code | `@reviewer` |
| Security audit | bảo mật / security, audit, owasp | `@security` |

Full agent descriptions → `.claude/agents/`

---

## Session Workflow

1. Read `.context/ACTIVE.md` and `.context/PROJECT.md`
2. Check In Progress table in ACTIVE.md — resume if continuing a plan
3. Route to the appropriate sub-agent based on intent
4. Implement following conventions in PROJECT.md
5. After finishing:
   - Append to `.context/HISTORY.md`
   - Update `.context/ACTIVE.md` In Progress table and Recent Context
   - If architectural decision made → update `.context/DECISIONS.md`
   - If bug fixed → update `.context/ERRORS.md`
   - If files created/renamed/deleted → update `.context/FILE-INDEX.md`

---

## Safeguards

- Confirm before: `DROP`, `TRUNCATE`, bulk `DELETE`, `git push --force`, `rm -rf`
- Never commit `.env`, secrets, or API keys
- Never implement features beyond the explicit request (YAGNI)
- Report blockers clearly rather than guessing or silently skipping
