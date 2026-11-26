# Architecture Overview

Forma is a modular monolith: one Next.js App Router application, one PostgreSQL database, and explicit internal boundaries. No queue or remote calculation service is introduced.

Implemented modules:

- `domain/worksheet`: framework-independent document types, schema validation, serialization, and prototype migration.
- `domain/expressions`: structured AST and restricted prototype-syntax parser.
- `domain/calculation`: evaluator, graph, structured errors, and an incremental in-process session.
- `domain/units` and `domain/constants`: tested SI quantity operations and source-versioned constants; not yet connected to worksheet evaluation.
- `features/editor`, `features/regions`, `features/worksheets`, `features/auth`: spatial editor, editor state/history, region rendering, persistence UI, and auth client.
- `server/auth`, `server/api`, `server/database`, `server/repositories`, `server/services`: identity, request handling, PostgreSQL, repository, and application-service boundaries.

The document and calculation modules do not import React, Next.js, or database clients. The database repository validates JSONB content before returning it. APIs authenticate, validate, invoke services, and serialize structured outcomes.

Implemented state is documented as such; planned capabilities are not presented as available features. See [module boundaries](module-boundaries.md), [worksheet document](worksheet-document-model.md), [expression model](expression-model.md), [units and constants](units-and-constants.md), and the [ADRs](../adr/0001-modular-monolith.md).
