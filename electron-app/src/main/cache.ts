import { app } from 'electron';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { logger } from './logger';
import type { Scene } from '@vibes/shared/types';

let cacheDirPromise: Promise<string> | null = null;

function cacheDir(): Promise<string> {
  if (!cacheDirPromise) {
    const dir = path.join(app.getPath('userData'), 'scene_cache');
    cacheDirPromise = fs.mkdir(dir, { recursive: true }).then(() => dir);
  }
  return cacheDirPromise;
}

export async function localPathFor(sceneId: string): Promise<string> {
  return path.join(await cacheDir(), `${sceneId}.mp4`);
}

export async function isCached(sceneId: string): Promise<boolean> {
  try {
    await fs.access(await localPathFor(sceneId));
    return true;
  } catch {
    return false;
  }
}

export async function ensureCached(scene: Scene): Promise<void> {
  if (await isCached(scene.id)) return;
  logger.info('video_download_start', { sceneId: scene.id });
  const res = await fetch(scene.videoUrl);
  if (!res.ok) {
    logger.error('video_download_failed', { sceneId: scene.id, status: res.status });
    throw new Error(`download ${scene.id}: ${res.status}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const target = await localPathFor(scene.id);
  const tmp = target + '.tmp';
  await fs.writeFile(tmp, buf);
  await fs.rename(tmp, target);
  logger.info('video_download_done', { sceneId: scene.id, bytes: buf.length });
}

export async function prefetchAll(scenes: Scene[]): Promise<void> {
  for (const s of scenes) {
    try {
      await ensureCached(s);
    } catch (e) {
      logger.error('prefetch_one_failed', { sceneId: s.id, error: String(e) });
    }
  }
}
