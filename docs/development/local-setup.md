# Local Setup

1. Install Docker Engine and Compose.
2. Run `docker compose -f compose.yaml -f compose.dev.yaml up -d` from the repository root.
3. Open http://localhost:3000 and create an account.
4. Stop with `docker compose -f compose.yaml -f compose.dev.yaml down`; the named PostgreSQL volume persists. Do not use `down -v` unless intentionally deleting local databases.

The development override uses `next dev`, source bind mounts, a named `node_modules` volume, and a named `.next` cache volume. Each app start clears generated `.next` artifacts to prevent stale chunk references from surviving rebuilds or restarts. The dependency and PostgreSQL volumes are retained.

The development override uses a development-only PostgreSQL password and auth secret. Production is the default in `compose.yaml`; use the README self-hosting instructions and never reuse development credentials in production.

Host-based commands need the same variables from `.env.example`. `DATABASE_URL` must point to a database with current migrations. Integration tests use a different database configured with `TEST_DATABASE_URL`.

Playwright uses `forma_e2e`, not the normal `forma` development database. Provision and migrate it using [the testing guide](testing.md) before running browser tests.
