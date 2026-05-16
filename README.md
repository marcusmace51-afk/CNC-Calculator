# CNC Machining Calculator

Lathe + Mill speeds & feeds calculator. Single-file HTML, no build pipeline,
installable as a PWA on iOS/Android.

Live: <https://YOUR-USERNAME.github.io/cnc-calc/>

## Install on iPhone

1. Open the live URL in Safari (not Chrome)
2. Tap the **Share** button → **Add to Home Screen** → Add
3. Open it from the home screen — full-screen dark theme, no browser chrome
4. Works offline after first open

## Files

- `index.html` — entire app (HTML + CSS + JS in one file, ~770 KB)
- `manifest.json` — PWA manifest (start_url, icons, theme color)
- `sw.js` — service worker (offline cache, opt-in updates)
- `offline.html` — fallback shown if app shell can't load
- `icon.svg` / `icon-180.png` / `icon-192.png` / `icon-512.png` — app icons
- `fonts/` — IBM Plex Mono + Sans (latin subset, locally hosted for offline)

## Update flow

1. Edit `Full Calculator Prototypes/cnc-calculator-v1_0.html` in the dev folder
2. Bump the `VERSION` string in `Full Calculator Prototypes/sw.js` (e.g. `v10` → `v11`)
3. Run `bash deploy.sh` (from the parent dir) — copies the latest files into `deploy/`
4. `cd deploy && git add -A && git commit -m "update" && git push`
5. GitHub Pages re-deploys automatically (~30 s)
6. Open the PWA on your phone — you'll see a "New version available" toast.
   Tap it to reload onto the latest version.
