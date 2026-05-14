# Vibes Spaces Client — Spec (monorepo edition)

The desktop playback engine for Vibes Spaces. Lives at `electron-app/` in the monorepo. Runs on a Windows machine plugged into the venue display, fullscreen. Polls Supabase for the schedule, resolves what to play right now, plays it from a local video cache with crossfade transitions, and writes a heartbeat row so the dashboard knows it's alive.

**Platform:** Electron (Chromium + Node.js), packaged as a Windows installer with auto-update via `electron-updater`. Shares types, resolver, and design tokens with the dashboard via `@vibes/shared`.

**Visual design:** the in-product Vibes attribution overlay is specified in detail in [`docs/branding-spec.md`](branding-spec.md) §5. This spec defers that visual design entirely; what follows is product behavior and technical architecture.

---

## 1. Product Spec

### "Done" definition

The client, running fullscreen on a Windows machine pointed at Supabase:

1. On startup, fetches scenes + schedule + settings, downloads every referenced video to a local cache directory, then begins playback
2. Every 1 second, resolves the current slot (force-play → one-off → weekly → default) and plays the matching scene
3. Transitions between scenes with a 1-second crossfade, no flicker, no double-prepare races
4. Polls Supabase every 30s for schedule changes — new scenes get cached in the background
5. Writes a heartbeat row to Supabase every 15s with `current_scene_id`, `current_scene_name`, `current_source_entry_id`
6. Shows the "Vibes" attribution wordmark per branding spec §5 unless suppressed by `org_settings.attribution_enabled` or `scenes.hide_attribution`
7. Writes structured JSONL logs to disk for post-mortem
8. **Auto-updates on relaunch when a new version is published**

### In scope (v0)
- Fullscreen video playback via HTML5 `<video>` with two-element crossfade
- 30s schedule polling with snapshot-swap concurrency (no torn reads, no swallowed exceptions)
- Resolver: force-play → one-off → weekly → default (imported from `@vibes/shared`)
- Playlist cycling (advance on `ended` event)
- Local video cache in `userData/scene_cache/`, prefetched on startup, background-refreshed on poll
- Heartbeat writer (15s interval)
- Structured JSONL logger
- Attribution overlay (visual spec in branding-spec.md §5)
- Custom protocol handler (`vibes-scene://`) for safe local-file playback without disabling `webSecurity`
- Auto-update via `electron-updater` (GitHub Releases or S3 feed)

### Out of scope (v0)
- Audio reactivity → v0.2 (WebGL shader layer or Unity migration)
- Multi-display output → v0.1
- MIDI → v0.1
- Realtime push (using 30s polling instead) → v0.1
- Code signing → v0.1 (unsigned build works for venue install, Windows shows SmartScreen warning once)
- Cache invalidation on video re-upload → v0.1 (use new scene ids for v0)
- Time-zone handling → assume single zone, verify clock at venue
- Health-check alerts (email/SMS when client drops) → v0.1, after heartbeat is collecting data

### User stories
- As the system, on startup I prefetch every referenced video so playback never depends on streaming
- As the system, I switch scenes within 1 second of the schedule boundary
- As an operator, my "Play now" tap from the dashboard takes effect within 30 seconds on the venue display
- As a developer, when something fails on May 16, I can pull `spaces.log` off the machine and grep my way through the post-mortem
- As the Vibes team, I can publish a new client version and have it install on the venue machine on next launch without driving to Brooklyn

---

## 2. Tech Spec

### Stack

- **Electron** (latest stable, ~v30+)
- **TypeScript** end-to-end with strict mode
- **React** for the renderer
- **electron-builder** for packaging Windows `.exe` installer
- **electron-updater** for auto-update
- **@supabase/supabase-js** for database client (same as dashboard)
- **node:fs/promises** for cache management (main process)
- **vitest** for renderer + main tests
- **`@vibes/shared`** workspace dependency for types, resolver, and design tokens

### Architecture

