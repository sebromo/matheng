# ADR 0002: Versioned JSON Document

## Context

Worksheets are spatial documents with stable regions and must survive UI/database changes.

## Decision

Use a typed, versioned JSON document validated with Zod. Coordinates are page millimeters. Region collections and ASTs are stored in PostgreSQL JSONB. Derived calculation results and transient editor state are excluded.

## Alternatives considered

HTML/DOM serialization, screenshots, normalized region tables, and unversioned localStorage objects.

## Consequences

Documents can be validated, migrated, exported, and round-tripped independently of React/PostgreSQL. Schema changes require explicit migration code.

## Known limitations

Only v1 plus a prototype-format migration exists. The current layout is one finite A4 page; pages/infinite canvas remain open product decisions.
