# Phase 2 — Backend Foundation (NestJS + Prisma)

## Status
- `draft`

## Scope
- Core backend modules: app bootstrap, Prisma schema, auth, CRUD base, upload, email, security/logging.

## Tasks
- Initialize NestJS app + global pipes/filters/interceptors + Swagger.
- Setup Prisma models: user/auth/audit + initial migrations/seed.
- Implement JWT auth, refresh rotation, OAuth, forgot/reset password.
- Implement reusable CRUD base services/controllers.
- Implement **Phase 2.5 upload architecture**:
  - `POST /api/upload/image`, `POST /api/upload/file`, `DELETE /api/upload/:key`.
  - Always create/delete `MediaFile` with storage operation.
  - Export `UploadResult` from `packages/types`.
  - Provide `GET /api/media/status` for frontend feature detection.
- Setup email queue with templates and retries.
- Add rate limit, security headers, structured logging.

## Acceptance Criteria
- Auth flow works end-to-end with refresh token rotation.
- CRUD base can scaffold one sample resource quickly.
- Upload API returns normalized `UploadResult` including `id/url/key`.
- MediaFile records are created/removed correctly.
