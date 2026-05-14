'use client';

import { useEffect, useRef, useState } from 'react';
import { resolve } from '@vibes/shared/resolver';
import type {
  Overlay,
  OverlayAnimation,
  OverlayType,
  Playlist,
  OrgSettings,
  Scene,
  ScheduleEntry,
} from '@vibes/shared/types';
import { getSupabase } from '@/lib/supabase';
import { ORG_ID } from '@/lib/constants';
import { CompositionLayer } from './CompositionLayer';
import { LiveOverlayLayer } from './LiveOverlayLayer';

const POLL_MS = 5_000;

interface Snapshot {
  scenes: Map<string, Scene>;
  playlists: Map<string, Playlist>;
  entries: ScheduleEntry[];
  settings: OrgSettings;
  overlays: Map<string, Overlay>;
}

// The preview is an operator-awareness tool, not the venue display, so it
// uses a single <video> with native loop. Yes, this has the Chromium "loop
// blink" — but for the preview, simplicity + reliability beat seamless looping.
// The Electron client keeps the double-buffered seamless loop where it matters.
export function PreviewStage() {
  const [scene, setScene] = useState<Scene | null>(null);
  const [shouldLoop, setShouldLoop] = useState(true);
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [overlayStartedAt, setOverlayStartedAt] = useState<Date | null>(null);
  const [sourceLabel, setSourceLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const snapshotRef = useRef<Snapshot | null>(null);
  const playlistIndexRef = useRef(0);
  const currentEntryIdRef = useRef<string | null>(null);
  const currentOverlayKeyRef = useRef<string | null>(null);

  async function fetchSnapshot(): Promise<Snapshot> {
    const supabase = getSupabase();
    const [scenesRes, plRes, entriesRes, settingsRes, overlaysRes] = await Promise.all([
      supabase.from('scenes').select('*').eq('org_id', ORG_ID),
      supabase.from('playlists').select('*, playlist_scenes(scene_id, position)').eq('org_id', ORG_ID),
      supabase
        .from('schedule_entries')
        .select('*')
        .eq('org_id', ORG_ID)
        .order('created_at', { ascending: false }),
      supabase.from('org_settings').select('*').eq('org_id', ORG_ID).maybeSingle(),
      supabase.from('overlays').select('*').eq('org_id', ORG_ID),
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
    const sd = settingsRes.data;
    const settings: OrgSettings = sd
      ? {
          orgId: sd.org_id,
          defaultSceneId: sd.default_scene_id,
          attributionEnabled: sd.attribution_enabled,
          forcePlaySceneId: sd.force_play_scene_id,
          liveOverlayId: sd.live_overlay_id ?? null,
          liveOverlayStartedAt: sd.live_overlay_started_at ?? null,
        }
      : {
          orgId: ORG_ID,
          defaultSceneId: null,
          attributionEnabled: true,
          forcePlaySceneId: null,
          liveOverlayId: null,
          liveOverlayStartedAt: null,
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
    return { scenes, playlists, entries, settings, overlays };
  }

  function tick() {
    const snap = snapshotRef.current;
    if (!snap) return;
    const slot = resolve(new Date(), snap.settings, snap.entries);

    if (slot.sourceEntryId !== currentEntryIdRef.current) {
      currentEntryIdRef.current = slot.sourceEntryId;
      playlistIndexRef.current = 0;
    }

    let sceneId = slot.sceneId;
    const isPlaylistSlot = !!slot.playlistId;
    if (isPlaylistSlot) {
      const pl = snap.playlists.get(slot.playlistId!);
      if (pl && pl.sceneIdsInOrder.length > 0) {
        sceneId = pl.sceneIdsInOrder[playlistIndexRef.current % pl.sceneIdsInOrder.length];
      }
    }

    let nextScene: Scene | null = null;
    if (sceneId) {
      nextScene = snap.scenes.get(sceneId) ?? null;
    }

    setScene((prev) => (prev?.id === nextScene?.id ? prev : nextScene));
    setShouldLoop(!!nextScene?.loopEnabled && !isPlaylistSlot);
    setSourceLabel(
      !nextScene
        ? 'No scene'
        : slot.sourceEntryId === 'force_play'
        ? 'PLAYING'
        : slot.sourceEntryId === 'default'
        ? 'Default'
        : 'Scheduled',
    );

    // Reconcile live overlay
    const { liveOverlayId, liveOverlayStartedAt } = snap.settings;
    if (!liveOverlayId || !liveOverlayStartedAt) {
      if (currentOverlayKeyRef.current !== null) {
        currentOverlayKeyRef.current = null;
        setOverlay(null);
        setOverlayStartedAt(null);
      }
      return;
    }
    const o = snap.overlays.get(liveOverlayId);
    if (!o) return;
    const startedAt = new Date(liveOverlayStartedAt);
    const elapsed = Date.now() - startedAt.getTime();
    if (elapsed > o.durationMs) {
      if (currentOverlayKeyRef.current !== null) {
        currentOverlayKeyRef.current = null;
        setOverlay(null);
        setOverlayStartedAt(null);
        // Conditional clear: a re-tap between expiry computation and DB write wins.
        void getSupabase()
          .from('org_settings')
          .update({ live_overlay_id: null, live_overlay_started_at: null })
          .eq('org_id', ORG_ID)
          .eq('live_overlay_started_at', liveOverlayStartedAt);
      }
      return;
    }
    const key = `${liveOverlayId}@${liveOverlayStartedAt}`;
    if (key !== currentOverlayKeyRef.current) {
      currentOverlayKeyRef.current = key;
      setOverlay(o);
      setOverlayStartedAt(startedAt);
    }
  }

  useEffect(() => {
    let active = true;
    async function poll() {
      try {
        const snap = await fetchSnapshot();
        if (!active) return;
        snapshotRef.current = snap;
        setError(null);
        tick();
      } catch (e) {
        if (!active) return;
        setError(`Couldn't reach Supabase. ${e instanceof Error ? e.message : ''}`);
        console.error('[preview] fetchSnapshot failed', e);
      }
    }
    poll();
    const pollId = window.setInterval(poll, POLL_MS);
    const tickId = window.setInterval(tick, 1000);
    return () => {
      active = false;
      window.clearInterval(pollId);
      window.clearInterval(tickId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onVideoEnded() {
    // For playlist slots only — native loop handles single-scene loops.
    if (!shouldLoop) {
      playlistIndexRef.current++;
      tick();
    }
  }

  return (
    <div className="fixed inset-0 bg-bg-base flex items-center justify-center p-5">
      <div
        className="relative aspect-video w-full max-w-full max-h-full bg-bg-base overflow-hidden"
        style={{
          boxShadow: `0 30px 80px rgba(0,0,0,0.5), 0 0 0 1px ${
            scene?.composition?.accent ?? 'var(--color-accent)'
          }`,
        }}
      >
        {scene ? (
          <video
            key={scene.id}
            src={scene.videoUrl}
            autoPlay
            loop={shouldLoop}
            muted
            playsInline
            onEnded={onVideoEnded}
            onError={(e) =>
              console.error('[preview] video error', (e.currentTarget as HTMLVideoElement).error)
            }
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-fg-tertiary font-mono text-xs uppercase tracking-[2px]">
            {error ?? 'Waiting for a scene…'}
          </div>
        )}

        {scene && <CompositionLayer composition={scene.composition} />}
        <LiveOverlayLayer overlay={overlay} startedAt={overlayStartedAt} />

        <div className="absolute top-3 left-4 z-20 text-[9px] uppercase tracking-[2px] text-fg-tertiary font-mono pointer-events-none">
          Preview · {sourceLabel ?? '—'} · {scene?.name ?? '—'}
        </div>
        {error && (
          <div className="absolute bottom-4 left-4 right-4 z-20 rounded border border-danger/40 bg-danger-soft p-3 text-sm text-fg-primary">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
