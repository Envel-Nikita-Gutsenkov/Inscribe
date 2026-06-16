#!/bin/sh
set -e

echo "Starting Inscribe deployment..."

# Navigate to the deployment folder
cd "$(dirname "$0")/.."

# Build and start services in detached mode
docker-compose up -d --build

# Poll container health
echo "Waiting for container health check..."
max_attempts=12
attempt=0

until [ "$(docker inspect --format='{{.State.Health.Status}}' inscribe-app)" = "healthy" ]; do
    attempt=$((attempt + 1))
    if [ "$attempt" -ge "$max_attempts" ]; then
        echo "Deployment failed! Container health check did not pass."
        exit 1
    fi
    echo "Checking status... ($attempt/$max_attempts)"
    sleep 5
done

echo "Inscribe deployed successfully and container is healthy!"
