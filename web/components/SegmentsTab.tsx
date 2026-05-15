'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash, UserPlus } from 'lucide-react';
import type { Segment, Speaker, SegmentSpeakerRef } from '@vibes/shared/types';
import { buildSegmentComposition } from '@vibes/shared/buildSegmentComposition';
import { getSupabase } from '@/lib/supabase';
import { ORG_ID } from '@/lib/constants';
import { Button } from './Button';
import { Modal } from './Modal';
import { useToast } from './Toast';
import { SpeakerCluster } from './SpeakerCluster';

const SPEAKER_PHOTOS_BUCKET = 'speaker-photos';

export function SegmentsTab() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Segment | null>(null);
  const { toast } = useToast();

  const refresh = useCallback(async () => {
    const supabase = getSupabase();
    const [segRes, spkRes, ssRes] = await Promise.all([
      supabase
        .from('segments')
        .select('*')
        .eq('org_id', ORG_ID)
        .order('position', { ascending: true })
        .order('created_at', { ascending: true }),
      supabase
        .from('speakers')
        .select('*')
        .eq('org_id', ORG_ID)
        .order('name', { ascending: true }),
      supabase
        .from('segment_speakers')
        .select('segment_id, speaker_id, role, position')
        .order('position', { ascending: true }),
    ]);
    const byId = new Map<string, SegmentSpeakerRef[]>();
    for (const row of ssRes.data ?? []) {
      const arr = byId.get(row.segment_id) ?? [];
      arr.push({
        speakerId: row.speaker_id,
        role: row.role as 'speaker' | 'moderator',
        position: row.position ?? 0,
      });
      byId.set(row.segment_id, arr);
    }
    setSegments(
      (segRes.data ?? []).map((r) => ({
        id: r.id,
        orgId: r.org_id,
        title: r.title,
        subtitle: r.subtitle,
        position: r.position ?? 0,
        speakers: (byId.get(r.id) ?? []).sort((a, b) => a.position - b.position),
        composition: r.composition ?? null,
      })),
    );
    setSpeakers(
      (spkRes.data ?? []).map((s) => ({
        id: s.id,
        orgId: s.org_id,
        name: s.name,
        photoUrl: s.photo_url ?? null,
      })),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh().catch(() => setLoading(false));
  }, [refresh]);

  async function deleteSegment(seg: Segment) {
    if (!confirm(`Delete “${seg.title}”?`)) return;
    setSegments((prev) => prev.filter((s) => s.id !== seg.id));
    try {
      await getSupabase().from('segments').delete().eq('id', seg.id);
      toast({ title: 'Segment deleted' });
    } catch {
      refresh();
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-fg-primary">Segments</h1>
        <Button
          variant="primary"
          onClick={() => {
            setEditing(null);
            setEditorOpen(true);
          }}
        >
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          New segment
        </Button>
      </div>

      <p className="text-sm text-fg-secondary">
        Group speakers visually by agenda block — opening keynote, a panel, a roundtable. Pick a
        moderator if one’s on stage. This is just for at-a-glance reference; it does not drive
        playback.
      </p>

      {loading ? (
        <div className="h-40 animate-pulse rounded-lg bg-bg-elevated" />
      ) : segments.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-border-subtle bg-bg-elevated p-8">
          <p className="text-base text-fg-primary">No segments yet.</p>
          <p className="text-sm text-fg-secondary">
            Make one for each agenda block — keynote, panel, roundtable.
          </p>
          <Button
            variant="primary"
            onClick={() => {
              setEditing(null);
              setEditorOpen(true);
            }}
          >
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            New segment
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-4" role="list">
          {segments.map((seg) => (
            <SegmentCluster
              key={seg.id}
              segment={seg}
              allSpeakers={speakers}
              onEdit={() => {
                setEditing(seg);
                setEditorOpen(true);
              }}
              onDelete={() => deleteSegment(seg)}
            />
          ))}
        </ul>
      )}

      <SegmentEditor
        open={editorOpen}
        editing={editing}
        allSpeakers={speakers}
        nextPosition={segments.length}
        onClose={() => {
          setEditorOpen(false);
          setEditing(null);
        }}
        onSaved={refresh}
        onSpeakerCreated={refresh}
      />
    </div>
  );
}

