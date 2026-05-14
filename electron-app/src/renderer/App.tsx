import { useEffect, useRef, useState } from 'react';
import type { Overlay, Scene } from '@vibes/shared/types';
import { Scheduler } from './Scheduler';
import { ScenePlayer } from './ScenePlayer';

export function App() {
  const [scene, setScene] = useState<Scene | null>(null);
  const [attributionVisible, setAttributionVisible] = useState(true);
  const [shouldLoop, setShouldLoop] = useState(true);
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [overlayStartedAt, setOverlayStartedAt] = useState<Date | null>(null);
  const schedulerRef = useRef<Scheduler | null>(null);

  useEffect(() => {
    const scheduler = new Scheduler(
      (state) => {
        setScene(state.scene);
        setAttributionVisible(state.attributionVisible);
        setShouldLoop(state.shouldLoop);
      },
      (state) => {
        if (state) {
          setOverlay(state.overlay);
          setOverlayStartedAt(state.startedAt);
        } else {
          setOverlay(null);
          setOverlayStartedAt(null);
        }
      },
    );
    schedulerRef.current = scheduler;
    void scheduler.start();
    return () => scheduler.stop();
  }, []);

  return (
    <ScenePlayer
      sceneToPlay={scene}
      attributionVisible={attributionVisible}
      shouldLoop={shouldLoop}
      overlay={overlay}
      overlayStartedAt={overlayStartedAt}
      onVideoEnded={() => schedulerRef.current?.onVideoEnded()}
    />
  );
}
