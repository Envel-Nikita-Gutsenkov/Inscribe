# Inscribe REST API Reference (v1)

The Inscribe internal REST API provides programmatic access to manage projects, sections, documentation articles, media assets, backups, and system diagnostics.

---

## Authentication

All `/api/v1/*` endpoints require authentication. You can authenticate using either:

1. **Bearer API Key (Recommended for automated scripts and AI agents):**
   ```http
   Authorization: Bearer <YOUR_INSCRIBE_API_KEY>
   ```
   or using the custom header:
   ```http
   x-api-key: <YOUR_INSCRIBE_API_KEY>
   ```
   Set `INSCRIBE_API_KEY` in your environment variables or Docker configuration.

2. **Admin Session Cookie:**
   If accessing via browser or internal fetch with active admin session cookies, requests are automatically authorized.

---

## Projects API

### 1. List All Projects
- **Endpoint:** `GET /api/v1/projects`
- **Response:**
```json
{
  "success": true,
  "count": 1,
  "projects": [
    {
      "slug": "inscribe-docs",
      "name": "Inscribe Documentation",
      "description": "Welcome to Inscribe! Create and manage your project documentation.",
      "isPublic": true,
      "sectionsCount": 1,
      "articlesCount": 3
    }
  ]
}
```

### 2. Create a Project
- **Endpoint:** `POST /api/v1/projects`
- **Request Body:**
```json
{
  "slug": "api-guide",
  "name": "API Documentation",
  "description": "Comprehensive reference guide for backend services",
  "isPublic": true,
  "passcode": "secret123",
  "customDomain": "docs.example.com",
  "webhookUrl": "https://api.example.com/webhooks/docs"
}
```
- **Response (201 Created):**
```json
{
  "success": true,
  "project": {
    "slug": "api-guide",
    "name": "API Documentation",
    "description": "Comprehensive reference guide for backend services",
    "isPublic": true
  }
}
```

### 3. Get Project Details & Outline
- **Endpoint:** `GET /api/v1/projects/:projectSlug`
- **Response:**
```json
{
  "success": true,
  "project": { "slug": "api-guide", "name": "API Documentation", "isPublic": true },
  "toc": [
    {
      "id": "sec-core",
      "title": "Core Concepts",
      "isProtected": false,
      "articles": [
        { "slug": "getting-started", "title": "Getting Started", "isPublished": true }
      ]
    }
  ]
}
```

### 4. Update Project
- **Endpoint:** `PUT /api/v1/projects/:projectSlug`
- **Request Body:**
```json
{
  "name": "Updated API Documentation",
  "isPublic": false,
  "passcode": "new-passcode"
}
```

### 5. Delete Project
- **Endpoint:** `DELETE /api/v1/projects/:projectSlug`

---

## Sections API

### 1. List Sections
- **Endpoint:** `GET /api/v1/projects/:projectSlug/sections`

### 2. Create Section
- **Endpoint:** `POST /api/v1/projects/:projectSlug/sections`
- **Request Body:**
```json
{
  "id": "sec-internal",
  "title": "Internal Guides",
  "isProtected": true,
  "protectionUsername": "staff",
  "protectionPassword": "securepassword"
}
```

### 3. Update Section & Protection
- **Endpoint:** `PUT /api/v1/projects/:projectSlug/sections/:sectionId`
- **Request Body:**
```json
{
  "title": "Confidential Specs",
  "isProtected": true,
  "protectionUsername": "engineer",
  "protectionPassword": "new-strong-password"
}
```

### 4. Delete Section
- **Endpoint:** `DELETE /api/v1/projects/:projectSlug/sections/:sectionId`

---

## Articles API

### 1. List Articles
- **Endpoint:** `GET /api/v1/projects/:projectSlug/articles?sectionId=sec-core`

### 2. Create Article
- **Endpoint:** `POST /api/v1/projects/:projectSlug/articles`
- **Request Body:**
```json
{
  "slug": "architecture-overview",
  "sectionId": "sec-core",
  "title": "Architecture Overview",
  "content": "# Architecture Overview\n\nDetailed system diagram and data flow...",
  "isPublished": true
}
```

### 3. Get Article Content & History
- **Endpoint:** `GET /api/v1/projects/:projectSlug/articles/:articleSlug?draft=false`
- **Response:**
```json
{
  "success": true,
  "article": {
    "slug": "architecture-overview",
    "projectSlug": "api-guide",
    "sectionId": "sec-core",
    "sectionIsProtected": false,
    "title": "Architecture Overview",
    "content": "# Architecture Overview\n\n...",
    "isPublished": true,
    "updatedAt": 1740000000000
  },
  "history": [
    {
      "id": "hist-123",
      "createdAt": 1740000000000,
      "username": "api_service",
      "changeSummary": "Created and published via API"
    }
  ]
}
```

### 4. Update & Publish Article
- **Endpoint:** `PUT /api/v1/projects/:projectSlug/articles/:articleSlug`
- **Request Body:**
```json
{
  "title": "Architecture Overview v2",
  "content": "# Architecture Overview v2\n\nUpdated microservice interactions...",
  "isPublished": true,
  "changeSummary": "Added payment gateway flow"
}
```

### 5. Delete Article
- **Endpoint:** `DELETE /api/v1/projects/:projectSlug/articles/:articleSlug`

---

## System & Maintenance API

### 1. Diagnostics & System Stats
- **Endpoint:** `GET /api/v1/system/stats`
- **Response:**
```json
{
  "success": true,
  "stats": {
    "dbSizeBytes": 1548288,
    "backupsSizeBytes": 4509120,
    "memory": {
      "rssBytes": 85000000,
      "heapUsedBytes": 42000000
    },
    "system": {
      "uptimeSeconds": 14500,
      "nodeVersion": "v20.x",
      "freeMemoryBytes": 12884901888
    },
    "caches": {
      "articles": 14,
      "tocs": 3,
      "projects": 2,
      "domains": 1
    }
  }
}
```

### 2. Trigger Instant Backup Snapshot
- **Endpoint:** `POST /api/v1/system/backup`
- **Response:**
```json
{
  "success": true,
  "message": "Database backup created successfully.",
  "filename": "db-backup-2026-08-23T10-30-00-000Z.sqlite"
}
```

### 3. Clear In-Memory Caches
- **Endpoint:** `POST /api/v1/system/cache/clear`
- **Response:**
```json
{
  "success": true,
  "message": "All in-memory LRU caches evicted and paths revalidated."
}
```

---

## Media & Image Management

### Upload Optimized Image
- **Endpoint:** `POST /api/images/upload`
- **Headers:** `Authorization: Bearer <API_KEY>` (Multipart Form Data)
- **Form Fields:** `files`: binary image file(s) (PNG, JPEG, WebP, GIF)
- Automatically converts to high-efficiency WebP format and registers image metadata.
