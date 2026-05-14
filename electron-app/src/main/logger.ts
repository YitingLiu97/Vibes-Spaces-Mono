import { app } from 'electron';
import * as fs from 'node:fs';
import * as path from 'node:path';

let cachedLogPath: string | null = null;

function logPath(): string {
  if (!cachedLogPath) {
    cachedLogPath = path.join(app.getPath('userData'), 'spaces.log');
  }
  return cachedLogPath;
}

function write(level: 'info' | 'error', evt: string, data?: unknown) {
  const row = JSON.stringify({ ts: new Date().toISOString(), level, evt, data });
  try {
    fs.appendFileSync(logPath(), row + '\n');
  } catch {
    // Disk issue or app not ready — fall back to console.
  }
  if (level === 'error') console.error(row);
  else console.log(row);
}

export const logger = {
  info: (evt: string, data?: unknown) => write('info', evt, data),
  error: (evt: string, data?: unknown) => write('error', evt, data),
  warn: (evt: string, data?: unknown) => write('info', evt, data),
  debug: (evt: string, data?: unknown) => write('info', evt, data),
  log: (evt: string, data?: unknown) => write('info', evt, data),
};
