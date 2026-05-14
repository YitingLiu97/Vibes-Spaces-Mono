import type { HeartbeatHealth } from './types.js';

export const HEARTBEAT_GREEN_MAX_MS = 30_000;
export const HEARTBEAT_AMBER_MAX_MS = 90_000;

export function heartbeatHealth(
  lastHeartbeatAt: Date | string | null,
  now: Date = new Date(),
): HeartbeatHealth {
  if (!lastHeartbeatAt) return 'unknown';
  const last = typeof lastHeartbeatAt === 'string' ? new Date(lastHeartbeatAt) : lastHeartbeatAt;
  const elapsed = now.getTime() - last.getTime();
  if (elapsed < HEARTBEAT_GREEN_MAX_MS) return 'green';
  if (elapsed < HEARTBEAT_AMBER_MAX_MS) return 'amber';
  return 'red';
}

export function timeAgo(date: Date | string, now: Date = new Date()): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const seconds = Math.max(0, Math.floor((now.getTime() - d.getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
