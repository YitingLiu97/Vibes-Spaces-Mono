'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, FileJson, Layers, Play, Trash, Upload } from 'lucide-react';
import type { Scene } from '@vibes/shared/types';
import { getSupabase } from '@/lib/supabase';
import { ORG_ID, STORAGE_BUCKET } from '@/lib/constants';
import { Button } from './Button';
import { Modal } from './Modal';
import { useToast } from './Toast';
import { GenerateFromReferenceButton } from './GenerateFromReferenceButton';
import { ComposeDialog } from './ComposeDialog';
import { ImportEventDialog } from './ImportEventDialog';
import { ExportEventDialog } from './ExportEventDialog';

export function ScenesTab() {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
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
    if (!confirm(`Play “${scene.name}” now until you resume the schedule?`)) return;
    setForcedSceneId(scene.id);
    try {
      // RPC sets force_play_scene_id + force_play_set_at=now() atomically.
      await getSupabase().rpc('trigger_force_play', {
        p_org_id: ORG_ID,
        p_scene_id: scene.id,
      });
      toast({
        title: 'Playing now',
        description: scene.name,
        action: { label: 'Resume schedule', onClick: resume },
      });
    } catch {
      setForcedSceneId(null);
      toast({
        variant: 'destructive',
        title: 'Couldn’t play',
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
          <Button variant="ghost" size="sm" onClick={() => setExportOpen(true)} title="Export event">
            <Download className="h-4 w-4" strokeWidth={1.5} />
            Export
          </Button>
          <Button variant="secondary" onClick={() => setImportOpen(true)}>
            <FileJson className="h-4 w-4" strokeWidth={1.5} />
            Import event
          </Button>
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
                      Playing
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

      <ImportEventDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={refresh}
      />

      <ExportEventDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
      />
    </div>
  );
}

function nameFromFilename(name: string): string {
  return name
    .replace(/\.[^/.]+$/, '') // drop extension
    .replace(/[_\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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
  const [files, setFiles] = useState<File[]>([]);
  const [hideAttribution, setHideAttribution] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const { toast } = useToast();

  const isBulk = files.length > 1;
  // Single-file uploads default to nameFromFilename when the user doesn't type
  // a custom name, so the dialog never blocks on a required name field.
  const canSubmit = files.length > 0;

  async function uploadOne(file: File, sceneName: string) {
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
      name: sceneName,
      video_url: pub.publicUrl,
      hide_attribution: hideAttribution,
    });
    if (insErr) throw insErr;
  }

  async function submit() {
    if (!canSubmit) return;
    setUploading(true);
    setProgress({ done: 0, total: files.length });
    let failed = 0;
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const sceneName = isBulk
        ? nameFromFilename(f.name)
        : name.trim() || nameFromFilename(f.name);
      try {
        await uploadOne(f, sceneName);
      } catch (e) {
        failed++;
        console.error('[scenes] upload failed', f.name, e);
      }
      setProgress({ done: i + 1, total: files.length });
    }
    setUploading(false);
    setProgress(null);
    const succeeded = files.length - failed;
    if (succeeded > 0) {
      toast({
        title: isBulk ? `${succeeded} scenes synced` : 'Scene synced',
        description: failed > 0 ? `${failed} failed — check the console.` : undefined,
      });
    }
    if (failed > 0 && succeeded === 0) {
      toast({
        variant: 'destructive',
        title: 'Couldn’t upload',
        description: 'Check your connection and try again.',
      });
    }
    setName('');
    setFiles([]);
    setHideAttribution(false);
    onUploaded();
    if (succeeded > 0) onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isBulk ? `Add ${files.length} scenes` : 'Add scene'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={uploading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={!canSubmit || uploading}>
            {uploading
              ? progress
                ? `Uploading ${progress.done}/${progress.total}…`
                : 'Uploading…'
              : isBulk
              ? `Add ${files.length} scenes`
              : 'Add scene'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-fg-primary">
            Video file{isBulk ? 's' : ''}
          </span>
          <input
            type="file"
            accept="video/*"
            multiple
            onChange={(e) => setFiles(e.target.files ? Array.from(e.target.files) : [])}
            className="rounded-md border border-border bg-bg-base px-3 py-3 text-sm text-fg-primary"
          />
          <span className="text-xs text-fg-tertiary">
            Tip: select multiple files at once to bulk-add scenes. Each scene takes its name from the filename.
          </span>
          {files.length > 0 && (
            <ul className="mt-1 flex flex-col gap-1 max-h-[200px] overflow-y-auto rounded border border-border-subtle bg-bg-base p-2">
              {files.map((f, i) => (
                <li key={i} className="flex items-center justify-between gap-3 text-xs text-fg-secondary">
                  <span className="font-mono truncate">
                    {isBulk ? nameFromFilename(f.name) : f.name}
                  </span>
                  <span className="text-fg-tertiary flex-shrink-0">
                    {(f.size / 1024 / 1024).toFixed(1)} MB
                  </span>
                </li>
              ))}
            </ul>
          )}
        </label>
        {!isBulk && files.length === 1 && (
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-fg-primary">Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={nameFromFilename(files[0].name)}
              className="rounded-md border border-border bg-bg-base px-3 py-3 text-base text-fg-primary placeholder:text-fg-tertiary"
            />
          </label>
        )}
        <label className="flex items-center gap-2 text-sm text-fg-secondary">
          <input
            type="checkbox"
            checked={hideAttribution}
            onChange={(e) => setHideAttribution(e.target.checked)}
          />
          Hide Vibes attribution{isBulk ? ' on all of these' : ' on this scene'}
        </label>
      </div>
    </Modal>
  );
}
