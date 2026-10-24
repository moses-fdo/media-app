# System Architecture Document
## Smart Media Mail Assistant (Mobile & Backend Ecosystem)

**Document Version:** 1.1.0  
**Status:** Approved Architectural Blueprint  
**Target Platform:** Mobile (iOS & Android via React Native Expo) + High-Performance Backend (Python FastAPI)  
**Author / Team:** Advanced Mobile & AI Systems Engineering Team  

---

## 1. Executive Summary & Architecture Vision

The **Smart Media Mail Assistant** is an intelligent, mission-critical event operations platform engineered for media heads, audio engineers, video technicians, and event coordinators. Media production environments in institutions, universities, and performance venues operate under tight, zero-fail deadlines where missed equipment requests (e.g., microphones, digital audio consoles, stage monitors, LED screens, video switchers) cause catastrophic production failures.

To address the challenges documented in the Product Requirements Document (PRD) and incorporate practical operational realities (walk-in events, email attachments, shared department inboxes, and native calendar syncing), this architecture adopts a **Distributed Hybrid Architecture**:
- **Mobile Client:** A high-performance, cross-platform mobile application built with **React Native (Expo SDK 51/52, TypeScript)**, utilizing a **Feature-Driven Clean Architecture**, **TanStack Query (React Query v5)** for server state synchronization and optimistic UI updates, **Zustand** for transient UI state, **MMKV** for persistent offline caching, and **expo-calendar** for native device integration.
- **Dedicated Backend:** A production-grade **Python FastAPI** service providing asynchronous REST APIs, WebSocket real-time feeds, secure OAuth 2.0 PKCE orchestration, and cryptographic token management.
- **Asynchronous AI, Attachment & Worker Pipeline:** **Celery** backed by **Redis** for 24/7 background email synchronization (Gmail API / Microsoft Graph), multi-document attachment extraction (`pypdf`, `python-docx`, Tesseract/Vision OCR), multi-stage AI extraction, priority scoring, and scheduled notifications.
- **Hybrid Notification & Calendar Engine:** Server-initiated **Remote Push Notifications (Expo Push / APNs / FCM)** coupled with **Local Device Notifications (expo-notifications)** and **Device Calendar Alarms (expo-calendar)** for fail-safe, offline-resilient alerts in RF-shielded auditoriums.
- **Multi-Channel Ingestion:** Automated email scanning + **Manual Walk-In Event Creation** (quick form and voice-to-text dictation) for emergency hallway or phone requests.

---

## 2. High-Level System Architecture & Context

### 2.1 C4 Context Diagram

```mermaid
C4Context
    title System Context Diagram - Smart Media Mail Assistant

    Person(mediaHead, "Media Head / Technician", "Manages events, equipment checklists, task assignments, and deadline reminders.")
    
    System(mobileApp, "Smart Media Mail Mobile App", "React Native / Expo iOS & Android client providing real-time dashboards, manual event entry, AV checklists, native calendar sync, and offline alerts.")
    
    System_Boundary(backendBoundary, "Cloud Backend Infrastructure") {
        System(apiServer, "FastAPI Backend Service", "Exposes REST & WebSocket APIs, brokers OAuth, enforces RBAC, and coordinates tasks.")
        System(workerCluster, "Celery Worker Cluster", "Processes background email sync, attachment parsing, AI extraction, and notification scheduling.")
        SystemDb(postgresDb, "PostgreSQL Database", "Stores users, shared mailboxes, encrypted tokens, events, equipment requirements, and tasks.")
        SystemDb(redisCache, "Redis Broker & Cache", "Task queues, pub/sub for real-time events, rate limits, and idempotency cache.")
    }

    System_Ext(googleApi, "Google Workspace / Gmail API", "OAuth 2.0 provider and email message store (personal & shared mailboxes).")
    System_Ext(msGraphApi, "Microsoft Graph (Outlook) API", "Optional Phase 2 enterprise email provider.")
    System_Ext(llmService, "LLM Extraction Service", "Structured NLP extraction via strict JSON Schema.")
    System_Ext(pushService, "Expo Push Notification Service", "Routes push notifications to Apple APNs and Google FCM.")
    System_Ext(deviceCalendar, "Native Device Calendar", "Apple Calendar / Google Calendar via expo-calendar.")

    Rel(mediaHead, mobileApp, "Interacts with, creates walk-ins, checks equipment", "Touch / Biometrics / Voice")
    Rel(mobileApp, apiServer, "Fetches data, mutates tasks, manual events", "HTTPS / WSS / JWT")
    Rel(mobileApp, deviceCalendar, "Syncs event setup deadlines & duration", "Native OS Calendar API")
    Rel(apiServer, postgresDb, "Reads and writes", "SQLAlchemy 2.0 / asyncpg")
    Rel(apiServer, redisCache, "Publishes events & queues jobs", "Redis Protocol")
    Rel(workerCluster, redisCache, "Consumes jobs & checks rate limits", "Redis Protocol")
    Rel(workerCluster, googleApi, "Fetches messages & attachments via OAuth", "REST HTTPS")
    Rel(workerCluster, msGraphApi, "Fetches messages via Graph API", "REST HTTPS")
    Rel(workerCluster, llmService, "Performs structured data extraction", "HTTPS / JSON Schema")
    Rel(workerCluster, pushService, "Dispatches scheduled reminders", "HTTPS")
    Rel(pushService, mobileApp, "Delivers APNs / FCM push notifications", "Push Notification Protocol")
```

