# Product Requirements Document (PRD)
## Smart Media Mail Assistant
**Project title:** *Smart Media Mail Assistant: An AI-Powered Email Analysis, Deadline Prioritization, and Reminder System for Event Management*  
**Project type:** AI-based application  
**Domain:** Artificial Intelligence, Natural Language Processing (NLP), Email Automation, and Task Management  
**Target users:** Media Heads, Audio Teams, Video Teams, Event Coordinators, and Technical Support Teams

## 1. Project Overview
The Smart Media Mail Assistant is an AI-powered application designed to help media teams manage event-related emails efficiently. Media heads often receive emails containing event details, technical requirements, deadlines, and schedules. Important information can be overlooked among a large number of messages.

The application connects to an authorized email account, analyses relevant emails, generates short summaries, extracts event details and audio/video requirements, identifies deadlines, prioritizes tasks, and sends reminders before scheduled events or task deadlines.

**Main objective:** Ensure that important events, technical requirements, and deadlines are less likely to be missed because an email was overlooked.

## 2. Problem Statement
Media departments receive emails about university events, meetings, conferences, cultural programs, chapel services, and other activities. These emails may contain event names, dates, venues, equipment requirements, setup deadlines, responsibilities, and schedule changes.

Managing this information manually can cause:
- Important emails to get buried.
- Event details to be recorded manually.
- Audio/video requirements to be overlooked.
- Approaching deadlines to receive insufficient attention.
- Team members to forget pending tasks.
- Last-minute preparations caused by missed information.

An intelligent system is needed to organize email information, identify priorities, and notify users about upcoming responsibilities.

## 3. Proposed Solution
The application will:
1. Let users sign in and securely connect their email accounts.
2. Retrieve and analyse relevant emails.
3. Generate concise email summaries.
4. Extract event details and audio/video requirements.
5. Identify event dates, setup deadlines, and task deadlines.
6. Assign priority levels based on urgency and importance.
7. Display events, requirements, and tasks on a centralized dashboard.
8. Send reminders before events and deadlines.
9. Identify relevant follow-up emails and potential schedule changes.

### Example
**Email subject:** Audio and Video Arrangements for Annual Day

The email states that University Annual Day is scheduled for 25 October 2026 at 5:00 PM in the Main Auditorium. It requests four wireless microphones, one digital mixing console, two speakers, stage monitors, a projector, an LED screen, and two video cameras. Technical setup must be complete by 3:00 PM.

**AI-generated summary**
- **Event:** University Annual Day
- **Date:** 25 October 2026
- **Event time:** 5:00 PM
- **Venue:** Main Auditorium
- **Setup deadline:** 3:00 PM
- **Audio:** Four wireless microphones, one digital mixing console, two speakers, stage monitors
- **Video:** Projector, LED screen, two video cameras
- **Suggested priority:** High
- **Status:** Pending

The system could schedule a preparation reminder one day before the event and additional reminders before the setup deadline. Users should be able to customize reminder timings.

## 4. Project Objectives
1. **Automated email analysis:** Identify important event-related emails.
2. **Email summarization:** Reduce the time needed to understand lengthy messages.
3. **Requirement extraction:** Identify audio, video, and other technical requirements.
4. **Deadline detection:** Extract event dates, setup deadlines, and task completion dates.
5. **Intelligent prioritization:** Rank tasks by urgency, importance, and status.
6. **Automated reminders:** Notify users before events and deadlines.
7. **Centralized dashboard:** Display summaries, upcoming events, and pending tasks.
8. **Team coordination:** Reduce missed requirements and improve event preparation.

## 5. Target Users

| User role | Main needs |
|---|---|
| Media Head | Review requests, priorities, and deadlines |
| Audio Team | Identify audio equipment and prepare arrangements |
| Video Team | Identify camera, projector, LED screen, and recording needs |
| Event Coordinator | Track schedules and communicate updates |
| Technical Support Team | Monitor assigned tasks and complete preparations |

The first version can focus on the media head and expand to multiple team members later.

## 6. Functional Requirements

### FR-01: User Authentication
The application shall allow users to sign in securely and connect an email account. Use OAuth authentication rather than asking users to share email passwords.

### FR-02: Email Integration
The application shall:
- Retrieve relevant emails.
- Identify new incoming messages.
- Read subject, sender, received date, and authorized message content.
- Process supported attachments where feasible.
- Avoid processing the same email repeatedly.
- Synchronize new emails.

Gmail API can be used for the first version; Microsoft Graph can be added for Outlook.

