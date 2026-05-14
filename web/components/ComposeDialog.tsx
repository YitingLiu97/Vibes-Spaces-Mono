'use client';

import { useCallback, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { Scene, SceneComposition } from '@vibes/shared/types';
import { EMPTY_COMPOSITION } from '@vibes/shared/types';
import { getSupabase } from '@/lib/supabase';
import { ORG_ID } from '@/lib/constants';
import { Button } from './Button';
import { useToast } from './Toast';
import { CompositionLayer } from './CompositionLayer';

interface Props {
  scene: Scene | null;
  onClose: () => void;
  onSaved: () => void;
}

const cloneComposition = (c: SceneComposition | null): SceneComposition => {
  if (!c) return JSON.parse(JSON.stringify(EMPTY_COMPOSITION));
  return JSON.parse(JSON.stringify(c));
};

export function ComposeDialog({ scene, onClose, onSaved }: Props) {
  const [comp, setComp] = useState<SceneComposition>(() => cloneComposition(scene?.composition ?? null));
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (scene) setComp(cloneComposition(scene.composition));
  }, [scene]);

  useEffect(() => {
    if (!scene) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !(e.target as HTMLElement).matches('input, select, textarea')) onClose();
    }
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [scene, onClose]);

  const setZoneImage = useCallback((zone: 'header' | 'center' | 'footer', url: string | null) => {
    setComp((prev) => ({
      ...prev,
      zones: { ...prev.zones, [zone]: { ...prev.zones[zone], imageUrl: url } },
    }));
  }, []);

  const setZonePos = useCallback(
    (zone: 'header' | 'center' | 'footer', position: 'left' | 'center' | 'right') => {
      setComp((prev) => ({
        ...prev,
        zones: { ...prev.zones, [zone]: { ...prev.zones[zone], position } },
      }));
    },
    [],
  );

  async function uploadZoneImage(zone: 'header' | 'center' | 'footer', file: File) {
    try {
      const id = crypto.randomUUID();
      const ext = file.name.split('.').pop() ?? 'png';
      const path = `${ORG_ID}/${id}.${ext}`;
      const supabase = getSupabase();
      const { error } = await supabase.storage.from('overlay-images').upload(path, file);
      if (error) throw error;
      const { data: pub } = supabase.storage.from('overlay-images').getPublicUrl(path);
      setZoneImage(zone, pub.publicUrl);
    } catch {
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: 'Check your connection and try again.',
      });
    }
  }

  function setCaptionField<K extends keyof NonNullable<SceneComposition['caption']>>(
    field: K,
    value: NonNullable<SceneComposition['caption']>[K],
  ) {
    setComp((prev) => ({
      ...prev,
      caption: {
        text: '',
        font: 'bebas',
        size: 36,
        color: '#F0EAF5',
        h: 'center',
        v: 'bottom',
        ...(prev.caption ?? {}),
        [field]: value,
      } as NonNullable<SceneComposition['caption']>,
    }));
  }

  function clearCaption() {
    setComp((prev) => ({ ...prev, caption: null }));
  }

  function setTintField(field: 'color' | 'opacity', value: string | number) {
    setComp((prev) => ({
      ...prev,
      tint: {
        color: prev.tint?.color ?? '#141418',
        opacity: prev.tint?.opacity ?? 0,
        [field]: value,
      },
    }));
  }

  async function save() {
    if (!scene) return;
    setSaving(true);
    try {
      const { error } = await getSupabase()
        .from('scenes')
        .update({ composition: comp })
        .eq('id', scene.id);
      if (error) throw error;
      toast({ title: 'Composition saved', description: scene.name });
      onSaved();
      onClose();
    } catch {
      toast({
        variant: 'destructive',
        title: 'Couldn’t save composition',
        description: 'Check your connection and try again.',
      });
    } finally {
      setSaving(false);
    }
  }

  async function clearAll() {
    if (!confirm('Clear all composition (zones, caption, tint) for this scene?')) return;
    if (!scene) return;
    setSaving(true);
    try {
      const { error } = await getSupabase()
        .from('scenes')
        .update({ composition: null })
        .eq('id', scene.id);
      if (error) throw error;
      toast({ title: 'Composition cleared' });
      onSaved();
      onClose();
    } catch {
      toast({ variant: 'destructive', title: 'Couldn’t clear' });
    } finally {
      setSaving(false);
    }
  }

  if (!scene) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg-base">
      <header className="flex items-center justify-between border-b border-border-subtle px-5 py-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs uppercase tracking-[0.2em] text-fg-tertiary">Compose</span>
          <h2 className="font-display text-2xl tracking-wider text-fg-primary">{scene.name}</h2>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={clearAll} disabled={saving}>
            Clear composition
          </Button>
          <Button variant="primary" size="sm" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
          <button onClick={onClose} aria-label="Close" className="text-fg-tertiary hover:text-fg-primary">
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 flex-col md:flex-row">
        {/* Sidebar */}
        <aside className="w-full md:w-[360px] border-b md:border-b-0 md:border-r border-border-subtle overflow-y-auto p-5 flex flex-col gap-5">
          <CollapsibleSection title="Header image · top" defaultOpen>
            <ZoneControls
              zone="header"
              imageUrl={comp.zones.header.imageUrl}
              position={comp.zones.header.position}
              onUpload={(f) => uploadZoneImage('header', f)}
              onClear={() => setZoneImage('header', null)}
              onPos={(p) => setZonePos('header', p)}
            />
          </CollapsibleSection>

          <CollapsibleSection title="Center image · middle">
            <ZoneControls
              zone="center"
              imageUrl={comp.zones.center.imageUrl}
              position={comp.zones.center.position}
              onUpload={(f) => uploadZoneImage('center', f)}
              onClear={() => setZoneImage('center', null)}
              onPos={(p) => setZonePos('center', p)}
            />
          </CollapsibleSection>

          <CollapsibleSection title="Footer image · bottom">
            <ZoneControls
              zone="footer"
              imageUrl={comp.zones.footer.imageUrl}
              position={comp.zones.footer.position}
              onUpload={(f) => uploadZoneImage('footer', f)}
              onClear={() => setZoneImage('footer', null)}
              onPos={(p) => setZonePos('footer', p)}
            />
          </CollapsibleSection>

          <CollapsibleSection title="Caption text" defaultOpen={!!comp.caption}>
            <CaptionControls
              caption={comp.caption}
              onChange={setCaptionField}
              onClear={clearCaption}
            />
          </CollapsibleSection>

          <CollapsibleSection title="Tint">
            <TintControls
              tint={comp.tint}
              onChange={setTintField}
              onClear={() => setComp((prev) => ({ ...prev, tint: null }))}
            />
          </CollapsibleSection>
        </aside>

        {/* Stage preview */}
        <main className="flex flex-1 min-h-0 items-center justify-center p-5 bg-bg-base">
          <Stage videoUrl={scene.videoUrl} composition={comp} loop={scene.loopEnabled} />
        </main>
      </div>
    </div>
  );
}

