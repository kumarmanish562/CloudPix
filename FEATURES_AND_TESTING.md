# CloudPix features and testing

## Implemented features

| Feature | Frontend | Java API |
| --- | --- | --- |
| Search and filters | Filename/tag search, format, upload date range, sorting | GET /api/photos?q=&tag=&mimeType=&from=&to=&sort= |
| Favorites | Photo heart buttons, Favorites page | PATCH /api/photos/{id} with favorite; GET /api/photos?favorite=true |
| Tags | Edit comma-separated tags on a photo; filter by saved tag | PATCH /api/photos/{id} with tags; GET /api/photos/tags |
| Album sharing | Create/copy an expiring link; list and revoke links; anonymous album page | POST/GET /api/albums/{id}/shares; DELETE /api/albums/{id}/shares/{shareId}; GET /api/shared/{token} |
| Duplicate detection | Duplicate warnings, explicit upload-another-copy action, grouped duplicates, select extra copies | SHA-256 during upload; GET /api/photos/duplicates |
| Downloads | Original photo download and album ZIP download | GET /api/photos/{id}/download; GET /api/albums/{id}/download |
| Memories | Select a day to see upload anniversaries | GET /api/photos/memories?date=YYYY-MM-DD |
| Upload queue | Per-file progress, cancellation, retry, continue after an error | Multipart upload with allowDuplicate=false by default |

Every private API checks the signed-in owner. Public share JSON and image endpoints validate expiry and revocation. Shared responses contain protected image URLs rather than the permanent CDN URLs. Shared images bypass the Next.js image optimizer and use Cache-Control: no-store.

Tags are lowercase, trimmed and deduplicated, with up to 20 tags of 50 characters each. A PATCH updates only the fields supplied; tags: [] clears tags.

Search and memories use UTC **upload dates**, not EXIF capture dates. The date range includes from and excludes to. Sort values are newest, oldest, name and size. Page sizes are 1–100.

Duplicates mean identical bytes. Renaming a file does not bypass detection. New uploads are fingerprinted; existing photos, ImageKit imports and AI outputs without a fingerprint are not compared. The duplicate view includes active and archived photos, excludes trash, and keeps one shown copy unselected when selecting extras.

Uploads allow JPEG, PNG, WebP, GIF, HEIC and HEIF files up to 25 MB. The queue holds up to 100 pending files and lasts while the signed-in app is open. An upload already accepted by the server may still appear after a browser cancellation. Failed uploads do not stop later files.

Share links last 1–720 hours, with a maximum of 20 active links per album. Links show active members only. Revocation prevents future album/image requests; it cannot erase a photo somebody already saved.

Album ZIPs contain active photos only and are limited to 500 photos and 1 GB of uncompressed content. ZIP generation completes before returning success, and temporary files are deleted when the response closes. External image downloads are restricted to the configured HTTPS ImageKit endpoint and do not follow redirects.

## Run the full backend tests

Requirements: JDK 25. Maven is supplied by the wrapper. Internet is needed the first time dependencies are downloaded.

From the project root in PowerShell:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-backend.ps1
```

This starts the real Spring application, applies Flyway V1–V3, validates the JPA schema and runs the tests against an isolated in-memory H2 database. It needs no ImageKit keys.

For the same suite on a fresh, disposable PostgreSQL 16 container, start Docker Desktop and run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-backend.ps1 -Postgres
```

The script uses a random localhost port, does not use the normal CloudPix database, and removes its test container after the run. Use -DockerConfig if Docker configuration is in another directory. Use -MavenRepository if your Maven cache is in another directory.

Alternatively:

```powershell
cd CloudPix-backend
.\mvnw.cmd test
```

Direct Maven test runs use the test profile in the test classes. TEST_DB_URL, TEST_DB_USERNAME and TEST_DB_PASSWORD can override the test datasource. Point them only at a dedicated test database. The runner script above sets these explicitly and restores the prior environment afterwards.

Reports: CloudPix-backend/target/surefire-reports.

