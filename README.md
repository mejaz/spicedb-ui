# SpiceDB UI

A guarded operational interface for inspecting a SpiceDB schema, managing exact relationships and testing live authorization decisions.

The UI never simulates permission results, activity history, relationship totals or creation timestamps. SpiceDB does not expose historical audit activity or relationship creation time; UI mutations are emitted as structured JSON server logs for collection by your logging platform.

## Capabilities

- Live connection and schema metadata dashboard
- Read-only-by-default schema editor with diff, local structural validation, optimistic locking and typed confirmation
- Cursor-based relationship browsing with structured server-side filters
- Exact relationship creation, idempotent touch and deletion
- Subject-set, caveat and caveat-context relationship support
- Live single/bulk permission checks, expansion and subject lookup
- Viewer, operator and administrator access levels
- Basic authentication, same-origin mutation protection, request timeouts and application-level rate limits
- Production environment warning, dark mode and keyboard-accessible dialogs

## Requirements

- Node.js 22 or Docker
- SpiceDB with its HTTP gateway enabled
- A pre-shared SpiceDB token

## Configuration

Copy `.env.example` to `.env.local` for local development. Required variables:

```dotenv
SPICEDB_URL=http://localhost:8443
SPICEDB_TOKEN=replace-with-a-secret
SPICEDB_UI_ENVIRONMENT=development
SPICEDB_UI_READ_ONLY=true
```

Authentication can use one account:

```dotenv
SPICEDB_UI_USERNAME=admin
SPICEDB_UI_PASSWORD=replace-with-a-long-password
SPICEDB_UI_ROLE=admin
```

Or a JSON user map, normally injected from a secret manager:

```dotenv
SPICEDB_UI_USERS={"reader":{"password":"...","role":"viewer"},"ops":{"password":"...","role":"operator"},"admin":{"password":"...","role":"admin"}}
```

Roles:

- `viewer`: schema, relationship and authorization reads only
- `operator`: viewer access plus relationship writes/deletes
- `admin`: operator access plus live schema writes

`SPICEDB_UI_READ_ONLY=true` blocks every mutation regardless of role. It defaults to `true` when omitted. `SPICEDB_UI_AUTH_DISABLED=true` is intended only for isolated local development and must never be used in staging or production.

Basic authentication is included as a secure minimum. For production, place the service behind your identity-aware proxy/SSO and keep the application role/read-only controls enabled.

## Local development

```bash
npm ci
npm run dev
```

Open <http://localhost:3000>.

## Docker

```bash
docker build -t spicedb-ui .
docker run --env-file .env -p 3000:3000 spicedb-ui
```

The image uses a multi-stage Node 22 build, runs as a non-root user and exposes an application health check at `/api/healthz`.

## Verification

```bash
npm run check
```

This runs lint, unit tests and the optimized production build.

## Production checklist

1. Set non-default authentication through a secret manager or enforce SSO at the ingress.
2. Start with `SPICEDB_UI_READ_ONLY=true` and a `viewer` account.
3. Use HTTPS between the browser and UI. Use HTTPS for a non-private SpiceDB endpoint.
4. Set `SPICEDB_UI_ENVIRONMENT=production` so the UI displays the correct safety banner.
5. Collect `spicedb_ui_mutation` JSON events from stdout into immutable audit storage.
6. Apply rate limiting at the ingress. The included in-memory limiter is defense-in-depth and is local to each application replica.
7. Back up/version the SpiceDB schema in source control; the UI provides comparison and export, not durable version storage.
8. Keep schema writes restricted to short administrator maintenance windows.

## Important behavior

- Relationship pages require a resource type because SpiceDB does not support a cheap global relationship scan or total count.
- Pagination uses SpiceDB continuation cursors; it intentionally shows Next/Previous rather than a misleading total page count.
- Deletes include resource type/ID, relation, subject type/ID and optional subject relation, and require the complete tuple as confirmation.
- Schema writes fail with `409` if the live schema changed after the editor loaded it.
- Bulk permission checks accept at most 50 subjects and run against SpiceDB in bounded groups.
