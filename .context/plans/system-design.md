# System Design — TypeScript Fullstack Template

## Status
- `draft`

## Goals
- Reusable fullstack monorepo template for 90% TypeScript projects.
- Bootstrap to runnable stack in under 10 minutes.
- Keep architecture VPS-first and cloud-agnostic.

## Core Architecture
- Monorepo: `pnpm workspaces` + `turborepo`.
- Apps: `apps/backend` (NestJS), `apps/admin` (Next.js), `apps/web` (Next.js).
- Shared packages: `types`, `utils`, `validators`, `constants`, `ui`.
- Infra: PostgreSQL, Redis, MinIO, Nginx, Maildev, Docker Compose.

## Critical Cross-Phase Decision
- Upload pipeline is single-entry via backend API.
- `Phase 2.5` creates both object storage file and `MediaFile` DB record.
- `Phase 8.2`/`8.6` consume `UploadResult` from `@repo/types` only.
- `Phase 10.1 media-library` extends core media schema and must not redefine `MediaFile`.

## Data/Integration Boundaries
- Frontend never calls MinIO/S3 SDK directly.
- Backend owns storage credentials, image processing, and record lifecycle.
- Feature detection for media package via `GET /api/media/status`.

## Phase Sequencing
1. Phase 1-2: foundation and backend capabilities.
2. Phase 3-4: admin and user apps.
3. Phase 5: DX, CI/CD, deployment hardening.
4. Phase 6-10: monitoring, realtime/2FA, advanced components, SEO, packages.

## Open Questions
- Priority strategy for Phase 6-10 after MVP (sequential vs parallel tracks).
- Testing depth target per phase (smoke only vs contract + e2e baseline).
- First package scope in Phase 10 after media-library (blog vs audit-log-ui).