function SegmentCluster({
  segment,
  allSpeakers,
  onEdit,
  onDelete,
}: {
  segment: Segment;
  allSpeakers: Speaker[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  // Recompute the cluster on render so existing segments — saved before the
  // composition shape changed — show the new circular look without needing
  // to be re-saved.
  const composition = useMemo(
    () => buildSegmentComposition(segment, allSpeakers),
    [segment, allSpeakers],
  );

  return (
    <li className="segment-card">
      <div className="segment-card-head">
        <div className="segment-card-titleblock">
          {segment.subtitle && <div className="segment-card-eyebrow">{segment.subtitle}</div>}
          <h2 className="segment-card-title">{segment.title}</h2>
        </div>
        <div className="segment-card-actions">
          <Button variant="ghost" size="sm" onClick={onEdit} aria-label={`Edit ${segment.title}`}>
            <Pencil className="h-4 w-4" strokeWidth={1.5} />
          </Button>
          <Button variant="danger" size="sm" onClick={onDelete} aria-label={`Delete ${segment.title}`}>
            <Trash className="h-4 w-4" strokeWidth={1.5} />
          </Button>
        </div>
      </div>

      <div className="segment-cluster">
        {composition.speakerCluster && composition.speakerCluster.items.length > 0 ? (
          <SpeakerCluster cluster={composition.speakerCluster} />
        ) : (
          <div className="segment-cluster-empty">No speakers yet — edit to add some.</div>
        )}
      </div>
    </li>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '');
}

function SegmentEditor({
  open,
  editing,
  allSpeakers,
  nextPosition,
  onClose,
  onSaved,
  onSpeakerCreated,
}: {
  open: boolean;
  editing: Segment | null;
  allSpeakers: Speaker[];
  nextPosition: number;
  onClose: () => void;
  onSaved: () => void;
  onSpeakerCreated: () => void;
}) {
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  // selectedIds keeps insertion order
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [moderatorId, setModeratorId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [creatingSpeaker, setCreatingSpeaker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTitle(editing.title);
      setSubtitle(editing.subtitle ?? '');
      setSelectedIds(editing.speakers.map((s) => s.speakerId));
      setModeratorId(editing.speakers.find((s) => s.role === 'moderator')?.speakerId ?? null);
    } else {
      setTitle('');
      setSubtitle('');
      setSelectedIds([]);
      setModeratorId(null);
    }
    setNewName('');
  }, [open, editing]);

  function toggleSpeaker(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        if (moderatorId === id) setModeratorId(null);
        return prev.filter((x) => x !== id);
      }
      return [...prev, id];
    });
  }

  async function createSpeaker(file: File | null) {
    if (!newName.trim()) {
      toast({ variant: 'destructive', title: 'Speaker needs a name' });
      return;
    }
    setCreatingSpeaker(true);
    try {
      const supabase = getSupabase();
      const id = crypto.randomUUID();
      let photoUrl: string | null = null;
      if (file) {
        setUploadingPhoto(true);
        const ext = file.name.split('.').pop() ?? 'jpg';
        const path = `${ORG_ID}/${id}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from(SPEAKER_PHOTOS_BUCKET)
          .upload(path, file, { upsert: true });
        if (upErr) throw upErr;
        photoUrl = supabase.storage.from(SPEAKER_PHOTOS_BUCKET).getPublicUrl(path).data.publicUrl;
      }
      const { error } = await supabase.from('speakers').insert({
        id,
        org_id: ORG_ID,
        name: newName.trim(),
        photo_url: photoUrl,
      });
      if (error) throw error;
      setSelectedIds((prev) => [...prev, id]);
      setNewName('');
      onSpeakerCreated();
      toast({ title: 'Speaker added' });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Couldn’t add speaker',
        description: 'Check your connection and try again.',
      });
    } finally {
      setCreatingSpeaker(false);
      setUploadingPhoto(false);
    }
  }

  async function submit() {
    if (!title.trim()) {
      toast({ variant: 'destructive', title: 'Segment needs a title' });
      return;
    }
    setSubmitting(true);
    try {
      const supabase = getSupabase();
      const segmentId = editing?.id ?? crypto.randomUUID();
      const speakerRefs: SegmentSpeakerRef[] = selectedIds.map((speakerId, i) => ({
        speakerId,
        role: speakerId === moderatorId ? 'moderator' : 'speaker',
        position: i,
      }));
      const composition = buildSegmentComposition(
        { title: title.trim(), subtitle: subtitle.trim() || null, speakers: speakerRefs },
        allSpeakers,
      );
      const row = {
        id: segmentId,
        org_id: ORG_ID,
        title: title.trim(),
        subtitle: subtitle.trim() || null,
        position: editing?.position ?? nextPosition,
        composition,
      };
      if (editing) {
        const { error } = await supabase.from('segments').update(row).eq('id', segmentId);
        if (error) throw error;
        await supabase.from('segment_speakers').delete().eq('segment_id', segmentId);
      } else {
        const { error } = await supabase.from('segments').insert(row);
        if (error) throw error;
      }
      if (speakerRefs.length > 0) {
        const ssRows = speakerRefs.map((r) => ({
          segment_id: segmentId,
          speaker_id: r.speakerId,
          role: r.role,
          position: r.position,
        }));
        const { error } = await supabase.from('segment_speakers').insert(ssRows);
        if (error) throw error;
      }
      toast({ title: editing ? 'Segment updated' : 'Segment created' });
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
      title={editing ? 'Edit segment' : 'New segment'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={submitting || !title.trim()}>
            {submitting ? 'Saving…' : editing ? 'Save changes' : 'Create'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-fg-primary">Title</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Three Scales of NYC Design"
            className="rounded-md border border-border bg-bg-base px-3 py-3 text-base text-fg-primary placeholder:text-fg-tertiary"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-fg-primary">
            Subtitle <span className="text-fg-tertiary">(optional — e.g. “Panel”, “Keynote”)</span>
          </span>
          <input
            type="text"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="Panel"
            className="rounded-md border border-border bg-bg-base px-3 py-3 text-base text-fg-primary placeholder:text-fg-tertiary"
          />
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-fg-primary">Speakers</span>
          {allSpeakers.length === 0 ? (
            <p className="text-sm text-fg-tertiary">
              No speakers yet — add one below.
            </p>
          ) : (
            <ul className="flex flex-wrap gap-2" role="list">
              {allSpeakers.map((s) => {
                const selected = selectedIds.includes(s.id);
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => toggleSpeaker(s.id)}
                      className={
                        selected
                          ? 'flex items-center gap-2 rounded-full border border-accent bg-accent-soft px-3 py-1.5 text-sm text-accent'
                          : 'flex items-center gap-2 rounded-full border border-border bg-bg-base px-3 py-1.5 text-sm text-fg-secondary hover:text-fg-primary'
                      }
                    >
                      {s.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.photoUrl} alt="" className="h-5 w-5 rounded-full object-cover" />
                      ) : (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-bg-overlay text-[10px] font-semibold text-fg-tertiary">
                          {initials(s.name)}
                        </span>
                      )}
                      {s.name}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {selectedIds.length > 0 && (
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-fg-primary">
              Moderator <span className="text-fg-tertiary">(optional)</span>
            </span>
            <select
              value={moderatorId ?? ''}
              onChange={(e) => setModeratorId(e.target.value || null)}
              className="rounded-md border border-border bg-bg-base px-3 py-3 text-base text-fg-primary"
            >
              <option value="">— none —</option>
              {selectedIds.map((id) => {
                const s = allSpeakers.find((x) => x.id === id);
                return (
                  <option key={id} value={id}>
                    {s?.name ?? '(unknown)'}
                  </option>
                );
              })}
            </select>
          </label>
        )}

        <div className="flex flex-col gap-2 rounded-md border border-dashed border-border bg-bg-base p-3">
          <span className="text-sm font-medium text-fg-primary">Add a new speaker</span>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Jane Doe"
            className="rounded-md border border-border bg-bg-base px-3 py-2 text-sm text-fg-primary placeholder:text-fg-tertiary"
          />
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                if (f) void createSpeaker(f);
              }}
              disabled={creatingSpeaker || !newName.trim()}
              className="flex-1 rounded-md border border-border bg-bg-base px-2 py-2 text-xs text-fg-secondary"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => createSpeaker(null)}
              disabled={creatingSpeaker || !newName.trim()}
            >
              <UserPlus className="h-4 w-4" strokeWidth={1.5} />
              {uploadingPhoto ? 'Uploading…' : creatingSpeaker ? 'Adding…' : 'Add'}
            </Button>
          </div>
          <p className="text-[11px] text-fg-tertiary">
            Type a name, then either click <strong>Add</strong> (no photo) or pick a photo to upload.
          </p>
        </div>
      </div>
    </Modal>
  );
}
