'use client';

import { Circle } from 'lucide-react';
import type { HeartbeatHealth } from '@vibes/shared/types';
import { timeAgo } from '@vibes/shared/health';

interface Props {
  health: HeartbeatHealth;
  lastHeartbeatAt: Date | string | null;
}

const config: Record<HeartbeatHealth, { color: string; label: string }> = {
  green: { color: 'var(--color-success)', label: 'Online' },
  amber: { color: 'var(--color-warning)', label: 'Delayed' },
  red: { color: 'var(--color-danger)', label: 'Offline' },
  unknown: { color: 'var(--color-fg-tertiary)', label: 'Unknown' },
};

export function HeartbeatDot({ health, lastHeartbeatAt }: Props) {
  const { color, label } = config[health];

  return (
    <div className="flex items-center gap-2">
      <span
        className="relative inline-block h-3 w-3 rounded-full"
        style={{ background: color }}
        aria-hidden
      >
        {health === 'green' && (
          <span
            className="absolute inset-0 rounded-full animate-pulse-soft"
            style={{ background: color, opacity: 0.6 }}
          />
        )}
      </span>
      <Circle className="sr-only" aria-hidden="true" />
      <span className="text-sm font-medium text-fg-primary">{label}</span>
      {lastHeartbeatAt && health !== 'green' && (
        <span className="text-xs text-fg-tertiary">last seen {timeAgo(lastHeartbeatAt)}</span>
      )}
    </div>
  );
}
