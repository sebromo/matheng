# Database Model

Drizzle ORM with the `postgres` driver is used against PostgreSQL. The domain model does not import either. The initial schema is generated and applied through checked-in Drizzle migrations.

Tables: Better Auth `user`, `session`, `account`, and `verification`; `worksheets` with owner, title, schema version, revision, JSONB content, timestamps, and soft deletion; `worksheet_revisions` with immutable JSONB snapshots and request IDs; `worksheet_permissions` with editor/viewer levels; and `audit_events`.

Worksheet content stays as JSONB. Ownership, access, revision, and timestamps are relational. Saves lock the worksheet row, verify permission and expected revision, update current content, insert a revision, and write an audit event in one transaction. `(worksheet_id, request_id)` supports idempotent retries. A stale base revision returns a conflict; client content is retained.

Repository integration tests use a separate `TEST_DATABASE_URL` and exercise migrations, access, revisions, retry behavior, conflicts, and rollback. Production migrations are an explicit deployment step.
