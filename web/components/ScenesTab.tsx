'use client';

import { useCallback, useEffect, useState } from 'react';
import { Layers, Play, Trash, Upload } from 'lucide-react';
import type { Scene } from '@vibes/shared/types';
import { getSupabase } from '@/lib/supabase';
import { ORG_ID, STORAGE_BUCKET } from '@/lib/constants';
import { Button } from './Button';
import { Modal } from './Modal';
import { useToast } from './Toast';
import { GenerateFromReferenceButton } from './GenerateFromReferenceButton';
import { ComposeDialog } from './ComposeDialog';

export function ScenesTab() {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [composingScene, setComposingScene] = useState<Scene | null>(null);
  const [forcedSceneId, setForcedSceneId] = useState<string | null>(null);
  const { toast } = useToast();

  const refresh = useCallback(async () => {
    const { data } = await getSupabase()
      .from('scenes')
      .select('*')
      .eq('org_id', ORG_ID)
      .order('created_at', { ascending: false });
    setScenes(
      (data ?? []).map((s) => ({
        id: s.id,
        name: s.name,
        videoUrl: s.video_url,
        hideAttribution: s.hide_attribution,
        loopEnabled: s.loop_enabled ?? true,
        composition: s.composition ?? null,
      })),
    );
    const { data: settings } = await getSupabase()
      .from('org_settings')
      .select('force_play_scene_id')
      .eq('org_id', ORG_ID)
      .maybeSingle();
    setForcedSceneId(settings?.force_play_scene_id ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh().catch(() => setLoading(false));
  }, [refresh]);

  async function forcePlay(scene: Scene) {
    if (!confirm(`Force-play “${scene.name}” until you tap Resume?`)) return;
    setForcedSceneId(scene.id);
    try {
      await getSupabase()
        .from('org_settings')
        // force_play_set_at is filled in server-side by the
        // org_settings_timestamps trigger when force_play_scene_id changes.
        .update({ force_play_scene_id: scene.id })
        .eq('org_id', ORG_ID);
      toast({
        title: 'Now forcing',
        description: scene.name,
        action: { label: 'Undo', onClick: resume },
      });
    } catch {
      setForcedSceneId(null);
      toast({
        variant: 'destructive',
        title: 'Couldn’t force-play',
        description: 'Check your connection and try again.',
      });
    }
  }

  async function resume() {
    setForcedSceneId(null);
    await getSupabase().from('org_settings').update({ force_play_scene_id: null }).eq('org_id', ORG_ID);
  }

  async function deleteScene(scene: Scene) {
    if (!confirm(`Delete “${scene.name}”? This can’t be undone.`)) return;
    setScenes((prev) => prev.filter((s) => s.id !== scene.id));
    try {
      await getSupabase().from('scenes').delete().eq('id', scene.id);
      toast({ title: 'Scene deleted', description: scene.name });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Couldn’t delete',
        description: 'Check your connection and try again.',
      });
      refresh();
    }
  }

  async function toggleAttribution(scene: Scene) {
    const next = !scene.hideAttribution;
    setScenes((prev) =>
      prev.map((s) => (s.id === scene.id ? { ...s, hideAttribution: next } : s)),
    );
    try {
      await getSupabase().from('scenes').update({ hide_attribution: next }).eq('id', scene.id);
    } catch {
      refresh();
    }
  }

  async function toggleLoop(scene: Scene) {
    const next = !scene.loopEnabled;
    setScenes((prev) =>
      prev.map((s) => (s.id === scene.id ? { ...s, loopEnabled: next } : s)),
    );
    try {
      await getSupabase().from('scenes').update({ loop_enabled: next }).eq('id', scene.id);
    } catch {
      refresh();
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-fg-primary">Scenes</h1>
        <div className="flex items-center gap-2">
          <GenerateFromReferenceButton surface="scenes_tab" />
          <Button variant="primary" onClick={() => setUploadOpen(true)}>
            <Upload className="h-4 w-4" strokeWidth={1.5} />
            Add scene
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-bg-elevated" />
          ))}
        </div>
      ) : scenes.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-border-subtle bg-bg-elevated p-8">
          <p className="text-base text-fg-primary">No scenes yet.</p>
          <p className="text-sm text-fg-secondary">Upload a video to start building your schedule.</p>
          <Button variant="primary" onClick={() => setUploadOpen(true)}>
            <Upload className="h-4 w-4" strokeWidth={1.5} />
            Upload scene
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-2" role="list">
          {scenes.map((scene) => (
            <li
              key={scene.id}
              className="flex items-center gap-4 rounded-lg border border-border-subtle bg-bg-elevated px-4 py-3"
            >
              <div className="flex flex-1 flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-base font-medium text-fg-primary">{scene.name}</span>
                  {forcedSceneId === scene.id && (
                    <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-warning">
                      Forced
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <label className="flex items-center gap-2 text-xs text-fg-tertiary">
                    <input
                      type="checkbox"
                      checked={scene.loopEnabled}
                      onChange={() => toggleLoop(scene)}
                      className="rounded"
                    />
                    Loop until next slot
                  </label>
                  <label className="flex items-center gap-2 text-xs text-fg-tertiary">
                    <input
                      type="checkbox"
                      checked={scene.hideAttribution}
                      onChange={() => toggleAttribution(scene)}
                      className="rounded"
                    />
                    Hide Vibes attribution
                  </label>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setComposingScene(scene)}>
                <Layers className="h-4 w-4" strokeWidth={1.5} />
                Compose
              </Button>
              <Button variant="ghost" size="sm" onClick={() => forcePlay(scene)}>
                <Play className="h-4 w-4" strokeWidth={1.5} />
                Play now
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => deleteScene(scene)}
                aria-label={`Delete ${scene.name}`}
              >
                <Trash className="h-4 w-4" strokeWidth={1.5} />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <ScenesUploadDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={refresh}
      />

      <ComposeDialog
        scene={composingScene}
        onClose={() => setComposingScene(null)}
        onSaved={refresh}
      />
    </div>
  );
}

function ScenesUploadDialog({
  open,
  onClose,
  onUploaded,
}: {
  open: boolean;
  onClose: () => void;
  onUploaded: () => void;
}) {
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [hideAttribution, setHideAttribution] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  async function submit() {
    if (!file || !name.trim()) return;
    setUploading(true);
    try {
      const id = crypto.randomUUID();
      const ext = file.name.split('.').pop() ?? 'mp4';
      const path = `${ORG_ID}/${id}.${ext}`;
      const supabase = getSupabase();
      const { error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file);
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      const { error: insErr } = await supabase.from('scenes').insert({
        id,
        org_id: ORG_ID,
        name: name.trim(),
        video_url: pub.publicUrl,
        hide_attribution: hideAttribution,
      });
      if (insErr) throw insErr;
      toast({ title: 'Scene synced', description: name.trim() });
      setName('');
      setFile(null);
      setHideAttribution(false);
      onUploaded();
      onClose();
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Couldn’t upload',
        description: 'Check your connection and try again.',
      });
    } finally {
      setUploading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add scene"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={uploading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={!file || !name.trim() || uploading}>
            {uploading ? 'Uploading…' : 'Add scene'}
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
            placeholder="Calm focus"
            className="rounded-md border border-border bg-bg-base px-3 py-3 text-base text-fg-primary placeholder:text-fg-tertiary"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-fg-primary">Video file</span>
          <input
            type="file"
            accept="video/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="rounded-md border border-border bg-bg-base px-3 py-3 text-sm text-fg-primary"
          />
          {file && (
            <span className="text-xs text-fg-tertiary">
              {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
            </span>
          )}
        </label>
        <label className="flex items-center gap-2 text-sm text-fg-secondary">
          <input
            type="checkbox"
            checked={hideAttribution}
            onChange={(e) => setHideAttribution(e.target.checked)}
          />
          Hide Vibes attribution on this scene
        </label>
      </div>
    </Modal>
  );
}
