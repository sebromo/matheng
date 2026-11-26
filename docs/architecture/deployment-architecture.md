# Deployment Architecture

The application is a Next.js Node.js server with PostgreSQL. `compose.yaml` is the production default: it uses the standalone `runner`, persists PostgreSQL in a named volume, waits for database health, and requires a successful one-shot migrator before app startup. `compose.dev.yaml` is an explicit opt-in for `next dev`, source bind mounts, and development dependency/cache volumes. The multi-stage production image runs as a non-root user.

Production migrations run in a separate, non-exposed one-shot service. The migrator acquires a PostgreSQL advisory lock before applying Drizzle migrations, and Compose starts the app only after it completes successfully. `/api/health/live` reports process availability; `/api/health/ready` checks PostgreSQL.

No queue, worker, Redis, or external service is deployed. Calculation remains in-process. Backups and restores are PostgreSQL operations; application-container storage is not authoritative.
