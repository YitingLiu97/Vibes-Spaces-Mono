'use client';

import type { SceneComposition } from '@vibes/shared/types';
import { FOND_BRANDING } from '@vibes/shared/fondBranding';
import { SpeakerCluster } from './SpeakerCluster';

interface Props {
  composition: SceneComposition | null;
}

export function CompositionLayer({ composition }: Props) {
  if (!composition) return null;

  const { zones, caption, tint, accent, speakerCluster, branding } = composition;
  const accentColor = accent ?? 'var(--color-accent)';

  return (
    <>
      {tint && tint.opacity > 0 && (
        <div
          className="composition-tint"
          style={{
            background: tint.color,
            opacity: tint.opacity / 100,
          }}
        />
      )}
      {branding?.enabled && (
        <>
          {FOND_BRANDING.showHeader && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="composition-fond-header"
              src={FOND_BRANDING.headerImageUrl}
              alt=""
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
          {FOND_BRANDING.showFooter && (
            <video
              className="composition-fond-footer"
              src={FOND_BRANDING.footerVideoUrl}
              autoPlay
              muted
              loop
              playsInline
              onError={(e) => {
                (e.currentTarget as HTMLVideoElement).style.display = 'none';
              }}
            />
          )}
          {(FOND_BRANDING.showLogo || FOND_BRANDING.showUrl) && (
            <div className="composition-branding">
              {FOND_BRANDING.showLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className="composition-branding-logo"
                  src={FOND_BRANDING.logoUrl}
                  alt={FOND_BRANDING.wordmark}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <span />
              )}
              {FOND_BRANDING.showUrl && (
                <span className="composition-branding-url">{FOND_BRANDING.website}</span>
              )}
            </div>
          )}
        </>
      )}
      <div className="composition-zones">
        <Zone name="header" zone={zones.header} />
        <Zone name="center" zone={zones.center} />
        <Zone name="footer" zone={zones.footer} />
      </div>
      {speakerCluster && speakerCluster.items.length > 0 && (
        <div className="composition-cluster-layer">
          <SpeakerCluster cluster={speakerCluster} />
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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={zone.imageUrl}
        alt=""
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = 'none';
        }}
      />
    </div>
  );
}