---

## 3. Email Ingestion Standards & AI Processing Pipeline

### 3.1 Recommended Email Format Template for Organizers
To achieve **99%+ automated extraction accuracy**, institutions can distribute this standardized template to academic departments, student bodies, and event coordinators:

```text
Subject: [EVENT REQUEST] - <Event Name> - <Date: YYYY-MM-DD>

Dear Media & Technical Services Team,

Please review the following event request and technical requirements:

1. EVENT DETAILS:
- Event Title: University Annual Convocation 2026
- Date of Event: 25 October 2026
- Event Timing: 10:00 AM – 1:00 PM
- Venue / Room: Main Auditorium (Stage A)
- Organizer / Department: Office of the Academic Registrar
- On-Site Contact Person: Dr. Robert Vance (Mobile: +1-555-0199)

2. SETUP DEADLINE:
- Required Setup Completion: 8:00 AM (2 hours prior for live mic checks)

3. AUDIO REQUIREMENTS:
- Wireless Handheld Microphones: 4
- Podium Gooseneck Microphone: 1
- Digital Mixing Console: 1 (with stage multi-core snake)
- Stage Monitors (Foldback): 2 wedges
- Audio Recording: Required (Direct USB stereo feed)

4. VIDEO & DISPLAY REQUIREMENTS:
- Center Stage Projector & Screen: 1 (1080p / HDMI input from podium)
- Stage Left/Right LED Confidence Monitors: 2
- Video Cameras for Archival Recording: 2 tripod mounts
- Live Video Streaming: Yes (to university YouTube channel)

5. SPECIAL NOTES / VIP ATTENDANCE:
- Chancellor and University Board in attendance; mandatory soundcheck at 8:30 AM.

Thank you,
Events Coordinating Committee
```

### 3.2 Real-World Conversational Email Example (Messy / Informal)
The AI engine is trained and prompted to accurately parse informal, conversational emails where details are scattered:

```text
Subject: Re: Next week's symposium tech setup

Hi Media Crew,

Just checking in regarding the International Bioethics Symposium next Tuesday (Nov 17th). 
We booked the Science Hall auditorium from 2 PM to 5 PM. 

Can we make sure we have at least 3 lapel mics for the panelists and one cordless mic 
for audience Q&A? Also, our keynote speaker wants to show high-res slides, so we will need 
the 4K laser projector and an audio feed from their MacBook for video playback. 

Dean Sarah wants everything tested and running no later than 12:30 PM because the guest 
speakers arrive early. 

Attached is the full speaker schedule in PDF. Let me know if you need anything else!

Best,
Elena Rostova
Program Coordinator
```

**AI Parsed Result:**
- **Event:** International Bioethics Symposium
- **Date & Time:** Nov 17, 2026 (14:00 - 17:00) | **Venue:** Science Hall auditorium
- **Setup Deadline:** Nov 17, 2026 at 12:30 PM (Flagged 90 mins prior)
- **Audio:** 3 Lapel Microphones, 1 Wireless Handheld Mic (Audience Q&A), 3.5mm/HDMI MacBook Audio Feed
- **Video:** 1 4K Laser Projector
- **Priority:** 🟡 **MEDIUM** (4 days lead time, VIP attendance flagged)

---

### 3.3 Attachment Ingestion Subsystem (PDF, DOCX, Image OCR)
When an email body contains brief text like *"Please see attached schedule and AV sheet"*, the Celery background worker executes the attachment processing pipeline:

```mermaid
flowchart LR
    A[Email Attachment Detected] --> B{MIME Type Check}
    B -->|application/pdf| C[pypdf / pdfplumber Text Extractor]
    B -->|application/vnd.openxmlformats| D[python-docx Extractor]
    B -->|image/jpeg, png| E[Tesseract / Vision LLM OCR]
    B -->|other/unsupported| F[Log & Attach file metadata to Event]
    
    C --> G[Sanitize & Normalize Extracted Text]
    D --> G
    E --> G
    G --> H[Merge Attachment Text with Email Body]
    H --> I[Execute Tier-2 Structured LLM Extraction]
```

### 3.4 Pydantic Extraction Schema (with Attachment & Source Tracking)

```python
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class AudioRequirement(BaseModel):
    equipment_name: str = Field(description="Name of audio equipment")
    quantity: int = Field(default=1, description="Quantity requested")
    specifications: Optional[str] = Field(None, description="e.g. Lapel, Handheld, XLR, Podium")
    assigned_team: str = Field(default="AUDIO", description="Departmental routing")

class VideoRequirement(BaseModel):
    equipment_name: str = Field(description="Name of video equipment")
    quantity: int = Field(default=1, description="Quantity requested")
    specifications: Optional[str] = Field(None, description="e.g. HDMI, 4K, LED Wall, Live Stream")
    assigned_team: str = Field(default="VIDEO", description="Departmental routing")

class ExtractedEventData(BaseModel):
    is_event_request: bool = Field(description="True if contains institutional event or AV request")
    event_name: str = Field(description="Official name of the event")
    summary: str = Field(description="2-3 sentence executive summary")
    venue: Optional[str] = Field(None, description="Auditorium, Hall, or Room")
    event_start_datetime: Optional[datetime] = Field(None, description="Event start ISO-8601")
    event_end_datetime: Optional[datetime] = Field(None, description="Event end ISO-8601")
    setup_deadline: Optional[datetime] = Field(None, description="Setup deadline ISO-8601")
    contact_person: Optional[str] = Field(None, description="Organizer name and contact phone/email")
    audio_requirements: List[AudioRequirement] = Field(default_factory=list)
    video_requirements: List[VideoRequirement] = Field(default_factory=list)
    attachment_extracted_data: Optional[str] = Field(None, description="Highlights from attached PDF/docs")
    is_schedule_update: bool = Field(default=False, description="True if modifies an earlier event")
    confidence_score: float = Field(description="Confidence score 0.0 - 1.0")
```

---

## 4. Manual "Walk-In" Event Creation Architecture

In institutional environments, urgent requests arrive via phone, WhatsApp, or in-person walk-ins (*"Dean needs 2 mics in Hall B at 4 PM today"*). The mobile client and backend provide a dedicated fast-entry path:

```mermaid
sequenceDiagram
    autonumber
    actor Tech as Media Technician
    participant Mobile as React Native Mobile App
    participant Voice as OS Speech-to-Text
    participant Backend as FastAPI Backend
    participant DB as PostgreSQL DB

    Tech->>Mobile: Tap Floating Action Button "(+) Add Event"
    Mobile->>Tech: Display Modal: Form or Voice Dictation Tab
    alt Voice Dictation Mode
        Tech->>Voice: Dictate: "Faculty meeting in Boardroom 3 at 2 PM, setup by 1:30 PM, need 2 mics and a TV"
        Voice-->>Mobile: Transcribed Text
        Mobile->>Backend: POST /api/v1/events/parse-quick-text { raw_text }
        Backend-->>Mobile: Auto-fills Form Fields via LLM
    else Quick Form Mode
        Tech->>Mobile: Enters Title, Venue, Setup Deadline, Toggles Audio/Video Chips
    end
    Tech->>Mobile: Tap "Save Event & Schedule Reminders"
    Mobile->>Backend: POST /api/v1/events/manual
    Backend->>DB: Insert Event (source_type = 'MANUAL', user_verified = true)
    Backend->>Backend: Trigger Celery Reminder Scheduler
    Backend-->>Mobile: 201 Created { event_id }
    Mobile->>Mobile: Schedule Local Device Alarms & Sync to Native Calendar
    Mobile-->>Tech: Success Haptic Feedback + Dashboard Refresh
```

---

## 5. Mobile Client Architecture (React Native & Expo)