### FR-03: AI-Based Email Summarization
The system shall create concise summaries that preserve key dates, times, requirements, and instructions.

**Example:** “Conference on 28 October at the Main Auditorium. Audio setup requires six microphones and a digital mixing console. Video needs include two cameras and a projector. Setup must be completed by 9:00 AM.”

### FR-04: Event Information Extraction
The system shall extract:
- Event name and description
- Event date and start/end times
- Venue and organizer
- Setup deadline and task deadlines
- Audio and video requirements
- Assigned team or responsible person, when stated

Missing or unclear details must be marked as unspecified or flagged for confirmation rather than invented.

### FR-05: Audio and Video Requirement Detection
The system shall categorize technical requirements.

**Audio examples:** microphones, speakers, audio mixers, stage monitors, digital mixing consoles, recording equipment, DI boxes, and accessories.

**Video examples:** cameras, projectors, LED screens, video switchers, capture devices, recording systems, and displays.

Users should be able to edit extracted requirements.

### FR-06: Deadline Detection
The system shall identify event dates and task deadlines and distinguish event start time from setup completion time. It should interpret relative dates using the email's received date and the applicable timezone. Ambiguous deadlines should be flagged for confirmation.

### FR-07: Intelligent Task Prioritization
The first version shall use three priority levels:

| Priority | Meaning | Example |
|---|---|---|
| High | Urgent or critical task with an approaching deadline | Audio setup due in one hour |
| Medium | Important task with adequate preparation time | Prepare equipment for tomorrow's event |
| Low | Non-urgent task with a distant deadline | Review requirements for next month's event |

Priority should consider deadline proximity, event importance, task status, and explicit urgency. It should not depend only on how soon the event occurs.

### FR-08: Automated Reminder System
The application shall support configurable reminders, such as:
- One day before an event
- Three hours before a deadline
- One hour before a deadline
- Thirty minutes before a deadline
- Custom reminder times

**Example notification:**  
**High Priority: Audio Setup Deadline Approaching**  
The audio setup for University Annual Day must be completed by 3:00 PM today. Required equipment: four wireless microphones, a digital mixing console, speakers, and stage monitors.

The system must prevent duplicate notifications, allow tasks to be marked complete, and reschedule future reminders when event details change. Reminders must work even when the dashboard is closed.

### FR-09: Centralized Dashboard
The dashboard shall display:
- Recent email summaries, sender, and subject
- Upcoming events, date, time, venue, and requirements
- High-priority and overdue tasks
- Separate audio and video checklists
- Upcoming reminders and schedule changes

### FR-10: Task Management
Users shall be able to view tasks, mark them complete, edit deadlines and requirements, change priority, and—if supported—assign tasks to team members.

### FR-11: Follow-Up Email Analysis
The system should associate follow-up emails with existing events when possible. For example, if an email postpones Annual Day from 25 October to 27 October, the system should detect the possible change, ask for confirmation when necessary, update the event, and adjust future reminders.

### FR-12: Search and Filtering
Users shall be able to search or filter by event name, date, sender, priority, task status, audio/video requirement, and upcoming or overdue deadlines.

## 7. Non-Functional Requirements

| Requirement | Description |
|---|---|
| Security | Use authorized authentication and secure token storage |
| Privacy | Process only email data authorized by the user |
| Performance | Display summaries and extracted information within a reasonable time |
| Reliability | Deliver scheduled reminders consistently |
| Scalability | Support additional users and email accounts |
| Usability | Keep the dashboard understandable for non-technical users |
| Accuracy | Validate dates, deadlines, requirements, and summaries |
| Availability | Recover from temporary API or network failures |
| Maintainability | Keep email, AI, database, and reminder modules separate |

## 8. Proposed System Architecture

### Main components
1. **Frontend:** Dashboard and user interaction; React.js, HTML, CSS, and JavaScript.
2. **Backend:** Authentication, synchronization, AI processing, task management, and notifications; Python with FastAPI or Flask.
3. **Email integration:** Gmail API initially; Microsoft Graph optionally.
4. **AI processing:** Email classification, summarization, structured extraction, deadline identification, and requirement detection.
5. **Database:** PostgreSQL or MySQL for events, tasks, preferences, and reminder schedules.
6. **Reminder service:** A persistent background scheduler, such as Celery with Redis, plus email or browser notifications.

### Architecture flow

