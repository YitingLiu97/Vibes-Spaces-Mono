'use client';

import { useEffect, useState } from 'react';
import { RotateCcw, X } from 'lucide-react';
import type {
  ClientStatus,
  OrgSettings,
  Overlay,
  OverlayAnimation,
  OverlayType,
  Scene,
} from '@vibes/shared/types';
import { heartbeatHealth } from '@vibes/shared/health';
import { getSupabase } from '@/lib/supabase';
import { NOW_TAB_POLL_MS, ORG_ID } from '@/lib/constants';
import { Button } from './Button';
import { HeartbeatDot } from './HeartbeatDot';
import { useToast } from './Toast';
import { QuickStart } from './QuickStart';

interface NowState {
  status: ClientStatus | null;
  settings: OrgSettings | null;
  forcedScene: Scene | null;
  overlays: Overlay[];
  sceneCount: number;
  loading: boolean;
  error: string | null;
}

export function NowTab() {
  const [state, setState] = useState<NowState>({
    status: null,
    settings: null,
    forcedScene: null,
    overlays: [],
    sceneCount: 0,
    loading: true,
    error: null,
  });
  // 1Hz ticker so overlay-elapsed math re-evaluates between 5s polls and the
  // "Live" chip drops the moment duration runs out (not 5s later).
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);
  const { toast } = useToast();

  useEffect(() => {
    let active = true;

    async function poll() {
      const supabase = getSupabase();
      try {
        const [statusRes, settingsRes, overlaysRes, scenesCountRes] = await Promise.all([
          supabase.from('client_status').select('*').eq('org_id', ORG_ID).maybeSingle(),
          supabase.from('org_settings').select('*').eq('org_id', ORG_ID).maybeSingle(),
          supabase
            .from('overlays')
            .select('*')
            .eq('org_id', ORG_ID)
            .order('created_at', { ascending: false }),
          supabase.from('scenes').select('id', { count: 'exact', head: true }).eq('org_id', ORG_ID),
        ]);
        if (!active) return;

        const settings: OrgSettings | null = settingsRes.data
          ? {
              orgId: settingsRes.data.org_id,
              defaultSceneId: settingsRes.data.default_scene_id,
              attributionEnabled: settingsRes.data.attribution_enabled,
              forcePlaySceneId: settingsRes.data.force_play_scene_id,
              liveOverlayId: settingsRes.data.live_overlay_id ?? null,
              liveOverlayStartedAt: settingsRes.data.live_overlay_started_at ?? null,
            }
          : null;

        let forcedScene: Scene | null = null;
        if (settings?.forcePlaySceneId) {
          const sceneRes = await supabase
            .from('scenes')
            .select('*')
            .eq('id', settings.forcePlaySceneId)
            .maybeSingle();
          if (sceneRes.data) {
            forcedScene = {
              id: sceneRes.data.id,
              name: sceneRes.data.name,
              videoUrl: sceneRes.data.video_url,
              hideAttribution: sceneRes.data.hide_attribution,
              loopEnabled: sceneRes.data.loop_enabled ?? true,
              composition: sceneRes.data.composition ?? null,
            };
          }
        }

        const status: ClientStatus | null = statusRes.data
          ? {
              orgId: statusRes.data.org_id,
              clientVersion: statusRes.data.client_version,
              currentSceneId: statusRes.data.current_scene_id,
              currentSceneName: statusRes.data.current_scene_name,
              currentSourceEntryId: statusRes.data.current_source_entry_id,
              lastHeartbeatAt: statusRes.data.last_heartbeat_at,
            }
          : null;

        const overlays: Overlay[] = (overlaysRes.data ?? []).map((row) => ({
          id: row.id,
          orgId: row.org_id,
          name: row.name,
          type: row.type as OverlayType,
          content: row.content,
          animation: row.animation as OverlayAnimation,
          durationMs: row.duration_ms,
        }));

        setState({
          status,
          settings,
          forcedScene,
          overlays,
          sceneCount: scenesCountRes.count ?? 0,
          loading: false,
          error: null,
        });
      } catch (e) {
        if (!active) return;
        setState((prev) => ({
          ...prev,
          loading: false,
          error: 'Couldn’t reach Supabase. Check your connection and try again.',
        }));
      }
    }

    poll();
    const id = window.setInterval(poll, NOW_TAB_POLL_MS);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, []);

  async function showOverlay(overlay: Overlay) {
    try {
      // RPC sets both live_overlay_id and live_overlay_started_at=now()
      // atomically, so re-tapping the same overlay restarts its timer.
      await getSupabase().rpc('trigger_live_overlay', {
        p_org_id: ORG_ID,
        p_overlay_id: overlay.id,
      });
      toast({ title: 'Showing now', description: overlay.name });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Couldn’t show overlay',
        description: 'Check your connection and try again.',
      });
    }
  }

  async function clearOverlay() {
    try {
      await getSupabase()
        .from('org_settings')
        .update({ live_overlay_id: null })
        .eq('org_id', ORG_ID);
    } catch {
      // silent — next poll will reconcile
    }
  }

  async function resume() {
    try {
      await getSupabase()
        .from('org_settings')
        .update({ force_play_scene_id: null })
        .eq('org_id', ORG_ID);
      toast({ title: 'Schedule resumed', description: 'Returning to scheduled scenes.' });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Couldn’t resume',
        description: 'Check your connection and try again.',
      });
    }
  }

  const health = heartbeatHealth(state.status?.lastHeartbeatAt ?? null);
  const lastSeen = state.status?.lastHeartbeatAt ?? null;
  const isForced = !!state.settings?.forcePlaySceneId;
  const currentSceneName = isForced
    ? state.forcedScene?.name ?? 'Playing now'
    : state.status?.currentSceneName ?? '—';
  const sourceLabel = isForced
    ? 'PLAYING'
    : state.status?.currentSourceEntryId === 'default'
    ? 'Default'
    : state.status?.currentSourceEntryId
    ? 'Scheduled'
    : null;

  // Compute "is this overlay actually visible right now" locally so the chip
  // refreshes the moment its duration runs out, even before any renderer has
  // had a chance to clear the DB row.
  const liveOverlayId = state.settings?.liveOverlayId ?? null;
  const liveOverlayStartedAt = state.settings?.liveOverlayStartedAt ?? null;
  const liveOverlay = liveOverlayId ? state.overlays.find((o) => o.id === liveOverlayId) : null;
  const overlayElapsedMs =
    liveOverlay && liveOverlayStartedAt
      ? Date.now() - new Date(liveOverlayStartedAt).getTime()
      : 0;
  const isOverlayActiveNow = !!liveOverlay && overlayElapsedMs < (liveOverlay?.durationMs ?? 0);
  const overlayRemainingSeconds =
    liveOverlay && isOverlayActiveNow
      ? Math.max(0, Math.ceil((liveOverlay.durationMs - overlayElapsedMs) / 1000))
      : 0;

  const isFirstRun = !state.loading && state.sceneCount === 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <HeartbeatDot health={health} lastHeartbeatAt={lastSeen} />
        <a
          href="/preview"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs uppercase tracking-wider text-fg-tertiary hover:text-accent font-mono"
        >
          Open preview ↗
        </a>
      </div>

      {state.error && (
        <div className="rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-fg-primary">
          {state.error}
        </div>
      )}

      {isFirstRun && <QuickStart hasOverlays={state.overlays.length > 0} />}

      <div className="flex flex-col gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-fg-tertiary">
          Now playing
        </span>
        <h1 className="font-display text-4xl text-fg-primary sm:text-5xl">{currentSceneName}</h1>
        {sourceLabel && (
          <span
            className={
              isForced
                ? 'inline-flex w-fit items-center rounded-full bg-warning-soft px-3 py-1 text-xs font-semibold uppercase tracking-wider text-warning'
                : 'inline-flex w-fit items-center rounded-full bg-bg-overlay px-3 py-1 text-xs font-medium text-fg-secondary'
            }
          >
            {sourceLabel}
          </span>
        )}
      </div>

      {isForced && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-lg border border-warning/30 p-5"
          style={{ background: 'var(--color-warning-soft)' }}
        >
          <div className="text-sm font-medium text-fg-primary">Playing manually.</div>
          <div className="text-sm text-fg-secondary">
            {state.forcedScene?.name ?? 'A scene'} will keep playing until you resume the schedule.
          </div>
          <Button variant="primary" fullWidth onClick={resume}>
            <RotateCcw className="h-4 w-4" strokeWidth={1.5} />
            Resume schedule
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-fg-tertiary">
            Live overlays
          </span>
          {isOverlayActiveNow && (
            <button
              onClick={clearOverlay}
              className="inline-flex items-center gap-1 text-xs text-fg-secondary hover:text-fg-primary"
            >
              <X className="h-3 w-3" strokeWidth={1.5} />
              Clear
            </button>
          )}
        </div>
        {state.overlays.length === 0 ? (
          <p className="text-sm text-fg-tertiary">
            No overlays yet.{' '}
            <a href="/dashboard/overlays" className="text-accent hover:text-accent-hover">
              Build one
            </a>{' '}
            to push speaker cards, quotes, or logos on top of the video.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {state.overlays.map((o) => {
              const isLive = isOverlayActiveNow && liveOverlayId === o.id;
              return (
                <button
                  key={o.id}
                  onClick={() => showOverlay(o)}
                  title={`${Math.round(o.durationMs / 1000)}s hold`}
                  className={
                    isLive
                      ? 'inline-flex items-center gap-2 rounded-md border border-warning bg-warning-soft px-3 py-2 text-sm font-medium text-warning min-h-[40px]'
                      : 'inline-flex items-center gap-2 rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm font-medium text-fg-primary hover:bg-bg-pressed min-h-[40px]'
                  }
                >
                  {o.name}
                  {isLive ? (
                    <span className="rounded-full bg-warning px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-bg-base tabular-nums">
                      Live · {overlayRemainingSeconds}s
                    </span>
                  ) : (
                    <span className="rounded-full bg-bg-overlay px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider text-fg-tertiary tabular-nums">
                      {Math.round(o.durationMs / 1000)}s
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {health === 'red' && (
        <div className="rounded-lg border border-border-subtle bg-bg-elevated p-5 text-sm text-fg-secondary">
          Client offline{lastSeen ? `. Last seen ${new Date(lastSeen).toLocaleTimeString()}.` : '.'} Changes you make
          here will apply when it reconnects.
        </div>
      )}
    </div>
  );
}
