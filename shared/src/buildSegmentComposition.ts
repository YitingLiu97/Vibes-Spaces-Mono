import type { SceneComposition, Speaker, Segment } from './types.js';

// Build a scene composition from a segment + its speakers.
//
// The speakers become a circular cluster overlaid on the video: moderator at
// the apex, panelists fanned out on an arc below. The caption carries the
// editorial framing — subtitle (eyebrow) and title — but not the names, since
// each photo already labels itself.
export function buildSegmentComposition(
  segment: Pick<Segment, 'title' | 'subtitle' | 'speakers'>,
  speakers: ReadonlyArray<Speaker>,
): SceneComposition {
  const byId = new Map(speakers.map((s) => [s.id, s] as const));
  const refs = [...segment.speakers].sort((a, b) => a.position - b.position);

  const items = refs
    .map((r) => {
      const sp = byId.get(r.speakerId);
      if (!sp) return null;
      return {
        photoUrl: sp.photoUrl,
        name: sp.name,
        role: r.role,
        key: sp.id,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const captionLines: string[] = [];
  if (segment.subtitle) captionLines.push(segment.subtitle);
  captionLines.push(segment.title);

  return {
    zones: {
      header: { imageUrl: null, position: 'center' },
      center: { imageUrl: null, position: 'center' },
      footer: { imageUrl: null, position: 'center' },
    },
    caption: {
      text: captionLines.join('\n'),
      font: 'bebas',
      size: 48,
      color: '#F0EAF5',
      h: 'center',
      v: 'bottom',
    },
    tint: { color: '#000000', opacity: 40 },
    accent: null,
    speakerCluster: items.length > 0 ? { items } : null,
  };
}
