# Karunya Media Desk

<!-- impeccable:product-schema 1 -->

## Platform

android

## Users and purpose

Karunya media staff organize department Gmail requests into events, review email changes, and coordinate audio/video equipment. The Expo client also supports web; this iteration targets physical Android phones and their home screens.

## Capabilities and constraints

- Preserve working Google login, staff access, request review, editing, event confirmation and reminders.
- Equipment is displayed as text with quantities and notes, without preparation-state controls.
- The approved Android home-screen widget shows the next three upcoming events, date/time and venue, and opens requests on tap.
- The widget uses the last successful app synchronization, labels freshness, and excludes completed, cancelled and dismissed events. It must not store credentials or expose a previous account after logout.
- Build a new internal-testing APK after the approved UI improvements and unused-code cleanup. Keep physical-device validation distinct from automated and web checks.

## Brand commitments

Preserve the Karunya K identity and the existing paper, charcoal and cobalt visual system. Refine hierarchy, spacing, readability, touch targets and dark mode.

## Evidence on hand

The user confirmed that Google login works on a physical phone. Existing screenshots under `../docs/ui-concepts/` are synthetic visual fixtures, not live mailbox evidence.

## First-run setup

After Google sign-in, guide each account through a welcome, shared Gmail connection, initial sync, reminders and optional Android widget. Only administrators can connect Gmail; staff see shared connection status. Sync reflects actual mailbox and extraction progress, with retry and reconnect guidance. Setup can be skipped, resumes after OAuth or restart, and can be replayed from Settings. Notification permission is requested only on an explicit action. Completion is stored per account, workspace and device.

## Approved phone usability pass

Use native date/time pickers, inline validation with scroll recovery, account-scoped resumable drafts, consistent 48dp controls, remembered system/light/dark appearance and reduced-motion support. Requests highlights the next future event and pending reviews. Keep filters visible when collapsed and provide reset and recovery actions. Support narrow widths, large text, landscape and keyboard resizing.

## Email intake policy

Only correctly structured media-request template emails create new imported events. Ordinary campus circulars, newsletters, subject tags alone and casual equipment mentions remain excluded. Review is for ambiguous values in a qualifying template and structured updates linked to an existing request. Old untouched non-template imports are reversibly excluded during sync after the backend update is deployed.

## Personal Gmail flow — 25 October 2026

The current app is for individuals: sign in with Google, grant read-only Gmail access, and see events imported from that account. Each Google identity owns a separate private workspace. Profile roles, shared-inbox setup, team management and equipment assignment controls are absent from the personal interface. Copy uses “Your Gmail” and “Your events”, with no hardcoded account names or email addresses.

New personal accounts open Requests directly and use the existing automatic synchronization. Setup is optional and can be replayed from Settings for connection recovery, reminders and widget setup. Settings offers the user's own Gmail connection and imported-data controls. This replaces earlier shared-account product assumptions in this document.
