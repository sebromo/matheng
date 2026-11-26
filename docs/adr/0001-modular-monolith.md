# ADR 0001: Modular Monolith

## Context

Forma needs clear domain/server/editor boundaries without premature distributed operations.

## Decision

Use one Next.js Node.js application and PostgreSQL database. Domain, feature, server, and repository modules expose explicit TypeScript contracts. No queue or service split is introduced.

## Alternatives considered

Microservices, a separate calculation service, and direct database access from routes or UI.

## Consequences

Modules can be tested independently and selected workloads can later move behind a worker contract. Initial scaling is process/application scaling. There is no independent worker deployment today.

## Known limitations

Some feature orchestration is still in a large workspace component; dependency rules are documented but not mechanically linted.
