# Phase 7 — Realtime, Notifications, 2FA

## Status
- `draft`

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
