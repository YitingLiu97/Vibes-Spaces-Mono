'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Play, Trash, Pencil } from 'lucide-react';
import type {
  Overlay,
  OverlayAnimation,
  OverlayType,
  SpeakerCardContent,
  TextOverlayContent,
  ImageLogoContent,
} from '@vibes/shared/types';
import { getSupabase } from '@/lib/supabase';
import { ORG_ID } from '@/lib/constants';
import { Button } from './Button';
import { Modal } from './Modal';
import { useToast } from './Toast';

const TYPE_LABELS: Record<OverlayType, string> = {
  speaker_card: 'Speaker card',
  text: 'Text',
  image_logo: 'Logo image',
};

const ANIMATION_LABELS: Record<OverlayAnimation, string> = {
  fade: 'Fade',
  'slide-left': 'Slide in from left',
  'slide-up': 'Slide up from bottom',
};

export function OverlaysTab() {
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const [liveOverlayId, setLiveOverlayId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Overlay | null>(null);
  const { toast } = useToast();

  const refresh = useCallback(async () => {
    const supabase = getSupabase();
    const [oRes, sRes] = await Promise.all([
      supabase.from('overlays').select('*').eq('org_id', ORG_ID).order('created_at', { ascending: false }),
      supabase.from('org_settings').select('live_overlay_id').eq('org_id', ORG_ID).maybeSingle(),
    ]);
    setOverlays(
      (oRes.data ?? []).map((row) => ({
        id: row.id,
        orgId: row.org_id,
        name: row.name,
        type: row.type as OverlayType,
        content: row.content,
        animation: row.animation as OverlayAnimation,
        durationMs: row.duration_ms,
      })),
    );
    setLiveOverlayId(sRes.data?.live_overlay_id ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh().catch(() => setLoading(false));
  }, [refresh]);

  async function showNow(overlay: Overlay) {
    setLiveOverlayId(overlay.id);
    try {
      // RPC sets id + started_at=now() atomically. Re-tap restarts the timer.
      await getSupabase().rpc('trigger_live_overlay', {
        p_org_id: ORG_ID,
        p_overlay_id: overlay.id,
      });
      toast({
        title: 'Showing now',
        description: `${overlay.name} · ${Math.round(overlay.durationMs / 1000)}s`,
      });
    } catch {
      setLiveOverlayId(null);
      toast({
        variant: 'destructive',
        title: 'Couldn’t trigger overlay',
        description: 'Check your connection and try again.',
      });
    }
  }

  async function clearLive() {
    setLiveOverlayId(null);
    await getSupabase().from('org_settings').update({ live_overlay_id: null }).eq('org_id', ORG_ID);
    toast({ title: 'Overlay cleared' });
  }

  async function deleteOverlay(o: Overlay) {
    if (!confirm(`Delete “${o.name}”?`)) return;
    setOverlays((prev) => prev.filter((x) => x.id !== o.id));
    try {
      await getSupabase().from('overlays').delete().eq('id', o.id);
    } catch {
      refresh();
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-fg-primary">Overlays</h1>
        <Button variant="primary" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          New overlay
        </Button>
      </div>

      <p className="text-sm text-fg-secondary">
        Pre-build overlay cards, then tap one to push it to the venue display.
      </p>

      {loading ? (
        <div className="h-24 animate-pulse rounded-lg bg-bg-elevated" />
      ) : overlays.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-border-subtle bg-bg-elevated p-8">
          <p className="text-base text-fg-primary">No overlays yet.</p>
          <p className="text-sm text-fg-secondary">
            Create a speaker card, a quote, or a logo to layer over your scenes.
          </p>
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            New overlay
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-2" role="list">
          {overlays.map((o) => (
            <li
              key={o.id}
              className="flex items-center gap-3 rounded-lg border border-border-subtle bg-bg-elevated px-4 py-3"
            >
              <div className="flex flex-1 flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-base font-medium text-fg-primary">{o.name}</span>
                  {liveOverlayId === o.id && (
                    <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-warning">
                      Live
                    </span>
                  )}
                </div>
                <span className="text-xs text-fg-tertiary">
                  {TYPE_LABELS[o.type]} · {ANIMATION_LABELS[o.animation]} ·{' '}
                  {Math.round(o.durationMs / 1000)}s
                </span>
              </div>
              <Button variant="primary" size="sm" onClick={() => showNow(o)}>
                <Play className="h-4 w-4" strokeWidth={1.5} />
                Show now
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setEditing(o)} aria-label={`Edit ${o.name}`}>
                <Pencil className="h-4 w-4" strokeWidth={1.5} />
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => deleteOverlay(o)}
                aria-label={`Delete ${o.name}`}
              >
                <Trash className="h-4 w-4" strokeWidth={1.5} />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {liveOverlayId && (
        <div className="flex items-center justify-between rounded-lg border border-warning/30 bg-warning-soft p-4">
          <span className="text-sm text-fg-primary">An overlay is currently live on the venue display.</span>
          <Button variant="secondary" size="sm" onClick={clearLive}>
            Clear
          </Button>
        </div>
      )}

      <OverlayEditDialog
        open={createOpen || !!editing}
        editing={editing}
        onClose={() => {
          setCreateOpen(false);
          setEditing(null);
        }}
        onSaved={refresh}
      />
    </div>
  );
}

function OverlayEditDialog({
  open,
  editing,
  onClose,
  onSaved,
}: {
  open: boolean;
  editing: Overlay | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<OverlayType>('speaker_card');
  const [animation, setAnimation] = useState<OverlayAnimation>('slide-up');
  const [durationSeconds, setDurationSeconds] = useState(6);

  // Type-specific content state
  const [speakerName, setSpeakerName] = useState('');
  const [speakerRole, setSpeakerRole] = useState('');
  const [textLine1, setTextLine1] = useState('');
  const [textLine2, setTextLine2] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoPosition, setLogoPosition] = useState<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'>('bottom-right');
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setType(editing.type);
      setAnimation(editing.animation);
      setDurationSeconds(Math.round(editing.durationMs / 1000));
      if (editing.type === 'speaker_card') {
        const c = editing.content as SpeakerCardContent;
        setSpeakerName(c.name);
        setSpeakerRole(c.role ?? '');
      } else if (editing.type === 'text') {
        const c = editing.content as TextOverlayContent;
        setTextLine1(c.lines[0] ?? '');
        setTextLine2(c.lines[1] ?? '');
      } else if (editing.type === 'image_logo') {
        const c = editing.content as ImageLogoContent;
        setLogoUrl(c.url);
        setLogoPosition(c.position);
      }
    } else {
      setName('');
      setType('speaker_card');
      setAnimation('slide-up');
      setDurationSeconds(6);
      setSpeakerName('');
      setSpeakerRole('');
      setTextLine1('');
      setTextLine2('');
      setLogoUrl('');
      setLogoPosition('bottom-right');
    }
  }, [open, editing]);

  async function uploadLogo(file: File) {
    setUploadingLogo(true);
    try {
      const id = crypto.randomUUID();
      const ext = file.name.split('.').pop() ?? 'png';
      const path = `${ORG_ID}/${id}.${ext}`;
      const supabase = getSupabase();
      const { error } = await supabase.storage.from('overlay-images').upload(path, file);
      if (error) throw error;
      const { data: pub } = supabase.storage.from('overlay-images').getPublicUrl(path);
      setLogoUrl(pub.publicUrl);
    } catch {
      toast({
        variant: 'destructive',
        title: 'Couldn’t upload logo',
        description: 'Check your connection and try again.',
      });
    } finally {
      setUploadingLogo(false);
    }
  }

  function contentForSubmit(): unknown | null {
    if (type === 'speaker_card') {
      if (!speakerName.trim()) return null;
      return { name: speakerName.trim(), role: speakerRole.trim() || undefined };
    }
    if (type === 'text') {
      const lines = [textLine1.trim(), textLine2.trim()].filter(Boolean);
      if (lines.length === 0) return null;
      return { lines };
    }
    if (type === 'image_logo') {
      if (!logoUrl) return null;
      return { url: logoUrl, position: logoPosition };
    }
    return null;
  }

  async function submit() {
    const content = contentForSubmit();
    if (!name.trim() || !content) {
      toast({
        variant: 'destructive',
        title: 'Missing required fields',
        description: 'Give it a name and at least one piece of content.',
      });
      return;
    }
    setSubmitting(true);
    try {
      const row = {
        org_id: ORG_ID,
        name: name.trim(),
        type,
        content,
        animation,
        duration_ms: Math.max(1000, Math.min(60000, durationSeconds * 1000)),
      };
      const supabase = getSupabase();
      const { error } = editing
        ? await supabase.from('overlays').update(row).eq('id', editing.id)
        : await supabase.from('overlays').insert(row);
      if (error) throw error;
      toast({ title: editing ? 'Overlay updated' : 'Overlay created' });
      onSaved();
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

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit overlay' : 'New overlay'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={submitting}>
            {submitting ? 'Saving…' : editing ? 'Save changes' : 'Create overlay'}
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
            placeholder="Speaker — Maya Chen"
            className="rounded-md border border-border bg-bg-base px-3 py-3 text-base text-fg-primary placeholder:text-fg-tertiary"
          />
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-fg-primary">Type</span>
          <div className="flex gap-2">
            {(['speaker_card', 'text', 'image_logo'] as OverlayType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={
                  t === type
                    ? 'flex-1 rounded-md border border-accent bg-accent-soft px-3 py-2 text-sm font-medium text-accent min-h-[40px]'
                    : 'flex-1 rounded-md border border-border bg-bg-base px-3 py-2 text-sm font-medium text-fg-secondary hover:text-fg-primary min-h-[40px]'
                }
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {type === 'speaker_card' && (
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-fg-primary">Speaker name</span>
              <input
                type="text"
                value={speakerName}
                onChange={(e) => setSpeakerName(e.target.value)}
                placeholder="Maya Chen"
                className="rounded-md border border-border bg-bg-base px-3 py-3 text-base text-fg-primary placeholder:text-fg-tertiary"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-fg-primary">Role / affiliation</span>
              <input
                type="text"
                value={speakerRole}
                onChange={(e) => setSpeakerRole(e.target.value)}
                placeholder="Designer, NYC Design Week"
                className="rounded-md border border-border bg-bg-base px-3 py-3 text-base text-fg-primary placeholder:text-fg-tertiary"
              />
            </label>
          </div>
        )}

        {type === 'text' && (
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-fg-primary">Line 1</span>
              <input
                type="text"
                value={textLine1}
                onChange={(e) => setTextLine1(e.target.value)}
                placeholder="Welcome to Future of NYC Design"
                className="rounded-md border border-border bg-bg-base px-3 py-3 text-base text-fg-primary placeholder:text-fg-tertiary"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-fg-primary">Line 2 (optional)</span>
              <input
                type="text"
                value={textLine2}
                onChange={(e) => setTextLine2(e.target.value)}
                placeholder="May 11, 2026"
                className="rounded-md border border-border bg-bg-base px-3 py-3 text-base text-fg-primary placeholder:text-fg-tertiary"
              />
            </label>
          </div>
        )}

        {type === 'image_logo' && (
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-fg-primary">Logo file</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])}
                disabled={uploadingLogo}
                className="rounded-md border border-border bg-bg-base px-3 py-3 text-sm text-fg-primary"
              />
              {uploadingLogo && <span className="text-xs text-fg-tertiary">Uploading…</span>}
              {logoUrl && !uploadingLogo && (
                <img
                  src={logoUrl}
                  alt="Logo preview"
                  className="mt-2 h-16 w-auto rounded-md border border-border-subtle bg-bg-base p-2 object-contain"
                />
              )}
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-fg-primary">Position</span>
              <select
                value={logoPosition}
                onChange={(e) => setLogoPosition(e.target.value as typeof logoPosition)}
                className="rounded-md border border-border bg-bg-base px-3 py-3 text-base text-fg-primary"
              >
                <option value="bottom-right">Bottom right</option>
                <option value="bottom-left">Bottom left</option>
                <option value="top-right">Top right</option>
                <option value="top-left">Top left</option>
                <option value="center">Center</option>
              </select>
            </label>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-fg-primary">Animation</span>
          <div className="flex gap-2">
            {(['fade', 'slide-left', 'slide-up'] as OverlayAnimation[]).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAnimation(a)}
                className={
                  a === animation
                    ? 'flex-1 rounded-md border border-accent bg-accent-soft px-3 py-2 text-sm font-medium text-accent min-h-[40px]'
                    : 'flex-1 rounded-md border border-border bg-bg-base px-3 py-2 text-sm font-medium text-fg-secondary hover:text-fg-primary min-h-[40px]'
                }
              >
                {ANIMATION_LABELS[a]}
              </button>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-fg-primary">Hold duration: {durationSeconds}s</span>
          <input
            type="range"
            min={1}
            max={30}
            step={1}
            value={durationSeconds}
            onChange={(e) => setDurationSeconds(Number(e.target.value))}
          />
        </label>
      </div>
    </Modal>
  );
}
