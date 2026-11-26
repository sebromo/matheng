# Contribution Guide

- Keep `domain/**` independent of React, Next.js, and database packages.
- Treat documents and API payloads as untrusted; validate them at boundaries.
- Add explicit migrations for document/database schema changes.
- Add focused tests with expected values independently checked for engineering calculations.
- Keep math editor vendor types and serialization behind `features/editor/math`.
- Do not add executable user code or render imported HTML as trusted content.
- Run typecheck, unit tests, database integration tests when repository behavior changes, and the production build before proposing changes.
- Update the relevant ADR when changing a significant architecture decision.