```
┌────────────────────────────────────────────────────┐
│  Electron Main Process (Node.js)                   │
│                                                    │
│  ┌──────────────────┐  ┌──────────────────────┐    │
│  │ BrowserWindow    │  │ IPC handlers         │    │
│  │ - fullscreen     │  │ - cache:ensure       │    │
│  │ - kiosk mode     │  │ - cache:local-path   │    │
│  └──────────────────┘  │ - cache:prefetch-all │    │
│  ┌──────────────────┐  │ - log:write          │    │
│  │ Custom protocol  │  └──────────────────────┘    │
│  │ vibes-scene://   │  ┌──────────────────────┐    │
│  └──────────────────┘  │ electron-updater     │    │
│                        └──────────────────────┘    │
└──────────────────┬─────────────────────────────────┘
                   │ contextBridge (preload)
                   ▼
┌────────────────────────────────────────────────────┐
│  Renderer (Chromium)                               │
│                                                    │
│  imports from @vibes/shared:                       │
│   - types.ts                                       │
│   - resolver.ts                                    │
│   - tokens.ts (for the attribution overlay)        │
│                                                    │
│  ┌────────────┐ ┌──────────────────────────────┐   │
│  │ <video> A  │ │ Scheduler                    │   │
│  │ <video> B  │ │ - snapshot state             │   │
│  │ crossfade  │ │ - 30s poll loop              │   │
│  └────────────┘ │ - 15s heartbeat loop         │   │
│  ┌────────────┐ │ - 1s tick → resolve()        │   │
│  │ Vibes      │ └──────────────────────────────┘   │
│  │ wordmark   │ ┌──────────────────────────────┐   │
│  │ (§5)       │ │ Supabase client (shared)     │   │
│  └────────────┘ └──────────────────────────────┘   │
└────────────────────┬───────────────────────────────┘
                     │ HTTPS
                     ▼
              ┌──────────────────┐
              │ Supabase         │
              └──────────────────┘
```

**Key design choices:**
- **Renderer owns scheduling and playback.** All time-critical logic (tick, crossfade, resolver) is in the renderer where `requestAnimationFrame` and `<video>` events live.
- **Main owns file system and OS.** Cache downloads, fullscreen control, custom protocol, logger writes, auto-updates.
- **IPC is async + small.** Renderer asks main "is scene X cached?" and "give me the local path"; main handles the rest.
- **Resolver lives in `@vibes/shared` and is identical between dashboard preview (v0.1) and client playback.**

### Data model touched by the client

The client only ever talks to Supabase. Full schema in `supabase/migrations/0001_spaces_init.sql`.

| Table | Read | Write |
|---|---|---|
| `scenes` | ✓ (every 30s) | — |
| `playlists` + `playlist_scenes` | ✓ (joined query, every 30s) | — |
| `schedule_entries` | ✓ (every 30s) | — |
| `org_settings` | ✓ (every 30s) | — |
| `client_status` | — | ✓ (UPSERT every 15s) |

### File structure (within `electron-app/`)

```
electron-app/
├── package.json                     // dependencies: { "@vibes/shared": "*", ... }
├── electron-builder.yml             // packaging + update feed config
├── tsconfig.json                    // paths: { "@vibes/shared/*": ["../shared/src/*"] }
├── tsconfig.main.json               // main process build
├── tsconfig.renderer.json           // renderer build
├── src/
│   ├── main/
│   │   ├── main.ts                  // app entry, BrowserWindow, fullscreen
│   │   ├── protocol.ts              // vibes-scene:// handler
│   │   ├── cache.ts                 // video cache (Node fs)
│   │   ├── logger.ts                // JSONL append to userData/spaces.log
│   │   ├── ipc.ts                   // IPC handlers
│   │   ├── auto-updater.ts          // electron-updater wiring
│   │   └── preload.ts               // contextBridge exposure
│   └── renderer/
│       ├── index.html
│       ├── index.tsx                // React mount
│       ├── App.tsx                  // <video>x2 + overlay
│       ├── ScenePlayer.tsx          // Crossfade state machine
│       ├── Scheduler.ts             // Poll + heartbeat + tick
│       ├── supabase-client.ts       // Reuses dashboard's pattern
│       ├── attribution.css          // imports tokens from @vibes/shared
│       └── env.ts                   // SUPABASE_URL, SUPABASE_ANON_KEY, ORG_ID
└── test/
    └── renderer.test.ts             // vitest tests for ScenePlayer state machine
```

The resolver tests live in `shared/test/` and are run by the root `npm test`. They guard the contract for both apps.

### Workspace imports

```typescript
// Anywhere in electron-app/src/renderer/
import { resolve } from '@vibes/shared/resolver';
import type { Scene, Playlist, ScheduleEntry, OrgSettings, ResolvedSlot } from '@vibes/shared/types';
import { colors } from '@vibes/shared/tokens';
```

