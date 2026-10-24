# Media Ops — Setup & Configuration Guide

This guide walks through configuring and running the **Media Ops** mobile client and backend service.

---

## 1. Prerequisites

- **Python 3.12+** and [`uv`](https://docs.astral.sh/uv/) (or standard `pip`/`venv`)
- **Node.js 20+** and `npm`
- **Expo CLI** (`npx expo`)
- **Docker & Docker Compose** (optional, for local PostgreSQL and Redis services)

---

## 2. Google Cloud Setup (for Gmail & Staff Auth)

To synchronize a real department mailbox and authenticate staff members:

1. **Create a Google Cloud Project**:
   - Go to the [Google Cloud Console](https://console.cloud.google.com/).
   - Create a project (e.g. `media-ops-department`).
2. **Enable APIs**:
   - Enable the **Gmail API**.
   - Enable the **Google Identity Services / OAuth 2.0 API**.
3. **Configure OAuth Consent Screen**:
   - User type: **Internal** (for Google Workspace organizations) or **External** (requires test users).
   - Add scopes:
     - `openid`
     - `https://www.googleapis.com/auth/userinfo.email`
     - `https://www.googleapis.com/auth/userinfo.profile`
     - `https://www.googleapis.com/auth/gmail.readonly` (Read-only access to messages)
4. **Create OAuth 2.0 Client IDs**:
   - Application type: **Web application**.
   - Authorized redirect URIs:
     - `http://localhost:8000/api/v1/auth/callback` (Local development)
     - `https://api.yourdomain.edu/api/v1/auth/callback` (Production)
   - Save the **Client ID** and **Client Secret**.

---

## 3. Server Configuration & Secrets

In `backend/.env` (copy from `backend/.env.example`):

```bash
# Server & Environment
ENVIRONMENT=development
PORT=8000
WORKSPACE_TIMEZONE=Asia/Kolkata
CORS_ORIGINS=http://localhost:8081,http://localhost:19006,mediaops://

# Durable Persistence
DATABASE_URL=sqlite:///media_ops.db
# Or PostgreSQL for production:
# DATABASE_URL=postgresql+psycopg://media_ops:media_pass@localhost:5432/media_ops_db
REDIS_URL=redis://localhost:6379/0

# Encryption key for storing Gmail refresh tokens securely (generate using cryptography.fernet)
# python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
ENCRYPTION_KEY=your_generated_32_byte_base64_fernet_key

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/auth/callback
MOBILE_REDIRECT_URI=mediaops://auth

# Initial Administrator
ADMIN_EMAIL=media-admin@yourdomain.edu

# Demo Mode (Strictly disabled in production)
DEMO_ENABLED=true
```

---

## 4. Running the Backend Locally

```bash
cd backend

# Install dependencies with uv
uv sync

# Run database migrations (or creates SQLite schema automatically in dev)
uv run uvicorn app.main:create_app --factory --reload --port 8000
```

Verify backend health:
```bash
curl http://localhost:8000/health
# Response: {"status":"ok"}
```

---

## 5. Running the Mobile App (Expo)

```bash
cd mobile

# Install dependencies
npm install

# Start development server
npm start
```

Press `a` to open Android Emulator, `i` to open iOS Simulator, or scan the QR code using the Expo Go / Development Build client on your mobile device.

To run against the local backend from a physical device or emulator, set `EXPO_PUBLIC_API_URL`:
```bash
EXPO_PUBLIC_API_URL=http://<YOUR_LOCAL_IP>:8000 npm start
```

---

## 6. Demo Mode vs Production

- **Demo Mode**:
  - Activated by tapping **"Explore Interactive Demo"** on the mobile Sign-In screen when `DEMO_ENABLED=true`.
  - Seeds synthetic events, ambiguous requests, follow-up proposals, and completed requests.
  - Clearly badged with an amber indicator throughout the interface.
- **Production Mode**:
  - Setting `ENVIRONMENT=production` in the backend rejects `DEMO_ENABLED=true`.
  - Requires valid Google OAuth authentication and verified workspace allowlist.
