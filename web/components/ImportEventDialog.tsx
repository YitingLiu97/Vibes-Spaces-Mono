'use client';

import { useState } from 'react';
import { Download, FileJson, Upload } from 'lucide-react';
import type {
  CaptionFont,
  CaptionHAlign,
  CaptionVAlign,
  OverlayAnimation,
  OverlayType,
  SceneComposition,
  ZoneHPosition,
} from '@vibes/shared/types';
import { EMPTY_COMPOSITION } from '@vibes/shared/types';
import { getSupabase } from '@/lib/supabase';
import { ORG_ID } from '@/lib/constants';
import { Button } from './Button';
import { Modal } from './Modal';
import { useToast } from './Toast';
import { DAYS, computeWeekdayMask, type Day } from '@/lib/weekday-mask';

// ─────────────────────────────────────────────────────────────────────────
// JSON event file format (version 1).
// Scenes match an existing row by `match: { name }` or `match: { filename }`.
// Cards and schedule entries are created fresh. Importing is additive — it
// updates scene metadata in place and appends cards/schedule entries.
// ─────────────────────────────────────────────────────────────────────────

interface EventFileV1 {
  version: 1;
  scenes?: ImportScene[];
  cards?: ImportCard[];
  schedule?: ImportScheduleEntry[];
}

interface ImportScene {
  match: { name?: string; filename?: string };
  name?: string;
  loopEnabled?: boolean;
  hideAttribution?: boolean;
  composition?: SceneComposition | null;
}

interface ImportCard {
  name: string;
  type: OverlayType;
  content: unknown;
  animation?: OverlayAnimation;
  durationMs?: number;
}

interface ImportScheduleEntry {
  sceneName?: string;
  playlistName?: string;
  startTime: string; // "HH:MM" or "HH:MM:SS"
  endTime: string;
  weeklyDays?: Day[];
  overrideDate?: string; // YYYY-MM-DD
}

interface ImportResult {
  scenesUpdated: number;
  scenesNotFound: string[];
  cardsCreated: number;
  cardsFailed: number;
  scheduleCreated: number;
  scheduleFailed: number;
}

const EXAMPLE_JSON: EventFileV1 = {
  version: 1,
  scenes: [
    {
      match: { filename: '01_arrival_clip.mp4' },
      name: 'Arrival',
      loopEnabled: true,
      composition: {
        ...EMPTY_COMPOSITION,
        caption: {
          text: 'Welcome to FoNYCD',
          font: 'bebas',
          size: 56,
          color: '#F0EAF5',
          h: 'center',
          v: 'bottom',
        },
        tint: { color: '#141418', opacity: 30 },
      },
    },
  ],
  cards: [
    {
      name: 'Maya Chen — keynote',
      type: 'speaker_card',
      content: { name: 'Maya Chen', role: 'Designer, NYC Design Week' },
      animation: 'slide-up',
      durationMs: 8000,
    },
    {
      name: 'Welcome banner',
      type: 'text',
      content: { lines: ['FUTURE OF NYC DESIGN', 'May 14, 2026'] },
      animation: 'fade',
      durationMs: 6000,
    },
  ],
  schedule: [
    {
      sceneName: 'Arrival',
      startTime: '09:00',
      endTime: '10:00',
      weeklyDays: ['thu', 'fri'],
    },
  ],
};

function normalizeTime(t: string): string {
  // Accept "HH:MM" or "HH:MM:SS"; PostgreSQL `time` accepts both.
  if (/^\d{2}:\d{2}$/.test(t)) return `${t}:00`;
  return t;
}

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

function validate(raw: unknown): { ok: true; data: EventFileV1 } | { ok: false; error: string } {
  if (!isObject(raw)) return { ok: false, error: 'Root must be a JSON object.' };
  if (raw.version !== 1) return { ok: false, error: 'Expected "version": 1 at the root.' };
  // Permissive validation — we trust the schema and let row inserts fail
  // individually if specific fields are off, with detailed error logging.
  return { ok: true, data: raw as unknown as EventFileV1 };
}

interface SceneRow {
  id: string;
  name: string;
  video_url: string;
}

