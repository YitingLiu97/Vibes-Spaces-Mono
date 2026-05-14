'use client';

import { useEffect, useState } from 'react';
import { Download, FileJson } from 'lucide-react';
import { getSupabase } from '@/lib/supabase';
import { ORG_ID } from '@/lib/constants';
import { Button } from './Button';
import { Modal } from './Modal';
import { useToast } from './Toast';
import { DAYS, maskToDays, type Day } from '@/lib/weekday-mask';

// Mirrors the ImportEventDialog schema so a roundtrip works: export →
// edit externally (spreadsheet, ChatGPT, by hand) → re-import.
//
// Deliberately *omits* runtime state: force_play_*, live_overlay_*,
// client_status, feature_interest. Those are transient signals that
// would pollute a "template" file and confuse re-imports.

interface Counts {
  scenes: number;
  cards: number;
  schedule: number;
}

function filenameFromUrl(url: string): string | null {
  const tail = url.split('/').pop();
  return tail || null;
}

function maskToWeeklyDays(mask: number): Day[] {
  const dayMap = maskToDays(mask);
  return DAYS.filter((d) => dayMap[d]);
}

function timeToShortFormat(t: string): string {
  // Postgres time returns "HH:MM:SS". Trim seconds when they're :00 — the
  // import accepts both "HH:MM" and "HH:MM:SS", and the short form is
  // friendlier to read and edit.
  if (/^\d{2}:\d{2}:00$/.test(t)) return t.slice(0, 5);
  return t;
}

export function ExportEventDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setCounts(null);
    const supabase = getSupabase();
    Promise.all([
      supabase.from('scenes').select('id', { count: 'exact', head: true }).eq('org_id', ORG_ID),
      supabase.from('overlays').select('id', { count: 'exact', head: true }).eq('org_id', ORG_ID),
      supabase
        .from('schedule_entries')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', ORG_ID),
    ])
      .then(([s, c, sc]) => {
        setCounts({
          scenes: s.count ?? 0,
          cards: c.count ?? 0,
          schedule: sc.count ?? 0,
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [open]);

  async function downloadJson() {
    setDownloading(true);
    try {
      const supabase = getSupabase();
      const [scenesRes, overlaysRes, scheduleRes] = await Promise.all([
        supabase.from('scenes').select('*').eq('org_id', ORG_ID).order('name'),
        supabase
          .from('overlays')
          .select('*')
          .eq('org_id', ORG_ID)
          .order('created_at', { ascending: true }),
        supabase
          .from('schedule_entries')
          .select('*, scene:scenes(name), playlist:playlists(name)')
          .eq('org_id', ORG_ID)
          .order('created_at', { ascending: true }),
      ]);

      const exportData = {
        version: 1 as const,
        exportedAt: new Date().toISOString(),
        scenes: (scenesRes.data ?? []).map((s) => ({
          // Include both name and filename so re-import matches even after
          // an external rename: name match wins first, filename is fallback.
          match: {
            name: s.name,
            filename: filenameFromUrl(s.video_url) ?? undefined,
          },
          name: s.name,
          loopEnabled: s.loop_enabled ?? true,
          hideAttribution: s.hide_attribution ?? false,
          composition: s.composition ?? null,
        })),
        cards: (overlaysRes.data ?? []).map((o) => ({
          name: o.name,
          type: o.type,
          content: o.content,
          animation: o.animation,
          durationMs: o.duration_ms,
        })),
        schedule: (scheduleRes.data ?? []).map((e) => {
          const out: Record<string, unknown> = {
            startTime: timeToShortFormat(e.start_time),
            endTime: timeToShortFormat(e.end_time),
          };
          // Either sceneName or playlistName, whichever the entry targets.
          const sceneRel = e.scene as { name: string } | null;
          const playlistRel = e.playlist as { name: string } | null;
          if (sceneRel) out.sceneName = sceneRel.name;
          else if (playlistRel) out.playlistName = playlistRel.name;
          if (e.weekday_mask !== null && e.weekday_mask !== undefined) {
            out.weeklyDays = maskToWeeklyDays(e.weekday_mask);
          }
          if (e.override_date) out.overrideDate = e.override_date;
          return out;
        }),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      const stamp = new Date().toISOString().slice(0, 10);
      link.download = `vibes-event-${stamp}.json`;
      link.click();
      URL.revokeObjectURL(link.href);
      toast({
        title: 'Event exported',
        description: `${exportData.scenes.length} scenes · ${exportData.cards.length} cards · ${exportData.schedule.length} schedule entries`,
      });
      onClose();
    } catch (e) {
      console.error('[export] failed', e);
      toast({
        variant: 'destructive',
        title: 'Couldn’t export',
        description: 'Check your connection and try again.',
      });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Export event"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={downloading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={downloadJson}
            disabled={loading || downloading || !counts}
          >
            <Download className="h-4 w-4" strokeWidth={1.5} />
            {downloading ? 'Building file…' : 'Download JSON'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-fg-secondary">
          Downloads the current authoring state as a single JSON file in the
          same format the Import dialog accepts. Edit it in any tool and
          re-import to update everything in one shot.
        </p>
        <p className="text-xs text-fg-tertiary">
          Skipped on purpose: force-play state, live card state, heartbeat —
          these are transient runtime signals, not part of the event template.
        </p>

        {loading ? (
          <div className="h-20 animate-pulse rounded-lg bg-bg-elevated" />
        ) : counts ? (
          <div className="flex flex-col gap-2 rounded-md border border-border-subtle bg-bg-base p-4">
            <div className="flex items-center gap-2 text-sm text-fg-primary">
              <FileJson className="h-4 w-4 text-accent" strokeWidth={1.5} />
              About to export
            </div>
            <ul className="text-xs text-fg-secondary list-disc pl-5">
              <li>{counts.scenes} scene(s) — metadata + composition only (videos stay in storage)</li>
              <li>{counts.cards} card(s)</li>
              <li>{counts.schedule} schedule entry/entries</li>
            </ul>
          </div>
        ) : (
          <div className="rounded-md border border-danger/30 bg-danger-soft p-3 text-sm text-fg-primary">
            Couldn’t reach Supabase to count rows. The export may still work — try anyway.
          </div>
        )}
      </div>
    </Modal>
  );
}
