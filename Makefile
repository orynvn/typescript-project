SHELL := /bin/bash

.PHONY: setup install docker-up docker-down dev lint typecheck

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