function matchScene(
  scenes: SceneRow[],
  match: ImportScene['match'],
): SceneRow | null {
  if (match.name) {
    const byName = scenes.find((s) => s.name.toLowerCase() === match.name!.toLowerCase());
    if (byName) return byName;
  }
  if (match.filename) {
    const lower = match.filename.toLowerCase();
    return (
      scenes.find((s) => {
        const tail = s.video_url.split('/').pop()?.toLowerCase() ?? '';
        return tail === lower || tail.endsWith('/' + lower);
      }) ??
      // Fallback: match by name === filename (without extension)
      scenes.find(
        (s) =>
          s.name.toLowerCase() ===
          match.filename!.replace(/\.[^/.]+$/, '').toLowerCase(),
      ) ??
      null
    );
  }
  return null;
}

export function ImportEventDialog({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}) {
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<EventFileV1 | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const { toast } = useToast();

  function reset() {
    setParseError(null);
    setParsed(null);
    setResult(null);
  }

  async function onFile(file: File) {
    reset();
    try {
      const text = await file.text();
      const raw = JSON.parse(text);
      const v = validate(raw);
      if (!v.ok) {
        setParseError(v.error);
        return;
      }
      setParsed(v.data);
    } catch (e) {
      setParseError(e instanceof Error ? e.message : 'Invalid JSON file.');
    }
  }

  async function runImport() {
    if (!parsed) return;
    setBusy(true);
    const supabase = getSupabase();
    const out: ImportResult = {
      scenesUpdated: 0,
      scenesNotFound: [],
      cardsCreated: 0,
      cardsFailed: 0,
      scheduleCreated: 0,
      scheduleFailed: 0,
    };

    // Fetch the scenes index ONCE for matching.
    const { data: scenesData } = await supabase
      .from('scenes')
      .select('id, name, video_url')
      .eq('org_id', ORG_ID);
    const scenes: SceneRow[] = scenesData ?? [];

    // 1. Scene metadata updates
    for (const s of parsed.scenes ?? []) {
      const target = matchScene(scenes, s.match);
      if (!target) {
        out.scenesNotFound.push(s.match.name ?? s.match.filename ?? '(unknown)');
        continue;
      }
      const patch: Record<string, unknown> = {};
      if (s.name !== undefined) patch.name = s.name;
      if (s.loopEnabled !== undefined) patch.loop_enabled = s.loopEnabled;
      if (s.hideAttribution !== undefined) patch.hide_attribution = s.hideAttribution;
      if (s.composition !== undefined) patch.composition = s.composition;
      if (Object.keys(patch).length === 0) continue;
      const { error } = await supabase.from('scenes').update(patch).eq('id', target.id);
      if (error) console.error('[import] scene update failed', target.name, error);
      else out.scenesUpdated++;
    }

    // 2. Card inserts (always additive — never deletes existing cards)
    for (const c of parsed.cards ?? []) {
      const { error } = await supabase.from('overlays').insert({
        org_id: ORG_ID,
        name: c.name,
        type: c.type,
        content: c.content,
        animation: c.animation ?? 'fade',
        duration_ms: c.durationMs ?? 6000,
      });
      if (error) {
        out.cardsFailed++;
        console.error('[import] card insert failed', c.name, error);
      } else {
        out.cardsCreated++;
      }
    }

    // 3. Schedule inserts — resolve sceneName/playlistName to ids
    if (parsed.schedule && parsed.schedule.length > 0) {
      const { data: playlistsData } = await supabase
        .from('playlists')
        .select('id, name')
        .eq('org_id', ORG_ID);
      const playlists = playlistsData ?? [];
      for (const e of parsed.schedule) {
        let sceneId: string | null = null;
        let playlistId: string | null = null;
        if (e.sceneName) {
          sceneId = scenes.find((s) => s.name.toLowerCase() === e.sceneName!.toLowerCase())?.id ?? null;
          if (!sceneId) {
            out.scheduleFailed++;
            console.error('[import] schedule: scene not found', e.sceneName);
            continue;
          }
        } else if (e.playlistName) {
          playlistId =
            playlists.find((p) => p.name.toLowerCase() === e.playlistName!.toLowerCase())?.id ??
            null;
          if (!playlistId) {
            out.scheduleFailed++;
            console.error('[import] schedule: playlist not found', e.playlistName);
            continue;
          }
        } else {
          out.scheduleFailed++;
          console.error('[import] schedule: needs sceneName or playlistName', e);
          continue;
        }
        const weekdayMask =
          e.weeklyDays && e.weeklyDays.length > 0
            ? computeWeekdayMask(
                DAYS.reduce<Record<Day, boolean>>(
                  (acc, d) => ({ ...acc, [d]: e.weeklyDays!.includes(d) }),
                  { sun: false, mon: false, tue: false, wed: false, thu: false, fri: false, sat: false },
                ),
              )
            : null;
        const { error } = await supabase.from('schedule_entries').insert({
          org_id: ORG_ID,
          scene_id: sceneId,
          playlist_id: playlistId,
          start_time: normalizeTime(e.startTime),
          end_time: normalizeTime(e.endTime),
          weekday_mask: weekdayMask,
          override_date: e.overrideDate ?? null,
        });
        if (error) {
          out.scheduleFailed++;
          console.error('[import] schedule insert failed', e, error);
        } else {
          out.scheduleCreated++;
        }
      }
    }

    setResult(out);
    setBusy(false);
    onImported();
    const summary = [
      out.scenesUpdated > 0 && `${out.scenesUpdated} scenes updated`,
      out.cardsCreated > 0 && `${out.cardsCreated} cards created`,
      out.scheduleCreated > 0 && `${out.scheduleCreated} schedule entries created`,
    ]
      .filter(Boolean)
      .join(' · ');
    toast({
      title: 'Event imported',
      description: summary || 'Nothing to import.',
    });
  }

  function downloadExample() {
    const blob = new Blob([JSON.stringify(EXAMPLE_JSON, null, 2)], {
      type: 'application/json',
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'vibes-event-example.json';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Import event"
      footer={
        <>
          <Button
            variant="ghost"
            onClick={() => {
              reset();
              onClose();
            }}
            disabled={busy}
          >
            {result ? 'Done' : 'Cancel'}
          </Button>
          {parsed && !result && (
            <Button variant="primary" onClick={runImport} disabled={busy}>
              <Upload className="h-4 w-4" strokeWidth={1.5} />
              {busy ? 'Importing…' : 'Import'}
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-fg-secondary">
          One JSON file describes scenes, cards, and schedule entries. Scenes match
          existing rows by name or filename — videos must already be uploaded.
          Cards and schedule entries are <strong>additive</strong> (always appended,
          never replaces what's there).
        </p>

        <button
          type="button"
          onClick={downloadExample}
          className="inline-flex w-fit items-center gap-2 rounded-md border border-border bg-bg-base px-3 py-2 text-xs font-medium text-fg-secondary hover:text-fg-primary hover:border-accent"
        >
          <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
          Download example.json
        </button>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-fg-primary">Event file (JSON)</span>
          <input
            type="file"
            accept="application/json,.json"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
            className="rounded-md border border-border bg-bg-base px-3 py-3 text-sm text-fg-primary"
          />
        </label>

        {parseError && (
          <div className="rounded-md border border-danger/30 bg-danger-soft p-3 text-sm text-fg-primary">
            <div className="font-medium">Couldn't read the file</div>
            <div className="mt-1 text-fg-secondary">{parseError}</div>
          </div>
        )}

        {parsed && !result && (
          <div className="flex flex-col gap-2 rounded-md border border-border-subtle bg-bg-base p-4">
            <div className="flex items-center gap-2 text-sm text-fg-primary">
              <FileJson className="h-4 w-4 text-accent" strokeWidth={1.5} />
              Ready to import
            </div>
            <ul className="text-xs text-fg-secondary list-disc pl-5">
              <li>{parsed.scenes?.length ?? 0} scene update(s)</li>
              <li>{parsed.cards?.length ?? 0} card(s) will be created</li>
              <li>{parsed.schedule?.length ?? 0} schedule entry/entries will be created</li>
            </ul>
          </div>
        )}

        {result && (
          <div className="flex flex-col gap-2 rounded-md border border-success/30 bg-success-soft p-4 text-sm text-fg-primary">
            <div className="font-medium">Import complete</div>
            <ul className="text-xs text-fg-secondary list-disc pl-5">
              <li>Scenes updated: {result.scenesUpdated}</li>
              {result.scenesNotFound.length > 0 && (
                <li className="text-warning">
                  Not found: {result.scenesNotFound.join(', ')}
                </li>
              )}
              <li>
                Cards: {result.cardsCreated} created
                {result.cardsFailed > 0 ? `, ${result.cardsFailed} failed` : ''}
              </li>
              <li>
                Schedule: {result.scheduleCreated} created
                {result.scheduleFailed > 0 ? `, ${result.scheduleFailed} failed` : ''}
              </li>
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}

// Unused helper imports kept for type narrowing in the future.
export type {
  CaptionFont,
  CaptionHAlign,
  CaptionVAlign,
  ZoneHPosition,
};
