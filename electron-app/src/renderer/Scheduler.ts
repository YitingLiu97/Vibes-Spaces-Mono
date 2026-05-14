import { createClient } from '@supabase/supabase-js';
import { resolve } from '@vibes/shared/resolver';
import type {
  Scene,
  Playlist,
  QueueItem,
  ScheduleEntry,
  OrgSettings,
  Overlay,
  OverlayAnimation,
  OverlayType,
} from '@vibes/shared/types';
import { SUPABASE_URL, SUPABASE_ANON_KEY, ORG_ID, CLIENT_VERSION } from './env';

interface Snapshot {
  scenes: Map<string, Scene>;
  playlists: Map<string, Playlist>;
  entries: ScheduleEntry[];
  queueItems: QueueItem[];
  settings: OrgSettings;
  overlays: Map<string, Overlay>;
  fetchedAt: Date;
}

export interface PlaybackState {
  scene: Scene;
  attributionVisible: boolean;
  shouldLoop: boolean;
}

export interface LiveOverlayState {
  overlay: Overlay;
  startedAt: Date;
}

export class Scheduler {
  private supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  private snapshot: Snapshot | null = null;
  private currentEntryId: string | null = null;
  private currentOverlayKey: string | null = null;
  private playlistIndex = 0;
  private lastPlayedSceneId: string | null = null;
  private tickInterval: number | null = null;
  private pollInterval: number | null = null;
  private settingsPollInterval: number | null = null;
  private heartbeatInterval: number | null = null;
  // Guards against the StrictMode double-mount race: start() is async,
  // so its setInterval calls can fire AFTER stop() ran. Without this flag
  // the first Scheduler's intervals never get cleared and two Schedulers
  // race onPlay/onOverlay calls, which flickers the screen.
  private stopped = false;

  constructor(
    private onPlay: (state: PlaybackState) => void,
    private onOverlay: (state: LiveOverlayState | null) => void,
  ) {}

  async start() {
    if (this.stopped) return;
    void window.log.info('scheduler_starting', { version: CLIENT_VERSION });
    try {
      const snap = await this.fetchSnapshot();
      if (this.stopped) return;
      this.snapshot = snap;
      await window.cache.prefetchAll(Array.from(snap.scenes.values()));
      if (this.stopped) return;
      void window.log.info('prefetch_complete', { count: snap.scenes.size });
    } catch (e) {
      if (this.stopped) return;
      void window.log.error('startup_fetch_failed', { error: String(e) });
    }
    if (this.stopped) return;
    this.tickInterval = window.setInterval(() => this.tick(), 1000);
    this.pollInterval = window.setInterval(() => void this.poll(), 30_000);
    // Fast-poll JUST the org_settings row at 1Hz so trigger writes
    // (force-play, live overlay) take effect within ~1s instead of waiting
    // for the next heavy 30s snapshot fetch. The full snapshot poll above
    // still handles scenes/playlists/overlays/entries — those don't change
    // mid-event and tolerate slower polling.
    this.settingsPollInterval = window.setInterval(() => void this.pollSettings(), 1000);
    this.heartbeatInterval = window.setInterval(() => void this.heartbeat(), 15_000);
  }

  stop() {
    this.stopped = true;
    if (this.tickInterval) clearInterval(this.tickInterval);
    if (this.pollInterval) clearInterval(this.pollInterval);
    if (this.settingsPollInterval) clearInterval(this.settingsPollInterval);
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
  }

