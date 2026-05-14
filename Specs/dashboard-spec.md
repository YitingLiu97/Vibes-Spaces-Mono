# Vibes Spaces Dashboard — Spec (monorepo edition)

The web control surface for Vibes Spaces. Lives at `web/` in the monorepo. Operators upload scenes, build schedules, force-play scenes during events, and monitor whether the venue client is alive. Pairs with the Vibes Spaces Client (`electron-app/`) — communication is one-way through Supabase: dashboard writes, client reads + writes heartbeat.

**Platform:** Next.js web app, installable as a PWA on phone/tablet/desktop. Deployed to Vercel. Shares types and resolver with the client via `@vibes/shared`.

**Visual design and voice:** all visual specifics, design tokens, component patterns, and microcopy guidelines live in [`docs/branding-spec.md`](branding-spec.md). This spec defers all design decisions to that document; what follows is product behavior and technical architecture.

---

## 1. Product Spec

### "Done" definition

Operator can, from desktop or phone (PWA):

1. Upload a video file as a named scene
2. Build a playlist of scenes
3. Create weekly recurring schedule entries and one-off date overrides
4. Set a default fallback scene
5. See whether the venue client is online (heartbeat dot per branding spec §4)
6. See what's currently playing at the venue
7. Tap "Play now" on any scene → venue switches within 30s
8. Tap "Resume schedule" to release the override

