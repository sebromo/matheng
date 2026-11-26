# Configuration

| Variable              | Required                      | Purpose                                         |
| --------------------- | ----------------------------- | ----------------------------------------------- |
| `DATABASE_URL`        | Yes                           | Server-only PostgreSQL connection string        |
| `BETTER_AUTH_SECRET`  | Yes outside local development | Session/signing secret; never expose to browser |
| `BETTER_AUTH_URL`     | Yes in deployment             | Canonical trusted auth origin                   |
| `NEXT_PUBLIC_APP_URL` | Yes for client auth           | Public application origin; contains no secret   |
| `DATABASE_POOL_MAX`   | No                            | PostgreSQL pool size, default 10                |
| `POSTGRES_PORT`       | No, Compose only              | Local host port, default 5432                   |

`.env.example` contains local placeholders only. The Compose password and fallback auth secret are development-only. Do not use `.env.example` as a production secret source.