```text
User
  |
  v
Web Application
  |
  v
Secure Authentication
  |
  v
Email Integration (Gmail / Outlook)
  |
  v
Email Processing
  |
  v
AI Engine
  |-- Email Summary
  |-- Audio/Video Requirement Extraction
  |-- Deadline Detection
  |
  v
Priority Engine
  |
  v
Database
  |-------------------|
  v                   v
Dashboard       Reminder Service
                      |
                      v
                 Notifications
```

## 9. AI and Machine Learning Methodology

### Step 1: Email classification
Classify messages into categories such as event request, audio requirement, video requirement, schedule change, task assignment, or general email. Irrelevant messages should not clutter the event dashboard.

### Step 2: Text preprocessing
Extract the meaningful message body, remove unnecessary formatting, handle quoted replies, and process supported attachments while preserving important information.

### Step 3: Summarization
Generate a concise summary that preserves important event details and requirements.

### Step 4: Structured information extraction
Extract fields into a predictable structure. Example:

```json
{
  "event_name": "University Annual Day",
  "event_date": "2026-10-25",
  "event_time": "17:00",
  "venue": "Main Auditorium",
  "setup_deadline": "2026-10-25T15:00:00",
  "audio_requirements": [
    "4 wireless microphones",
    "1 digital mixing console",
    "2 speakers",
    "Stage monitors"
  ],
  "video_requirements": [
    "Projector",
    "LED screen",
    "2 video cameras"
  ],
  "status": "Pending"
}
```

This is an illustrative format. The actual implementation should include the applicable timezone and leave missing values unset rather than guessing.

### Step 5: Deadline analysis
Compare the current time with extracted deadlines. The system may flag deadlines in the next few hours as approaching and past deadlines as overdue, unless the task is completed or the deadline has changed. Thresholds should be configurable.

### Step 6: Priority calculation
Use a rules-based system initially, considering deadline proximity, event importance, and task status. More advanced prediction can be considered after collecting reliable data.

### Step 7: Reminder scheduling
Schedule notifications based on deadlines and user preferences. Handle completed tasks, cancelled events, changed deadlines, duplicate reminders, and delivery failures.

## 10. User Workflow
1. The media head opens the application.
2. The user signs in and authorizes access to the relevant email account.
3. The application retrieves and analyses relevant emails.
4. The AI engine summarizes messages and extracts event details.
5. Audio and video requirements are identified.
6. Deadlines are extracted and tasks are created.
7. The priority engine ranks tasks.
8. The dashboard displays summaries, requirements, deadlines, and priorities.
9. The reminder service sends notifications at configured times.
10. Follow-up emails are checked for event changes and relevant reminders are updated.
11. The user reviews the information and marks completed tasks.

## 11. User Interface Requirements

### Screen 1: Login page
- Application name and logo
- Sign-in option
- Connect Gmail or Outlook
- Privacy information

### Screen 2: Main dashboard
- Upcoming event count
- Pending, high-priority, and overdue tasks
- Recent email summaries
- Upcoming deadlines

### Screen 3: Email analysis page
- Subject, sender, and received date
- AI-generated summary
- Extracted event details
- Audio/video requirements
- Link to review the original email

### Screen 4: Event details page
- Event date, time, and venue
- Setup deadline
- Audio and video checklists
- Assigned tasks and status

### Screen 5: Reminder settings
- Default reminder timings
- Email and browser notifications
- Event and task reminders

### Screen 6: Task management page
- Pending, completed, high-priority, and overdue tasks
- Task deadlines and status

## 12. Project Scope

### Phase 1: Minimum Viable Product (MVP)
1. Secure login
2. Gmail integration
3. Retrieval of relevant emails
4. AI-generated summaries
5. Event information extraction
6. Audio/video requirement extraction
7. Deadline identification
8. Rule-based prioritization
9. Central dashboard
10. Automated reminders

The MVP should demonstrate the complete process from receiving an email to notifying the user about an upcoming deadline.

### Phase 2: Advanced features
- Microsoft Outlook integration
- Follow-up email and event-change detection
- Team member assignment
- Shared event checklists
- Calendar integration
- Multiple notification channels
- Attachment analysis
- Advanced priority prediction
- Workload analysis
- Event conflict detection

### Out of scope for the initial version
- Replacing the organization's email system
- Automatically sending replies on behalf of the media head
- Purchasing or reserving equipment
- Controlling physical audio/video equipment
- Treating AI-generated information as correct without verification

## 13. Suggested Technology Stack

| Component | Recommended technology |
|---|---|
| Frontend | React.js |
| UI styling | CSS or Tailwind CSS |
| Backend | Python with FastAPI |
| Email integration | Gmail API |
| Authentication | Google OAuth 2.0 |
| AI processing | Python, NLP, and an LLM |
| Database | PostgreSQL |
| Background tasks | Celery with Redis |
| Date/time processing | Python datetime and timezone libraries |
| Notifications | Email and browser notifications |
| Deployment | Suitable cloud platform |

