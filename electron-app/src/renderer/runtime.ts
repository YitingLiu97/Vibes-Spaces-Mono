import type { Scene } from '@vibes/shared/types';

// Inside Electron's renderer, the preload script attaches `window.cache` and
// `window.log` via contextBridge. When you load the same Vite dev URL
// (localhost:5173) in a regular browser, those bridges don't exist and the
// Scheduler crashes on its first window.log.info call.
//
// This module exports a single helper to detect "are we running inside
// Electron?" and a one-time installer that stubs the missing bridges with
// browser-safe equivalents. Call install() once at app boot, before anything
// touches window.log or window.cache.

export function isElectron(): boolean {
  return typeof window !== 'undefined' && typeof window.cache !== 'undefined';
}

export function installBrowserShimsIfNeeded() {
  if (typeof window === 'undefined') return;

  if (typeof window.log === 'undefined') {
    window.log = {
      info: async (evt: string, data?: unknown) => {
        console.log(`[vibes] ${evt}`, data ?? '');
      },
      error: async (evt: string, data?: unknown) => {
        console.error(`[vibes] ${evt}`, data ?? '');
      },
    };
  }

  if (typeof window.cache === 'undefined') {
    // In a browser we stream straight from Supabase Storage — there's no local
    // cache layer, so isCached is always "yes, go ahead" and prefetch is a
    // no-op. ScenePlayer reads scene.videoUrl directly (see srcFor below).
    window.cache = {
      isCached: async (_id: string) => true,
      ensure: async (_scene: Scene) => {},
      prefetchAll: async (_scenes: Scene[]) => {},
    };
  }
}

// Returns the URL the <video> element should load. Inside Electron, we use
// the custom protocol which serves the locally cached file (offline-capable,
// fast). In a browser, we use the public Supabase Storage URL.
export function srcFor(scene: Scene): string {
  return isElectron() ? `vibes-scene://${scene.id}.mp4` : scene.videoUrl;
}
