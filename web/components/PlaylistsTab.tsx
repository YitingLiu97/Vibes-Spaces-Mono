'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash } from 'lucide-react';
import type { Playlist, Scene } from '@vibes/shared/types';
import { getSupabase } from '@/lib/supabase';
import { ORG_ID } from '@/lib/constants';
import { Button } from './Button';
import { Modal } from './Modal';
import { useToast } from './Toast';

export function PlaylistsTab() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const { toast } = useToast();

  const refresh = useCallback(async () => {
    const supabase = getSupabase();
    const [plRes, scenesRes] = await Promise.all([
      supabase
        .from('playlists')
        .select('*, playlist_scenes(scene_id, position)')
        .eq('org_id', ORG_ID),
      supabase.from('scenes').select('id,name').eq('org_id', ORG_ID),
    ]);
    setPlaylists(
      (plRes.data ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        sceneIdsInOrder: ((p.playlist_scenes ?? []) as { scene_id: string; position: number }[])
          .sort((a, b) => a.position - b.position)
          .map((ps) => ps.scene_id),
      })),
    );
    setScenes((scenesRes.data ?? []).map((s) => ({ id: s.id, name: s.name, videoUrl: '', hideAttribution: false, loopEnabled: true, composition: null })));
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh().catch(() => setLoading(false));
  }, [refresh]);

  async function deletePlaylist(id: string) {
    if (!confirm('Delete this playlist?')) return;
    setPlaylists((prev) => prev.filter((p) => p.id !== id));
    try {
      await getSupabase().from('playlists').delete().eq('id', id);
      toast({ title: 'Playlist deleted' });
    } catch {
      refresh();
    }
  }

  function sceneNames(p: Playlist): string {
    return p.sceneIdsInOrder
      .map((id) => scenes.find((s) => s.id === id)?.name ?? '—')
      .join(' → ');
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-fg-primary">Playlists</h1>
        <Button variant="primary" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          New playlist
        </Button>
      </div>

      {loading ? (
        <div className="h-20 animate-pulse rounded-lg bg-bg-elevated" />
      ) : playlists.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-border-subtle bg-bg-elevated p-8">
          <p className="text-base text-fg-primary">No playlists yet.</p>
          <p className="text-sm text-fg-secondary">
            Group scenes together to schedule a sequence.
          </p>
          <Button variant="primary" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            New playlist
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-2" role="list">
          {playlists.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-4 rounded-lg border border-border-subtle bg-bg-elevated px-4 py-3"
            >
              <div className="flex flex-1 flex-col gap-1">
                <span className="text-base font-medium text-fg-primary">{p.name}</span>
                <span className="text-xs text-fg-tertiary">
                  {p.sceneIdsInOrder.length} scenes · {sceneNames(p) || 'empty'}
                </span>
              </div>
              <Button variant="danger" size="sm" onClick={() => deletePlaylist(p.id)} aria-label="Delete playlist">
                <Trash className="h-4 w-4" strokeWidth={1.5} />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <PlaylistAddDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={refresh}
        scenes={scenes}
      />
    </div>
  );
}

function PlaylistAddDialog({
  open,
  onClose,
  onAdded,
  scenes,
}: {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
  scenes: Scene[];
}) {
  const [name, setName] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  function toggle(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function submit() {
    if (!name.trim() || selectedIds.length === 0) return;
    setSubmitting(true);
    try {
      const supabase = getSupabase();
      const playlistId = crypto.randomUUID();
      const { error: plErr } = await supabase.from('playlists').insert({
        id: playlistId,
        org_id: ORG_ID,
        name: name.trim(),
      });
      if (plErr) throw plErr;
      const { error: psErr } = await supabase.from('playlist_scenes').insert(
        selectedIds.map((sceneId, idx) => ({
          playlist_id: playlistId,
          scene_id: sceneId,
          position: idx,
        })),
      );
      if (psErr) throw psErr;
      toast({ title: 'Playlist created' });
      setName('');
      setSelectedIds([]);
      onAdded();
      onClose();
    } catch {
      toast({
        variant: 'destructive',
        title: 'Couldn’t create',
        description: 'Check your connection and try again.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New playlist"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={submit}
            disabled={!name.trim() || selectedIds.length === 0 || submitting}
          >
            {submitting ? 'Creating…' : 'Create'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-fg-primary">Name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Evening set"
            className="rounded-md border border-border bg-bg-base px-3 py-3 text-base text-fg-primary placeholder:text-fg-tertiary"
          />
        </label>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-fg-primary">Scenes (in order)</span>
          {scenes.length === 0 ? (
            <p className="text-sm text-fg-tertiary">Upload a scene first to build a playlist.</p>
          ) : (
            <ul className="flex flex-col gap-1.5" role="list">
              {scenes.map((s) => {
                const order = selectedIds.indexOf(s.id);
                const selected = order >= 0;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => toggle(s.id)}
                      className={
                        selected
                          ? 'flex w-full items-center justify-between rounded-md border border-accent bg-accent-soft px-3 py-3 text-left text-sm text-fg-primary'
                          : 'flex w-full items-center justify-between rounded-md border border-border bg-bg-base px-3 py-3 text-left text-sm text-fg-primary hover:bg-bg-overlay'
                      }
                    >
                      <span>{s.name}</span>
                      {selected && (
                        <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-fg-on-accent">
                          {order + 1}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}
