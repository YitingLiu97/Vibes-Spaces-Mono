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

// Simple single-<video> player. Native loop is fine here — the venue
// Chromium build has the loop-point blink but the simpler architecture is
// dramatically more reliable than the double-buffered ping-pong we tried.
// The blink is a single frame; the alternative was a black screen.
//
// Future enhancement (when stable): add a double-buffered seamless loop
// behind a flag, but keep this path as the fallback.
export function ScenePlayer({
  sceneToPlay,
  attributionVisible,
  shouldLoop,
  overlay,
  overlayStartedAt,
  onVideoEnded,
}: Props) {
  return (
    <div className="player-root">
      {sceneToPlay && (
        <video
          // key forces React to remount the element on scene change so we get
          // a clean .load() / .play() cycle without manual seek juggling.
          key={sceneToPlay.id}
          className="layer"
          src={srcFor(sceneToPlay)}
          autoPlay
          loop={shouldLoop}
          muted
          playsInline
          onEnded={onVideoEnded}
          onError={(e) => {
            const err = (e.currentTarget as HTMLVideoElement).error;
            void window.log?.error('video_error', {
              code: err?.code,
              message: err?.message,
              sceneId: sceneToPlay.id,
            });
          }}
          onPlaying={() => {
            void window.log?.info('video_playing', { sceneId: sceneToPlay.id });
          }}
        />
      )}
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
