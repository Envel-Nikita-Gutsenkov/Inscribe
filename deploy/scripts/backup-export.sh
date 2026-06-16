#!/bin/sh
set -e

BACKUPS_DIR="/app/data/backups"
HOST_EXPORT_DIR="./backups-export"

echo "Locating latest backup inside container..."
LATEST_BACKUP=$(docker exec inscribe-app sh -c "ls -t $BACKUPS_DIR/db-backup-*.sqlite 2>/dev/null | head -n 1")

if [ -z "$LATEST_BACKUP" ]; then
    echo "No backups found inside the container."
    exit 1
fi

mkdir -p "$HOST_EXPORT_DIR"
BACKUP_FILENAME=$(basename "$LATEST_BACKUP")
echo "Copying $BACKUP_FILENAME to host at $HOST_EXPORT_DIR..."

docker cp inscribe-app:"$LATEST_BACKUP" "$HOST_EXPORT_DIR/$BACKUP_FILENAME"

echo "Latest backup exported successfully to $HOST_EXPORT_DIR/$BACKUP_FILENAME"
