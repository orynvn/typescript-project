#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR=${BACKUP_DIR:-"/var/backups/postgres"}
DB_CONTAINER=${DB_CONTAINER:-"app_postgres"}
DB_USER=${DB_USER:-"appuser"}
DB_NAME=${DB_NAME:-"appdb"}
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_DIR/backup_$DATE.sql.gz"

find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete

echo "✅ Backup created: $BACKUP_DIR/backup_$DATE.sql.gz"
