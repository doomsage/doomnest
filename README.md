# DoomNest

Doomsage app hub. Static site, no build step.

## Add a new app

1. Copy `apps/doomloader/` to `apps/<new-id>/`. Replace `icon.svg` (or use a png and set `"icon"` in `app.json`) and edit `app.json` (name, about, package, steps, `release.apkUrl` and `release.version` when an APK exists, `screenshots` file names placed in the same folder).
2. Add `"<new-id>"` to the list in `apps.json`.
3. Commit to main. Vercel deploys it. No edit to `index.html` needed.

Folders: `apps/` one folder per app, `assets/` shared images (the logo). `2-logo.png` is the original logo, kept as is.