function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details open={defaultOpen} className="border-b border-border-subtle pb-3">
      <summary className="cursor-pointer select-none text-[10px] font-bold uppercase tracking-[2px] text-accent py-2">
        {title}
      </summary>
      <div className="pt-2 flex flex-col gap-2">{children}</div>
    </details>
  );
}

function ZoneControls({
  imageUrl,
  position,
  onUpload,
  onClear,
  onPos,
}: {
  zone: 'header' | 'center' | 'footer';
  imageUrl: string | null;
  position: 'left' | 'center' | 'right';
  onUpload: (f: File) => void;
  onClear: () => void;
  onPos: (p: 'left' | 'center' | 'right') => void;
}) {
  return (
    <>
      <label className="relative flex min-h-[70px] cursor-pointer items-center justify-center border border-dashed border-border bg-bg-base p-3 text-center text-[10px] uppercase tracking-wider text-fg-tertiary hover:border-accent hover:text-fg-primary">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="max-h-[60px] max-w-full" />
        ) : (
          'Click to upload'
        )}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
      <div className="flex gap-1">
        {(['left', 'center', 'right'] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPos(p)}
            className={
              p === position
                ? 'flex-1 rounded border border-accent bg-accent text-fg-on-accent px-2 py-2 text-[9px] uppercase tracking-wider font-mono'
                : 'flex-1 rounded border border-border bg-bg-base text-fg-secondary hover:border-accent px-2 py-2 text-[9px] uppercase tracking-wider font-mono'
            }
          >
            {p}
          </button>
        ))}
      </div>
      {imageUrl && (
        <button
          type="button"
          onClick={onClear}
          className="rounded border border-border bg-bg-base px-2 py-2 text-[9px] uppercase tracking-wider font-mono text-fg-tertiary hover:text-danger hover:border-danger"
        >
          Clear
        </button>
      )}
    </>
  );
}

