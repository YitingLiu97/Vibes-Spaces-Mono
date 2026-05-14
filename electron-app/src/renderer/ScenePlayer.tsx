import { useEffect, useRef, useState } from 'react';
import type { Overlay, Scene } from '@vibes/shared/types';
import { OverlayLayer } from './OverlayLayer';
import { CompositionLayer } from './CompositionLayer';

type PlayerState = 'idle' | 'preparing' | 'crossfading';

const SCENE_CROSSFADE_MS = 1000;
// Loop handoff length. Long enough to mask any decoder hiccup between
// the dying buffer's last frame and the fresh buffer's first frame.
const LOOP_CROSSFADE_MS = 300;

interface Props {
  sceneToPlay: Scene | null;
  attributionVisible: boolean;
  shouldLoop: boolean;
  overlay: Overlay | null;
  overlayStartedAt: Date | null;
  onVideoEnded: () => void;
}

export function ScenePlayer({
  sceneToPlay,
  attributionVisible,
  shouldLoop,
  overlay,
  overlayStartedAt,
  onVideoEnded,
}: Props) {
  const videoA = useRef<HTMLVideoElement>(null);
  const videoB = useRef<HTMLVideoElement>(null);
  const [activeIsA, setActiveIsA] = useState(true);
  const activeIsARef = useRef(true);
  const shouldLoopRef = useRef(shouldLoop);
  const stateRef = useRef<PlayerState>('idle');
  const currentSceneIdRef = useRef<string | null>(null);
  const pendingSceneRef = useRef<Scene | null>(null);

  useEffect(() => {
    activeIsARef.current = activeIsA;
  }, [activeIsA]);
  useEffect(() => {
    shouldLoopRef.current = shouldLoop;
  }, [shouldLoop]);

  useEffect(() => {
    if (!sceneToPlay) return;
    if (sceneToPlay.id === currentSceneIdRef.current) return;
    if (stateRef.current !== 'idle') {
      pendingSceneRef.current = sceneToPlay;
      void window.log.info('play_queued', {
        sceneId: sceneToPlay.id,
        state: stateRef.current,
      });
      return;
    }
    startTransition(sceneToPlay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneToPlay?.id]);

  function srcFor(sceneId: string) {
    return `vibes-scene://${sceneId}.mp4`;
  }

  function startTransition(scene: Scene) {
    stateRef.current = 'preparing';
    currentSceneIdRef.current = scene.id;
    const inactive = activeIsARef.current ? videoB.current! : videoA.current!;
    inactive.src = srcFor(scene.id);
    inactive.loop = false;
    inactive.load();
    inactive.oncanplay = () => {
      inactive.oncanplay = null;
      inactive.play().catch((e) => void window.log.error('play_failed', { error: String(e) }));
      stateRef.current = 'crossfading';
      crossfade(SCENE_CROSSFADE_MS, true);
    };
  }

  function startSeamlessLoop() {
    if (stateRef.current !== 'idle') return;
    const inactive = activeIsARef.current ? videoB.current! : videoA.current!;
    if (!currentSceneIdRef.current) return;
    // Inactive buffer holds the same scene, paused at currentTime=0.
    // Fallback: if it isn't ready for some reason, rewind the active and keep playing.
    if (inactive.readyState < 2 || inactive.src.indexOf(currentSceneIdRef.current) < 0) {
      const active = activeIsARef.current ? videoA.current : videoB.current;
      if (active) {
        active.currentTime = 0;
        active.play().catch(() => {});
      }
      return;
    }
    stateRef.current = 'crossfading';
    inactive.currentTime = 0;
    inactive.play().catch(() => {});
    crossfade(LOOP_CROSSFADE_MS, false);
  }

  function crossfade(durationMs: number, primeLoopBuffer: boolean) {
    const start = performance.now();
    const wasActiveA = activeIsARef.current;
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / durationMs);
      const fadeOut = wasActiveA ? videoA.current! : videoB.current!;
      const fadeIn = wasActiveA ? videoB.current! : videoA.current!;
      fadeOut.style.opacity = String(1 - k);
      fadeIn.style.opacity = String(k);
      if (k < 1) {
        requestAnimationFrame(step);
      } else {
        const formerlyActive = wasActiveA ? videoA.current! : videoB.current!;
        formerlyActive.pause();
        // Rewind so it's ready as the next loop buffer.
        formerlyActive.currentTime = 0;
        setActiveIsA(!wasActiveA);
        activeIsARef.current = !wasActiveA;
        stateRef.current = 'idle';

        // After a scene-change crossfade, the formerly-active still has the OLD
        // scene's src. Re-prime it with the current scene so the first loop is seamless.
        if (primeLoopBuffer && currentSceneIdRef.current) {
          const sceneSrc = srcFor(currentSceneIdRef.current);
          if (formerlyActive.src !== sceneSrc && !formerlyActive.src.endsWith(sceneSrc)) {
            formerlyActive.src = sceneSrc;
            formerlyActive.loop = false;
            formerlyActive.load();
            formerlyActive.oncanplay = () => {
              formerlyActive.oncanplay = null;
              formerlyActive.pause();
              formerlyActive.currentTime = 0;
            };
          }
        }

        const pending = pendingSceneRef.current;
        pendingSceneRef.current = null;
        if (pending && pending.id !== currentSceneIdRef.current) {
          startTransition(pending);
        }
      }
    };
    requestAnimationFrame(step);
  }

  function handleEnded(e: React.SyntheticEvent<HTMLVideoElement>) {
    const isActive =
      (e.currentTarget === videoA.current && activeIsARef.current) ||
      (e.currentTarget === videoB.current && !activeIsARef.current);
    if (!isActive) return;

    if (shouldLoopRef.current) {
      startSeamlessLoop();
    } else {
      onVideoEnded();
    }
  }

  return (
    <div className="player-root">
      <video
        ref={videoA}
        className="layer"
        style={{ opacity: 1 }}
        onEnded={handleEnded}
        muted
        playsInline
      />
      <video
        ref={videoB}
        className="layer"
        style={{ opacity: 0 }}
        onEnded={handleEnded}
        muted
        playsInline
      />
      <CompositionLayer composition={sceneToPlay?.composition ?? null} />
      <OverlayLayer overlay={overlay} startedAt={overlayStartedAt} />
      {attributionVisible && (
        <div className="vibes-wordmark" aria-hidden>
          Vibes
        </div>
      )}
    </div>
  );
}
