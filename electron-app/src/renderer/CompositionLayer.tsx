import type { SceneComposition } from '@vibes/shared/types';

interface Props {
  composition: SceneComposition | null;
}

export function CompositionLayer({ composition }: Props) {
  if (!composition) return null;
  const { zones, caption, tint, accent } = composition;
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
      {caption && caption.text && (
        <div className="composition-caption-layer">
          <div
            className={`composition-caption font-${caption.font}`}
            data-h={caption.h}
            data-v={caption.v}
            style={{ fontSize: `${caption.size}px`, color: caption.color }}
          >
            {caption.font === 'bebas' ? caption.text.toUpperCase() : caption.text}
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
