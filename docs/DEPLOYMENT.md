# Deployment and operations

The supported production topology is PostgreSQL + Redis + API + Celery worker + exactly one Beat scheduler, behind an HTTPS reverse proxy. The API does not silently fall back to in-process jobs in production. The parser is deterministic; no LLM provider or AI API key is currently used.

## Configure

Copy `backend/.env.production.example` to a private `backend/.env.production`. Fill the actual database password/URL, a newly generated Fernet encryption key, Google web OAuth client credentials, callback URL, initial administrator email and approved frontend origin. Keep the key backed up; changing it without re-encrypting stored mailbox tokens prevents reconnection.

`CORS_ORIGINS` contains HTTPS browser origins only, without paths or trailing slashes. The configured native return URI is `mediaops://auth`; optional exact app URLs can be listed in `CLIENT_REDIRECT_URIS`. Browser return paths must belong to approved origins. A workspace is linked to one department Gmail account; reconnect that original account rather than silently swapping its source history to another inbox.

Set `FORWARDED_ALLOW_IPS` to the trusted reverse proxy address/CIDR for the actual host. Avoid a public wildcard: authentication rate limits use the server's trusted client IP. Configure the reverse proxy using `infra/Caddyfile` or `infra/nginx.conf`, replacing the example host/certificate values.

## Start

From the repository root:

```sh
docker compose --env-file backend/.env.production -f infra/compose.yaml config --quiet
docker compose --env-file backend/.env.production -f infra/compose.yaml up -d --build
```

The API runs `alembic upgrade head` before starting. Existing installations require revision **002** for recoverable reminder leases. Back up and test the migration on a restored copy before upgrading the hosted database. API production startup does not create/alter tables automatically.

PostgreSQL and Redis are private Compose services. Only loopback port 8000 is exposed for the host's HTTPS reverse proxy. The API readiness check verifies the database, migration revision and Redis. Workers start after API readiness. Run one scheduler; scaling Beat creates duplicate scheduled jobs.

## Verify before publishing

- `/health` and `/ready` return 200 through the intended proxy. An unauthenticated request to `/api/v1/requests` returns 401; `/api/v1/auth/demo` is unavailable in production.
- Staff Google login, unauthorized account rejection, mailbox read-only consent, token refresh/reconnect and logout work on the real frontend/native origins.
- Only new email with a [MEDIA REQUEST] subject and the required organizer, venue, date, event time, setup deadline and equipment sections is admitted. Invalid values inside an otherwise matching template go to Review; missing headers, casual requests and subject tags alone are excluded. Staff confirmation enables reminders. Structured venue-only replies in an existing tagged request thread preserve equipment/times and show a reviewable proposal.
- A supported attachment populates fields; conflicting/scanned content requires review. Recovery of excluded messages requires an administrator and access to the original Gmail message.
- API/worker restart preserves requests, proposals and reminders. Scheduled tasks reach workers. Inspect failed-message counts and processing errors instead of relying only on mailbox last-sync time.
- Due reminders submit and receive receipts on actual devices. Verify revoked staff and logged-out devices no longer receive pushes. A successful local mock does not establish FCM/APNs delivery.

## Backups and monitoring

Keep encrypted PostgreSQL backups outside the container volume and regularly restore one into a separate database. Keep the Fernet key and release signing key in secure backed-up storage. A database-only restore without the encryption key cannot decrypt Gmail authorization.

Monitor `/ready`, container restarts, worker task failures, Gmail `reconnect_required`/`error` state, failed message counts, overdue `pending`/`sending` reminders, push receipt failures and source-retention jobs. API logs avoid returning internal exceptions to clients. Reminder delivery can retry after an interrupted claim and is at least once across an ambiguous network/crash boundary.

The retention job expires processed source bodies/attachments after `SOURCE_RETENTION_DAYS`, preserving headers and request records. It also removes expired OAuth state and old session records. Startup never deletes requests based on text classification. Account removal revokes active sessions/devices; deleting stored workspace data is an explicit administrator action and does not delete Gmail messages.

## Native builds

Follow `mobile/RELEASE.md`. Preview APKs use debug signing and are for internal testing. A signed production release needs the operator's private keystore, public HTTPS API, demo disabled, platform push credentials and physical-device checks. EAS CLI is an optional external release tool, not an application dependency.

See `PRODUCTION-HARDENING.md` and `RELEASE-READINESS.md` for current verification and remaining publication gates.

## Automatic Karunya domain registration

To allow verified `@karunya.edu.in` Google accounts into the shared department workspace, deploy the current backend and configure:

```dotenv
ALLOWED_DOMAIN=karunya.edu.in
DOMAIN_AUTO_JOIN=true
ADMIN_EMAIL=<the existing workspace administrator email>
```

Keep the existing administrator email rather than changing workspace ownership. The configured administrator must be active with role `admin` and must sign in first if the workspace has not yet been initialized. New domain members receive only the `staff` role in that administrator's workspace. Existing memberships are retained; inactive members stay blocked. Other domains, subdomains and unverified accounts are rejected. Administrators still manage members and connect/reconnect the shared Gmail mailbox. No APK rebuild or database migration is required.

The flag defaults to false, retaining invitation-only access unless explicitly enabled. On the hosted service, save these environment settings and deploy this source revision. Code changes alone do not change the running server. This repository does not identify students versus employees within a shared email domain: enabling domain registration admits every verified account on that domain.