### 5.1 Technology Foundation
- **Framework:** React Native 0.74+ with **Expo SDK 51/52** (Managed Workflow with Custom Config Plugins).
- **Navigation:** **Expo Router v3** (File-based, deeply typed routes with native modal sheets).
- **Calendar Integration:** `expo-calendar` for direct synchronization to Apple Calendar and Google Calendar.
- **Speech Recognition:** `expo-speech` and OS native dictation APIs for hands-free event entry on stage.
- **State & Caching:** **TanStack Query v5** (server cache & optimistic updates) + **Zustand** (UI state) + **react-native-mmkv** (offline cache).
- **Styling:** Vanilla StyleSheet + Design Token System (curated HSL palettes, dark/light modes, 60/120 FPS native performance).

### 5.2 Mobile Folder Structure (Feature-Driven Modular Architecture)

```text
media-app-mobile/
├── app/                                # Expo Router file-based route definitions
│   ├── (auth)/
│   │   ├── login.tsx                   # OAuth sign-in with Google / Microsoft
│   │   └── callback.tsx                # Deep link OAuth callback handler
│   ├── (tabs)/
│   │   ├── _layout.tsx                 # Bottom navigation tab bar definition
│   │   ├── index.tsx                   # Central Dashboard (Overview, Metrics, Filter by Audio/Video)
│   │   ├── events/
│   │   │   ├── index.tsx               # Upcoming events list & calendar view
│   │   │   └── [id].tsx                # Event details, AV checklists, sync calendar button
│   │   ├── tasks/
│   │   │   ├── index.tsx               # Task management, my-assignments toggle
│   │   │   └── [id].tsx                # Task detail & technician assignment
│   │   ├── emails/
│   │   │   ├── index.tsx               # Analyzed email summaries feed
│   │   │   └── [id].tsx                # Email summary, attachment viewer, source toggle
│   │   └── settings/
│   │       ├── index.tsx               # User preferences, mailboxes, reminder windows
│   │       └── mailboxes.tsx           # Connect shared department inboxes
│   ├── modal/
│   │   ├── add-manual-event.tsx        # Fast Manual Event & Voice Dictation Entry Modal
│   │   ├── filter.tsx                  # Advanced filter modal (Audio vs Video vs All)
│   │   └── conflict-resolver.tsx       # Schedule change confirmation modal
│   ├── _layout.tsx                     # Root application layout (Providers, Notifications)
│   └── +not-found.tsx
├── src/
│   ├── api/                            # Core networking, Axios/Ky client, interceptors
│   ├── components/                     # Shared Atomic UI components (Badges, Cards, Checklists)
│   ├── features/
│   │   ├── auth/                       # useAuth, SecureStore token management
│   │   ├── calendar-sync/              # hooks/useDeviceCalendarSync, services/calendarManager
│   │   ├── events/                     # useEventsQuery, manualEventMutation, EventCard
│   │   ├── technical-requirements/     # AudioChecklist, VideoChecklist, useChecklistToggle
│   │   ├── tasks/                      # useTasksQuery, useTaskAssignment
│   │   ├── emails/                     # useEmailSummaries, AttachmentViewer
│   │   └── notifications/              # usePushRegistration, useLocalNotifications
│   ├── store/                          # Zustand uiStore (active crew filter: ALL | AUDIO | VIDEO)
│   ├── theme/                          # Colors, Typography, Spacing tokens
│   └── utils/                          # Timezone converters, date formatters
├── app.json
└── tsconfig.json
```

---

## 6. Shared Department Mailbox & Team Assignment Subsystem

### 6.1 Shared Mailbox Delegation
Universities and organizations receive event requests via shared mailboxes (`media-support@university.edu`, `av-services@...`).
- The Media Head or Admin authorizes the shared mailbox once via Google Workspace Service Account delegation or Microsoft Graph application permissions.
- Ingestion runs continuously for the shared mailbox.
- All media crew members who sign in have visibility into the central department queue.

### 6.2 Role-Based Filtering & Task Assignments
Technicians can switch their app dashboard context with one tap:
- **"All Requirements"** (Media Head overview)
- **"Audio Crew View"** (Filtered strictly to wireless mics, mixers, monitors, XLR runs)
- **"Video Crew View"** (Filtered strictly to LED walls, projectors, cameras, switchers)
- **"My Assignments"** (Tasks explicitly assigned to the logged-in technician)

When the Media Head taps **"Assign to Technician"** $\rightarrow$ *Marcus (Audio)*, the backend dispatches a targeted push notification:
> 🔔 **New Assignment:** "Marcus, you are assigned to Audio Setup for University Annual Day (Setup by 3:00 PM today)."