The renderer uses `colors` for the attribution overlay (which can't use Tailwind because Electron renderer typically doesn't run a Tailwind build — keep it simple with CSS custom properties).

### Shared resolver (TypeScript) — lives in `shared/src/resolver.ts`

The dashboard *could* import this (e.g. for a v0.1 "what would play right now" preview); the client *does* import this. One implementation, both apps.

```typescript
// shared/src/resolver.ts
import type { OrgSettings, ScheduleEntry, ResolvedSlot } from './types';

function timeToSeconds(s: string): number {
  const [h, m, sec] = s.split(':').map(Number);
  return h * 3600 + m * 60 + sec;
}

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function resolve(
  now: Date,
  settings: OrgSettings,
  entries: ScheduleEntry[]
): ResolvedSlot {
  // 0. Force play — highest precedence
  if (settings.forcePlaySceneId) {
    return { sceneId: settings.forcePlaySceneId, playlistId: null, sourceEntryId: 'force_play' };
  }

  const today = dateKey(now);
  const nowSecs = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

  // 1. One-off override
  const oneOff = entries.find(e =>
    e.overrideDate === today &&
    nowSecs >= timeToSeconds(e.startTime) &&
    nowSecs < timeToSeconds(e.endTime)
  );
  if (oneOff) return toSlot(oneOff);

  // 2. Weekly recurring
  const todayMask = 1 << now.getDay();  // Sunday=0 → bit 1
  const weekly = entries.find(e =>
    e.weekdayMask !== null &&
    (e.weekdayMask & todayMask) !== 0 &&
    nowSecs >= timeToSeconds(e.startTime) &&
    nowSecs < timeToSeconds(e.endTime)
  );
  if (weekly) return toSlot(weekly);

  // 3. Default fallback
  return {
    sceneId: settings.defaultSceneId,
    playlistId: null,
    sourceEntryId: 'default',
  };
}

function toSlot(e: ScheduleEntry): ResolvedSlot {
  return { sceneId: e.sceneId, playlistId: e.playlistId, sourceEntryId: e.id };
}
```

### Resolver tests — `shared/test/resolver.test.ts`

These run from the monorepo root via `npm test`. Both apps depend on this contract.

```typescript
import { describe, it, expect } from 'vitest';
import { resolve } from '../src/resolver';
import type { OrgSettings } from '../src/types';

const settings = (overrides: Partial<OrgSettings> = {}): OrgSettings => ({
  orgId: 'test', defaultSceneId: 'default-scene',
  attributionEnabled: true, forcePlaySceneId: null, ...overrides,
});

describe('resolver', () => {
  it('force_play beats everything', () => {
    const slot = resolve(
      new Date('2026-05-16T12:00:00'),
      settings({ forcePlaySceneId: 'forced' }),
      [{ id: 'e1', sceneId: 'scheduled', playlistId: null,
         startTime: '00:00:00', endTime: '23:59:59',
         weekdayMask: null, overrideDate: '2026-05-16' }]
    );
    expect(slot.sceneId).toBe('forced');
    expect(slot.sourceEntryId).toBe('force_play');
  });

  it('one-off override beats weekly', () => { /* ... */ });
  it('weekly fires on matching weekday mask', () => { /* ... */ });
  it('endTime is exclusive (boundary returns default)', () => { /* ... */ });
  it('Sunday is bit 1 (mask=1)', () => { /* ... */ });
  it('no match returns default', () => { /* ... */ });
  it('no match + no default returns null sceneId', () => { /* ... */ });
});
```

Make these pass before wiring anything else.

### Main process — startup + fullscreen + protocol

```typescript
// src/main/main.ts
import { app, BrowserWindow } from 'electron';
import * as path from 'node:path';
import { registerSceneProtocol } from './protocol';
import { registerIpcHandlers } from './ipc';
import { initAutoUpdater } from './auto-updater';
import { logger } from './logger';

let win: BrowserWindow | null = null;

app.whenReady().then(async () => {
  registerSceneProtocol();
  registerIpcHandlers();

  win = new BrowserWindow({
    fullscreen: true,
    kiosk: true,
    autoHideMenuBar: true,
    backgroundColor: '#0a0a0b',  // matches --color-bg-base from @vibes/shared
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
    },
  });

  win.loadFile(path.join(__dirname, '../renderer/index.html'));
  logger.info('window_created', { version: app.getVersion() });

  initAutoUpdater();
});

app.on('window-all-closed', () => app.quit());
```

