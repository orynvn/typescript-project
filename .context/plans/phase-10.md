# Phase 10 — Packages (Plugin System)

## Status
- `draft`

## Scope
- Installable/uninstallable feature packages with one-command workflow.

## Tasks
- Define installer/uninstaller conventions and safety checks.
- Implement package #1 `media-library` first with architecture alignment:
  - Reuse core `MediaFile`; do not redefine model.
  - Add media folders, search, bulk actions, metadata editing.
  - Provide `/api/media/status` for feature detection.
  - Integrate MediaPickerModal with forms and Tiptap image button.
- Define roadmap for package 2-10 based on value/frequency.

## Acceptance Criteria
- Package install/uninstall is reversible and does not break core.
- Media-library works with files uploaded before package installation.
- Usage tracking/warnings behave correctly for in-use files.
