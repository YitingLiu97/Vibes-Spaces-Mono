import { app, protocol, net } from 'electron';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

export function registerSceneProtocol() {
  const cacheDir = path.join(app.getPath('userData'), 'scene_cache');
  protocol.handle('vibes-scene', (request) => {
    const filename = decodeURIComponent(request.url.replace('vibes-scene://', ''));
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '');
    const local = path.join(cacheDir, safe);
    return net.fetch(pathToFileURL(local).toString());
  });
}

export function registerSceneSchemePrivileged() {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'vibes-scene',
      privileges: { secure: true, standard: true, supportFetchAPI: true, stream: true, bypassCSP: true },
    },
  ]);
}