These are suggestions, not mandatory choices. Simpler alternatives may be used depending on project time and resources.

## 14. Data Requirements

| Entity | Important fields |
|---|---|
| User | User ID, email address, preferences |
| Email | Email ID, sender, subject, received date, relevant content |
| Event | Event ID, name, date, time, venue |
| Requirement | Requirement ID, event ID, category, equipment, quantity |
| Task | Task ID, description, deadline, priority, status |
| Reminder | Reminder ID, task ID, scheduled time, delivery status |

Avoid storing unnecessary email content. Retain only the information needed for the service and apply appropriate access controls and data-retention policies.

## 15. Security and Privacy Requirements
1. Use secure OAuth authentication.
2. Request only the email permissions required.
3. Never ask users to provide their email password directly.
4. Store authentication tokens securely.
5. Encrypt network communication.
6. Restrict access to each user's email-derived information.
7. Provide an option to disconnect the email account.
8. Support deletion of stored information when requested, subject to applicable retention requirements.
9. Do not send confidential email content to external AI services without appropriate authorization.
10. Treat email content as untrusted input; instructions inside an email must not override the application's system behavior.

Read-only email access should be preferred for the first version wherever possible.

## 16. Expected Outcomes
- Less time spent manually reading emails
- Faster identification of important event requests
- Better visibility of audio and video requirements
- Improved deadline management
- Fewer missed reminders
- Better event preparation
- Centralized view of technical responsibilities
- Improved organization of media team operations

The application supports the media head's decision-making; it does not replace human judgment.

## 17. Success Criteria

| Metric | Evaluation method |
|---|---|
| Email classification accuracy | Compare predictions with manually labelled emails |
| Summary quality | Check preservation of essential details |
| Information extraction accuracy | Compare extracted fields with source emails |
| Deadline extraction accuracy | Measure correctness of dates and times |
| Reminder reliability | Verify delivery at configured times |
| Duplicate task rate | Check repeated task creation |
| Update detection accuracy | Test changed dates and cancelled events |
| Usability | Collect feedback from media team members |

The team may set an initial target, such as at least 90% accuracy for clearly stated dates and equipment requirements on a labelled test set. Actual performance must be measured rather than assumed.

## 18. Potential Challenges and Solutions

| Challenge | Proposed solution |
|---|---|
| Lengthy or unclear emails | Use summarization and structured extraction |
| Indirect or ambiguous deadlines | Combine NLP extraction with date/time validation |
| Multiple events in one email | Separate events and associate requirements correctly |
| Follow-up emails change details | Link related messages and detect changes |
| Incorrect AI extraction | Show source references and allow user corrections |
| Duplicate emails about one event | Use event matching and duplicate detection |
| Repeated reminders | Track notification history and use idempotent scheduling |
| Too many notifications | Offer configurable reminders and preferences |
| Email privacy risks | Use OAuth, limited permissions, secure storage, and data minimization |

## 19. Future Enhancements
1. **Intelligent workload distribution:** Recommend team assignments based on availability and responsibilities.
2. **Equipment inventory:** Compare event requirements against available equipment.
3. **Calendar synchronization:** Integrate with Google Calendar or Outlook Calendar.
4. **Natural language queries:** Let users ask, “What are today's important events?”, “Which events need wireless microphones?”, or “What tasks must be completed before 3 PM?”
5. **Event conflict detection:** Identify overlapping events that may need the same equipment or team members.
6. **Intelligent change detection:** Detect changes in dates, times, venues, and requirements, requesting confirmation where needed.
7. **Workload and deadline prediction:** Use historical task data to identify events that may need extra preparation time.

## 20. Final Project Summary
The **Smart Media Mail Assistant** is an AI-powered email management and task prioritization application for media departments and event support teams. It connects to an authorized email account, analyses event-related emails, generates short summaries, extracts audio and video requirements, identifies deadlines, assigns task priorities, and schedules reminders.

Instead of manually searching through many emails, the media head can use one dashboard to identify important events, understand technical requirements, monitor pending tasks, and prepare for approaching deadlines. The integration of NLP, AI-based information extraction, deadline analysis, and automated notifications makes the project a practical application of AI in institutional event management.

**Proposed project title:** *Smart Media Mail Assistant: An AI-Powered Email Analysis, Deadline Prioritization, and Reminder System for Event Management*