function CaptionControls({
  caption,
  onChange,
  onClear,
}: {
  caption: SceneComposition['caption'];
  onChange: <K extends keyof NonNullable<SceneComposition['caption']>>(
    field: K,
    value: NonNullable<SceneComposition['caption']>[K],
  ) => void;
  onClear: () => void;
}) {
  const c = caption ?? {
    text: '',
    font: 'bebas' as const,
    size: 36,
    color: '#F0EAF5',
    h: 'center' as const,
    v: 'bottom' as const,
  };

  const positions: Array<['top' | 'middle' | 'bottom', 'left' | 'center' | 'right']> = [
    ['top', 'left'], ['top', 'center'], ['top', 'right'],
    ['middle', 'left'], ['middle', 'center'], ['middle', 'right'],
    ['bottom', 'left'], ['bottom', 'center'], ['bottom', 'right'],
  ];

  return (
    <>
      <input
        type="text"
        value={c.text}
        onChange={(e) => onChange('text', e.target.value)}
        placeholder="FUTURE OF NYC DESIGN 2026"
        className="w-full rounded border border-border bg-bg-base px-3 py-3 text-sm text-fg-primary placeholder:text-fg-tertiary font-mono"
      />

      <label className="text-[9px] uppercase tracking-wider text-fg-tertiary mt-1">Font</label>
      <div className="flex gap-1">
        {(['bebas', 'serif', 'mono'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => onChange('font', f)}
            className={
              f === c.font
                ? 'flex-1 rounded border border-accent bg-accent text-fg-on-accent px-2 py-2 text-[9px] uppercase tracking-wider font-mono'
                : 'flex-1 rounded border border-border bg-bg-base text-fg-secondary hover:border-accent px-2 py-2 text-[9px] uppercase tracking-wider font-mono'
            }
          >
            {f === 'bebas' ? 'Bebas' : f === 'serif' ? 'DM Serif' : 'Mono'}
          </button>
        ))}
      </div>

      <label className="text-[9px] uppercase tracking-wider text-fg-tertiary mt-2">
        Size {c.size}px
      </label>
      <input
        type="range"
        min={14}
        max={120}
        value={c.size}
        onChange={(e) => onChange('size', Number(e.target.value))}
        className="w-full"
      />

      <label className="text-[9px] uppercase tracking-wider text-fg-tertiary mt-2">Color</label>
      <input
        type="color"
        value={c.color}
        onChange={(e) => onChange('color', e.target.value)}
        className="h-10 w-full cursor-pointer rounded border border-border bg-bg-base p-1"
      />

      <label className="text-[9px] uppercase tracking-wider text-fg-tertiary mt-2">Position</label>
      <div className="grid grid-cols-3 gap-1">
        {positions.map(([v, h]) => {
          const active = v === c.v && h === c.h;
          return (
            <button
              key={`${v}-${h}`}
              type="button"
              onClick={() => {
                onChange('v', v);
                onChange('h', h);
              }}
              className={
                active
                  ? 'aspect-square rounded border border-accent bg-accent'
                  : 'aspect-square rounded border border-border bg-bg-base hover:border-accent'
              }
              aria-label={`${v} ${h}`}
            />
          );
        })}
      </div>

      {caption && (
        <button
          type="button"
          onClick={onClear}
          className="mt-2 rounded border border-border bg-bg-base px-2 py-2 text-[9px] uppercase tracking-wider font-mono text-fg-tertiary hover:text-danger hover:border-danger"
        >
          Remove caption
        </button>
      )}
    </>
  );
}

function TintControls({
  tint,
  onChange,
  onClear,
}: {
  tint: { color: string; opacity: number } | null;
  onChange: (field: 'color' | 'opacity', value: string | number) => void;
  onClear: () => void;
}) {
  const t = tint ?? { color: '#141418', opacity: 0 };
  return (
    <>
      <label className="text-[9px] uppercase tracking-wider text-fg-tertiary">Tint color</label>
      <input
        type="color"
        value={t.color}
        onChange={(e) => onChange('color', e.target.value)}
        className="h-10 w-full cursor-pointer rounded border border-border bg-bg-base p-1"
      />
      <label className="text-[9px] uppercase tracking-wider text-fg-tertiary mt-2">
        Opacity {t.opacity}%
      </label>
      <input
        type="range"
        min={0}
        max={100}
        value={t.opacity}
        onChange={(e) => onChange('opacity', Number(e.target.value))}
        className="w-full"
      />
      {tint && (
        <button
          type="button"
          onClick={onClear}
          className="mt-2 rounded border border-border bg-bg-base px-2 py-2 text-[9px] uppercase tracking-wider font-mono text-fg-tertiary hover:text-danger hover:border-danger"
        >
          Remove tint
        </button>
      )}
    </>
  );
}

function Stage({
  videoUrl,
  composition,
  loop,
}: {
  videoUrl: string;
  composition: SceneComposition;
  loop: boolean;
}) {
  return (
    <div
      className="relative aspect-video w-full max-w-full max-h-full bg-bg-base overflow-hidden"
      style={{ boxShadow: `0 30px 80px rgba(0,0,0,0.5), 0 0 0 1px ${composition.accent ?? 'var(--color-accent)'}` }}
    >
      <video
        src={videoUrl}
        autoPlay
        loop={loop}
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
      />
      <CompositionLayer composition={composition} />
    </div>
  );
}
