# Karunya Media Desk — K identity

The cobalt geometric K is the current identity, matching the approved UI previews.

- `karunya-k.svg`: editable vector master, also drawn by `src/components/Brand.tsx`.
- `karunya-k-icon.png`: 1024px launcher icon on warm paper.
- `karunya-k-adaptive.png`: transparent Android foreground with mask-safe padding.
- `karunya-k-monochrome.png`: alpha silhouette for Android themed icons.
- `karunya-k-mark.png`: transparent splash mark.
- `karunya-k-favicon.png`: browser icon.

Both `app.json` and `app.config.js` point to this set. Existing icon files are retained as previous versions. A native rebuild is required for an installed app's launcher and splash assets to change.
