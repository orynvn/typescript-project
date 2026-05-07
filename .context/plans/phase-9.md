# Phase 9 — SEO System

## Status

- `implemented (baseline)`

## Scope

- Full SEO configuration pipeline across backend, admin, and web rendering.

## Tasks

- Build SEO settings backend model/API/cache strategy.
- Build admin SEO settings UI with preview and per-page override.
- Implement metadata pipeline and dynamic metadata generation.
- Implement robots/sitemap/JSON-LD/OG image workflows.
- Integrate analytics settings from admin configuration.

## Acceptance Criteria

- SEO values can be configured without code changes.
- Metadata/robots/sitemap outputs reflect configured settings.
- Media-based SEO assets use shared upload component rules.

## Delivery Notes (2026-05-07)

- Added SEO settings Prisma model and backend CRUD/reset endpoints with role guards.
- Added SEO defaults bootstrap and seed integration.
- Added admin `/settings/seo` configuration screen with grouped editing and previews.
- Added web dynamic metadata pipeline from SEO settings, plus dynamic robots/sitemap and OG image route.
- Added JSON-LD website structured data baseline in root layout.
