# Vibes Spaces — Monorepo

The Vibes Spaces product, organized as an npm workspaces monorepo. Three workspaces share one schema, one type system, and one resolver: the **dashboard** (Next.js web PWA), the **client** (Electron desktop playback engine), and **shared** (types + pure resolver, the single source of truth).

This README is the starting point. Each workspace has its own spec for product, tech, and build details:

- [`docs/dashboard-spec.md`](docs/dashboard-spec.md) — what the dashboard does and how it's built
- [`docs/client-spec.md`](docs/client-spec.md) — what the client does and how it's built
- [`docs/branding-spec.md`](docs/branding-spec.md) — design system, voice, human-centric principles for live-event UX

---

## What's in here

```
vibes-spaces/
├── shared/                          # @vibes/shared — types + resolver
│   ├── src/
│   │   ├── types.ts                 # Scene, Playlist, ScheduleEntry, OrgSettings, ResolvedSlot
│   │   ├── resolver.ts              # Pure scheduling function
│   │   ├── tokens.ts                # Design tokens, exported as TS for both apps
│   │   └── index.ts                 # public exports
│   ├── test/
│   │   └── resolver.test.ts         # vitest unit tests (7+ cases)
│   ├── package.json
│   └── tsconfig.json
│
├── web/                             # @vibes/web — Next.js dashboard, deploys to Vercel
│   ├── app/                         # App Router routes
│   ├── components/                  # UI components
│   ├── lib/                         # supabase client, helpers
│   ├── public/                      # PWA manifest, icons
│   ├── package.json
│   └── tsconfig.json                # paths: { "@vibes/shared": ["../shared/src"] }
│
├── electron-app/                    # @vibes/electron-app — Windows desktop client
│   ├── src/
│   │   ├── main/                    # Electron main process (Node.js)
│   │   └── renderer/                # Electron renderer (Chromium)
│   ├── electron-builder.yml         # packaging + auto-update feed
│   ├── package.json
│   └── tsconfig.json
│
├── supabase/
│   └── migrations/
│       └── 0001_spaces_init.sql     # schema migration
│
├── docs/                            # all specs live here
│   ├── dashboard-spec.md
│   ├── client-spec.md
│   ├── branding-spec.md
│   └── architecture-decisions.md    # ADR log (optional but recommended)
│
├── .github/
│   └── workflows/
│       ├── web-deploy.yml           # Vercel deploys on push to main (web/**)
│       └── electron-release.yml     # builds installer on tag, publishes to GitHub Releases
│
├── .env.example                     # SUPABASE_URL, SUPABASE_ANON_KEY, ORG_ID
├── .gitignore
├── package.json                     # workspace root
├── tsconfig.base.json               # shared TS config
└── README.md                        # ← you are here
```

### Why a monorepo

- **One source of truth for types and resolver.** Schema changes in `shared/src/types.ts` produce TS errors in both apps until handled. No drift.
- **Atomic commits across apps.** A schema migration + dashboard form + client field update can land in one PR.
- **Independent deploy cadences preserved.** Dashboard pushes to Vercel on every commit; client builds installers on tagged releases. Monorepo doesn't force lockstep.
- **One CI config, three pipelines.** Lint + test once, build per workspace.

### Why not one app

The dashboard is a CRUD interface used by an operator on a phone or laptop. The client is an autonomous render daemon on a venue Windows machine. Different runtime, different failure modes, different update cadences. They share a schema and a brand — not a process. See the architecture-decisions ADR for the long version.

---

## Quick start

Prerequisites: Node.js 20+, npm 10+, a Supabase project.

```bash
# 1. Clone
git clone <repo-url> vibes-spaces
cd vibes-spaces

# 2. Install (npm workspaces handles all three apps + shared)
npm install

# 3. Environment
cp .env.example .env
# Fill in SUPABASE_URL, SUPABASE_ANON_KEY, ORG_ID

# 4. Apply schema to your Supabase project
# Either via Supabase SQL editor (paste supabase/migrations/0001_spaces_init.sql)
# or via Supabase CLI: supabase db push

# 5. Run the shared tests first — guarantees resolver is correct before touching apps
npm test

# 6a. Run the dashboard (http://localhost:3000)
npm run dev:web

# 6b. Run the Electron client (in another terminal)
npm run dev:electron
```

If `npm test` is green and both apps start, you're set. Open `localhost:3000` on your laptop and your phone (same wifi) — the dashboard is responsive and ready to be installed as a PWA.

