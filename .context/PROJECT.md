# PROJECT.md — Project Context (Single Source of Truth)

> Read by: Claude (via CLAUDE.md), Copilot (via copilot-instructions.md), Codex (via AGENTS.md)
> Updated by: developer after meaningful changes to stack, conventions, or modules
> Keep under 150 lines. High signal only. Do NOT duplicate into entry-point files.

---

## Project

**Name:** TypeScript Fullstack Template
**Description:** Monorepo fullstack template production-ready để tái sử dụng cho nhiều dự án TypeScript, gồm backend NestJS, admin Next.js, web Next.js, và hạ tầng Docker VPS-first. Mục tiêu là rút ngắn thời gian bootstrap từ 1-2 tuần xuống dưới 10 phút để tập trung vào business logic.
**Repository:** https://github.com/orynvn/typescript-project.git
**Environment:** N/A

---

## Stack

| Layer      | Technology |
|------------|------------|
| Backend    | NestJS 10 + Prisma + TypeScript |
| Frontend   | Next.js 14 (Admin + Web), shadcn/ui, Tailwind CSS |
| Database   | PostgreSQL 16, Redis 7, MinIO/S3 |
| Auth       | JWT + Refresh Token Rotation + Google OAuth2 |
| Testing    | Unit/Integration (NestJS + Next.js), E2E (planned) |
| CI/CD      | GitHub Actions + Docker multi-stage |
| Hosting    | VPS-first with Docker Compose + Nginx |

Stack-specific conventions → `.github/instructions/nestjs.instructions.md`

---

## Language & Communication

- Respond in the same language the user writes in.
- Default: **Vietnamese** — switch to English only if user writes in English.
- All code, variable names, comments, and commit messages: always **English**.

---

## Conventions

### Code Rules
- Commit format: `type(scope): subject` — `feat` | `fix` | `chore` | `docs` | `refactor` | `test` | `perf` | `ci`
- Branch naming: `<type>/<short-description>` — e.g. `feat/user-auth`, `fix/login-redirect`
- Max function length: ~40 lines — split if longer
- No hardcoded secrets — always environment variables
- No commented-out dead code in final commits
- Validate all external inputs at system boundaries
- DRY after second duplication; keep YAGNI by default
- All async operations must handle errors explicitly

### Naming
| Construct  | Convention  | Example |
|------------|-------------|---------|
| Files      | kebab-case  | `auth-service.ts` |
| Classes    | PascalCase  | `AuthService` |
| Functions  | camelCase   | `refreshAccessToken` |
| Constants  | UPPER_SNAKE | `UPLOAD_IMAGE_MAX_SIZE` |
| DB columns | snake_case  | `created_at` |

### Security Defaults
- Never hardcode secrets, API keys, passwords
- Parameterized queries / ORM only — never raw string interpolation
- Validate user input at every system boundary
- Follow OWASP Top 10 mitigations by default
- Confirm before destructive actions (`DROP`, `TRUNCATE`, bulk `DELETE`, force-push, `rm -rf`)

---

## Module Map

> Updated by AI after each implementation phase. Full file paths → `.context/FILE-INDEX.md`

| Module | Type | Description | Status |
|--------|------|-------------|--------|
| infrastructure | core | Monorepo, docker, makefile, shared packages | planned |
| backend-core | core | NestJS, Prisma, auth, CRUD, upload, email, security | planned |
| admin-app | app | Admin dashboard, datatable, user management | planned |
| web-app | app | User-facing app, auth pages, profile, landing | planned |
| dx-deployment | core | CI/CD, create-project scripts, production deployment | planned |
| monitoring | extension | Metrics, logs, tracing, alerting | planned |
| realtime-notify-2fa | extension | Realtime notifications and 2FA | planned |
| frontend-components | extension | Shared advanced components (upload, tiptap, etc.) | planned |
| seo-system | extension | SEO settings backend/admin/web pipeline | planned |
| packages | extension | Installable packages (media-library, blog, etc.) | planned |

---

## Key Files

| File | Reason |
|------|--------|
| `docs/PROJECT-OVERVIEW.md` | Product vision, stack baseline, phase roadmap |
| `docs/ARCHITECTURE-Storage-Upload-Tiptap-MediaLibrary.md` | Cross-phase architecture dependency for upload/media |
| `docs/Phase-2-Backend.md` | Core backend design including upload + media record pipeline |
| `docs/Phase-8-Frontend-Components.md` | FileUpload/Tiptap behavior that must align with backend |
| `docs/Phase-10-Packages.md` | Package system, especially media-library extension model |

---

## Known Constraints

- VPS-first deployment with Docker Compose; Kubernetes out of scope.
- Monorepo with `pnpm` + Turborepo; do not introduce alternative orchestrators.
- Upload pipeline must use API single-entry architecture; frontend must not call MinIO SDK directly.
- `MediaFile` belongs to core schema (Phase 2.5); media-library package only extends it.

---

## Context Files Reference

| File                       | Purpose                                   | When to Read                   |
|----------------------------|-------------------------------------------|--------------------------------|
| `.context/ACTIVE.md`       | Current sprint — tasks, blockers          | Every session start            |
| `.context/HISTORY.md`      | Chronological change log                  | Complex tasks only             |
| `.context/DECISIONS.md`    | ADR index — architectural decisions       | Before proposing arch changes  |
| `.context/ERRORS.md`       | Known bugs and anti-patterns              | Before implementing fixes      |
| `.context/FILE-INDEX.md`   | Module → file map                         | Before locating files          |
| `.context/plans/`          | Implementation plans (PLAN-NNN, phase-N)  | When plan reference is given   |
