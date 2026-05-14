import { ipcMain } from 'electron';
import { isCached, ensureCached, prefetchAll } from './cache';
import { logger } from './logger';
import type { Scene } from '@vibes/shared/types';

export function registerIpcHandlers() {
  ipcMain.handle('cache:is-cached', (_e, sceneId: string) => isCached(sceneId));
  ipcMain.handle('cache:ensure', (_e, scene: Scene) => ensureCached(scene));
  ipcMain.handle('cache:prefetch-all', (_e, scenes: Scene[]) => prefetchAll(scenes));
  ipcMain.handle('log:info', (_e, evt: string, data?: unknown) => {
    logger.info(evt, data);
  });
  ipcMain.handle('log:error', (_e, evt: string, data?: unknown) => {
    logger.error(evt, data);
  });
}
