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

export function OverlayLayer({ overlay, startedAt }: Props) {
  const [phase, setPhase] = useState<Phase>('gone');
  const [renderedOverlay, setRenderedOverlay] = useState<Overlay | null>(null);

  useEffect(() => {
    if (!overlay || !startedAt) {
      // Trigger exit if currently visible.
      if (phase !== 'gone') {
        setPhase('exiting');
        const t = window.setTimeout(() => {
          setPhase('gone');
          setRenderedOverlay(null);
        }, EXIT_MS);
        return () => window.clearTimeout(t);
      }
      return;
    }

    // New overlay triggered.
    setRenderedOverlay(overlay);
    setPhase('entering');

    const enterTimer = window.setTimeout(() => setPhase('holding'), ENTER_MS);
    const holdDuration = Math.max(0, overlay.durationMs - ENTER_MS - EXIT_MS);
    const exitTimer = window.setTimeout(() => setPhase('exiting'), ENTER_MS + holdDuration);
    const goneTimer = window.setTimeout(() => {
      setPhase('gone');
      setRenderedOverlay(null);
    }, overlay.durationMs);

    return () => {
      window.clearTimeout(enterTimer);
      window.clearTimeout(exitTimer);
      window.clearTimeout(goneTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlay?.id, startedAt?.toISOString()]);

  if (!renderedOverlay || phase === 'gone') return null;

  const stateClass = phase === 'entering' || phase === 'holding' ? 'enter' : 'exit';
  const animClass = `anim-${renderedOverlay.animation}`;

  return (
    <div className="overlay-root">
      <div className={`overlay-card ${animClass} ${stateClass}`} aria-live="polite">
        <OverlayContents overlay={renderedOverlay} />
      </div>
    </div>
  );
}

function OverlayContents({ overlay }: { overlay: Overlay }) {
  if (overlay.type === 'speaker_card') {
    const c = overlay.content as SpeakerCardContent;
    return (
      <div className="overlay-speaker">
        <div className="overlay-speaker-name">{c.name}</div>
        {c.role && <div className="overlay-speaker-role">{c.role}</div>}
      </div>
    );
  }
  if (overlay.type === 'text') {
    const c = overlay.content as TextOverlayContent;
    return (
      <div className="overlay-text" style={{ textAlign: c.align ?? 'left' }}>
        {c.lines.map((line, i) => (
          <div key={i} className={i === 0 ? 'overlay-text-line-1' : 'overlay-text-line-2'}>
            {line}
          </div>
        ))}
      </div>
    );
  }
  if (overlay.type === 'image_logo') {
    const c = overlay.content as ImageLogoContent;
    return (
      <div className={`overlay-logo overlay-pos-${c.position}`}>
        <img src={c.url} alt="" />
      </div>
    );
  }
  return null;
}
