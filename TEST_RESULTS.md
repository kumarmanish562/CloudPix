# Validation results

Validated on 2026-11-04.

| Check | Result |
| --- | --- |
| Full backend suite on isolated H2 | 41 tests passed, 0 failures/errors |
| Full backend suite on disposable PostgreSQL 16 | 41 tests passed, 0 failures/errors |
| V2-to-V3 migration with existing data | Passed on H2 and PostgreSQL |
| Browser workflows against the real Java API | All 7 workflows verified |
| PowerShell smoke script against the isolated test server | Passed |
| Frontend ESLint | Passed |
| Frontend TypeScript | Passed |
| Production build with Next.js 16.4.5 | Passed |
| PowerShell script parsing | Passed |
| Test database cleanup | Both disposable PostgreSQL containers removed |

The browser run passed six workflows. A focused rerun passed the remaining upload/favorites/tags/search/download workflow after fixing the tag and format control labels. The first cold request also needed more time on this machine, so the initial workflow has a longer test timeout.

Backend workflow tests cover real MVC/security/services/JPA/Flyway behavior. A separate test starts an actual HTTP server and exercises authenticated socket requests. Browser tests use a production frontend build and a real Java backend.

ImageKit storage and AI network calls are mocked. Real ImageKit upload/download/AI availability has not been verified with your credentials. The live smoke script is included for that step; the empty test account it creates remains after photo/album cleanup.

Duplicates compare exact file bytes for new uploads; older imports without a fingerprint are not included. Memories use UTC upload anniversaries.

See [FEATURES_AND_TESTING.md](FEATURES_AND_TESTING.md) for setup, startup, migration notes, commands, feature behavior and limits.

