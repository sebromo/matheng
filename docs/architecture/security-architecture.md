# Security Architecture

Trust boundaries:

- Browser input, local drafts, and imported JSON are untrusted. Documents are size-bounded and Zod-validated at serialization/API/database boundaries.
- Worksheet text is rendered as React text/input content, not trusted HTML. Math is parsed through an allowlisted grammar; no `eval`, `Function`, plugins, or document-supplied JavaScript is executed.
- Better Auth owns password hashing and database-backed session management. Server routes and page entry check sessions; every worksheet read/write checks owner/editor/viewer access in application/repository paths.
- SQL is emitted through parameterized Drizzle operations. Database URLs and auth secrets are server-only environment variables.

Implemented headers include CSP, `X-Content-Type-Options`, `X-Frame-Options`, referrer/permissions policy, and HSTS. CSP is self-hosted and restrictive in origin, but uses `unsafe-inline` for Next/MathLive compatibility; production nonce-based scripts/styles are a hardening follow-up. Better Auth uses trusted origins and secure framework-managed cookies; deployment must use HTTPS and a strong secret.

Request bodies are capped at about 2.1 MB; document limits are enforced separately. Writes have an in-process rate limiter and request IDs. That limiter is not shared across replicas and must be complemented by an ingress/provider limit in a multi-instance deployment. Structured logs omit document content, passwords, cookies, and tokens.

Email verification, account recovery policy, external abuse controls, distributed rate limiting, uploaded assets, and automated dependency scanning in CI remain incomplete. The local Compose password/auth secret are development-only and must never be used in production.