---

## 7. Native Device Calendar Integration (`expo-calendar`)

Technicians frequently plan their schedules inside native calendar apps (Apple Calendar on iOS, Google Calendar on Android). The mobile app includes a seamless, bidirectional sync engine:

1. **Auto-Calendar Creation:** On first launch, the app creates a dedicated native calendar named **"Media Team Deadlines"** with a distinct brand color (Electric Violet `#6366F1`).
2. **Setup Deadline Event:** Creates a high-priority calendar block for the **Setup Window** (e.g. 1:00 PM – 3:00 PM) with 1-hour and 15-minute native OS alarms.
3. **Event Runtime Block:** Creates a second block representing the actual event duration.
4. **Deep-Link URL:** The native calendar entry includes a clickable deep link (`mediaapp://events/{event_id}`) that opens the app directly to the equipment checklist.
5. **Auto-Update on Reschedule:** If an event is postponed or cancelled via follow-up email, the app updates or deletes the native calendar entry automatically.

---

## 8. AI Cost Guardrails & Circuit Breaker Architecture

To prevent accidental API budget spikes from automated email loops, newsletters, or malicious spam storms:

```mermaid
flowchart TD
    A[Incoming Email] --> B{Subject/Sender in Blacklist?}
    B -- Yes --> C[Drop immediately]
    B -- No --> D{Sender in Allowed Domain/List?}
    D -- No --> E{Subject contains AV/Event keywords?}
    E -- No --> C
    E -- Yes --> F[Check Hourly Rate Limit in Redis]
    D -- Yes --> F
    
    F --> G{"Rate Limit Exceeded? (> 60 calls/hr)"}
    G -- Yes --> H[Enqueue in Low-Priority Backlog & Alert Admin]
    G -- No --> I[Execute Tier-1 Fast Relevance Classifier]
    
    I --> J{Relevance Score >= 0.75?}
    J -- No --> K[Store Email as Ignored]
    J -- Yes --> L[Call LLM Structured Extraction]
```

---

## 9. Comprehensive Database Schema (PostgreSQL)

```mermaid
erDiagram
    USERS ||--o{ EMAIL_ACCOUNTS : owns
    USERS ||--o{ NOTIFICATION_TOKENS : registers
    USERS ||--o{ TASKS : assigned_to
    EMAIL_ACCOUNTS ||--o{ EMAILS : ingests
    EMAILS ||--o{ ATTACHMENTS : includes
    EMAILS ||--o{ EVENTS : extracts_into
    EVENTS ||--o{ AUDIO_REQUIREMENTS : specifies
    EVENTS ||--o{ VIDEO_REQUIREMENTS : specifies
    EVENTS ||--o{ TASKS : generates
    TASKS ||--o{ REMINDERS : triggers
    REMINDERS ||--o{ NOTIFICATION_DELIVERIES : logs

    USERS {
        uuid id PK
        string email UK
        string full_name
        string role "MEDIA_HEAD | AUDIO_TECH | VIDEO_TECH | COORDINATOR"
        jsonb preferences
        timestamp created_at
    }

    EMAIL_ACCOUNTS {
        uuid id PK
        uuid user_id FK
        string provider "GMAIL | OUTLOOK | SHARED_DELEGATED"
        string account_email
        text encrypted_refresh_token
        boolean is_shared_mailbox
        timestamp last_synced_at
    }

    EMAILS {
        uuid id PK
        uuid account_id FK
        string message_id UK
        string thread_id
        string sender
        string subject
        text body_text
        timestamp received_at
        boolean is_event_related
        float classification_confidence
    }

    ATTACHMENTS {
        uuid id PK
        uuid email_id FK
        string filename
        string content_type
        integer file_size
        string s3_storage_path
        text extracted_text
        boolean parsed_by_ai
    }

    EVENTS {
        uuid id PK
        uuid source_email_id FK "Nullable for manual events"
        string source_type "EMAIL | MANUAL_FORM | MANUAL_VOICE"
        string title
        text summary
        string venue
        timestamp event_start_time
        timestamp event_end_time
        timestamp setup_deadline
        string timezone
        string status "CONFIRMED | PENDING | CANCELLED | POSTPONED"
        string contact_person
        string native_calendar_event_id
        uuid created_by_user_id FK
        timestamp created_at
    }

    AUDIO_REQUIREMENTS {
        uuid id PK
        uuid event_id FK
        string equipment_name
        integer quantity
        text specifications
        boolean is_prepared
        boolean is_tested
        uuid checked_by_user_id FK
    }

    VIDEO_REQUIREMENTS {
        uuid id PK
        uuid event_id FK
        string equipment_name
        integer quantity
        text specifications
        boolean is_prepared
        boolean is_tested
        uuid checked_by_user_id FK
    }

    TASKS {
        uuid id PK
        uuid event_id FK
        string description
        string priority "HIGH | MEDIUM | LOW"
        string category "AUDIO | VIDEO | LOGISTICS"
        timestamp deadline
        string status "PENDING | IN_PROGRESS | COMPLETED"
        uuid assigned_to_user_id FK
        timestamp completed_at
    }

    REMINDERS {
        uuid id PK
        uuid task_id FK
        uuid event_id FK
        timestamp scheduled_time
        string trigger_type "ONE_DAY_BEFORE | THREE_HOURS_BEFORE | ONE_HOUR_BEFORE | THIRTY_MINS_BEFORE | CUSTOM"
        boolean is_active
    }

    NOTIFICATION_DELIVERIES {
        uuid id PK
        uuid reminder_id FK
        string push_token
        string channel "APNS | FCM | LOCAL"
        string delivery_status "DELIVERED | FAILED | SNOOZED"
        timestamp delivered_at
    }
```