### In scope (v0)
- Scenes: list, upload (to Supabase Storage), delete, rename, attribution toggle
- Playlists: list, create with multi-select scenes, reorder, delete
- Schedule entries: list, create (weekly mask or one-off date), delete
- Org settings: default scene picker, attribution master toggle
- **Now tab:** live client status, current scene, force-play controls
- **PWA:** installable on home screen, works on mobile (one-thumb operation per branding spec principle #2)
- Disabled "Generate from reference" button (click logged to `feature_interest` for demand validation; design per branding spec §8)
- Single hardcoded org (`00000000-0000-0000-0000-000000000001`)

### Out of scope (v0)
- Auth (deferred to v0.1 — disable RLS for now)
- Multi-tenant org switching (v0.1)
- Editing/reordering individual videos within a playlist post-creation (v0.1 — delete + recreate for v0)
- Brand overlays beyond the per-scene attribution toggle (v0.1)
- Lead-capture page `futureofnycdesign.com/vibes` (built separately, writes to same Supabase)
- Cache invalidation when a video is re-uploaded (v0.1 — delete + new scene for v0)

### User stories
- As an operator, I can upload a video and name it as a scene from my laptop
- As an operator, I can build a schedule for the event from my desk
- As an operator at the event, I open the PWA on my phone and see at a glance that the system is healthy (the **glance test**, branding spec principle #1)
- As an operator at the event, I tap "Play now" when a speaker runs long, and the venue switches without me walking to the laptop
- As a Vibes team member, I can see which "Generate from reference" clicks were logged to validate v1 demand

---

## 2. Tech Spec

### Stack

- **Next.js 14+ (App Router)**
- **Supabase JS client** for database + storage
- **shadcn/ui** for components — themed with Vibes design tokens
- **Tailwind CSS** configured to consume `@vibes/shared` tokens
- **next-pwa** for PWA wrapper
- **TypeScript** end-to-end with strict mode
- **`@vibes/shared`** workspace dependency for types, resolver, and design tokens
- Hosted on **Vercel** (preview deployments per branch — useful for letting sponsors review schedule UI before the event)

### Architecture

```
┌──────────────────────────────┐
│  Browser (desktop or phone)  │
│  Next.js dashboard PWA       │
│                              │
│  imports from @vibes/shared: │
│   - types.ts                 │
│   - tokens.ts                │
│                              │
│  ┌────────┐ ┌────────┐       │
│  │ Now    │ │ Scenes │ ...   │
│  └────────┘ └────────┘       │
│         │         │          │
│         ▼         ▼          │
│    Supabase JS client        │
└────────────┬─────────────────┘
             │ HTTPS
             ▼
       ┌──────────────────────┐
       │ Supabase             │
       │  - Postgres          │
       │  - Storage           │
       └──────────────────────┘
```

The dashboard is **read-mostly for `client_status`** (heartbeat row) and **write-mostly for everything else**. It never talks to the Electron client directly — all coordination is through Supabase rows.

### Data model touched by the dashboard

Full schema lives in `supabase/migrations/0001_spaces_init.sql`.

| Table | Read | Write |
|---|---|---|
| `scenes` | ✓ | ✓ (create, delete, toggle `hide_attribution`) |
| `playlists` | ✓ | ✓ (create, delete) |
| `playlist_scenes` | ✓ | ✓ (insert on playlist create) |
| `schedule_entries` | ✓ | ✓ (create, delete) |
| `org_settings` | ✓ | ✓ (update `default_scene_id`, `attribution_enabled`, `force_play_scene_id`) |
| `client_status` | ✓ (Now tab) | — |
| `feature_interest` | — | ✓ (log "Generate from reference" clicks) |

### File structure (within `web/`)

```
web/
├── app/
│   ├── layout.tsx                  // PWA meta tags, design token CSS import
│   ├── globals.css                 // imports tokens from @vibes/shared
│   ├── page.tsx                    // Redirect to /dashboard
│   └── dashboard/
│       ├── layout.tsx              // Tab navigation shell
│       └── page.tsx                // Active tab content
├── components/
│   ├── NowTab.tsx                  // Heartbeat dot + current scene + Resume button
│   ├── ScenesTab.tsx               // List, upload, delete, Play now per row
│   ├── PlaylistsTab.tsx            // List, create modal, delete
│   ├── ScheduleTab.tsx             // List, create modal, delete
│   ├── ScheduleAddDialog.tsx       // Weekly/one-off form, weekday checkboxes
│   ├── ScenesUploadDialog.tsx      // File picker → Storage upload → row insert
│   ├── HeartbeatDot.tsx            // Visual indicator (see branding spec §4)
│   ├── GenerateFromReferenceButton.tsx  // Disabled button + interest logger
│   └── ui/                         // shadcn/ui components (themed)
├── lib/
│   ├── supabase.ts                 // Browser client
│   ├── weekday-mask.ts             // bitmask helpers (UI ↔ DB)
│   └── constants.ts                // ORG_ID from env, storage bucket name
├── public/
│   ├── manifest.json               // PWA manifest
│   ├── icon-192.png
│   └── icon-512.png
├── tailwind.config.ts              // Reads tokens from @vibes/shared
├── tsconfig.json                   // paths: { "@vibes/shared": ["../shared/src"] }
├── next.config.js                  // wrapped with next-pwa
└── package.json                    // dependencies: { "@vibes/shared": "*", ... }
```

### Workspace imports

All shared modules come from `@vibes/shared`:

```typescript
// Anywhere in web/
import type { Scene, Playlist, ScheduleEntry, OrgSettings } from '@vibes/shared/types';
import { colors, type ColorToken } from '@vibes/shared/tokens';
// Resolver also imported here for v0.1 "what would play now" preview
import { resolve } from '@vibes/shared/resolver';
```

The `tsconfig.json`:
```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "paths": { "@vibes/shared/*": ["../shared/src/*"] }
  }
}
```

### Tailwind theming from shared tokens

```typescript
// web/tailwind.config.ts
import { colors, space, radius } from '@vibes/shared/tokens';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: colors.bg,
        fg: colors.fg,
        accent: colors.accent,
        success: colors.success,
        warning: colors.warning,
        danger: colors.danger,
      },
      spacing: space,
      borderRadius: radius,
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
        mono: ['var(--font-mono)'],
      },
    },
  },
};
```

Every dashboard component reads from these tokens. Updating Vibes brand colors is a one-line change in `shared/src/tokens.ts`.

### Now tab — the highest-leverage component for live events

Implements branding spec §4 "The Now tab — hero layout". Full code in branding spec.

Key behaviors:
- Polls `client_status` every **5s** (fast enough to feel real-time, light enough on Supabase)
- Polls `org_settings` every 5s to detect force-play state
- Heartbeat dot per branding spec §4 (color + icon + text label, never color alone)
- "FORCED" banner appears the moment `force_play_scene_id` is non-null
- "Resume schedule" button is full-width on mobile, primary visual weight (because it's the user's escape hatch)

### Force-play UX

Each scene row has a "Play now" button (branding spec §4 "Primary action"). When tapped:

```tsx
async function forcePlay(sceneId: string, sceneName: string) {
  if (!confirm(`Force-play "${sceneName}" until you tap Resume?`)) return;
  // Optimistic UI: show FORCED badge on this scene immediately
  setOptimisticForce(sceneId);
  try {
    await supabase
      .from('org_settings')
      .update({
        force_play_scene_id: sceneId,
        force_play_set_at: new Date().toISOString(),
      })
      .eq('org_id', ORG_ID);
    toast({
      title: 'Now forcing',
      description: sceneName,
      action: <ToastAction onClick={resume}>Undo</ToastAction>,
    });
  } catch (e) {
    setOptimisticForce(null);
    toast({
      variant: 'destructive',
      title: "Couldn't force-play",
      description: 'Check your connection and try again.',
    });
  }
}
```

Microcopy follows branding spec §6 — "Now forcing" not "Success!", "Couldn't force-play" not "Error".

### Schedule add dialog (the only non-trivial form)

Layout follows branding spec §4 "Forms":
- Full-screen modal on mobile (slides up from bottom)
- Centered max-width 480px on desktop
- Field order: target → time window → recurrence → days/date
- CTAs sticky at bottom on mobile
- Inline validation on blur, never per-keystroke

```tsx
const [recurrence, setRecurrence] = useState<'weekly' | 'oneoff'>('weekly');
const [days, setDays] = useState({ sun: false, mon: true, tue: true,
                                   wed: true, thu: true, fri: true, sat: false });
const [overrideDate, setOverrideDate] = useState('');
const [startTime, setStartTime] = useState('09:00');
const [endTime, setEndTime] = useState('17:00');

const handleSubmit = async () => {
  const mask = computeWeekdayMask(days);
  const row = {
    org_id: ORG_ID,
    scene_id: targetType === 'scene' ? targetId : null,
    playlist_id: targetType === 'playlist' ? targetId : null,
    start_time: startTime + ':00',
    end_time: endTime + ':00',
    weekday_mask: recurrence === 'weekly' ? mask : null,
    override_date: recurrence === 'oneoff' ? overrideDate : null,
  };
  await supabase.from('schedule_entries').insert(row);
};
```

`web/lib/weekday-mask.ts`:
```ts
export const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
type Day = typeof DAYS[number];

export function computeWeekdayMask(days: Record<Day, boolean>): number {
  return DAYS.reduce((m, d, i) => m | (days[d] ? 1 << i : 0), 0);
}

export function maskToDays(mask: number): Record<Day, boolean> {
  return Object.fromEntries(DAYS.map((d, i) => [d, (mask & (1 << i)) !== 0])) as Record<Day, boolean>;
}
```

### Scenes upload — Storage + row in one shot

```tsx
async function uploadScene(file: File, name: string, options: { hideAttribution: boolean }) {
  const id = crypto.randomUUID();
  const ext = file.name.split('.').pop() ?? 'mp4';
  const path = `${ORG_ID}/${id}.${ext}`;
  const { error: upErr } = await supabase.storage.from('scenes-videos').upload(path, file);
  if (upErr) throw upErr;
  const { data: { publicUrl } } = supabase.storage.from('scenes-videos').getPublicUrl(path);
  await supabase.from('scenes').insert({
    id,
    org_id: ORG_ID,
    name,
    video_url: publicUrl,
    hide_attribution: options.hideAttribution,
  });
}
```

Progress indicator behavior per branding spec §4 "Loading states":
- <200ms: no indicator
- 200ms–1s: spinner replaces upload icon
- 1s+: skeleton + percentage

### "Generate from reference" — demand signal with the right UX

Design per branding spec §8 (the "disabled state that sells"):

```tsx
async function handleClick() {
  await supabase.from('feature_interest').insert({
    org_id: ORG_ID,
    feature: 'reference_to_style',
    metadata: { surface: 'scenes_tab', page: window.location.pathname },
  });
  toast({
    title: 'Coming soon',
    description: 'Reference-to-style generation. We logged your interest.',
  });
}
```

Visual: sparkle icon pulsing subtly (1.5s cycle, opacity 0.7↔1.0), "Soon" badge in corner. Tone is calm, not hype-y.

### PWA wrapper

```bash
npm i next-pwa -w @vibes/web
```

```js
// web/next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
});
module.exports = withPWA({ /* existing config */ });
```

```json
// web/public/manifest.json
{
  "name": "Vibes Spaces",
  "short_name": "Spaces",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#0a0a0b",
  "theme_color": "#0a0a0b",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

Background and theme colors match `--color-bg-base` from the design tokens.

---

## 3. Build Plan (Dashboard portion — ~135 min)

| # | Chunk | Time | Output |
|---|---|---|---|
| 1 | Workspace setup (`web/package.json`, tsconfig, Tailwind theming from `@vibes/shared`) | 15 min | `npm run dev -w @vibes/web` opens a styled blank page |
| 2 | Supabase project + migration applied + Storage bucket + hardcoded org row | 10 min | DB ready |
| 3 | `/dashboard` route with 4 empty tabs | 15 min | Tabs render with design tokens applied |
| 4 | Scenes tab (list, upload, delete, force-play, attribution toggle, Generate-from-reference) | 25 min | Can upload a video and see it in the list |
| 5 | Schedule tab (list, add dialog, delete) | 25 min | Can build a weekly + one-off schedule |
| 6 | Org settings section (default scene picker, attribution master toggle) | 10 min | Default scene saved to `org_settings` |
| 7 | Now tab (heartbeat dot + current scene + Resume button + force-play banner) | 20 min | Tab shows red dot until Electron client comes online |
| 8 | Playlists tab (list, multi-select create, delete) | 15 min | Can build a playlist; *defer if tight* |
| 9 | PWA wrapper + manifest + icons | 10 min | Installs to phone home screen |

**Total: 145 min with Playlists, 130 min without.** 90-min checkpoint: through chunks 1–5. If short, cut chunks 8 and 9 first.

---

## 4. Integration with the Electron Client

The dashboard never speaks to the client directly. The contract is the **Supabase schema** + these behaviors:

| Dashboard action | Database effect | Client behavior |
|---|---|---|
| Upload scene | INSERT into `scenes`, file in Storage | Picks up on next 30s poll, downloads to local cache |
| Create schedule entry | INSERT into `schedule_entries` | Picks up on next 30s poll, becomes eligible in resolver |
| Force-play | UPDATE `org_settings.force_play_scene_id` | Picks up on next 30s poll, resolver returns it immediately |
| Resume schedule | UPDATE `org_settings.force_play_scene_id = NULL` | Picks up on next 30s poll, returns to schedule |
| Toggle attribution | UPDATE `org_settings.attribution_enabled` or `scenes.hide_attribution` | Picks up on next 30s poll, overlay shown/hidden within ~1s of next tick |
| — | — | UPSERT to `client_status` every 15s — dashboard reads this for the Now tab |

**Latency budget:** dashboard change → venue effect = up to 30 seconds. The "Syncing to venue…" cue (branding spec §8) makes this latency *felt* rather than mysterious. v0.1 swaps polling for Supabase Realtime and drops this to <1 second.

**Failure modes the dashboard handles gracefully:**
- Client offline (red dot) → Now tab shows last-known scene; force-play button warns "Will apply when client reconnects" (branding spec §6 microcopy)
- Storage upload fails → row not inserted, error toast with retry guidance
- Schedule conflict (two entries overlap on same day) → v0 allows; resolver picks first match — surface as "⚠ overlaps with X" if time permits

---

## 5. Scalability notes (for SaaS path)

Things this v0 dashboard does *right* for scaling:

- **All state in Supabase**, no server-side session — horizontally scalable from day one
- **Hardcoded `ORG_ID` isolated to a single env constant** — when auth lands in v0.1, replace with `useUser().orgId` and everything else works unchanged
- **Shared tokens and types from `@vibes/shared`** — schema and brand changes propagate to both apps via TS errors at build time
- **PWA = no app store** — ship dashboard updates as often as you want; phone users see new version on next load

Things needing attention before second tenant:
- **Enable RLS** on every table. Migration explicitly leaves it off for v0 dev velocity. *Do not onboard a second venue until this is done.*
- **Move Storage uploads behind signed URLs** — current public-read is fine for v0 but means anyone with the URL can grab a customer's video. v0.1: private bucket + short-lived signed URLs the client requests at poll time.
- **Index `client_status.last_heartbeat_at`** and the schedule lookup queries. Trivial at 10 venues, important at 1000.
- **Rate-limit `feature_interest` inserts** — currently any visitor could spam. Add a per-IP rate limit at the Vercel edge or a Supabase function check.
- **Operator audit log** — when force-play is hit, log who/what/when. Currently we just write the row; for accountability across an operator team, log each transition to a new `org_audit_log` table.