---

## Root `package.json`

```json
{
  "name": "vibes-spaces",
  "private": true,
  "workspaces": ["shared", "web", "electron-app"],
  "scripts": {
    "test": "npm run test -w @vibes/shared",
    "dev:web": "npm run dev -w @vibes/web",
    "dev:electron": "npm run dev -w @vibes/electron-app",
    "build:web": "npm run build -w @vibes/web",
    "build:electron": "npm run dist -w @vibes/electron-app",
    "lint": "npm run lint --workspaces --if-present",
    "typecheck": "npm run typecheck --workspaces --if-present"
  }
}
```

Each workspace's `package.json` references `"@vibes/shared": "*"` as a dependency. npm workspaces resolves this to the local `shared/` folder — no publishing needed.

---

## Run commands (cheat sheet)

| Command | What it does |
|---|---|
| `npm test` | Run the resolver unit tests (vitest) |
| `npm run dev:web` | Start the dashboard at `localhost:3000` |
| `npm run dev:electron` | Start the Electron client in development mode (fullscreen on primary display) |
| `npm run build:web` | Build the dashboard for production |
| `npm run build:electron` | Build a Windows `.exe` installer to `electron-app/dist/` |
| `npm run typecheck` | Type-check all workspaces |
| `npm run lint` | Lint all workspaces |

---

## Environment variables

`.env.example` (copied to `.env` and `.env.local` per workspace as needed):

```bash
# Both apps
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
ORG_ID=00000000-0000-0000-0000-000000000001

# Dashboard only (Next.js public envs)
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
NEXT_PUBLIC_ORG_ID=$ORG_ID

# Electron client only
VIBES_DISABLE_UPDATES=0     # set to 1 to suppress auto-update during events
```

For v0, the hardcoded `ORG_ID` is used everywhere. v0.1 swaps this for real auth (Supabase Auth + RLS).

---

## Database setup

The schema lives in `supabase/migrations/0001_spaces_init.sql`. Tables:

- `scenes` — videos (id, name, video_url, hide_attribution)
- `playlists` + `playlist_scenes` — ordered scene sets
- `schedule_entries` — when to play what (weekly mask or one-off date)
- `org_settings` — defaults + `force_play_scene_id` + `attribution_enabled`
- `client_status` — heartbeat row written by the client
- `feature_interest` — clicks on disabled "Generate from reference" button
- `demo_requests` — lead capture from `futureofnycdesign.com/vibes`

Storage bucket: `scenes-videos` (public read, authenticated write).

RLS is **disabled** in v0 for development velocity. v0.1 adds policies before any second tenant onboards. The migration has a `TODO(v0.1)` marker for this.

---

## Branching & deploys

- **`main`** — production. Every commit deploys the dashboard to Vercel; tagged commits build a client installer.
- **`develop`** — staging. Vercel preview deployments; manual client builds.
- **Feature branches** — `feat/scene-uploader`, `fix/heartbeat-flap`. PRs target `develop`.

The dashboard deploys ~60 seconds after a `main` push. The client builds when you tag a release (`git tag v0.1.2 && git push --tags`) — the GitHub Action runs `electron-builder` and publishes to GitHub Releases. Venue machines pick up updates on next launch.

**Hold updates during events:** set `VIBES_DISABLE_UPDATES=1` on the venue machine before the event. Unset after. See [`docs/client-spec.md`](docs/client-spec.md#distribution--ops) for the runbook.

---

## Conventions

- **Commits:** [Conventional Commits](https://www.conventionalcommits.org/) — `feat:`, `fix:`, `chore:`, `docs:`. Helpful for changelogs and `electron-updater` release notes.
- **TypeScript strict mode** in all workspaces. No `any` without a comment.
- **Path imports** from `@vibes/shared`, never relative paths into `../shared/`.
- **Migrations are immutable.** Never edit a committed migration; add a new one.
- **One ADR per architectural decision.** Save under `docs/adr/NNNN-title.md`.

---

## What's next

The v0.1 backlog is tracked in [`docs/client-spec.md`](docs/client-spec.md#scalability-notes-saas-path) and [`docs/dashboard-spec.md`](docs/dashboard-spec.md#scalability-notes). Highest priorities post-v0:

1. Auth + RLS (blocking second-tenant onboarding)
2. Supabase Realtime (replaces 30s polling)
3. Reference-to-style AI generation (v1, the actual differentiator)
4. Multi-display output
5. Cache invalidation via `etag` column
