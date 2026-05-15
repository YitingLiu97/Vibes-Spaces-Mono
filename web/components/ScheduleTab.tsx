'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Playlist, Scene, ScheduleEntry } from '@vibes/shared/types';
import { getSupabase } from '@/lib/supabase';
import { ORG_ID } from '@/lib/constants';
import { Button } from './Button';
import { Modal } from './Modal';
import { useToast } from './Toast';
import { DAYS, type Day, computeWeekdayMask } from '@/lib/weekday-mask';

// Visible window of the day in the timeline. 11:00 → 23:00 covers the full
// event arc with breathing room on each side; outside this, entries still
// exist in the DB, just clipped from view.
const VISIBLE_START_MIN = 11 * 60;
const VISIBLE_END_MIN = 23 * 60;
const VISIBLE_SPAN = VISIBLE_END_MIN - VISIBLE_START_MIN;

function isoToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function shiftDate(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function timeToMin(t: string): number {
  const [h, m] = t.split(':');
  return Number(h) * 60 + Number(m);
}

function minToTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function entryMatchesDate(e: ScheduleEntry, isoDate: string): boolean {
  if (e.overrideDate === isoDate) return true;
  if (e.weekdayMask !== null && e.weekdayMask !== undefined) {
    const dow = new Date(isoDate + 'T00:00:00').getDay();
    return (e.weekdayMask & (1 << dow)) !== 0;
  }
  return false;
}

export function ScheduleTab() {
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [seedStartTime, setSeedStartTime] = useState<string | null>(null);
  const [date, setDate] = useState<string>(() => {
    // If today has no entries but a near-future day does, prefer that day
    // (we patch this in refresh once entries load).
    return isoToday();
  });
  const { toast } = useToast();

  const refresh = useCallback(async () => {
    const supabase = getSupabase();
    const [entriesRes, scenesRes, plRes] = await Promise.all([
      supabase
        .from('schedule_entries')
        .select('*')
        .eq('org_id', ORG_ID)
        .order('created_at', { ascending: false }),
      supabase.from('scenes').select('id,name').eq('org_id', ORG_ID),
      supabase.from('playlists').select('id,name').eq('org_id', ORG_ID),
    ]);
    const list: ScheduleEntry[] = (entriesRes.data ?? []).map((e) => ({
      id: e.id,
      sceneId: e.scene_id,
      playlistId: e.playlist_id,
      startTime: e.start_time,
      endTime: e.end_time,
      weekdayMask: e.weekday_mask,
      overrideDate: e.override_date,
    }));
    setEntries(list);
    setScenes(
      (scenesRes.data ?? []).map((s) => ({
        id: s.id,
        name: s.name,
        videoUrl: '',
        hideAttribution: false,
        loopEnabled: true,
        composition: null,
      })),
    );
    setPlaylists(
      (plRes.data ?? []).map((p) => ({ id: p.id, name: p.name, sceneIdsInOrder: [] })),
    );
    setLoading(false);

    // First load: if the default date has no entries, jump to the nearest
    // override_date that does (helps the day-before-event case).
    setDate((current) => {
      const hasToday = list.some((e) => entryMatchesDate(e, current));
      if (hasToday) return current;
      const upcoming = list
        .map((e) => e.overrideDate)
        .filter((d): d is string => !!d && d >= isoToday())
        .sort()[0];
      return upcoming ?? current;
    });
  }, []);

  useEffect(() => {
    refresh().catch(() => setLoading(false));
  }, [refresh]);

  async function deleteEntry(id: string) {
    if (!confirm('Delete this schedule entry?')) return;
    setEntries((prev) => prev.filter((e) => e.id !== id));
    try {
      await getSupabase().from('schedule_entries').delete().eq('id', id);
      toast({ title: 'Entry deleted' });
    } catch {
      refresh();
    }
  }

  const visibleEntries = useMemo(
    () => entries.filter((e) => entryMatchesDate(e, date)).sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [entries, date],
  );

  const dateLabel = useMemo(() => {
    try {
      return new Date(date + 'T00:00:00').toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return date;
    }
  }, [date]);

  function labelFor(e: ScheduleEntry): string {
    if (e.sceneId) return scenes.find((s) => s.id === e.sceneId)?.name ?? '—';
    if (e.playlistId) return playlists.find((p) => p.id === e.playlistId)?.name ?? '—';
    return '—';
  }

  function openAdd(seedStart: string | null) {
    setSeedStartTime(seedStart);
    setAddOpen(true);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-fg-primary">Schedule</h1>
        <Button variant="primary" onClick={() => openAdd(null)}>
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          Add entry
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => setDate((d) => shiftDate(d, -1))} aria-label="Previous day">
          <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
        </Button>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-md border border-border bg-bg-base px-3 py-2 text-sm text-fg-primary"
        />
        <Button variant="ghost" size="sm" onClick={() => setDate((d) => shiftDate(d, 1))} aria-label="Next day">
          <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
        </Button>
        <span className="text-sm text-fg-secondary ml-2">{dateLabel}</span>
        <span className="text-xs text-fg-tertiary ml-auto">
          Click an empty slot to add · click an entry to delete
        </span>
      </div>

      {loading ? (
        <div className="h-32 animate-pulse rounded-lg bg-bg-elevated" />
      ) : (
        <ScheduleTimeline
          entries={visibleEntries}
          labelFor={labelFor}
          onClickEmpty={(t) => openAdd(t)}
          onClickEntry={(e) => deleteEntry(e.id)}
        />
      )}

      {visibleEntries.length === 0 && !loading && (
        <div className="rounded-md border border-dashed border-border bg-bg-base p-4 text-sm text-fg-tertiary">
          No entries on this day. Click anywhere on the timeline above to add one at that time.
        </div>
      )}

      <ScheduleAddDialog
        open={addOpen}
        onClose={() => {
          setAddOpen(false);
          setSeedStartTime(null);
        }}
        onAdded={refresh}
        scenes={scenes}
        playlists={playlists}
        seedStartTime={seedStartTime}
        seedDate={date}
      />
    </div>
  );
}

