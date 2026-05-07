# Phase 7 — Realtime, Notifications, 2FA

## Status

- `implemented (baseline)`

## Scope

- Realtime notifications channel and optional 2FA security layer.

## Tasks

- Implement notification domain + persistence + delivery channels.
- Add realtime transport (WebSocket/SSE) for live updates.
- Implement 2FA (TOTP + backup codes + recovery flow).
- Add admin controls and user settings for notifications/2FA.

## Acceptance Criteria

- Users receive realtime notifications for configured events.
- 2FA can be enabled, verified, and recovered safely.

## Delivery Notes (2026-05-07)

- Added `Notification` domain in Prisma + backend CRUD/unread/read-all/test endpoints.
- Added SSE stream endpoint (`/api/notifications/stream`) as realtime baseline transport.
- Added admin Notification Bell and `/notifications` page with polling + read actions.
- Added 2FA email OTP login challenge flow and backup-code support.
- Deferred full TOTP QR implementation to next phase iteration (dependency install not performed).
