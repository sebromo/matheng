# Deployment Architecture

The application is a Next.js Node.js server with PostgreSQL. `compose.yaml` starts both for local development, persists database files in a named volume, waits for PostgreSQL health, and applies migrations before `next dev`. The production `Dockerfile` is multi-stage, uses Next standalone output, and runs as a non-root user.

Production startup does not migrate implicitly. Build and deploy the image, provide environment configuration/secrets, run `npm run db:migrate` as an explicit release step, then start `node server.js`. `/api/health/live` reports process availability; `/api/health/ready` checks PostgreSQL.

No queue, worker, Redis, or external service is deployed. Calculation remains in-process. Backups and restores are PostgreSQL operations; application-container storage is not authoritative.
