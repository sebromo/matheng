# ADR 0005: Better Auth

## Context

Worksheet APIs require established password/session handling and server-side authorization.

## Decision

Use Better Auth with its Drizzle PostgreSQL adapter and email/password flow. Sessions are database-backed, short-lived, and checked by server page/API boundaries. Ownership and editor/viewer permission are separate authorization checks.

## Alternatives considered

Custom password/session code, browser-only checks, and OAuth-only integration requiring external provider credentials.

## Consequences

Forma avoids implementing password hashing or session cryptography and stores auth tables in the same migration-managed database.

## Known limitations

Email verification and account recovery workflows are not configured. Deployment requires a generated strong secret, trusted HTTPS origin, and operational account-abuse controls.
