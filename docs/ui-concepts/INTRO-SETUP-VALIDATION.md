# Intro setup validation — 25 October 2026

Implemented per-account/workspace/device resumable setup with administrator Gmail connection, shared staff status, real initial-sync status and recovery, reminder preferences, explicit notification permission and optional widget setup. Settings supports replay. Notification and widget deep links wait until setup finishes.

Validation: mobile TypeScript and 52 tests across 18 suites pass. Tests cover persistence, account isolation, sync baseline and queue states, retry, role restrictions, reminders and deferred routing. Read-only code review found no actionable issues.

A local web walkthrough using synthetic API/OAuth fixtures verified sign-in into setup, connection redirect/resume, queued sync through completion, reminder saving, widget preview, completion surviving reload and Settings replay. The welcome screenshot is `intro-welcome-web.png`. This is web/fixture evidence; real Gmail authorization, Android notification permission and launcher pinning were not retested on a device in this iteration.

No APK was built or replaced.
