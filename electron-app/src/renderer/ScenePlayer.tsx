import { useEffect, useRef, useState } from 'react';
import type { Overlay, Scene } from '@vibes/shared/types';
import { OverlayLayer } from './OverlayLayer';
import { CompositionLayer } from './CompositionLayer';
import { srcFor } from './runtime';

interface Props {
  sceneToPlay: Scene | null;
  attributionVisible: boolean;
  shouldLoop: boolean;
  overlay: Overlay | null;
  overlayStartedAt: Date | null;
  onVideoEnded: () => void;
}

// Two-video crossfade on scene change. Both <video> elements stay mounted;
// each owns its own <video src> declaratively (React-managed). When a new
// scene arrives we load it on the *inactive* side, wait for canplay, then
// flip activeSide — a CSS opacity transition handles the visible fade.
//
// Native `loop` on the visible video handles within-scene looping (Chromium
// shows a 1-frame blink at the loop point; we accept that as the price of
// not running a manual ping-pong buffer that has historically caused worse
// failures). The crossfade is only for scene-to-scene transitions.
export function ScenePlayer({
  sceneToPlay,
  attributionVisible,
  shouldLoop,
  overlay,
  overlayStartedAt,
  onVideoEnded,
}: Props) {
  const [activeSide, setActiveSide] = useState<'A' | 'B'>('A');
  const [sceneA, setSceneA] = useState<Scene | null>(null);
  const [sceneB, setSceneB] = useState<Scene | null>(null);
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!sceneToPlay) return;
    const visibleScene = activeSide === 'A' ? sceneA : sceneB;
    if (visibleScene?.id === sceneToPlay.id) return;

    // Load the new scene on the side that's currently hidden.
    const incomingSide: 'A' | 'B' = activeSide === 'A' ? 'B' : 'A';
    if (incomingSide === 'B') setSceneB(sceneToPlay);
    else setSceneA(sceneToPlay);

    // After React commits the new src, wait for the element's canplay,
    // then flip activeSide so CSS animates the fade.
    const targetVideo = () =>
      incomingSide === 'A' ? videoARef.current : videoBRef.current;

    let cancelled = false;
    const startWhenReady = () => {
      if (cancelled) return;
      const v = targetVideo();
      if (!v) return;
      const onReady = () => {
        v.removeEventListener('canplay', onReady);
        if (cancelled) return;
        void v.play().catch((e) => void window.log?.error('play_failed', { error: String(e) }));
        setActiveSide(incomingSide);
      };
      // If already ready (cached / fast load), fire immediately.
      if (v.readyState >= 2) {
        onReady();
      } else {
        v.addEventListener('canplay', onReady);
      }
    };

    // Defer one frame so React has committed the new src to the DOM.
    const handle = window.requestAnimationFrame(startWhenReady);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(handle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneToPlay?.id]);

  return (
    <div className="player-root">
      <video
        ref={videoARef}
        key={sceneA?.id ?? 'a-empty'}
        src={sceneA ? srcFor(sceneA) : undefined}
        loop={shouldLoop}
        muted
        playsInline
        onEnded={onVideoEnded}
        onPlaying={() =>
          void window.log?.info('video_playing', { sceneId: sceneA?.id, side: 'A' })
        }
        onError={(e) => {
          const err = (e.currentTarget as HTMLVideoElement).error;
          void window.log?.error('video_error', {
            sceneId: sceneA?.id,
            code: err?.code,
            message: err?.message,
          });
        }}
        className="layer crossfade"
        style={{ opacity: activeSide === 'A' ? 1 : 0 }}
      />
      <video
        ref={videoBRef}
        key={sceneB?.id ?? 'b-empty'}
        src={sceneB ? srcFor(sceneB) : undefined}
        loop={shouldLoop}
        muted
        playsInline
        onEnded={onVideoEnded}
        onPlaying={() =>
          void window.log?.info('video_playing', { sceneId: sceneB?.id, side: 'B' })
        }
        onError={(e) => {
          const err = (e.currentTarget as HTMLVideoElement).error;
          void window.log?.error('video_error', {
            sceneId: sceneB?.id,
            code: err?.code,
            message: err?.message,
          });
        }}
        className="layer crossfade"
        style={{ opacity: activeSide === 'B' ? 1 : 0 }}
      />
      <CompositionLayer composition={sceneToPlay?.composition ?? null} />
      <OverlayLayer overlay={overlay} startedAt={overlayStartedAt} />
      {attributionVisible && (
        <img
          className="vibes-wordmark"
          src="https://www.futureofnycdesign.com/public/logos/vibes.png"
          alt=""
          aria-hidden
        />
      )}
    </div>
  );
}
