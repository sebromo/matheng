# Module Boundaries

| Module                | Owns                                                                 | Must not depend on         |
| --------------------- | -------------------------------------------------------------------- | -------------------------- |
| `domain/worksheet`    | Document model, runtime validation, serialization                    | React, Next.js, PostgreSQL |
| `domain/expressions`  | AST and restricted parser                                            | UI and persistence         |
| `domain/calculation`  | Dependencies, numerical evaluation, structured results               | React, database clients    |
| `domain/units`        | Dimensions, units, quantity operations                               | UI and database            |
| `features/editor`     | Document commands, history, editor state, MathLive adapter           | PostgreSQL                 |
| `features/worksheets` | Workspace workflows and client persistence integration               | Database client            |
| `server/services`     | Authorization-aware worksheet use cases                              | UI components              |
| `server/repositories` | PostgreSQL persistence implementation                                | UI components              |
| `app/api`             | Request parsing, auth boundary, service invocation, response mapping | Domain algorithms          |

Database access is obtained through the server-only client and `WorksheetRepository`. Auth and worksheet services are called by route handlers. Workers are deferred; the calculation session is a synchronous domain capability that can later be wrapped by a worker contract.

Some React workflow logic remains in `features/worksheets/components/worksheet-workspace.tsx`; splitting it further is follow-up work. There is no dependency-boundary lint rule yet.
