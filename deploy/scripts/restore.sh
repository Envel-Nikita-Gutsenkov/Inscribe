#!/bin/sh
set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <path-to-backup-file-on-host>"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file $BACKUP_FILE does not exist on host."
    exit 1
fi

# Navigate to the deployment folder
cd "$(dirname "$0")/.."

echo "Stopping Inscribe service..."
docker-compose stop inscribe

echo "Restoring database inside container..."
docker cp "$BACKUP_FILE" inscribe-app:/app/data/db.sqlite

# Ensure ownership permissions are correct
docker exec -u root inscribe-app chown nextjs:nodejs /app/data/db.sqlite

echo "Starting Inscribe service..."
docker-compose start inscribe

echo "Database restored successfully from $BACKUP_FILE!"