function ScheduleTimeline({
  entries,
  labelFor,
  onClickEmpty,
  onClickEntry,
}: {
  entries: ScheduleEntry[];
  labelFor: (e: ScheduleEntry) => string;
  onClickEmpty: (time: string) => void;
  onClickEntry: (e: ScheduleEntry) => void;
}) {
  const railRef = useRef<HTMLDivElement>(null);

  function pct(min: number): number {
    return ((min - VISIBLE_START_MIN) / VISIBLE_SPAN) * 100;
  }

  function handleRailClick(ev: React.MouseEvent<HTMLDivElement>) {
    if (ev.target !== ev.currentTarget) return; // click landed on an entry
    const rect = railRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ev.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    const min = VISIBLE_START_MIN + Math.round((ratio * VISIBLE_SPAN) / 5) * 5;
    onClickEmpty(minToTime(min));
  }

  const hours: number[] = [];
  for (let h = Math.ceil(VISIBLE_START_MIN / 60); h <= Math.floor(VISIBLE_END_MIN / 60); h++) {
    hours.push(h);
  }

  return (
    <div className="schedule-timeline">
      <div className="schedule-axis">
        {hours.map((h) => (
          <div key={h} className="schedule-axis-tick" style={{ left: `${pct(h * 60)}%` }}>
            <span className="schedule-axis-tick-label">{String(h).padStart(2, '0')}:00</span>
          </div>
        ))}
      </div>
      <div ref={railRef} className="schedule-rail" onClick={handleRailClick} role="grid">
        {hours.map((h) => (
          <div key={h} className="schedule-rail-grid" style={{ left: `${pct(h * 60)}%` }} aria-hidden />
        ))}
        {entries.map((e) => {
          const start = timeToMin(e.startTime);
          const end = timeToMin(e.endTime);
          if (end <= VISIBLE_START_MIN || start >= VISIBLE_END_MIN) return null;
          const clippedStart = Math.max(start, VISIBLE_START_MIN);
          const clippedEnd = Math.min(end, VISIBLE_END_MIN);
          const isPlaylist = !!e.playlistId;
          return (
            <button
              key={e.id}
              type="button"
              onClick={(ev) => {
                ev.stopPropagation();
                onClickEntry(e);
              }}
              className={`schedule-block${isPlaylist ? ' schedule-block--playlist' : ''}`}
              style={{
                left: `${pct(clippedStart)}%`,
                width: `${pct(clippedEnd) - pct(clippedStart)}%`,
              }}
              title={`${labelFor(e)} · ${e.startTime.slice(0, 5)}–${e.endTime.slice(0, 5)}`}
            >
              <span className="schedule-block-label">{labelFor(e)}</span>
              <span className="schedule-block-time">
                {e.startTime.slice(0, 5)}–{e.endTime.slice(0, 5)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ScheduleAddDialog({
  open,
  onClose,
  onAdded,
  scenes,
  playlists,
  seedStartTime,
  seedDate,
}: {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
  scenes: Scene[];
  playlists: Playlist[];
  seedStartTime: string | null;
  seedDate: string;
}) {
  const [targetType, setTargetType] = useState<'scene' | 'playlist'>('scene');
  const [targetId, setTargetId] = useState<string>('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [recurrence, setRecurrence] = useState<'weekly' | 'oneoff'>('oneoff');
  const [days, setDays] = useState<Record<Day, boolean>>({
    sun: false, mon: true, tue: true, wed: true, thu: true, fri: true, sat: false,
  });
  const [overrideDate, setOverrideDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    setError(null);
    setTargetId('');
    setStartTime(seedStartTime ?? '12:00');
    // Default end = start + 15 min
    if (seedStartTime) {
      const [h, m] = seedStartTime.split(':').map(Number);
      const endMin = h * 60 + m + 15;
      setEndTime(minToTime(endMin));
    } else {
      setEndTime('12:15');
    }
    setRecurrence('oneoff');
    setOverrideDate(seedDate);
  }, [open, seedStartTime, seedDate]);

  async function submit() {
    setError(null);
    if (!targetId) {
      setError('Choose a scene or playlist.');
      return;
    }
    if (startTime >= endTime) {
      setError('End time must be after start time.');
      return;
    }
    if (recurrence === 'weekly' && computeWeekdayMask(days) === 0) {
      setError('Pick at least one day.');
      return;
    }
    if (recurrence === 'oneoff' && !overrideDate) {
      setError('Pick a date.');
      return;
    }

    setSubmitting(true);
    try {
      const row = {
        org_id: ORG_ID,
        scene_id: targetType === 'scene' ? targetId : null,
        playlist_id: targetType === 'playlist' ? targetId : null,
        start_time: startTime + ':00',
        end_time: endTime + ':00',
        weekday_mask: recurrence === 'weekly' ? computeWeekdayMask(days) : null,
        override_date: recurrence === 'oneoff' ? overrideDate : null,
      };
      const { error: insErr } = await getSupabase().from('schedule_entries').insert(row);
      if (insErr) throw insErr;
      toast({ title: 'Entry added' });
      onAdded();
      onClose();
    } catch {
      toast({
        variant: 'destructive',
        title: 'Couldn’t save',
        description: 'Check your connection and try again.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  const targets = targetType === 'scene' ? scenes : playlists;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add to schedule"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={submitting}>
            {submitting ? 'Adding…' : 'Add'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-fg-primary">Target</span>
          <div className="flex gap-2">
            <SegmentedButton
              active={targetType === 'scene'}
              onClick={() => {
                setTargetType('scene');
                setTargetId('');
              }}
            >
              Scene
            </SegmentedButton>
            <SegmentedButton
              active={targetType === 'playlist'}
              onClick={() => {
                setTargetType('playlist');
                setTargetId('');
              }}
            >
              Playlist
            </SegmentedButton>
          </div>
          <select
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="mt-1 rounded-md border border-border bg-bg-base px-3 py-3 text-base text-fg-primary"
          >
            <option value="">Choose a {targetType}…</option>
            {targets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-2">
            <span className="text-sm font-medium text-fg-primary">Start</span>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="rounded-md border border-border bg-bg-base px-3 py-3 text-base text-fg-primary"
            />
          </label>
          <label className="flex flex-1 flex-col gap-2">
            <span className="text-sm font-medium text-fg-primary">End</span>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="rounded-md border border-border bg-bg-base px-3 py-3 text-base text-fg-primary"
            />
          </label>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-fg-primary">Recurrence</span>
          <div className="flex gap-2">
            <SegmentedButton active={recurrence === 'oneoff'} onClick={() => setRecurrence('oneoff')}>
              One-off date
            </SegmentedButton>
            <SegmentedButton active={recurrence === 'weekly'} onClick={() => setRecurrence('weekly')}>
              Weekly
            </SegmentedButton>
          </div>
        </div>

        {recurrence === 'weekly' ? (
          <div className="flex flex-wrap gap-2">
            {DAYS.map((d) => (
              <label
                key={d}
                className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-bg-base px-3 py-2 text-sm text-fg-primary has-[:checked]:border-accent has-[:checked]:bg-accent-soft"
              >
                <input
                  type="checkbox"
                  checked={days[d]}
                  onChange={(e) => setDays((prev) => ({ ...prev, [d]: e.target.checked }))}
                />
                {d.toUpperCase()}
              </label>
            ))}
          </div>
        ) : (
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-fg-primary">Date</span>
            <input
              type="date"
              value={overrideDate}
              onChange={(e) => setOverrideDate(e.target.value)}
              className="rounded-md border border-border bg-bg-base px-3 py-3 text-base text-fg-primary"
            />
          </label>
        )}

        {error && (
          <div className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-fg-primary">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}

function SegmentedButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? 'flex-1 rounded-md border border-accent bg-accent-soft px-4 py-2 text-sm font-medium text-accent min-h-[40px]'
          : 'flex-1 rounded-md border border-border bg-bg-base px-4 py-2 text-sm font-medium text-fg-secondary hover:text-fg-primary min-h-[40px]'
      }
    >
      {children}
    </button>
  );
}
