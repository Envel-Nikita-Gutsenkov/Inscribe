# Database Replication & Off-Site Backups (Litestream)

To achieve high availability and disaster recovery, Inscribe supports database replication using **Litestream**. Litestream runs as a separate process or sidecar container, continuously streaming SQLite WAL frames to an Amazon S3 (or S3-compatible) bucket.

---

## 1. How it Works

1. Inscribe is configured to run SQLite in **WAL (Write-Ahead Logging)** mode.
2. Litestream monitors the WAL file (`db.sqlite-wal`) for changes.
3. Every second, new WAL frames are compressed and uploaded to your cloud storage bucket.
4. If the server crashes or the disk is lost, Litestream can restore the database up to the last second of writes.

---

## 2. Configuration (`litestream.yml`)

Create a `litestream.yml` configuration file in your deploy/production environment:

```yaml
dbs:
  - path: /app/data/db.sqlite
    replicas:
      - url: s3://YOUR_BUCKET_NAME/replications/db
        access-key-id: "${LITESTREAM_ACCESS_KEY_ID}"
        secret-access-key: "${LITESTREAM_SECRET_ACCESS_KEY}"
        region: us-east-1
```

---

## 3. Deployment with Docker Compose

You can run Litestream as a sidecar container in `docker-compose.yml`:

```yaml
version: '3.8'

services:
  inscribe:
    image: inscribe:latest
    container_name: inscribe_app
    volumes:
      - inscribe_data:/app/data
    environment:
      - NODE_ENV=production
      - INSCRIBE_JWT_SECRET=${INSCRIBE_JWT_SECRET}

  litestream:
    image: litestream/litestream:0.3.9
    container_name: inscribe_litestream
    volumes:
      - inscribe_data:/app/data
      - ./litestream.yml:/etc/litestream.yml
    environment:
      - LITESTREAM_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
      - LITESTREAM_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
    command: replicate
    restart: always

volumes:
  inscribe_data:
```

---

## 4. Disaster Recovery (Restore)

To restore the database from the replica to a new server:

```bash
# Run litestream restore command
litestream restore -config /etc/litestream.yml /app/data/db.sqlite
```

By default, this restores the latest snapshot. You can also restore to a specific point in time using the `-timestamp` option.
