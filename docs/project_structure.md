# Project Structure

This document outlines the folder layout and module separations of the Inscribe application.

## Directory Tree

```
inscribe/
├── data/                    # Local SQLite Database (Git ignored)
├── deploy/                  # Production Deployment assets
│   ├── Dockerfile           # Multi-stage production build script
│   ├── docker-compose.yml   # Multi-service container definitions
│   ├── nginx/               # Reverse proxy configuration
│   └── scripts/             # Deployment & backup bash utilities
├── docs/                    # Architecture, Database, & Project docs
├── scripts/                 # Development utility scripts
│   └── reset-db.js          # Cross-platform development DB reset script
├── src/
│   ├── app/                 # Next.js App Router Pages & APIs
│   │   ├── actions/         # Server Actions (Mutations & Ops)
│   │   ├── admin/           # Secured Admin Panel Pages
│   │   │   └── setup-2fa/   # User 2FA setup page on first login
│   │   ├── api/             # REST Endpoints (search, health, mapping)
│   │   └── p/               # Public-facing Reader Views
│   ├── components/          # Reusable React components
│   │   ├── admin/           # Admin Dashboard specific components
│   │   │   └── Setup2FAForm.tsx # Client-side 2FA setup component
│   │   └── ui/              # Low-level layout and styling blocks
│   ├── lib/                 # Core server logic & utilities
│   │   ├── db/              # Modularized SQLite Database modules
│   │   ├── auth.ts          # TOTP & JWT authentication logic
│   │   ├── rateLimit.ts     # Token-Bucket Rate Limiter
│   │   └── validation.ts    # Central Zod Input Schemas
│   └── proxy.ts             # Domain proxy rewrite middleware
├── package.json             # NPM package dependencies
└── next.config.ts           # Next.js settings & security headers
```

## Module Descriptions

### 1. `src/lib/db/`
The monolithic database file has been modularized into separate, single-responsibility files:
- **`connection.ts`**: Holds the singleton database instance, configures WAL mode, handles concurrency timeouts, and contains the versioned migration runner.
- **`users.ts`**: Prepared statements and methods for fetching, inserting, and deleting users.
- **`projects.ts`**: Manage configuration options, custom domain mappings, and settings for documentation projects.
- **`articles.ts`**: Controls article drafts, published statuses, revision history prune schedules, and FTS5 search queries.
- **`backup.ts`**: Runs debounced backups and handles validation integrity checks.
- **`compression.ts`**: Helper utilities for compression.
- **`historyStore.ts`**: Storage and retrieval of article revision histories.
- **`types.ts`**: Database model type definitions.

### 2. `src/app/actions/`
Handles server mutations (Server Actions) initiated from the browser:
- **`authActions.ts`**: Coordinates login/logout validations, TOTP token check, and session cookie setup.
- **`articleActions.ts`**: Manages publishing, draft saving, rolling back, and retrieving revision histories.
- **`projectActions.ts`**: Handles project creations, deletions, and metadata updates.
- **`userActions.ts`**: Encapsulates admin actions to add or modify user permissions and roles.

### 3. `src/app/admin/`
Contains admin views, dashboard stats, settings pages, and the editor workspaces:
- Split editor logic into sub-components like `EditorWorkspace.tsx`, `RevisionHistory.tsx`, and `OutlineSidebar.tsx` to maintain clean structures under 400 lines of code.

### 4. `src/proxy.ts`
Acting as the routing gateway, this Next.js middleware handles routing for custom domains, mapping hostnames dynamically to `/p/[projectSlug]/...`.
