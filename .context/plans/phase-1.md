# Phase 1 — Core Infrastructure

## Status
- `draft`

## Scope
- Monorepo bootstrap, TS config baseline, lint/format hooks, Docker local stack.

## Tasks
- Setup `pnpm-workspace.yaml`, root `package.json`, `turbo.json`.
- Create `apps/*` and `packages/*` skeleton.
- Add shared `tsconfig.base.json` and per-app extensions.
- Setup ESLint, Prettier, Husky, lint-staged, commitlint.
- Setup dev/prod Docker Compose + nginx + env templates.

## Acceptance Criteria
- `pnpm install` and `pnpm turbo run build --dry` pass.
- `make docker-up` brings up postgres/redis/minio/nginx/maildev.
- Type imports via `@repo/*` resolve in apps/packages.