---

## 10. REST API & WebSocket Specifications

### 10.1 Key REST Endpoints

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/v1/auth/google/exchange` | Exchanges PKCE auth code for JWT session | No |
| `GET` | `/api/v1/events` | Lists events (filterable by `crew_type`: ALL, AUDIO, VIDEO) | Yes |
| `POST` | `/api/v1/events/manual` | Creates a manual walk-in or phone request event | Yes |
| `POST` | `/api/v1/events/parse-quick-text` | Takes raw voice dictation text and returns structured fields | Yes |
| `GET` | `/api/v1/events/{id}` | Returns event detail, AV checklists, and assigned crew | Yes |
| `PATCH` | `/api/v1/events/{id}/requirements/{req_id}` | Toggles equipment prepared/tested with audit user ID | Yes |
| `POST` | `/api/v1/events/{id}/sync-calendar` | Generates payload for device native calendar sync | Yes |
| `GET` | `/api/v1/tasks` | Lists tasks with status, priority, and assignment filters | Yes |
| `PATCH` | `/api/v1/tasks/{id}/assign` | Assigns a task to a technician & dispatches push notification | Yes |
| `GET` | `/api/v1/emails/analyzed` | Lists parsed emails with attachment extraction badges | Yes |
| `POST` | `/api/v1/notifications/register-token` | Registers Expo Push token for iOS / Android device | Yes |

---

## 11. Architecture Decision Records (ADRs) Summary

| Decision ID | Context / Question | Selected Alternative | Architectural Rationale |
|---|---|---|---|
| **ADR-01** | Mobile Framework | **React Native + Expo (TypeScript)** | Single cross-platform codebase, native 60/120 FPS UI, robust push notifications and EAS update support. |
| **ADR-02** | Backend & Processing | **FastAPI + Celery + PostgreSQL** | Guarantees continuous 24/7 email monitoring, document parsing, and reminder execution independent of phone state. |
| **ADR-03** | State Management | **TanStack Query v5 + Zustand + MMKV** | Decouples server state from UI state; MMKV guarantees $< 15\text{ms}$ cold-start hydration when offline. |
| **ADR-04** | Ingestion Channels | **Dual (Automated Email + Manual Walk-in)** | Captures both structured email requests and emergency hallway/phone walk-in requests via voice or quick form. |
| **ADR-05** | Attachment Parsing | **Asynchronous Celery Pipeline (`pypdf`, OCR)** | Extracts crucial run-of-show sheets and tech specs from attached PDFs/Word docs when the email body is brief. |
| **ADR-06** | Notification Strategy | **Hybrid Remote Push + Local Device Alarms** | Remote alerts handle server updates; local `expo-notifications` guarantee alarms ring inside RF-shielded auditoriums. |
| **ADR-07** | Calendar Integration | **Native OS Sync via `expo-calendar`** | Places setup deadlines directly on technicians' native Apple/Google Calendar widgets with deep links to checklists. |
| **ADR-08** | Ingestion Safety | **Redis Token Bucket Rate Limiting** | Protects external LLM APIs from bill shocks during email reply loops or departmental newsletter blasts. |

---

*This document serves as the formal architectural reference for all implementation phases of the Smart Media Mail Assistant.*
