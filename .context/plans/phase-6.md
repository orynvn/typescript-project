# Phase 6 — Monitoring & Observability

## Status

- `implemented (baseline)`

## Scope

- Metrics, logs, tracing, and alerting for backend and apps.

## Tasks

- Define core metrics (API latency, error rate, queue depth, upload stats).
- Implement health/readiness/liveness endpoints with dependency checks.
- Standardize structured logs and correlation/request IDs.
- Add dashboards and alert rules for critical paths.

## Acceptance Criteria

- Service health and key metrics are visible.
- Alerts fire for critical failures and actionable thresholds.
- Upload failure and auth anomalies can be investigated from telemetry.

## Delivery Notes (2026-05-07)

- Added monitoring stack compose and configs under `docker/monitoring`.
- Added backend metrics endpoint (`/api/metrics`) with request/error/upload counters.
- Added request correlation (`x-request-id`) in success/error responses.
- Added admin monitoring endpoints + `/monitoring` page restricted to `SUPER_ADMIN`.
