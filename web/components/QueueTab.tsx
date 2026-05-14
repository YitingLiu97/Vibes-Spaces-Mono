'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, SkipForward, Trash, X } from 'lucide-react';
import type { Playlist, QueueItem, Scene } from '@vibes/shared/types';
import { getSupabase } from '@/lib/supabase';
import { ORG_ID } from '@/lib/constants';
import { Button } from './Button';
import { Modal } from './Modal';
import { useToast } from './Toast';

interface OrgCursor {
  queueCurrentItemId: string | null;
  queueStartedAt: string | null;
}

export function QueueTab() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [cursor, setCursor] = useState<OrgCursor>({
    queueCurrentItemId: null,
    queueStartedAt: null,
  });
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const { toast } = useToast();

  const refresh = useCallback(async () => {
    const supabase = getSupabase();
    const [qRes, scenesRes, plRes, settingsRes] = await Promise.all([
      supabase
        .from('queue_items')
        .select('*')
        .eq('org_id', ORG_ID)
        .order('position', { ascending: true }),
      supabase.from('scenes').select('id,name').eq('org_id', ORG_ID),
      supabase.from('playlists').select('id,name').eq('org_id', ORG_ID),
      supabase
        .from('org_settings')
        .select('queue_current_item_id, queue_started_at')
        .eq('org_id', ORG_ID)
        .maybeSingle(),
    ]);
    setItems(
      (qRes.data ?? []).map((q) => ({
        id: q.id,
        position: q.position,
        sceneId: q.scene_id,
        playlistId: q.playlist_id,
        durationSeconds: q.duration_seconds,
      })),
    );
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
    if (settingsRes.data) {
      setCursor({
        queueCurrentItemId: settingsRes.data.queue_current_item_id,
        queueStartedAt: settingsRes.data.queue_started_at,
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh().catch(() => setLoading(false));
  }, [refresh]);

  function targetLabel(item: QueueItem): string {
    if (item.sceneId) return scenes.find((s) => s.id === item.sceneId)?.name ?? '—';
    if (item.playlistId) return playlists.find((p) => p.id === item.playlistId)?.name ?? '—';
    return '—';
  }

  async function deleteItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    try {
      await getSupabase().from('queue_items').delete().eq('id', id);
      toast({ title: 'Removed from queue' });
    } catch {
      refresh();
    }
  }

  async function moveItem(id: string, direction: -1 | 1) {
    const idx = items.findIndex((i) => i.id === id);
    if (idx < 0) return;
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= items.length) return;
    const a = items[idx];
    const b = items[swapIdx];
    const next = [...items];
    next[idx] = { ...b, position: a.position };
    next[swapIdx] = { ...a, position: b.position };
    setItems(next.sort((x, y) => x.position - y.position));
    try {
      const supabase = getSupabase();
      await Promise.all([
        supabase.from('queue_items').update({ position: b.position }).eq('id', a.id),
        supabase.from('queue_items').update({ position: a.position }).eq('id', b.id),
      ]);
    } catch {
      refresh();
    }
  }

  async function skipCurrent() {
    const current = items.find((i) => i.id === cursor.queueCurrentItemId);
    if (!current) return;
    const sorted = [...items].sort((a, b) => a.position - b.position);
    const idx = sorted.findIndex((i) => i.id === current.id);
    const next = sorted[idx + 1] ?? null;
    setCursor({
      queueCurrentItemId: next?.id ?? null,
      queueStartedAt: next ? new Date().toISOString() : null,
    });
    try {
      await getSupabase()
        .from('org_settings')
        .update({
          queue_current_item_id: next?.id ?? null,
          queue_started_at: next ? new Date().toISOString() : null,
        })
        .eq('org_id', ORG_ID);
      toast({ title: next ? 'Skipped to next' : 'Queue ended' });
    } catch {
      refresh();
    }
  }

  async function clearQueue() {
    if (!confirm('Clear the entire queue?')) return;
    setItems([]);
    setCursor({ queueCurrentItemId: null, queueStartedAt: null });
    try {
      const supabase = getSupabase();
      await Promise.all([
        supabase.from('queue_items').delete().eq('org_id', ORG_ID),
        supabase
          .from('org_settings')
          .update({ queue_current_item_id: null, queue_started_at: null })
          .eq('org_id', ORG_ID),
      ]);
      toast({ title: 'Queue cleared' });
    } catch {
      refresh();
    }
  }

  const sorted = [...items].sort((a, b) => a.position - b.position);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-fg-primary">Queue</h1>
        <div className="flex gap-2">
          {cursor.queueCurrentItemId && (
            <Button variant="ghost" onClick={skipCurrent}>
              <SkipForward className="h-4 w-4" strokeWidth={1.5} />
              Skip
            </Button>
          )}
          {items.length > 0 && (
            <Button variant="ghost" onClick={clearQueue}>
              <X className="h-4 w-4" strokeWidth={1.5} />
              Clear
            </Button>
          )}
          <Button variant="primary" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            Add to queue
          </Button>
        </div>
      </div>

      <p className="text-sm text-fg-secondary">
        Queue overrides the schedule while it has items. When empty, the schedule (and
        then the default scene) take back over.
      </p>

      {loading ? (
        <div className="h-20 animate-pulse rounded-lg bg-bg-elevated" />
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-border-subtle bg-bg-elevated p-8">
          <p className="text-base text-fg-primary">Queue is empty.</p>
          <p className="text-sm text-fg-secondary">
            Add a scene or playlist to take over playback temporarily.
          </p>
          <Button variant="primary" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            Add to queue
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-2" role="list">
          {sorted.map((item, idx) => {
            const isCurrent = item.id === cursor.queueCurrentItemId;
            return (
              <li
                key={item.id}
                className={
                  isCurrent
                    ? 'flex items-center gap-3 rounded-lg border border-accent bg-accent-soft px-4 py-3'
                    : 'flex items-center gap-3 rounded-lg border border-border-subtle bg-bg-elevated px-4 py-3'
                }
              >
                <div className="flex flex-col gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => moveItem(item.id, -1)}
                    disabled={idx === 0}
                    aria-label="Move up"
                  >
                    <ArrowUp className="h-4 w-4" strokeWidth={1.5} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => moveItem(item.id, 1)}
                    disabled={idx === sorted.length - 1}
                    aria-label="Move down"
                  >
                    <ArrowDown className="h-4 w-4" strokeWidth={1.5} />
                  </Button>
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <span className="text-base font-medium text-fg-primary">
                    {targetLabel(item)}
                    {isCurrent && (
                      <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs text-fg-on-accent">
                        Now playing
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-fg-tertiary">
                    {item.playlistId ? 'Playlist' : 'Scene'} · {Math.round(item.durationSeconds / 60)} min
                  </span>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => deleteItem(item.id)}
                  aria-label="Remove from queue"
                >
                  <Trash className="h-4 w-4" strokeWidth={1.5} />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <QueueAddDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={refresh}
        scenes={scenes}
        playlists={playlists}
        nextPosition={sorted.length > 0 ? sorted[sorted.length - 1].position + 1 : 0}
      />
    </div>
  );
}

function QueueAddDialog({
  open,
  onClose,
  onAdded,
  scenes,
  playlists,
  nextPosition,
}: {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
  scenes: Scene[];
  playlists: Playlist[];
  nextPosition: number;
}) {
  const [targetType, setTargetType] = useState<'scene' | 'playlist'>('scene');
  const [targetId, setTargetId] = useState<string>('');
  const [durationMinutes, setDurationMinutes] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  function reset() {
    setTargetType('scene');
    setTargetId('');
    setDurationMinutes(5);
    setError(null);
  }

  async function submit() {
    setError(null);
    if (!targetId) {
      setError('Choose a scene or playlist.');
      return;
    }
    if (durationMinutes <= 0) {
      setError('Duration must be greater than 0.');
      return;
    }
    setSubmitting(true);
    try {
      const { error: insErr } = await getSupabase().from('queue_items').insert({
        org_id: ORG_ID,
        position: nextPosition,
        scene_id: targetType === 'scene' ? targetId : null,
        playlist_id: targetType === 'playlist' ? targetId : null,
        duration_seconds: durationMinutes * 60,
      });
      if (insErr) throw insErr;
      toast({ title: 'Added to queue' });
      reset();
      onAdded();
      onClose();
    } catch {
      toast({
        variant: 'destructive',
        title: 'Couldn’t add',
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
      title="Add to queue"
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

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-fg-primary">Duration (minutes)</span>
          <input
            type="number"
            min={1}
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Number(e.target.value))}
            className="rounded-md border border-border bg-bg-base px-3 py-3 text-base text-fg-primary"
          />
          <span className="text-xs text-fg-tertiary">
            How long this item plays before auto-advancing to the next.
          </span>
        </label>

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
