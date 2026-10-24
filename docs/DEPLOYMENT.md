# Media Ops — Deployment & Production Operations

This document outlines deployment architecture, container orchestration, worker scheduling, backup strategies, and native mobile release pipelines.

---

## 1. Production Architecture Overview

The system consists of three server tiers and native client builds:

1. **FastAPI Web Service**: Authenticated JSON API over HTTPS with rate limiting, PKCE authorization exchange, and row-level workspace scoping.
2. **Celery Asynchronous Workers**:
   - `sync_mailbox`: Periodic polling of connected Gmail accounts (every 2 minutes) with incremental history tracking and per-mailbox locking.
   - `extract_one`: Structured LLM request classification, requirement extraction, and attachment processing.
   - `deliver_due_reminders`: Periodic scheduler claiming due setup alarms and dispatching notifications through Expo Push.
3. **PostgreSQL & Redis**: Durable transactional storage with row-version optimistic concurrency and high-throughput job queue.
4. **Native Expo Mobile Client**: iOS and Android builds distributed via EAS Build or internal enterprise distribution.

---

## 2. Docker Compose Deployment

The `infra/compose.yaml` file configures all required server services:

```bash
cd infra
docker compose up -d
```

### Services Defined:
- **`postgres`**: PostgreSQL 16 with persistent volume `pgdata`.
- **`redis`**: Redis 7 for Celery message broker and cache.
- **`api`**: FastAPI service running under Uvicorn workers.
- **`worker`**: Celery worker running `sync_one`, `extract_one`, and delivery jobs.
- **`scheduler`**: Celery Beat triggering 2-minute syncs and reminder evaluations.

---

## 3. HTTPS & Reverse Proxy

Terminate TLS at a reverse proxy such as Caddy or Nginx:

```nginx
server {
    server_name api.mediaops.yourdomain.edu;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 4. Database Migrations & Backups

### Running Migrations:
```bash
cd backend
uv run alembic upgrade head
```

### Automated Backup Recommendation:
Run daily encrypted `pg_dump` snapshots:
```bash
pg_dump -U media_ops -d media_ops_db -Fc | gzip > /backups/db-$(date +%F).dump.gz
```

---

## 5. Mobile EAS Build & Store Distribution

To build native release binaries using Expo Application Services:

```bash
cd mobile

# Log in to Expo account
npx eas-cli login

# Configure project
npx eas-cli build:configure

# Build for Android (AAB for Google Play Store)
npx eas-cli build --platform android --profile production

# Build for iOS (IPA for Apple App Store / TestFlight)
npx eas-cli build --platform ios --profile production
```

### Push Notification Credentials:
- Configure **Google Firebase Cloud Messaging (FCM) v1** credentials for Android notifications in EAS.
- Configure **Apple Push Notification service (APNs)** authentication key (`.p8`) for iOS notifications in the Apple Developer Console.
