# Vibes Spaces

Monorepo for the Vibes Spaces venue control surface — a Next.js dashboard and an Electron playback client backed by Supabase.

See [`Specs/`](./Specs) for the canonical product, technical, and design specifications.

## Workspaces

- [`shared/`](./shared) — `@vibes/shared`: types, scheduling resolver, design tokens, heartbeat helpers. Single source of truth for the contract between dashboard and client.
- [`web/`](./web) — `@vibes/web`: Next.js 14 dashboard with PWA wrapper. Operator's mobile/desktop control surface plus the `/preview` browser playback route.
- [`electron-app/`](./electron-app) — `@vibes/electron-app`: Windows kiosk-mode playback client. Fullscreen video on a venue display, auto-updates from GitHub Releases.
- [`supabase/`](./supabase) — schema migrations (`0001` initial, `0002` overlays + loop, `0003` scene composition).

## Quick start

```bash
npm install
cp .env.example .env                # then fill in NEXT_PUBLIC_* in web/.env.local
                                    # and VITE_* in electron-app/.env
npm test                            # resolver contract tests
npm run dev:web                     # dashboard at http://localhost:3000
npm run dev:electron                # client window (renderer at http://localhost:5173 internally)
```

The dashboard's `/preview` route at `http://localhost:3000/preview` runs the same playback engine in a browser — open it alongside the operator UI for a live mirror of what's on the venue display.

## What's live

### Dashboard (`web/`)

Six tabs:

| Tab | What it does |
|---|---|
| **Now** | Heartbeat dot · current scene · force-play banner · live overlay quick-tap chips · link to `/preview` |
| **Scenes** | Upload `.mp4` → Supabase Storage · per-scene **Loop** toggle · per-scene **attribution** toggle · **Compose** button (per-scene composition editor) · **Play now** force trigger · delete |
| **Overlays** | Live-trigger templates: speaker card · text (1–2 lines) · logo image. Choose animation (fade / slide-in-left / slide-up) and hold duration. Tap **Show now** to push to venue |
| **Playlists** | Multi-select scene ordering · delete |
| **Schedule** | Weekly mask or one-off date entries · time window · target scene or playlist |
| **Settings** | Default fallback scene · global attribution toggle |

### Scene composition editor (Scenes tab → Compose)

Fullscreen authoring tool that mirrors the Vibes Studio mockup:

- 3 image zones: **header / center / footer**, each with left/center/right horizontal placement
- 1 caption: text + font (Bebas Neue · DM Serif Display italic · Space Mono) + 14–120 px size + color + 9-position grid
- Tint color + opacity over the video
- Live stage preview on the right; the same Supabase video plays underneath while you author
- Saved to `scenes.composition` JSON, rendered persistently with the scene by both the Electron client and `/preview`

### Electron renderer layer stack (bottom → top)

```
video element (double-buffered, seamless loop)
↓
composition layer (per-scene: tint + 3 image zones + caption + frame)
↓
live overlay layer (one at a time, expires after durationMs)
↓
attribution wordmark (Vibes, configurable per scene)
```

### Seamless looping

The Electron renderer and `/preview` both use a **ping-pong buffer** to bypass Chromium's native `<video loop>` blink:

1. After a scene transition, the now-inactive video is re-primed with the same scene at `currentTime=0` (paused).
2. On `onEnded`, the buffer is played (decoder warm, already at frame 0) and crossfades 300 ms.
3. After settle, the formerly-active resets to `currentTime=0` and becomes the next buffer.

Each loop plays the full video length; the fade overlaps last-frame-of-n with first-frame-of-n+1.

### Brand

- Accent: **`#C07FD4`** (Vibes purple)
- Background: `#141418` (warm near-black)
- Foreground: `#F0EAF5` (purple-tinted off-white)
- Typography: **Bebas Neue** (display), **DM Serif Display italic** (editorial), **Space Mono** (body + mono)

Tokens live in [`shared/src/tokens.ts`](shared/src/tokens.ts) and [`shared/src/tokens.css`](shared/src/tokens.css). Both apps consume the same values.

## Validation

What this scaffold proves at the repo level:

- `npm test` — 8 resolver tests pass
- `npm run typecheck` — all three workspaces clean under `--strict`
- `npm run build:web` — Next.js production build green (9 static routes)
- `npm run build:electron` — main bundles to ~7 KB CJS, renderer to ~360 KB

Validated end-to-end against the live Supabase project (`arnfcguwmsgazpsybvth`):

- Scene upload to `scenes-videos` bucket → row insert
- Force-play → Electron client picks up within 30 s → scene plays
- Heartbeat upsert every 15 s → Now tab dot goes green
- Live overlay trigger → renderer fades in, holds, fades out

## Database

| Table | Purpose |
|---|---|
| `scenes` | Video, attribution flag, loop flag, composition JSON |
| `playlists` + `playlist_scenes` | Ordered scene groups |
| `schedule_entries` | Weekly mask or one-off date · time window · target |
| `org_settings` | Default scene · attribution master · force-play state · live overlay state |
| `client_status` | Heartbeat row from the Electron client |
| `overlays` | Live-trigger templates (speaker / text / logo) |
| `feature_interest` | Disabled-button click logs (demand validation) |
| `demo_requests` | Lead capture |

Storage buckets: `scenes-videos` (public, 500 MB cap, video MIME types) and `overlay-images` (public, 10 MB cap, image MIME types). Both have anon CRUD policies for v0.

**RLS is deliberately disabled** on all `public.*` tables for v0 single-tenant operation. The publishable key in `.env.local` ships to every browser visitor, which is fine on localhost but **must not be deployed publicly** without first enabling RLS. The v0.1 RLS migration is commented out at the bottom of `supabase/migrations/0001_spaces_init.sql`.

## Run commands

| Command | Effect |
|---|---|
| `npm test` | Resolver unit tests (vitest, 8 cases) |
| `npm run typecheck` | All three workspaces |
| `npm run dev:web` | Dashboard + `/preview` at `localhost:3000` |
| `npm run dev:electron` | Electron client (Vite renderer at `localhost:5173`) |
| `npm run build:web` | Production Next build |
| `npm run build:electron` | Production main + renderer bundles |
| `npm run dist -w @vibes/electron-app` | Windows installer (.exe) via electron-builder |

## CI

- [`.github/workflows/web-deploy.yml`](.github/workflows/web-deploy.yml) — runs tests + typecheck + Next build on push/PR touching `web/` or `shared/`. Vercel deploys on push to `main`.
- [`.github/workflows/electron-release.yml`](.github/workflows/electron-release.yml) — runs on `v*` tags, builds Windows installer, uploads to GitHub Releases.

## Conventions

- TypeScript strict everywhere.
- Schema lives in `shared/src/types.ts`. Changes there produce compile errors in both apps until handled.
- `@vibes/shared/*` imports only; no relative `../shared/` paths from app code.
- Migrations are immutable — add a new file, never edit a committed one.
- For Electron main process: `app.getPath('userData')` and similar Electron-app calls must be lazy. Calling them at module-load time crashes inside the bundled CJS before Electron's hooks are wired.

## Known dev environment gotcha

If your shell has `ELECTRON_RUN_AS_NODE=1` set, Electron's binary launches as plain Node.js and `require('electron')` returns the binary path string instead of the API. The dev script handles this via `electron-app/scripts/launch-electron.cjs` which spawns Electron with that env var stripped.
