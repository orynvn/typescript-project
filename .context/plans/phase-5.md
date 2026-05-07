# Phase 5 — DX, Tooling, Deployment

## Status
- `draft`

## Scope
- Developer automation, CI/CD, production dockerization, operational docs.

## Tasks
- Create project bootstrap script (`make new-project` / rename automation).
- Add CI workflows: lint, typecheck, test, build.
- Add CD workflows: image build/push/deploy/health checks.
- Harden production docker/nginx configs.
- Write setup/deploy/runbook docs.

## Acceptance Criteria
- New project can bootstrap with one guided command flow.
- CI catches lint/type/test regressions.
- Production stack can be deployed consistently via documented steps.
