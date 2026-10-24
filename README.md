# Media Ops — Mobile Gmail Media Request Manager

Native mobile application (Expo / React Native) and backend API (FastAPI / PostgreSQL / Celery) that converts media department Gmail messages into an actionable, organized event-request queue.

---

## Repository Structure

```
├── mobile/       # Native Expo / React Native mobile app (TypeScript, Expo Router, TanStack Query)
├── backend/      # FastAPI REST service, SQLAlchemy models, Alembic migrations, Celery jobs
├── infra/        # Docker Compose configuration for PostgreSQL, Redis, API, and workers
├── docs/         # Specifications, operational setup, deployment, and verification reports
│   ├── SETUP.md                     # Local development and Google Cloud credentials setup
│   ├── DEPLOYMENT.md                # Production Docker Compose, HTTPS, and EAS build guide
│   ├── VALIDATION.md                # Automated test execution and quality verification report
│   └── superpowers/specs/           # Product specifications and system design documents
└── src/          # Legacy reference prototype (preserved independently)
```

---

## Quickstart

### 1. Backend Service
```bash
cd backend
uv sync
uv run uvicorn app.main:create_app --factory --reload --port 8000
```
Run tests:
```bash
uv run pytest
```

### 2. Mobile Client
```bash
cd mobile
npm install
npm start
```
Run typecheck & tests:
```bash
npm run typecheck
npm test
```

### 3. Detailed Guides
- **Setup & Google OAuth**: Read [docs/SETUP.md](file:///mnt/win-newvol/Projects/GitHub/media-app/docs/SETUP.md).
- **Deployment & EAS Builds**: Read [docs/DEPLOYMENT.md](file:///mnt/win-newvol/Projects/GitHub/media-app/docs/DEPLOYMENT.md).
- **Quality & Verification**: Read [docs/VALIDATION.md](file:///mnt/win-newvol/Projects/GitHub/media-app/docs/VALIDATION.md).
