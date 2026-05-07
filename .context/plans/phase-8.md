# Phase 8 — Advanced Frontend Components

## Status

- `implemented (baseline)`

## Scope

- Shared reusable components and patterns for admin/web apps.

## Tasks

- Build and integrate tasks 8.1-8.10 from docs.
- Enforce upload/media architecture dependencies:
  - `8.2 FileUpload` uses `UploadResult` from `@repo/types`.
  - Add `useMediaLibrary` with `GET /api/media/status` detection.
  - `8.6 Tiptap`: drag/paste auto-upload; toolbar image uses MediaPickerModal.
- Ensure consistent form integrations and accessibility states.

## Acceptance Criteria

- Components are reusable, typed, and documented.
- Upload/Tiptap behavior is consistent with Phase 2.5 architecture.

## Delivery Notes (2026-05-07)

- Delivered reusable baseline for `useConfirm`, `FileUpload`, `AsyncCombobox`, dynamic breadcrumb, and image wrapper.
- Integrated components into both `apps/admin` and `apps/web` flows with practical usage examples.
- Kept `UploadResult` contract from `@repo/types` and media-status feature detection.
- Deferred richer components (Date/Time picker, Cmd+K, Tiptap, export, multi-step) to subsequent phases.
