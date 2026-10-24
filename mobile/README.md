# Media Ops — Mobile Client

Native Expo / React Native application for media department staff.

## Features
- **Requests Queue**: Categorized tabs (`Needs Review`, `Today`, `Upcoming`, `Completed`, `All`) with offline caching.
- **Agenda View**: Chronological grouping of events with localized date labels.
- **Request Detail & Edit**: Optimistic concurrency versioning, equipment requirement testing, assignment, notes, and raw email inspection.
- **Push Reminders**: Device push notification token registration with customizable advance reminder offsets (24h, 1h).
- **Settings & Administration**: Mailbox status/syncing, team member allowlist management, and excluded senders.
- **Theme Support**: Adaptive system light and dark color schemes.

## Development

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on web
npm run web

# Typecheck and tests
npm run typecheck
npm test
```

## Android Builds

To produce a standalone Android APK using EAS:
```bash
npx eas build -p android --profile preview
```
The APK output is configured via `eas.json` under the `preview` profile (`buildType: "apk"`).