```typescript
// src/main/protocol.ts
import { app, protocol, net } from 'electron';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

const cacheDir = path.join(app.getPath('userData'), 'scene_cache');

export function registerSceneProtocol() {
  protocol.handle('vibes-scene', (request) => {
    const filename = decodeURIComponent(request.url.replace('vibes-scene://', ''));
    const local = path.join(cacheDir, filename);
    return net.fetch(pathToFileURL(local).toString());
  });
}
```

Lets the renderer use `<video src="vibes-scene://scene-uuid.mp4">` without disabling `webSecurity`.

### Cache (main process)

```typescript
// src/main/cache.ts
import { app } from 'electron';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { logger } from './logger';
import type { Scene } from '@vibes/shared/types';

const cacheDir = path.join(app.getPath('userData'), 'scene_cache');
await fs.mkdir(cacheDir, { recursive: true });

export function localPathFor(sceneId: string): string {
  return path.join(cacheDir, `${sceneId}.mp4`);
}

export async function isCached(sceneId: string): Promise<boolean> {
  try { await fs.access(localPathFor(sceneId)); return true; }
  catch { return false; }
}

export async function ensureCached(scene: Scene): Promise<void> {
  if (await isCached(scene.id)) return;
  logger.info('video_download_start', { sceneId: scene.id });
  const res = await fetch(scene.videoUrl);
  if (!res.ok) {
    logger.error('video_download_failed', { sceneId: scene.id, status: res.status });
    throw new Error(`download ${scene.id}: ${res.status}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const tmp = localPathFor(scene.id) + '.tmp';
  await fs.writeFile(tmp, buf);
  await fs.rename(tmp, localPathFor(scene.id));
  logger.info('video_download_done', { sceneId: scene.id, bytes: buf.length });
}

export async function prefetchAll(scenes: Scene[]): Promise<void> {
  for (const s of scenes) {
    try { await ensureCached(s); }
    catch (e) { logger.error('prefetch_one_failed', { sceneId: s.id, error: String(e) }); }
  }
}
```

### IPC bridge

```typescript
// src/main/ipc.ts
import { ipcMain } from 'electron';
import { isCached, ensureCached, prefetchAll } from './cache';
import { logger } from './logger';

export function registerIpcHandlers() {
  ipcMain.handle('cache:is-cached', (_, sceneId: string) => isCached(sceneId));
  ipcMain.handle('cache:ensure', (_, scene) => ensureCached(scene));
  ipcMain.handle('cache:prefetch-all', (_, scenes) => prefetchAll(scenes));
  ipcMain.handle('log:info', (_, evt, data) => logger.info(evt, data));
  ipcMain.handle('log:error', (_, evt, data) => logger.error(evt, data));
}

// src/main/preload.ts
import { contextBridge, ipcRenderer } from 'electron';
import type { Scene } from '@vibes/shared/types';

contextBridge.exposeInMainWorld('cache', {
  isCached: (id: string) => ipcRenderer.invoke('cache:is-cached', id),
  ensure: (scene: Scene) => ipcRenderer.invoke('cache:ensure', scene),
  prefetchAll: (scenes: Scene[]) => ipcRenderer.invoke('cache:prefetch-all', scenes),
});
contextBridge.exposeInMainWorld('log', {
  info: (evt: string, data?: unknown) => ipcRenderer.invoke('log:info', evt, data),
  error: (evt: string, data?: unknown) => ipcRenderer.invoke('log:error', evt, data),
});

// Type augmentation for the renderer
declare global {
  interface Window {
    cache: {
      isCached: (id: string) => Promise<boolean>;
      ensure: (scene: Scene) => Promise<void>;
      prefetchAll: (scenes: Scene[]) => Promise<void>;
    };
    log: {
      info: (evt: string, data?: unknown) => Promise<void>;
      error: (evt: string, data?: unknown) => Promise<void>;
    };
  }
}
```

### Scheduler (renderer)

```typescript
// src/renderer/Scheduler.ts
import { createClient } from '@supabase/supabase-js';
import { resolve } from '@vibes/shared/resolver';
import type { Scene, Playlist, ScheduleEntry, OrgSettings } from '@vibes/shared/types';
import { SUPABASE_URL, SUPABASE_ANON_KEY, ORG_ID, CLIENT_VERSION } from './env';

