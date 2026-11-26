# Verification Record

**Date:** 2026-11-24  
**Source identifier:** Current workspace snapshot; this workspace has no `.git` metadata, so no commit SHA is available.  
**Data safety:** Unit/integration tests used the isolated `forma_test` database. Browser tests used the separate `forma_e2e` database. The regular Compose development database was not used for destructive test setup.

## Results

| Check                               | Result                                                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`                 | Passed                                                                                                        |
| `npm run lint`                      | Passed with no warnings                                                                                       |
| `npm run format:check`              | Passed                                                                                                        |
| `TEST_DATABASE_URL=... npm test`    | 11 test files, 34 tests passed                                                                                |
| `npm audit`                         | 0 vulnerabilities reported                                                                                    |
| `docker compose config -q`          | Passed                                                                                                        |
| `docker build -t forma:verify .`    | Passed; standalone production image built without auth/database build arguments                               |
| Production image runtime            | Passed; runs as UID 1001 `forma`; Playwright, Vitest, ESLint, and Prettier are absent from runtime resolution |
| Production image smoke              | `/api/health/ready` reported database `ok`; `/sign-in` returned 200                                           |
| Playwright against production image | 4/4 passed: edit/save/reopen, create/switch worksheets, viewer/editor access, stale revision recovery         |

## Security Scan Limitation

`npm audit` completed cleanly. A local Trivy image scan was attempted against the saved production image, but the scanner's 136.7 MiB vulnerability database download had reached only about 15% at roughly 140 KiB/s and was stopped to avoid an extended network wait. The GitHub Actions workflow now runs Trivy against the production image and fails on unfixed high/critical findings. CI itself has not been run from this workspace, so that image-scan result remains pending.
