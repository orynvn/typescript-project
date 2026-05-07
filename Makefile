SHELL := /bin/bash

.PHONY: setup install docker-up docker-down dev lint typecheck db-migrate db-seed new-project

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
