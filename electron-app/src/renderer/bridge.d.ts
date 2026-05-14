import type { Scene } from '@vibes/shared/types';

declare global {
  interface Window {
    cache: {
      isCached: (id: string) => Promise<boolean>;
      ensure: (scene: Scene) => Promise<void>;
      prefetchAll: (scenes: Scene[]) => Promise<void>;
    };
    log: {
      info: (evt: string, data?: unknown) => Promise<void>;
      error: (evt: string, data?: unknown) => Promise<void>;
    };
  }
}

export {};