Coverage includes:
- Registration, valid/invalid login, profile, token rotation, refresh replay rejection, logout.
- Upload, duplicate rejection and explicit copies, metadata, tag normalization, search and pagination.
- Importing assets only from the owner's ImageKit folder.
- Albums, idempotent membership, original download bytes and ZIP contents.
- Anonymous sharing, expiry, revocation, private metadata exclusion and active-photo visibility.
- Cross-user denial for photo, metadata, album, share and download operations.
- Date-filtered memories and archive visibility.
- AI preview/apply, required prompts and dimensions, ownership and active-photo checks.
- Archive, trash, restore, permanent deletion and album-cover cleanup.
- Provider failures, input validation and download URL allowlisting.
- A real HTTP server startup and authenticated socket requests.
- Upgrading populated V2 data to V3, membership deduplication and foreign-key cascades.

External ImageKit calls are mocked. The suite verifies application behavior without uploading, deleting or charging for real media.

## Test the frontend in Chromium

Requirements: Node.js 20.9+, JDK 25 and the Maven wrapper dependencies.

```powershell
cd cloudpixclient
npm.cmd install
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

The browser suite starts:
- A real Java backend on port 8088, using H2 and in-memory ImageKit replacements from test sources.
- A production frontend on port 3005, built with that backend URL.

Both ports must be free. The Java test server is excluded from the packaged production application. Browser tests use .next-e2e so they do not overwrite the normal production build.

The suite checks registration, upload, favorites, tags, search and filters, original/ZIP downloads, duplicate handling, trash/restore, anonymous sharing/revocation, upload retry/cancellation, and mobile navigation/layout.

Reports: cloudpixclient/playwright-report. Failure traces and screenshots: cloudpixclient/test-results.

Other frontend checks:

```powershell
npm.cmd run lint
npx.cmd tsc --noEmit
npm.cmd run build
```

## Run the real app

1. Start your normal PostgreSQL database. The root docker-compose.yml provisions the development database on localhost:5436.
2. Copy CloudPix-backend/.env.example to CloudPix-backend/.env and fill in your database, JWT and ImageKit values. Spring does not automatically load .env files: load the values through your IDE run configuration, PowerShell environment, or your deployment system.
3. Run the backend:

```powershell
cd CloudPix-backend
.\mvnw.cmd spring-boot:run
```

4. Copy cloudpixclient/.env.example to cloudpixclient/.env.local. Set NEXT_PUBLIC_API_URL and NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT to the backend and ImageKit endpoint you use.
5. Start the frontend:

```powershell
cd cloudpixclient
npm.cmd install
npm.cmd run dev
```

Open http://localhost:3000 and register an account. The backend defaults to port 8080. CORS_ALLOWED_ORIGINS must include the frontend origin.

The fonts use local system font stacks, so production builds do not need to fetch Google Fonts.

### Existing database migration

V1 and V2 were preserved. V3 adds favorites, hashes, tags and shares, indexes the photo listing query, deduplicates album memberships and fixes deletion references.

With Flyway auto-configuration now enabled by the starter, a nonempty database without Flyway history needs an explicit baseline after verifying its schema. Do not enable automatic baselining without checking whether the database matches V1 or V2. Use an empty development database for a clean start; back up an existing database before migration.

## Smoke-test a running backend with real ImageKit

After the real backend is running with valid credentials:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/smoke-backend.ps1
```

For another backend URL or a larger PNG:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/smoke-backend.ps1 -BaseUrl http://localhost:8080/api -ImagePath C:/images/sample.png
```

This creates a dedicated random test account, uploads two copies, checks favorites/tags/search/duplicates, creates and shares an album, downloads an original and ZIP, revokes the share, tests archive/trash/restore, rotates refresh tokens, permanently deletes its photos and album, and logs out.

It uses real ImageKit operations and attempts cleanup if a check fails. The empty test account remains because the app has no account-deletion API. AI provider rendering is covered by mocks in the automated suite; testing real AI transformations additionally requires ImageKit AI access.

