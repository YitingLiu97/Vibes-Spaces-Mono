'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Film, Sparkles } from 'lucide-react';
import type { Segment, SceneComposition, SegmentSpeakerRef } from '@vibes/shared/types';
import { getSupabase } from '@/lib/supabase';
import { ORG_ID, STORAGE_BUCKET } from '@/lib/constants';
import { Button } from './Button';
import { CompositionLayer } from './CompositionLayer';
import { useToast } from './Toast';

interface Backdrop {
  name: string;
  url: string;
}

const VIDEO_EXT = /\.(mp4|webm|mov|m4v)$/i;

export function BuildTab() {
  const [backdrops, setBackdrops] = useState<Backdrop[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);

  const [chosenBackdrop, setChosenBackdrop] = useState<Backdrop | null>(null);
  const [chosenSegment, setChosenSegment] = useState<Segment | null>(null);
  const [captionDraft, setCaptionDraft] = useState('');
  const [sceneName, setSceneName] = useState('');
  const [creating, setCreating] = useState(false);

  const { toast } = useToast();

  const load = useCallback(async () => {
    const supabase = getSupabase();
    const [filesRes, segRes, ssRes] = await Promise.all([
      supabase.storage.from(STORAGE_BUCKET).list(ORG_ID, {
        sortBy: { column: 'updated_at', order: 'desc' },
        limit: 200,
      }),
      supabase
        .from('segments')
        .select('*')
        .eq('org_id', ORG_ID)
        .order('position', { ascending: true }),
      supabase
        .from('segment_speakers')
        .select('segment_id, speaker_id, role, position')
        .order('position', { ascending: true }),
    ]);
    const drops: Backdrop[] = (filesRes.data ?? [])
      .filter((f) => VIDEO_EXT.test(f.name))
      .map((f) => {
        const path = `${ORG_ID}/${f.name}`;
        const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
        return { name: f.name, url: data.publicUrl };
      });
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
    const segs: Segment[] = (segRes.data ?? []).map((r) => ({
      id: r.id,
      orgId: r.org_id,
      title: r.title,
      subtitle: r.subtitle,
      position: r.position ?? 0,
      speakers: (byId.get(r.id) ?? []).sort((a, b) => a.position - b.position),
      composition: r.composition ?? null,
    }));
    setBackdrops(drops);
    setSegments(segs);
    setLoading(false);
  }, []);

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [load]);

  // Auto-prefill caption + scene name when segment changes.
  useEffect(() => {
    if (!chosenSegment) return;
    setCaptionDraft(chosenSegment.composition?.caption?.text ?? chosenSegment.title);
    setSceneName((prev) => prev || chosenSegment.title);
  }, [chosenSegment?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const previewComposition: SceneComposition | null = useMemo(() => {
    if (!chosenSegment?.composition) return null;
    const c = chosenSegment.composition;
    return {
      ...c,
      caption: c.caption ? { ...c.caption, text: captionDraft } : null,
    };
  }, [chosenSegment, captionDraft]);

  const canCreate = !!chosenBackdrop && !!chosenSegment && !creating;

  async function createScene() {
    if (!chosenBackdrop || !chosenSegment) return;
    setCreating(true);
    try {
      const id = crypto.randomUUID();
      const { error } = await getSupabase().from('scenes').insert({
        id,
        org_id: ORG_ID,
        name: sceneName.trim() || chosenSegment.title,
        video_url: chosenBackdrop.url,
        hide_attribution: false,
        loop_enabled: true,
        composition: previewComposition,
      });
      if (error) throw error;
      toast({ title: 'Scene created', description: sceneName.trim() || chosenSegment.title });
      setChosenBackdrop(null);
      setChosenSegment(null);
      setCaptionDraft('');
      setSceneName('');
    } catch {
      toast({
        variant: 'destructive',
        title: 'Couldn’t create scene',
        description: 'Check your connection and try again.',
      });
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-fg-primary">Build</h1>
        <Button variant="primary" onClick={createScene} disabled={!canCreate}>
          <Sparkles className="h-4 w-4" strokeWidth={1.5} />
          {creating ? 'Creating…' : 'Create scene'}
        </Button>
      </div>

      <p className="text-sm text-fg-secondary">
        Pick a backdrop + a segment. The composition auto-fills. Edit the caption if you want, then{' '}
        <strong>Create scene</strong>. Three clicks.
      </p>

      {/* PREVIEW */}
      <div className="build-preview">
        {chosenBackdrop ? (
          <video
            key={chosenBackdrop.url}
            src={chosenBackdrop.url}
            autoPlay
            muted
            loop
            playsInline
            className="build-preview-video"
          />
        ) : (
          <div className="build-preview-empty">
            <Film className="h-8 w-8" strokeWidth={1.5} />
            <span>Pick a backdrop below to start</span>
          </div>
        )}
        {previewComposition && <CompositionLayer composition={previewComposition} />}
        <div className="build-preview-corner">
          {chosenBackdrop?.name ?? '—'} · {chosenSegment?.title ?? 'no segment'}
        </div>
      </div>

      {/* Caption editor (only when a segment is picked) */}
      {chosenSegment && (
        <div className="flex flex-col gap-3 rounded-lg border border-border-subtle bg-bg-elevated p-4">
          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-fg-tertiary">
              Caption · one line per row (first line = title, larger)
            </span>
            <textarea
              value={captionDraft}
              onChange={(e) => setCaptionDraft(e.target.value)}
              rows={Math.max(3, captionDraft.split('\n').length)}
              className="rounded-md border border-border bg-bg-base px-3 py-3 text-sm text-fg-primary font-mono"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-fg-tertiary">
              Scene name (for your Scenes list)
            </span>
            <input
              type="text"
              value={sceneName}
              onChange={(e) => setSceneName(e.target.value)}
              placeholder={chosenSegment.title}
              className="rounded-md border border-border bg-bg-base px-3 py-2 text-sm text-fg-primary"
            />
          </label>
        </div>
      )}

      {/* GRIDS */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Backdrops" count={backdrops.length}>
          {loading ? (
            <SkeletonGrid />
          ) : backdrops.length === 0 ? (
            <EmptyHint>
              No videos in the <code>scenes-videos</code> bucket. Upload one on the Scenes tab.
            </EmptyHint>
          ) : (
            <div className="build-grid">
              {backdrops.map((b) => (
                <button
                  key={b.url}
                  type="button"
                  onClick={() => setChosenBackdrop(b)}
                  className={
                    chosenBackdrop?.url === b.url ? 'build-tile build-tile--selected' : 'build-tile'
                  }
                  title={b.name}
                >
                  <video
                    src={b.url}
                    muted
                    playsInline
                    preload="metadata"
                    className="build-tile-video"
                  />
                  <div className="build-tile-label">{b.name}</div>
                  {chosenBackdrop?.url === b.url && (
                    <div className="build-tile-check">
                      <Check className="h-4 w-4" strokeWidth={2.5} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </Section>

        <Section title="Segments" count={segments.length}>
          {loading ? (
            <SkeletonGrid />
          ) : segments.length === 0 ? (
            <EmptyHint>
              No segments yet. Create one on the Segments tab.
            </EmptyHint>
          ) : (
            <div className="build-grid">
              {segments.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setChosenSegment(s)}
                  className={
                    chosenSegment?.id === s.id ? 'build-tile build-tile--selected' : 'build-tile'
                  }
                >
                  <div className="build-tile-segment">
                    {s.subtitle && <div className="build-tile-eyebrow">{s.subtitle}</div>}
                    <div className="build-tile-title">{s.title}</div>
                    <div className="build-tile-meta">
                      {s.speakers.length} {s.speakers.length === 1 ? 'speaker' : 'speakers'}
                    </div>
                  </div>
                  {chosenSegment?.id === s.id && (
                    <div className="build-tile-check">
                      <Check className="h-4 w-4" strokeWidth={2.5} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-fg-secondary">{title}</h2>
        <span className="text-xs text-fg-tertiary">{count}</span>
      </div>
      {children}
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="build-grid">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-32 animate-pulse rounded-md bg-bg-elevated" />
      ))}
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-border bg-bg-base p-4 text-sm text-fg-tertiary">
      {children}
    </div>
  );
}