interface Snapshot {
  scenes: Map<string, Scene>;
  playlists: Map<string, Playlist>;
  entries: ScheduleEntry[];
  settings: OrgSettings;
  fetchedAt: Date;
}

export class Scheduler {
  private supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  private snapshot: Snapshot | null = null;
  private currentEntryId: string | null = null;
  private playlistIndex = 0;
  private lastPlayedSceneId: string | null = null;
  private tickInterval: number | null = null;
  private pollInterval: number | null = null;
  private heartbeatInterval: number | null = null;

  constructor(private onPlay: (scene: Scene, attributionVisible: boolean) => void) {}

  async start() {
    window.log.info('scheduler_starting', { version: CLIENT_VERSION });
    try {
      const snap = await this.fetchSnapshot();
      this.snapshot = snap;
      await window.cache.prefetchAll(Array.from(snap.scenes.values()));
      window.log.info('prefetch_complete', { count: snap.scenes.size });
    } catch (e) {
      window.log.error('startup_fetch_failed', { error: String(e) });
    }
    this.tickInterval = window.setInterval(() => this.tick(), 1000);
    this.pollInterval = window.setInterval(() => this.poll(), 30_000);
    this.heartbeatInterval = window.setInterval(() => this.heartbeat(), 15_000);
  }

  stop() {
    if (this.tickInterval) clearInterval(this.tickInterval);
    if (this.pollInterval) clearInterval(this.pollInterval);
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
  }

  private async fetchSnapshot(): Promise<Snapshot> {
    const [scenesRes, plRes, entriesRes, settingsRes] = await Promise.all([
      this.supabase.from('scenes').select('*').eq('org_id', ORG_ID),
      this.supabase.from('playlists').select('*, playlist_scenes(scene_id, position)').eq('org_id', ORG_ID),
      this.supabase.from('schedule_entries').select('*').eq('org_id', ORG_ID),
      this.supabase.from('org_settings').select('*').eq('org_id', ORG_ID).single(),
    ]);
    const scenes = new Map((scenesRes.data ?? []).map((s: any) => [s.id, {
      id: s.id, name: s.name, videoUrl: s.video_url, hideAttribution: s.hide_attribution,
    }]));
    const playlists = new Map((plRes.data ?? []).map((p: any) => [p.id, {
      id: p.id, name: p.name,
      sceneIdsInOrder: (p.playlist_scenes ?? [])
        .sort((a: any, b: any) => a.position - b.position)
        .map((ps: any) => ps.scene_id),
    }]));
    const entries: ScheduleEntry[] = (entriesRes.data ?? []).map((e: any) => ({
      id: e.id, sceneId: e.scene_id, playlistId: e.playlist_id,
      startTime: e.start_time, endTime: e.end_time,
      weekdayMask: e.weekday_mask, overrideDate: e.override_date,
    }));
    const s = settingsRes.data;
    const settings: OrgSettings = {
      orgId: s.org_id, defaultSceneId: s.default_scene_id,
      attributionEnabled: s.attribution_enabled, forcePlaySceneId: s.force_play_scene_id,
    };
    return { scenes, playlists, entries, settings, fetchedAt: new Date() };
  }

  private async poll() {
    try {
      const snap = await this.fetchSnapshot();
      this.snapshot = snap;  // atomic reference swap in JS
      window.cache.prefetchAll(Array.from(snap.scenes.values()));  // fire and forget
    } catch (e) {
      window.log.error('poll_failed', { error: String(e) });
    }
  }

  private tick() {
    const snap = this.snapshot;
    if (!snap) return;

    const slot = resolve(new Date(), snap.settings, snap.entries);

    if (slot.sourceEntryId !== this.currentEntryId) {
      this.currentEntryId = slot.sourceEntryId;
      this.playlistIndex = 0;
      window.log.info('slot_changed', {
        source: slot.sourceEntryId, sceneId: slot.sceneId, playlistId: slot.playlistId,
      });
    }

    let sceneId = slot.sceneId;
    if (slot.playlistId) {
      const pl = snap.playlists.get(slot.playlistId);
      if (pl && pl.sceneIdsInOrder.length > 0) {
        sceneId = pl.sceneIdsInOrder[this.playlistIndex % pl.sceneIdsInOrder.length];
      }
    }
    if (!sceneId) return;
    const scene = snap.scenes.get(sceneId);
    if (!scene) return;

    window.cache.isCached(scene.id).then(cached => {
      if (!cached) return;
      this.lastPlayedSceneId = scene.id;
      const attributionVisible = snap.settings.attributionEnabled && !scene.hideAttribution;
      this.onPlay(scene, attributionVisible);
    });
  }

