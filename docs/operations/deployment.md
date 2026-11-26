# Deployment

The default `compose.yaml` is the production deployment. Copy `.env.production.example` to `.env`, configure a unique `POSTGRES_PASSWORD`, a `BETTER_AUTH_SECRET` of at least 32 bytes, and the same public HTTPS origin for `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL`, then run `docker compose up -d`. Compose builds the Dockerfile's `runner` target and keeps PostgreSQL on the internal network.

Before the app starts, the non-exposed one-shot `migrate` service waits for PostgreSQL and applies checked-in migrations while holding a PostgreSQL advisory lock. Compose starts the app only after migration completes successfully. Verify `docker compose ps`, `/api/health/live`, and `/api/health/ready` after rollout. For a manually managed image, run the `migrator` target with the same environment before starting the `runner` target.

Persistent user data lives in PostgreSQL, not the app container. Configure database backups, restore drills, TLS/network policy, ingress rate limits, and centralized structured log collection. The current in-process API rate limiter is not sufficient by itself for multiple replicas.
