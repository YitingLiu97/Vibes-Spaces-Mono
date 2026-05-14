import { contextBridge, ipcRenderer } from 'electron';
import type { Scene } from '@vibes/shared/types';

contextBridge.exposeInMainWorld('cache', {
  isCached: (id: string): Promise<boolean> => ipcRenderer.invoke('cache:is-cached', id),
  ensure: (scene: Scene): Promise<void> => ipcRenderer.invoke('cache:ensure', scene),
  prefetchAll: (scenes: Scene[]): Promise<void> => ipcRenderer.invoke('cache:prefetch-all', scenes),
});

contextBridge.exposeInMainWorld('log', {
  info: (evt: string, data?: unknown): Promise<void> => ipcRenderer.invoke('log:info', evt, data),
  error: (evt: string, data?: unknown): Promise<void> => ipcRenderer.invoke('log:error', evt, data),
});