  onVideoEnded() {
    this.playlistIndex++;
    this.tick();
  }

  private async heartbeat() {
    const snap = this.snapshot;
    if (!snap) return;
    const scene = this.lastPlayedSceneId ? snap.scenes.get(this.lastPlayedSceneId) : null;
    try {
      await this.supabase.from('client_status').upsert({
        org_id: ORG_ID,
        client_version: CLIENT_VERSION,
        current_scene_id: scene?.id ?? null,
        current_scene_name: scene?.name ?? null,
        current_source_entry_id: this.currentEntryId,
        last_heartbeat_at: new Date().toISOString(),
      });
    } catch (e) {
      window.log.error('heartbeat_failed', { error: String(e) });
    }
  }
}
```

**Concurrency note:** JavaScript's single-threaded event loop makes `this.snapshot = snap` inherently atomic — no `Interlocked.Exchange` needed like the C# equivalent. Tick reads `this.snapshot` at the top and the rest operates on that reference. Concurrent `poll()` mid-tick is safe.

### ScenePlayer (renderer) — crossfade state machine

Visual styling for the attribution overlay follows branding spec §5 exactly.

```tsx
// src/renderer/ScenePlayer.tsx
import { useEffect, useRef, useState } from 'react';
import type { Scene } from '@vibes/shared/types';

type PlayerState = 'idle' | 'preparing' | 'crossfading';

interface Props {
  sceneToPlay: Scene | null;
  attributionVisible: boolean;
  onVideoEnded: () => void;
}

export function ScenePlayer({ sceneToPlay, attributionVisible, onVideoEnded }: Props) {
  const videoA = useRef<HTMLVideoElement>(null);
  const videoB = useRef<HTMLVideoElement>(null);
  const [activeIsA, setActiveIsA] = useState(true);
  const stateRef = useRef<PlayerState>('idle');
  const currentSceneIdRef = useRef<string | null>(null);
  const pendingSceneRef = useRef<Scene | null>(null);

  useEffect(() => {
    if (!sceneToPlay) return;
    if (sceneToPlay.id === currentSceneIdRef.current) return;

    if (stateRef.current !== 'idle') {
      pendingSceneRef.current = sceneToPlay;
      window.log.info('play_queued', { sceneId: sceneToPlay.id, state: stateRef.current });
      return;
    }
    startTransition(sceneToPlay);
  }, [sceneToPlay?.id]);

  function startTransition(scene: Scene) {
    stateRef.current = 'preparing';
    currentSceneIdRef.current = scene.id;
    const inactive = activeIsA ? videoB.current! : videoA.current!;
    inactive.src = `vibes-scene://${scene.id}.mp4`;
    inactive.load();
    inactive.oncanplay = () => {
      inactive.oncanplay = null;
      inactive.play().catch(e => window.log.error('play_failed', { error: String(e) }));
      stateRef.current = 'crossfading';
      crossfade();
    };
  }

  function crossfade() {
    const start = performance.now();
    const dur = 1000;  // matches branding spec --motion-duration-scene
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / dur);
      const fadeOut = activeIsA ? videoA.current! : videoB.current!;
      const fadeIn  = activeIsA ? videoB.current! : videoA.current!;
      fadeOut.style.opacity = String(1 - k);
      fadeIn.style.opacity = String(k);
      if (k < 1) {
        requestAnimationFrame(step);
      } else {
        (activeIsA ? videoA.current! : videoB.current!).pause();
        setActiveIsA(!activeIsA);
        stateRef.current = 'idle';
        const pending = pendingSceneRef.current;
        pendingSceneRef.current = null;
        if (pending && pending.id !== currentSceneIdRef.current) {
          startTransition(pending);
        }
      }
    };
    requestAnimationFrame(step);
  }

  return (
    <div className="player-root">
      <video ref={videoA} className="layer" style={{ opacity: 1 }}
             onEnded={onVideoEnded} muted playsInline />
      <video ref={videoB} className="layer" style={{ opacity: 0 }}
             onEnded={onVideoEnded} muted playsInline />
      {attributionVisible && (
        <div className="vibes-wordmark" aria-hidden>Vibes</div>
      )}
    </div>
  );
}
```

```css
/* src/renderer/attribution.css — uses tokens from @vibes/shared */
@import url('../../shared/src/tokens.css');

