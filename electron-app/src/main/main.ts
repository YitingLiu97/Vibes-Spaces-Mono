import { app, BrowserWindow } from 'electron';
import * as path from 'node:path';
import { registerSceneProtocol, registerSceneSchemePrivileged } from './protocol';
import { registerIpcHandlers } from './ipc';
import { initAutoUpdater } from './auto-updater';
import { logger } from './logger';

let win: BrowserWindow | null = null;

registerSceneSchemePrivileged();

const isDev = !!process.env.VITE_DEV_SERVER_URL;

app.whenReady().then(async () => {
  registerSceneProtocol();
  registerIpcHandlers();

  win = new BrowserWindow({
    fullscreen: !isDev,
    kiosk: !isDev,
    autoHideMenuBar: true,
    backgroundColor: '#0a0a0b',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
    },
  });

  // Pipe renderer console into the main stdout so we can diagnose without devtools.
  win.webContents.on('console-message', (_e, level, message, line, sourceId) => {
    logger.info('renderer_console', { level, message, source: `${sourceId}:${line}` });
  });
  win.webContents.on('did-fail-load', (_e, errorCode, errorDescription, validatedURL) => {
    logger.error('did_fail_load', { errorCode, errorDescription, validatedURL });
  });
  win.webContents.on('render-process-gone', (_e, details) => {
    logger.error('render_process_gone', details);
  });

  if (isDev) {
    await win.loadURL(process.env.VITE_DEV_SERVER_URL!);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    await win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  logger.info('window_created', { version: app.getVersion(), dev: isDev });
  initAutoUpdater();
});

app.on('window-all-closed', () => {
  app.quit();
});
