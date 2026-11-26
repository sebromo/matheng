# Deployment

Build the production image with `docker build -t forma:release .`. Configure `DATABASE_URL`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, and `NEXT_PUBLIC_APP_URL` through the deployment platform's secret/configuration facility. Use HTTPS at the public boundary and a secret of at least 32 random bytes.

Before starting the release, run the migration step once with the same image and database configuration: `npm run db:migrate`. Then start the container. Migrations are not run automatically by the production entrypoint. Verify `/api/health/live` and `/api/health/ready` after rollout.

Persistent user data lives in PostgreSQL, not the app container. Configure database backups, restore drills, TLS/network policy, ingress rate limits, and centralized structured log collection. The current in-process API rate limiter is not sufficient by itself for multiple replicas.
