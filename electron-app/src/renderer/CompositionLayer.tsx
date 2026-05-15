import type { SceneComposition, SceneSpeakerCluster } from '@vibes/shared/types';

interface Props {
  composition: SceneComposition | null;
}

export function CompositionLayer({ composition }: Props) {
  if (!composition) return null;
  const { zones, caption, tint, accent, speakerCluster } = composition;
  const accentColor = accent ?? 'var(--color-accent)';

  return (
    <>
      {tint && tint.opacity > 0 && (
        <div
          className="composition-tint"
          style={{ background: tint.color, opacity: tint.opacity / 100 }}
        />
      )}
      <div className="composition-zones">
        <Zone name="header" zone={zones.header} />
        <Zone name="center" zone={zones.center} />
        <Zone name="footer" zone={zones.footer} />
      </div>
      {speakerCluster && speakerCluster.items.length > 0 && (
        <div className="composition-cluster-layer">
          <SpeakerClusterLayer cluster={speakerCluster} />
        </div>
      )}
      {caption && caption.text && (
        <div className="composition-caption-layer">
          <div
            className={`composition-caption font-${caption.font}`}
            data-h={caption.h}
            data-v={caption.v}
            style={{ color: caption.color }}
          >
            {(caption.font === 'bebas' ? caption.text.toUpperCase() : caption.text)
              .split('\n')
              .map((line, i) => (
                <div
                  key={i}
                  className={i === 0 ? 'composition-caption-title' : 'composition-caption-body'}
                  style={{
                    fontSize: i === 0 ? `${caption.size}px` : `${Math.round(caption.size * 0.5)}px`,
                  }}
                >
                  {line}
                </div>
              ))}
          </div>
        </div>
      )}
      <div className="composition-frame" style={{ boxShadow: `inset 0 0 0 2px ${accentColor}` }} />
    </>
  );
}

function Zone({
  name,
  zone,
}: {
  name: 'header' | 'center' | 'footer';
  zone: { imageUrl: string | null; position: 'left' | 'center' | 'right' };
}) {
  if (!zone.imageUrl) return <div className={`composition-zone composition-zone-${name}`} />;
  return (
    <div className={`composition-zone composition-zone-${name}`} data-pos={zone.position}>
      <img
        src={zone.imageUrl}
        alt=""
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = 'none';
          void window.log?.error('composition_image_failed', {
            url: zone.imageUrl,
            zone: name,
          });
        }}
      />
    </div>
  );
}

// Renderer-local copy of the cluster layout — kept in sync with the shared
// web component (web/components/SpeakerCluster.tsx). Same arc math.

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
function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '');
}

function SpeakerClusterLayer({ cluster }: { cluster: SceneSpeakerCluster }) {
  const moderator = cluster.items.find((s) => s.role === 'moderator');
  const panel = cluster.items.filter((s) => s.role === 'speaker');
  const sweep = panel.length === 1 ? 0 : 110;
  const start = panel.length === 1 ? 0 : -sweep / 2;
  const step = panel.length <= 1 ? 0 : sweep / (panel.length - 1);

  return (
    <div className="speaker-cluster">
      {moderator && (
        <Node item={moderator} isModerator x={50} y={8} rotate={jitter(moderator.key, 'r', 3)} />
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
        return <Node key={s.key} item={s} x={x} y={y} rotate={jitter(s.key, 'r', 4)} />;
      })}
    </div>
  );
}

function Node({
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
      <div className="speaker-node-photo">
        {item.photoUrl ? (
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
