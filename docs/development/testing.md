# Testing

`npm test` runs Vitest unit tests for document validation/serialization/migrations, parser and editor adapter, calculation graph and engineering regression, commands/history, local recovery, application-service authorization, units, and constants.

Integration tests use a separate PostgreSQL database and never create/drop the configured database. Create it, apply migrations, then run:

```sh
TEST_DATABASE_URL=postgres://forma:forma-local-only@localhost:5432/forma_test npm run test:integration
```

Playwright tests create isolated accounts and worksheets in a separate database. Create and migrate it once:

```sh
docker compose exec -T database createdb -U forma forma_e2e
DATABASE_URL=postgres://forma:forma-local-only@localhost:5432/forma_e2e npm run db:migrate
```

Run the browser suite against that database:

```sh
DATABASE_URL=postgres://forma:forma-local-only@localhost:5432/forma_e2e \
BETTER_AUTH_URL=http://127.0.0.1:3001 \
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3001 \
npm run test:e2e
```

The E2E launcher builds the current source, prepares Next standalone assets, and runs an isolated server on port 3001. The suite covers registration, calculation editing, save/reopen, sharing, editor/viewer permissions, and stale revision conflicts. `npm run typecheck` and `npm run build` are required gates. CI uses its own ephemeral PostgreSQL service. CI configuration is in `.github/workflows/ci.yml`.

If port 3001 is occupied, set `PLAYWRIGHT_PORT` to a free port and use the same port in `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL`. Playwright sets `BETTER_AUTH_SIGNUP_RATE_LIMIT_MAX=100` only for its isolated test server so the full suite can create its independent test users. The application default remains 10 sign-ups per minute.