  private async fetchSnapshot(): Promise<Snapshot> {
    const [scenesRes, plRes, entriesRes, queueRes, settingsRes, overlaysRes] = await Promise.all([
      this.supabase.from('scenes').select('*').eq('org_id', ORG_ID),
      this.supabase
        .from('playlists')
        .select('*, playlist_scenes(scene_id, position)')
        .eq('org_id', ORG_ID),
      // Newer entries win when two overlap at the same time.
      this.supabase
        .from('schedule_entries')
        .select('*')
        .eq('org_id', ORG_ID)
        .order('created_at', { ascending: false }),
      this.supabase
        .from('queue_items')
        .select('*')
        .eq('org_id', ORG_ID)
        .order('position', { ascending: true }),
      this.supabase.from('org_settings').select('*').eq('org_id', ORG_ID).maybeSingle(),
      this.supabase.from('overlays').select('*').eq('org_id', ORG_ID),
    ]);

    const scenes = new Map<string, Scene>(
      (scenesRes.data ?? []).map((s) => [
        s.id as string,
        {
          id: s.id,
          name: s.name,
          videoUrl: s.video_url,
          hideAttribution: s.hide_attribution,
          loopEnabled: s.loop_enabled ?? true,
          composition: s.composition ?? null,
        },
      ]),
    );

    const playlists = new Map<string, Playlist>(
      (plRes.data ?? []).map((p) => {
        const links = (p.playlist_scenes ?? []) as { scene_id: string; position: number }[];
        return [
          p.id as string,
          {
            id: p.id,
            name: p.name,
            sceneIdsInOrder: links.sort((a, b) => a.position - b.position).map((l) => l.scene_id),
          },
        ];
      }),
    );

    const entries: ScheduleEntry[] = (entriesRes.data ?? []).map((e) => ({
      id: e.id,
      sceneId: e.scene_id,
      playlistId: e.playlist_id,
      startTime: e.start_time,
      endTime: e.end_time,
      weekdayMask: e.weekday_mask,
      overrideDate: e.override_date,
    }));

    const queueItems: QueueItem[] = (queueRes.data ?? []).map((q) => ({
      id: q.id,
      position: q.position,
      sceneId: q.scene_id,
      playlistId: q.playlist_id,
      durationSeconds: q.duration_seconds,
    }));

    const sd = settingsRes.data;
    const settings: OrgSettings = sd
      ? {
          orgId: sd.org_id,
          defaultSceneId: sd.default_scene_id,
          attributionEnabled: sd.attribution_enabled,
          forcePlaySceneId: sd.force_play_scene_id,
          liveOverlayId: sd.live_overlay_id ?? null,
          liveOverlayStartedAt: sd.live_overlay_started_at ?? null,
          queueCurrentItemId: sd.queue_current_item_id ?? null,
          queueStartedAt: sd.queue_started_at ?? null,
        }
      : {
          orgId: ORG_ID,
          defaultSceneId: null,
          attributionEnabled: true,
          forcePlaySceneId: null,
          liveOverlayId: null,
          liveOverlayStartedAt: null,
          queueCurrentItemId: null,
          queueStartedAt: null,
        };

    const overlays = new Map<string, Overlay>(
      (overlaysRes.data ?? []).map((row) => [
        row.id as string,
        {
          id: row.id,
          orgId: row.org_id,
          name: row.name,
          type: row.type as OverlayType,
          content: row.content,
          animation: row.animation as OverlayAnimation,
          durationMs: row.duration_ms,
        },
      ]),
    );

    return { scenes, playlists, entries, queueItems, settings, overlays, fetchedAt: new Date() };
  }

  private async poll() {
    try {
      const snap = await this.fetchSnapshot();
      this.snapshot = snap;
      void window.cache.prefetchAll(Array.from(snap.scenes.values()));
    } catch (e) {
      void window.log.error('poll_failed', { error: String(e) });
    }
  }

  // Lightweight 1Hz fetch: just the single org_settings row.
  // Cheap (~6 columns, one row) and makes overlay/force-play triggers
  // visibly fire within a second instead of getting silently expired
  // by the 30s heavy-poll cadence.
  private async pollSettings() {
    if (!this.snapshot) return;
    try {
      const { data, error } = await this.supabase
        .from('org_settings')
        .select('*')
        .eq('org_id', ORG_ID)
        .maybeSingle();
      if (error) throw error;
      if (!data) return;
      const settings: OrgSettings = {
        orgId: data.org_id,
        defaultSceneId: data.default_scene_id,
        attributionEnabled: data.attribution_enabled,
        forcePlaySceneId: data.force_play_scene_id,
        liveOverlayId: data.live_overlay_id ?? null,
        liveOverlayStartedAt: data.live_overlay_started_at ?? null,
        queueCurrentItemId: data.queue_current_item_id ?? null,
        queueStartedAt: data.queue_started_at ?? null,
      };
      // Atomic reference swap — tick() reads this.snapshot via local var so
      // it sees a consistent settings object even if we replace mid-frame.
      this.snapshot = { ...this.snapshot, settings };
    } catch (e) {
      void window.log.error('settings_poll_failed', { error: String(e) });
    }
  }

