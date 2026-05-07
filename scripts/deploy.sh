#!/usr/bin/env bash
set -euo pipefail

echo "🚀 Deploying..."

git pull origin main

docker compose -f docker/docker-compose.prod.yml build

docker compose -f docker/docker-compose.prod.yml up -d --remove-orphans

docker compose -f docker/docker-compose.prod.yml exec backend npx prisma migrate deploy

echo "✅ Deploy complete"
docker compose -f docker/docker-compose.prod.yml ps
