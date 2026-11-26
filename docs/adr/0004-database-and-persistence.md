# ADR 0004: PostgreSQL, Drizzle, and JSONB

## Context

Forma needs authoritative ownership, sharing, revisions, and optimistic concurrency while retaining a versioned document format.

## Decision

Use PostgreSQL, Drizzle ORM, the `postgres` driver, and checked-in Drizzle migrations. Store document JSONB in `worksheets`; keep identity, access, revision numbers, timestamps, and audit metadata relational.

## Alternatives considered

Browser-only persistence, manually managed SQL without migrations, and normalizing each region into tables.

## Consequences

Transactions can update current content and revision history atomically; JSONB preserves domain serialization.

## Known limitations

The current integration suite requires an explicitly provisioned test database. Collaboration/merge and revision pruning are deferred.