.player-root {
  position: fixed;
  inset: 0;
  background: var(--color-bg-base);
}
.layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
/* Branding spec §5 — Vibes attribution overlay */
.vibes-wordmark {
  position: fixed;
  right: 16px;
  bottom: 16px;
  font-family: var(--font-display);
  font-size: clamp(14px, 1.5vw, 22px);
  font-weight: var(--font-weight-regular);
  color: rgba(240, 237, 232, 0.5);
  pointer-events: none;
  user-select: none;
  transition: opacity var(--motion-duration-scene) var(--motion-easing-default);
}
```

### Logger (main process)

```typescript
// src/main/logger.ts
import { app } from 'electron';
import * as fs from 'node:fs';
import * as path from 'node:path';

const logPath = path.join(app.getPath('userData'), 'spaces.log');

function write(level: 'info' | 'error', evt: string, data?: unknown) {
  const row = JSON.stringify({ ts: new Date().toISOString(), level, evt, data });
  fs.appendFileSync(logPath, row + '\n');
  if (level === 'error') console.error(row); else console.log(row);
}

export const logger = {
  info: (evt: string, data?: unknown) => write('info', evt, data),
  error: (evt: string, data?: unknown) => write('error', evt, data),
};
```

Log file location: Windows = `%APPDATA%/vibes-spaces/spaces.log`.

### Auto-update via electron-updater

The single biggest reason Electron beats Unity for this product.

```typescript
// src/main/auto-updater.ts
import { autoUpdater } from 'electron-updater';
import { logger } from './logger';

export function initAutoUpdater() {
  // Hold-during-events kill switch
  if (process.env.VIBES_DISABLE_UPDATES === '1') {
    logger.info('updates_disabled_by_env');
    return;
  }
  autoUpdater.logger = logger as any;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => logger.info('update_checking'));
  autoUpdater.on('update-available', (info) => logger.info('update_available', info));
  autoUpdater.on('update-not-available', () => logger.info('update_none'));
  autoUpdater.on('error', (err) => logger.error('update_error', { error: String(err) }));
  autoUpdater.on('update-downloaded', (info) => logger.info('update_downloaded', info));

  autoUpdater.checkForUpdatesAndNotify();
  setInterval(() => autoUpdater.checkForUpdatesAndNotify(), 60 * 60 * 1000);
}
```

```yaml
# electron-app/electron-builder.yml
appId: app.gotvibes.spaces
productName: Vibes Spaces
directories:
  output: dist
files:
  - dist-electron/**/*
  - node_modules/**/*
win:
  target:
    - target: nsis
      arch: [x64]
  artifactName: ${productName}-Setup-${version}.${ext}
publish:
  provider: github
  owner: your-github-org
  repo: vibes-spaces
nsis:
  oneClick: false
  perMachine: false
  allowToChangeInstallationDirectory: true
