'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash } from 'lucide-react';
import type { Playlist, Scene, ScheduleEntry } from '@vibes/shared/types';
import { getSupabase } from '@/lib/supabase';
import { ORG_ID } from '@/lib/constants';
import { Button } from './Button';
import { Modal } from './Modal';
import { useToast } from './Toast';
import { DAYS, type Day, computeWeekdayMask, maskToLabel } from '@/lib/weekday-mask';

export function ScheduleTab() {
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
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
    setEntries(
      (entriesRes.data ?? []).map((e) => ({
        id: e.id,
        sceneId: e.scene_id,
        playlistId: e.playlist_id,
        startTime: e.start_time,
        endTime: e.end_time,
        weekdayMask: e.weekday_mask,
        overrideDate: e.override_date,
      })),
    );
    setScenes((scenesRes.data ?? []).map((s) => ({ id: s.id, name: s.name, videoUrl: '', hideAttribution: false, loopEnabled: true, composition: null })));
    setPlaylists(
      (plRes.data ?? []).map((p) => ({ id: p.id, name: p.name, sceneIdsInOrder: [] })),
    );
    setLoading(false);
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

  function entryLabel(e: ScheduleEntry) {
    const target =
      (e.sceneId && scenes.find((s) => s.id === e.sceneId)?.name) ||
      (e.playlistId && playlists.find((p) => p.id === e.playlistId)?.name) ||
      '—';
    const time = `${e.startTime.slice(0, 5)}–${e.endTime.slice(0, 5)}`;
    const recur =
      e.weekdayMask !== null ? maskToLabel(e.weekdayMask) : `On ${e.overrideDate}`;
    return { target, time, recur };
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-fg-primary">Schedule</h1>
        <Button variant="primary" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          Add entry
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-bg-elevated" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-border-subtle bg-bg-elevated p-8">
          <p className="text-base text-fg-primary">No schedule yet.</p>
          <p className="text-sm text-fg-secondary">
            Add an entry to choose what plays at the venue and when.
          </p>
          <Button variant="primary" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            Add entry
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-2" role="list">
          {entries.map((e) => {
            const { target, time, recur } = entryLabel(e);
            return (
              <li
                key={e.id}
                className="flex items-center gap-4 rounded-lg border border-border-subtle bg-bg-elevated px-4 py-3"
              >
                <div className="flex flex-1 flex-col gap-1">
                  <span className="text-base font-medium text-fg-primary">{target}</span>
                  <span className="text-xs text-fg-tertiary">
                    {recur} · {time}
                  </span>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => deleteEntry(e.id)}
                  aria-label="Delete entry"
                >
                  <Trash className="h-4 w-4" strokeWidth={1.5} />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <ScheduleAddDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={refresh}
        scenes={scenes}
        playlists={playlists}
      />
    </div>
  );
}

function ScheduleAddDialog({
  open,
  onClose,
  onAdded,
  scenes,
  playlists,
}: {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
  scenes: Scene[];
  playlists: Playlist[];
}) {
  const [targetType, setTargetType] = useState<'scene' | 'playlist'>('scene');
  const [targetId, setTargetId] = useState<string>('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [recurrence, setRecurrence] = useState<'weekly' | 'oneoff'>('weekly');
  const [days, setDays] = useState<Record<Day, boolean>>({
    sun: false,
    mon: true,
    tue: true,
    wed: true,
    thu: true,
    fri: true,
    sat: false,
  });
  const [overrideDate, setOverrideDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  function reset() {
    setTargetType('scene');
    setTargetId('');
    setStartTime('09:00');
    setEndTime('17:00');
    setRecurrence('weekly');
    setOverrideDate('');
    setError(null);
  }

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
      reset();
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
      title="Add schedule entry"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={submitting}>
            {submitting ? 'Adding…' : 'Add to schedule'}
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
            <SegmentedButton
              active={recurrence === 'weekly'}
              onClick={() => setRecurrence('weekly')}
            >
              Weekly
            </SegmentedButton>
            <SegmentedButton
              active={recurrence === 'oneoff'}
              onClick={() => setRecurrence('oneoff')}
            >
              One-off
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
