'use client';

import { useEffect, useState } from 'react';
import type {
  ImageLogoContent,
  Overlay,
  SpeakerCardContent,
  TextOverlayContent,
} from '@vibes/shared/types';

const ENTER_MS = 400;
const EXIT_MS = 400;

interface Props {
  overlay: Overlay | null;
  startedAt: Date | null;
}

type Phase = 'entering' | 'holding' | 'exiting' | 'gone';

export function LiveOverlayLayer({ overlay, startedAt }: Props) {
  const [phase, setPhase] = useState<Phase>('gone');
  const [rendered, setRendered] = useState<Overlay | null>(null);

  useEffect(() => {
    if (!overlay || !startedAt) {
      if (phase !== 'gone') {
        setPhase('exiting');
        const t = window.setTimeout(() => {
          setPhase('gone');
          setRendered(null);
        }, EXIT_MS);
        return () => window.clearTimeout(t);
      }
      return;
    }
    setRendered(overlay);
    setPhase('entering');
    const enter = window.setTimeout(() => setPhase('holding'), ENTER_MS);
    const hold = Math.max(0, overlay.durationMs - ENTER_MS - EXIT_MS);
    const exit = window.setTimeout(() => setPhase('exiting'), ENTER_MS + hold);
    const gone = window.setTimeout(() => {
      setPhase('gone');
      setRendered(null);
    }, overlay.durationMs);
    return () => {
      window.clearTimeout(enter);
      window.clearTimeout(exit);
      window.clearTimeout(gone);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlay?.id, startedAt?.toISOString()]);

  if (!rendered || phase === 'gone') return null;

  const stateClass = phase === 'entering' || phase === 'holding' ? 'enter' : 'exit';
  const animClass = `anim-${rendered.animation}`;

  return (
    <div className="live-overlay-root">
      <div className={`live-overlay-card ${animClass} ${stateClass}`} aria-live="polite">
        <Contents overlay={rendered} />
      </div>
    </div>
  );
}

function Contents({ overlay }: { overlay: Overlay }) {
  if (overlay.type === 'speaker_card') {
    const c = overlay.content as SpeakerCardContent;
    return (
      <div className="live-overlay-speaker">
        <div className="live-overlay-speaker-name">{c.name}</div>
        {c.role && <div className="live-overlay-speaker-role">{c.role}</div>}
      </div>
    );
  }
  if (overlay.type === 'text') {
    const c = overlay.content as TextOverlayContent;
    return (
      <div className="live-overlay-text" style={{ textAlign: c.align ?? 'left' }}>
        {c.lines.map((line, i) => (
          <div key={i} className={i === 0 ? 'live-overlay-text-1' : 'live-overlay-text-2'}>
            {line}
          </div>
        ))}
      </div>
    );
  }
  if (overlay.type === 'image_logo') {
    const c = overlay.content as ImageLogoContent;
    return (
      <div className={`live-overlay-logo live-overlay-pos-${c.position}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={c.url} alt="" />
      </div>
    );
  }
  return null;
}