```

Release workflow:
1. Bump version in `electron-app/package.json`
2. `git tag v0.1.2 && git push --tags`
3. GitHub Actions runs `electron-builder` and publishes installer + `latest.yml`
4. Venue machine checks hourly + on launch — downloads in background, installs on next quit

---

## 3. Build Plan (Client portion — ~150 min)

| # | Chunk | Time | Output |
|---|---|---|---|
| 1 | Workspace setup (`electron-app/package.json`, tsconfig pointing at shared) + electron-vite scaffold | 25 min | `npm run dev -w @vibes/electron-app` opens blank fullscreen window |
| 2 | Resolver tests in shared (vitest, 7 cases passing) | 20 min | `npm test` green |
| 3 | Main process: cache, logger, IPC, custom protocol | 25 min | Can call `window.cache.ensure(scene)` from devtools and see file in `userData/scene_cache/` |
| 4 | Scheduler (poll, tick, heartbeat) | 25 min | Heartbeat row appearing in Supabase every 15s; dashboard Now tab goes green |
| 5 | ScenePlayer (two `<video>`, crossfade, re-entrancy guard) + attribution overlay per branding spec §5 | 25 min | End-to-end: dashboard schedule → venue plays correct scene at right time, with Vibes wordmark |
| 6 | Wire ScenePlayer ↔ Scheduler | 10 min | App.tsx orchestrates everything |
| 7 | electron-builder config + first installer build | 15 min | `dist/Vibes Spaces-Setup-0.1.0.exe` exists and installs cleanly |
| 8 | electron-updater wiring + dummy GitHub Release | 5 min | App checks GitHub Releases on launch |

**Total: ~150 min.** 90-min checkpoint: through chunks 1–4. Heartbeat is flowing, dashboard shows green, scheduler is ticking — but nothing on screen yet. ScenePlayer (chunk 5) puts video on the wall.

Defer if tight: chunk 8 (auto-updater) is the only one that can wait until post-event. Everything else is critical.

---

## 4. Integration with the Dashboard

Same contract as documented in the dashboard spec.

- **Inputs (read from Supabase every 30s):** scenes, playlists+playlist_scenes, schedule_entries, org_settings
- **Outputs (written to Supabase every 15s):** `client_status` row (UPSERT)
- **Inputs from main to renderer (via IPC):** cache state, log forwarding
- **Outputs from renderer to main (via IPC):** cache prefetch requests, log writes

**The dashboard and client never share process, language at runtime, or memory.** The only contract is the Supabase schema + shared types in `@vibes/shared`. Either side can be rewritten without touching the other.

---

## 5. Distribution + ops

**v0 install on the venue machine (manual):**
1. Build installer locally: `npm run build:electron`
2. Copy `electron-app/dist/Vibes Spaces-Setup-0.1.0.exe` to USB stick or send via Drive
3. Run installer on venue machine, accept SmartScreen warning once
4. Pin shortcut to startup folder (`shell:startup`) so it auto-launches on reboot
5. Verify clock + timezone on the machine — single biggest non-code risk

**v0.1 install on additional venues (auto-update from feed):**
1. Each venue runs the installer once
2. From then on, every tagged release auto-installs on relaunch
3. No further hands-on work per venue until major architectural changes

**Disabling auto-update for a specific event:**

```powershell
# On venue machine, before event
[Environment]::SetEnvironmentVariable("VIBES_DISABLE_UPDATES", "1", "User")
# After event
[Environment]::SetEnvironmentVariable("VIBES_DISABLE_UPDATES", $null, "User")
```

The `auto-updater.ts` honors this env var and skips checks entirely.

---

## 6. Scalability notes (SaaS path)

What this client design does *right* for scaling:

- **Stateless except for the local cache.** Kill, restart, no data loss.
- **All coordination through Supabase.** No peer discovery, no central server beyond Postgres.
- **Snapshot-swap concurrency.** Renderer never reads partial state.
- **Idempotent heartbeat (UPSERT).** Multiple instances under same `org_id` race the heartbeat, not corrupt data. v0.1 concern.
- **Shared types/resolver/tokens via `@vibes/shared`.** Schema changes propagate as build-time errors.
- **Auto-update is the moat.** Every customer on the latest version keeps support cost flat as venues scale.

What needs attention before second venue or v0.2 audio reactivity:

- **One-instance-per-org enforcement.** Add `client_id` to `client_status`; dashboard shows all online clients per org.
- **Cache size cap.** Add LRU eviction at 10GB or 100 scenes.
- **Cache invalidation.** Add `etag` column on `scenes`; client compares and re-downloads when changed.
- **Audio reactivity migration path:**
  - **WebGL shader layer inside Electron** — `<canvas>` over video, Web Audio API for FFT, fragment shader. Stays in monorepo.
  - **Per-scene engine selection** via `scene_type` column. Probably overkill for most cases.
  - For 80% of audio-reactive use cases, the WebGL shader path is right. Save Unity for true 3D Vibescape Worlds work.
- **RLS.** Same as dashboard — turn it on before any second tenant.
- **Telemetry.** Logs are local-only. Once >5 venues, ship structured logs to Axiom or Better Stack for fleet-wide observability.
- **Health alerts.** When a venue's heartbeat goes stale >2min, page the operator via Twilio + email. Trivial to add once heartbeat is collecting data.
