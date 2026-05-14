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
const LOOP_CROSSFADE_MS = 300;
const SCENE_CROSSFADE_MS = 1000;

interface Snapshot {
  scenes: Map<string, Scene>;
  playlists: Map<string, Playlist>;
  entries: ScheduleEntry[];
  settings: OrgSettings;
  overlays: Map<string, Overlay>;
}

export function PreviewStage() {
  const [scene, setScene] = useState<Scene | null>(null);
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [overlayStartedAt, setOverlayStartedAt] = useState<Date | null>(null);
  const [sourceLabel, setSourceLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const snapshotRef = useRef<Snapshot | null>(null);
  const playlistIndexRef = useRef(0);
  const currentEntryIdRef = useRef<string | null>(null);
  const currentOverlayKeyRef = useRef<string | null>(null);

  // Two raw <video> DOM elements managed imperatively. Active is the one
  // currently visible; buffer is preloaded at currentTime=0 with the same src
  // for seamless looping.
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const activeIsARef = useRef(true);
  const shouldLoopRef = useRef(true);
  const isPlaylistSlotRef = useRef(false);
  const currentSceneIdRef = useRef<string | null>(null);

  async function fetchSnapshot(): Promise<Snapshot> {
    const supabase = getSupabase();
    const [scenesRes, plRes, entriesRes, settingsRes, overlaysRes] = await Promise.all([
      supabase.from('scenes').select('*').eq('org_id', ORG_ID),
      supabase.from('playlists').select('*, playlist_scenes(scene_id, position)').eq('org_id', ORG_ID),
      // Newer entries win when two overlap at the same time — the resolver's
      // entries.find() picks the first match, so created_at DESC = newest wins.
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

  // ── Imperative video orchestration ─────────────────────────────────────

  function activeVideo() {
    return activeIsARef.current ? videoARef.current : videoBRef.current;
  }
  function bufferVideo() {
    return activeIsARef.current ? videoBRef.current : videoARef.current;
  }

  function loadSceneOnVideo(v: HTMLVideoElement, url: string, autoplay: boolean) {
    v.src = url;
    v.muted = true;
    v.playsInline = true;
    v.loop = false;
    v.load();
    if (autoplay) {
      v.play().catch(() => {});
    }
  }

  function primeBuffer(url: string) {
    const buf = bufferVideo();
    if (!buf) return;
    if (buf.src && buf.src.endsWith(url.split('/').pop() ?? '')) return;
    loadSceneOnVideo(buf, url, false);
    const onCanPlay = () => {
      buf.removeEventListener('canplay', onCanPlay);
      buf.pause();
      buf.currentTime = 0;
    };
    buf.addEventListener('canplay', onCanPlay);
  }

  function fade(durationMs: number, onSettled?: () => void) {
    const start = performance.now();
    const wasActiveA = activeIsARef.current;
    const a = videoARef.current!;
    const b = videoBRef.current!;
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / durationMs);
      const out = wasActiveA ? a : b;
      const ins = wasActiveA ? b : a;
      out.style.opacity = String(1 - k);
      ins.style.opacity = String(k);
      if (k < 1) {
        requestAnimationFrame(step);
      } else {
        const formerlyActive = wasActiveA ? a : b;
        formerlyActive.pause();
        formerlyActive.currentTime = 0;
        activeIsARef.current = !wasActiveA;
        onSettled?.();
      }
    };
    requestAnimationFrame(step);
  }

  function applyScene(nextScene: Scene | null, isPlaylistSlot: boolean) {
    if (!nextScene) {
      currentSceneIdRef.current = null;
      const a = videoARef.current;
      const b = videoBRef.current;
      if (a) {
        a.pause();
        a.removeAttribute('src');
        a.style.opacity = '0';
      }
      if (b) {
        b.pause();
        b.removeAttribute('src');
        b.style.opacity = '0';
      }
      return;
    }

    isPlaylistSlotRef.current = isPlaylistSlot;
    shouldLoopRef.current = nextScene.loopEnabled && !isPlaylistSlot;

    if (nextScene.id === currentSceneIdRef.current) return;

    currentSceneIdRef.current = nextScene.id;

    const buffer = bufferVideo();
    const active = activeVideo();
    if (!buffer || !active) return;

    // Load the new scene onto the buffer, play it, crossfade in.
    loadSceneOnVideo(buffer, nextScene.videoUrl, true);
    buffer.style.opacity = '0';
    active.style.opacity = '1';
    fade(SCENE_CROSSFADE_MS, () => {
      // After fade: the formerly-buffer is active. Prime the now-buffer
      // with the same scene at currentTime=0 for seamless looping.
      primeBuffer(nextScene.videoUrl);
    });
  }

  function handleEnded(e: React.SyntheticEvent<HTMLVideoElement>) {
    const isActive =
      (e.currentTarget === videoARef.current && activeIsARef.current) ||
      (e.currentTarget === videoBRef.current && !activeIsARef.current);
    if (!isActive) return;

    if (shouldLoopRef.current) {
      // Seamless loop using the preloaded buffer.
      const buffer = bufferVideo();
      const active = activeVideo();
      if (!buffer || !active) return;
      if (buffer.readyState >= 2) {
        buffer.currentTime = 0;
        buffer.play().catch(() => {});
        fade(LOOP_CROSSFADE_MS);
      } else {
        // Buffer not ready — fall back to a rewind on the active.
        active.currentTime = 0;
        active.play().catch(() => {});
      }
      return;
    }
    // Playlist advance
    playlistIndexRef.current++;
    tick();
  }

  // ── Scheduler tick / poll ──────────────────────────────────────────────

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
    if (!sceneId) {
      setScene(null);
      setSourceLabel('No scene to play');
      applyScene(null, false);
      return;
    }
    const nextScene = snap.scenes.get(sceneId);
    if (!nextScene) {
      setScene(null);
      applyScene(null, false);
      return;
    }
    setScene((prev) => (prev?.id === nextScene.id ? prev : nextScene));
    setSourceLabel(
      slot.sourceEntryId === 'force_play'
        ? 'PLAYING'
        : slot.sourceEntryId === 'default'
        ? 'Default'
        : 'Scheduled',
    );
    applyScene(nextScene, isPlaylistSlot);

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
        // Mirror Electron's autoclear, conditional on the same started_at we
        // used to compute expiry — a re-tap in the meantime wins.
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
        setError('Couldn’t reach Supabase. Check your connection.');
        console.error(e);
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
        <video
          ref={videoARef}
          muted
          playsInline
          onEnded={handleEnded}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ opacity: 0 }}
        />
        <video
          ref={videoBRef}
          muted
          playsInline
          onEnded={handleEnded}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ opacity: 0 }}
        />
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
