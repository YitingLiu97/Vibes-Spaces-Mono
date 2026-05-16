'use client';

import type { SceneSpeakerCluster } from '@vibes/shared/types';

// Renders the circular speaker arc — moderator at the apex, panelists fanning
// on an arc below. Used both on the Segments page card and as a layer inside
// CompositionLayer so the same branded look appears on top of the scene video.

interface Props {
  cluster: SceneSpeakerCluster;
}

function hash(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h;
}

function jitter(key: string, salt: string, range: number): number {
  const h = hash(key + salt);
  return ((h % 1000) / 1000 - 0.5) * 2 * range;
}

// Logo nodes (brand marks) need contain-fit + an inset background; speaker
// headshots want the default crop-to-circle. Match both relative seed paths
// and the absolute Supabase Storage URLs used by the FOND 2026 reel.
function isLogoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes('/logos/') || url.includes('/overlay-images/');
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '');
}

export function SpeakerCluster({ cluster }: Props) {
  const moderator = cluster.items.find((s) => s.role === 'moderator');
  const panel = cluster.items.filter((s) => s.role === 'speaker');

  // Arc placement: 0° = top, sweep -55° to +55° across panel speakers.
  const sweep = panel.length === 1 ? 0 : 110;
  const start = panel.length === 1 ? 0 : -sweep / 2;
  const step = panel.length <= 1 ? 0 : sweep / (panel.length - 1);

  return (
    <div className="speaker-cluster">
      {moderator && (
        <SpeakerNode
          item={moderator}
          isModerator
          x={50}
          y={32}
          rotate={jitter(moderator.key, 'r', 3)}
        />
      )}
      {panel.map((s, i) => {
        const angleDeg = start + step * i;
        const angleRad = (angleDeg * Math.PI) / 180;
        const cx = 50;
        const cy = moderator ? 78 : 55;
        const rx = panel.length <= 2 ? 22 : 32;
        const ry = panel.length <= 2 ? 10 : 14;
        const x = cx + Math.sin(angleRad) * rx + jitter(s.key, 'x', 1.5);
        const y = cy - Math.cos(angleRad) * ry + jitter(s.key, 'y', 2);
        return (
          <SpeakerNode key={s.key} item={s} x={x} y={y} rotate={jitter(s.key, 'r', 4)} />
        );
      })}
    </div>
  );
}

function SpeakerNode({
  item,
  isModerator,
  x,
  y,
  rotate,
}: {
  item: SceneSpeakerCluster['items'][number];
  isModerator?: boolean;
  x: number;
  y: number;
  rotate: number;
}) {
  return (
    <div
      className={`speaker-node${isModerator ? ' speaker-node--moderator' : ''}`}
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: `translate(-50%, -50%) rotate(${rotate}deg)`,
      }}
    >
      <div
        className={`speaker-node-photo${isLogoUrl(item.photoUrl) ? ' speaker-node-photo--logo' : ''}`}
      >
        {item.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.photoUrl}
            alt=""
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="speaker-node-initials">{initials(item.name)}</div>
        )}
      </div>
      <div className="speaker-node-name">{item.name}</div>
      {isModerator && <div className="speaker-node-tag">Moderator</div>}
    </div>
  );
}
