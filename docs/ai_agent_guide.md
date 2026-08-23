# Inscribe AI Agent Integration Guide

This guide is designed for Autonomous AI Coding Agents and LLM Services interacting with Inscribe containers.

---

## 1. Container Overview & Environment

Inscribe runs as a containerized Next.js service with an embedded SQLite database (using WAL mode and FTS5 search indexing).

### Key Environment Variables
| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `INSCRIBE_API_KEY` | Secret token for Bearer API authentication | `your-secret-api-key-here` |
| `INSCRIBE_JWT_SECRET` | Secret key used to sign session cookies & tokens | *(auto-generated or set)* |
| `PORT` | Container internal listening port | `3000` |

---

## 2. Quickstart for AI Agents (cURL / Python)

### Health & Readiness Check
```bash
curl -s http://localhost:3000/api/health
```
Expected response:
```json
{ "status": "ok", "timestamp": 1740000000000 }
```

### Authentication Header
Every API request from an AI agent must include:
```http
Authorization: Bearer <INSCRIBE_API_KEY>
Content-Type: application/json
```

---

## 3. Autonomous Ingestion Workflow

To autonomously populate or synchronize documentation from code repositories into Inscribe, follow this 4-step workflow:

### Step 1: Ensure Project Exists
```bash
curl -X POST http://localhost:3000/api/v1/projects \
  -H "Authorization: Bearer $INSCRIBE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "backend-core",
    "name": "Backend Core Services",
    "description": "Auto-generated documentation by AI Agent",
    "isPublic": true
  }'
```

### Step 2: Create Navigation Sections
```bash
curl -X POST http://localhost:3000/api/v1/projects/backend-core/sections \
  -H "Authorization: Bearer $INSCRIBE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "sec-architecture",
    "title": "Architecture & Modules",
    "isProtected": false
  }'
```

For private internal sections (e.g. database credentials or internal runbooks):
```bash
curl -X POST http://localhost:3000/api/v1/projects/backend-core/sections \
  -H "Authorization: Bearer $INSCRIBE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "sec-runbooks",
    "title": "Confidential Runbooks",
    "isProtected": true,
    "protectionUsername": "ops-agent",
    "protectionPassword": "GeneratedPasscode!2026"
  }'
```

### Step 3: Insert / Update Documentation Articles
```bash
curl -X POST http://localhost:3000/api/v1/projects/backend-core/articles \
  -H "Authorization: Bearer $INSCRIBE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "data-pipeline",
    "sectionId": "sec-architecture",
    "title": "Data Processing Pipeline",
    "content": "# Data Processing Pipeline\n\nOur data pipeline ingests Kafka events and writes to ClickHouse.\n\n```mermaid\ngraph LR\n  Kafka[Kafka Events] --> Ingest[Go Ingest Worker]\n  Ingest --> ClickHouse[(ClickHouse DB)]\n```",
    "isPublished": true
  }'
```

### Step 4: Trigger Database Snapshot & Cache Refresh
```bash
# Evict cache to immediately expose latest documentation to reader clients
curl -X POST http://localhost:3000/api/v1/system/cache/clear \
  -H "Authorization: Bearer $INSCRIBE_API_KEY"

# Persist backup snapshot
curl -X POST http://localhost:3000/api/v1/system/backup \
  -H "Authorization: Bearer $INSCRIBE_API_KEY"
```

---

## 4. Python SDK Example for AI Agents

```python
import os
import requests

INSCRIBE_URL = os.getenv("INSCRIBE_URL", "http://localhost:3000")
API_KEY = os.getenv("INSCRIBE_API_KEY", "inscribe-secret-key")

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

def sync_article(project_slug: str, section_id: str, slug: str, title: str, markdown_content: str):
    # Check if article exists
    url = f"{INSCRIBE_URL}/api/v1/projects/{project_slug}/articles/{slug}"
    res = requests.get(url, headers=headers)
    
    if res.status_code == 200:
        # Update existing article
        update_res = requests.put(url, headers=headers, json={
            "title": title,
            "content": markdown_content,
            "isPublished": True,
            "changeSummary": "AI automated sync"
        })
        print(f"Updated article {slug}: {update_res.status_code}")
    else:
        # Create article
        create_url = f"{INSCRIBE_URL}/api/v1/projects/{project_slug}/articles"
        create_res = requests.post(create_url, headers=headers, json={
            "slug": slug,
            "sectionId": section_id,
            "title": title,
            "content": markdown_content,
            "isPublished": True
        })
        print(f"Created article {slug}: {create_res.status_code}")

if __name__ == "__main__":
    sync_article(
        project_slug="backend-core",
        section_id="sec-architecture",
        slug="api-endpoints",
        title="REST Endpoints",
        markdown_content="# REST Endpoints\n\n- `GET /v1/health`\n- `POST /v1/process`\n"
    )
```

---

## 5. Security & Rate Limiting

- **Constant-Time Verification:** API key headers are validated using `crypto.timingSafeEqual` to eliminate timing attacks.
- **Section Security:** Passwords for protected sections are verified with salted SHA-256 HMAC tokens and protected with 5-attempt rate-limiting locks.
- **SQL Injection Prevention:** All internal database access uses parameterized SQLite prepared statements.
- **Input Sanitization:** Markdown rendering in reader pages uses `rehypeSanitize` and `rehypeHighlight` to prevent XSS.
