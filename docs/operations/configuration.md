# Configuration

| Variable              | Required                      | Purpose                                                                          |
| --------------------- | ----------------------------- | -------------------------------------------------------------------------------- |
| `DATABASE_URL`        | Required by app/migrator      | Server-only PostgreSQL connection; built by Compose from the PostgreSQL settings |
| `POSTGRES_PASSWORD`   | Required for production       | PostgreSQL role password; use a unique URL-safe hex secret                       |
| `POSTGRES_USER`       | No, Compose                   | PostgreSQL role name, default `forma`                                            |
| `POSTGRES_DB`         | No, Compose                   | PostgreSQL database name, default `forma`                                        |
| `BETTER_AUTH_SECRET`  | Required for production       | Session/signing secret, at least 32 bytes; never expose to browser               |
| `BETTER_AUTH_URL`     | Required for production       | Canonical public auth origin                                                     |
| `NEXT_PUBLIC_APP_URL` | Required for production build | Public app origin, inlined into the client bundle at build time                  |
| `APP_PORT`            | No, Compose                   | Published app port, default `3000`                                               |
| `POSTGRES_PORT`       | Development override only     | Published PostgreSQL port, default `5432`                                        |
| `DATABASE_POOL_MAX`   | No                            | PostgreSQL pool size, default `10`                                               |

Production Compose has no development secret defaults. Copy `.env.production.example` to `.env`, replace every placeholder, and set `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` to the same public HTTPS origin. `.env.example` is for host-based development only.
