SHELL := /bin/bash

.PHONY: setup install docker-up docker-down dev lint typecheck db-migrate db-seed new-project monitoring-up monitoring-down monitoring-logs

setup: install docker-up
	@echo "Setup complete"

install:
	pnpm install

docker-up:
	docker compose -f docker/docker-compose.yml up -d

docker-down:
	docker compose -f docker/docker-compose.yml down

dev:
	pnpm dev

lint:
	pnpm lint

typecheck:
	pnpm typecheck

db-migrate:
	cd apps/backend && pnpm prisma:migrate

db-seed:
	cd apps/backend && pnpm prisma:seed

new-project:
	@scripts/create-project.sh "$(NAME)"

monitoring-up:
	docker compose -f docker/docker-compose.monitoring.yml up -d
	@echo "Grafana: http://localhost:3100"
	@echo "Prometheus: http://localhost:9090"
	@echo "Uptime Kuma: http://localhost:3102"

monitoring-down:
	docker compose -f docker/docker-compose.monitoring.yml down

monitoring-logs:
	docker compose -f docker/docker-compose.monitoring.yml logs -f
