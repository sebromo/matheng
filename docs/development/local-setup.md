# Local Setup

1. Install Docker Engine and Compose.
2. Run `docker compose up --build` from the repository root.
3. Open http://localhost:3000 and create an account.
4. Stop with Ctrl+C; named PostgreSQL volumes persist. `docker compose down` stops containers but retains data. Do not use `down -v` unless intentionally deleting local databases.

Each development-container start clears generated `.next` artifacts to prevent stale chunk references from surviving rebuilds or restarts. The dependency and PostgreSQL volumes are retained.

The Compose stack uses a development-only PostgreSQL password and auth secret. To change the auth secret, set `BETTER_AUTH_SECRET` in the shell before Compose startup. Production secrets must be independently generated and managed.

Host-based commands need the same variables from `.env.example`. `DATABASE_URL` must point to a database with current migrations. Integration tests use a different database configured with `TEST_DATABASE_URL`.

Playwright uses `forma_e2e`, not the normal `forma` development database. Provision and migrate it using [the testing guide](testing.md) before running browser tests.