  private tick() {
    const snap = this.snapshot;
    if (!snap) return;

    const slot = resolve(new Date(), snap.settings, snap.entries, snap.queueItems);

    // If the resolver picked a different queue item than what's stored, write
    // the new cursor back. Optimistically mutate the in-memory snapshot so the
    // next tick sees the new cursor without waiting for the round-trip.
    if (slot.queueItemId && slot.queueItemId !== snap.settings.queueCurrentItemId) {
      const startedAt = new Date().toISOString();
      this.snapshot = {
        ...snap,
        settings: {
          ...snap.settings,
          queueCurrentItemId: slot.queueItemId,
          queueStartedAt: startedAt,
        },
      };
      void this.supabase
        .from('org_settings')
        .update({ queue_current_item_id: slot.queueItemId, queue_started_at: startedAt })
        .eq('org_id', ORG_ID)
        .then(({ error }) => {
          if (error) void window.log.error('queue_cursor_write_failed', { error: String(error) });
        });
    } else if (!slot.queueItemId && snap.settings.queueCurrentItemId) {
      // Resolver fell through to schedule/default — clear the cursor.
      this.snapshot = {
        ...snap,
        settings: { ...snap.settings, queueCurrentItemId: null, queueStartedAt: null },
      };
      void this.supabase
        .from('org_settings')
        .update({ queue_current_item_id: null, queue_started_at: null })
        .eq('org_id', ORG_ID)
        .then(({ error }) => {
          if (error) void window.log.error('queue_cursor_clear_failed', { error: String(error) });
        });
    }

    if (slot.sourceEntryId !== this.currentEntryId) {
      this.currentEntryId = slot.sourceEntryId;
      this.playlistIndex = 0;
      void window.log.info('slot_changed', {
        source: slot.sourceEntryId,
        sceneId: slot.sceneId,
        playlistId: slot.playlistId,
      });
    }

    let sceneId = slot.sceneId;
    const isPlaylistSlot = !!slot.playlistId;
    if (isPlaylistSlot) {
      const pl = snap.playlists.get(slot.playlistId!);
      if (pl && pl.sceneIdsInOrder.length > 0) {
        sceneId = pl.sceneIdsInOrder[this.playlistIndex % pl.sceneIdsInOrder.length];
      }
    }

    if (sceneId) {
      const scene = snap.scenes.get(sceneId);
      if (scene) {
        void window.cache.isCached(scene.id).then((cached) => {
          if (!cached) return;
          this.lastPlayedSceneId = scene.id;
          const attributionVisible = snap.settings.attributionEnabled && !scene.hideAttribution;
          // Loop only when we're on a single-scene slot — playlists must let `onEnded`
          // fire so the renderer can advance to the next scene.
          const shouldLoop = scene.loopEnabled && !isPlaylistSlot;
          this.onPlay({ scene, attributionVisible, shouldLoop });
        });
      }
    }

    this.reconcileOverlay(snap);
  }

  private reconcileOverlay(snap: Snapshot) {
    const { liveOverlayId, liveOverlayStartedAt } = snap.settings;
    if (!liveOverlayId || !liveOverlayStartedAt) {
      if (this.currentOverlayKey !== null) {
        this.currentOverlayKey = null;
        this.onOverlay(null);
      }
      return;
    }

    const overlay = snap.overlays.get(liveOverlayId);
    if (!overlay) {
      if (this.currentOverlayKey !== null) {
        this.currentOverlayKey = null;
        this.onOverlay(null);
      }
      return;
    }

    const startedAt = new Date(liveOverlayStartedAt);
    const elapsed = Date.now() - startedAt.getTime();
    // Hold for the overlay's duration; exit animation runs out the back end.
    if (elapsed > overlay.durationMs) {
      if (this.currentOverlayKey !== null) {
        this.currentOverlayKey = null;
        this.onOverlay(null);
        // Write null back so the dashboard chip stops showing "Live".
        // Conditional on the started_at we used to compute expiry — if the
        // operator re-tapped in the meantime, the DB row has a new
        // started_at and our clear becomes a no-op (their re-tap wins).
        void this.supabase
          .from('org_settings')
          .update({ live_overlay_id: null, live_overlay_started_at: null })
          .eq('org_id', ORG_ID)
          .eq('live_overlay_started_at', liveOverlayStartedAt)
          .then(({ error }) => {
            if (error) void window.log.error('overlay_autoclear_failed', { error: String(error) });
          });
      }
      return;
    }

    const key = `${liveOverlayId}@${liveOverlayStartedAt}`;
    if (key !== this.currentOverlayKey) {
      this.currentOverlayKey = key;
      void window.log.info('overlay_triggered', {
        overlayId: liveOverlayId,
        name: overlay.name,
        type: overlay.type,
      });
      this.onOverlay({ overlay, startedAt });
    }
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
      void window.log.error('heartbeat_failed', { error: String(e) });
    }
  }
}
