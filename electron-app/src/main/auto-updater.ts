import { autoUpdater } from 'electron-updater';
import { logger } from './logger';

export function initAutoUpdater() {
  if (process.env.VIBES_DISABLE_UPDATES === '1') {
    logger.info('updates_disabled_by_env');
    return;
  }
  autoUpdater.logger = logger as unknown as typeof autoUpdater.logger;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => logger.info('update_checking'));
  autoUpdater.on('update-available', (info) => logger.info('update_available', info));
  autoUpdater.on('update-not-available', () => logger.info('update_none'));
  autoUpdater.on('error', (err) => logger.error('update_error', { error: String(err) }));
  autoUpdater.on('update-downloaded', (info) => logger.info('update_downloaded', info));

  void autoUpdater.checkForUpdatesAndNotify();
  setInterval(() => void autoUpdater.checkForUpdatesAndNotify(), 60 * 60 * 1000);
}
