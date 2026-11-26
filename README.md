# Forma

Forma is a browser-first, document-centered engineering worksheet foundation. It keeps worksheets as spatial documents with independently positioned math and text regions; it is not a vertically stacked code notebook. The current implementation is an architectural foundation, not Mathcad/SMath feature parity.

## Self-hosting

The default Compose configuration is the production standalone deployment. Requirements: Docker Engine and Docker Compose. Create a production environment file:

```sh
cp .env.production.example .env
openssl rand -hex 32
```

Generate two different secrets and replace the `POSTGRES_PASSWORD` and `BETTER_AUTH_SECRET` placeholders in `.env`. Set `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` to the same public HTTPS origin. `APP_PORT` selects the host port for the app; PostgreSQL is not published outside the Compose network. Start Forma with:

```sh
docker compose up -d
```

Compose builds the Dockerfile's `runner` target. A non-exposed one-shot migration service waits for PostgreSQL, validates production configuration, serializes concurrent migration runs with a PostgreSQL advisory lock, and must complete successfully before the web app starts. Terminate TLS at a trusted reverse proxy and forward traffic to the published app port. Check `docker compose ps` and `docker compose logs migrate app` after startup. User data persists in the PostgreSQL volume.

For an existing database created by the previous development Compose setup, its persisted PostgreSQL role still has the old development password; changing `POSTGRES_PASSWORD` in `.env` does not rotate credentials in an existing volume. Back up the database and rotate the role password inside PostgreSQL before using a new production password with that volume. Do not use development credentials in production.

## Development

Development is an explicit opt-in. It uses `next dev`, source bind mounts, and named dependency/cache volumes:

```sh
docker compose -f compose.yaml -f compose.dev.yaml up -d
```

This override uses development-only credentials and publishes PostgreSQL for local tools. Never use these credentials outside development.

For host-based commands, install dependencies with `npm ci` and configure `DATABASE_URL`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, and `NEXT_PUBLIC_APP_URL` from `.env.example`. Never reuse the example secret outside local development.

## Implemented

- Versioned JSON worksheet document with Zod validation, millimeter page coordinates, stable region IDs, math/text discriminated regions, and legacy localStorage migration.
- MathLive direct mathematical editing behind Forma's adapter; the supported numeric subset converts to a structured AST. LaTeX is not the authoritative document format.
- Restricted numerical evaluator with dependency graph, order-independent assignments, duplicate-definition errors, circular dependency detection, structured errors, and dependent-only incremental recalculation.
- SI unit/quantity API with a tested initial subset and a source-versioned physical-constant registry. These are not yet parsed from worksheet math regions or connected to displayed calculation results.
- PostgreSQL JSONB persistence, owners, editor/viewer sharing, immutable revisions, optimistic concurrency, idempotent save retries, and local recovery keyed by user and base revision.
- Better Auth email/password accounts, server-side sessions and access checks, API request limits, security headers, health endpoints, Docker, unit/integration/E2E test foundations, and CI.

## Editing

Click the squared A4 page to add a math region. Drag its grip to move it. Use the region's variable field for assignments; edit the expression in place with MathLive. Text and math remain separate regions. Toolbox controls insert arithmetic, functions, and Greek symbols. `Ctrl+Space` in text switches to math; quote in an empty math region switches to text. Undo/redo, export, and local draft recovery are available.

Supported calculations are intentionally limited to real scalar arithmetic, assignments, powers, roots, and basic functions. Fractions, roots, powers, subscripts, and Greek-symbol shortcuts are editable; vector/matrix numerical evaluation, units in expressions, plots, rich text, and symbolic math are not complete.

## Checks

```sh
npm run typecheck
npm test
npm run test:integration
npm run test:e2e
npm run build
```

Integration tests require a separately migrated test database via `TEST_DATABASE_URL`. See [testing](docs/development/testing.md) and [local setup](docs/development/local-setup.md).

Architecture, module boundaries, security, database, deployment, and known limitations are documented under [docs](docs/architecture/overview.md).
