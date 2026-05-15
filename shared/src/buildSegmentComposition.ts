import type { SceneComposition, Speaker, Segment } from './types.js';

// Build a scene composition from a segment + its speakers.
//
// Mirrors the convention from fond_2026_event.sql: panel speakers get zone
// priority; a moderator never displaces a panelist from a zone — they appear
// only in the caption ("Moderator: <name>").
//
//   1 panel (with photo)        → center zone
//   2 panel (with photo)        → header(left) + center(right)
//   3 panel (with photo)        → header(left) + center(center) + footer(right)
//   4+ panel OR 0 photos        → text-only caption (no zones — fair to all)
//   0 panel + 1 moderator photo → center zone (moderator)
//
// Caption (line by line):
//   1: subtitle (eyebrow — e.g. "PANEL")
//   2: title
//   3: speaker names joined by " · "
//   4: "Moderator: <name>"  (only if moderator + ≥1 panel)
export function buildSegmentComposition(
  segment: Pick<Segment, 'title' | 'subtitle' | 'speakers'>,
  speakers: ReadonlyArray<Speaker>,
): SceneComposition {
  const byId = new Map(speakers.map((s) => [s.id, s] as const));
  const refs = [...segment.speakers].sort((a, b) => a.position - b.position);

  const moderator = refs.find((r) => r.role === 'moderator');
  const panel = refs.filter((r) => r.role === 'speaker');
  const moderatorSpk = moderator ? byId.get(moderator.speakerId) : undefined;
  const panelSpks = panel.map((r) => byId.get(r.speakerId)).filter((s): s is Speaker => !!s);
  const photoedPanel = panelSpks.filter((s) => s.photoUrl);

  const composition: SceneComposition = {
    zones: {
      header: { imageUrl: null, position: 'center' },
      center: { imageUrl: null, position: 'center' },
      footer: { imageUrl: null, position: 'center' },
    },
    caption: null,
    tint: { color: '#000000', opacity: 0.4 },
    accent: null,
  };

  let zonesUsed = false;
  if (photoedPanel.length === 1) {
    composition.zones.center = { imageUrl: photoedPanel[0].photoUrl!, position: 'center' };
    zonesUsed = true;
  } else if (photoedPanel.length === 2) {
    composition.zones.header = { imageUrl: photoedPanel[0].photoUrl!, position: 'left' };
    composition.zones.center = { imageUrl: photoedPanel[1].photoUrl!, position: 'right' };
    zonesUsed = true;
  } else if (photoedPanel.length === 3) {
    composition.zones.header = { imageUrl: photoedPanel[0].photoUrl!, position: 'left' };
    composition.zones.center = { imageUrl: photoedPanel[1].photoUrl!, position: 'center' };
    composition.zones.footer = { imageUrl: photoedPanel[2].photoUrl!, position: 'right' };
    zonesUsed = true;
  } else if (photoedPanel.length === 0 && moderatorSpk?.photoUrl && panel.length === 0) {
    // Moderator alone — give them the spotlight.
    composition.zones.center = { imageUrl: moderatorSpk.photoUrl, position: 'center' };
    zonesUsed = true;
  }

  // Caption.
  const captionLines: string[] = [];
  if (segment.subtitle) captionLines.push(segment.subtitle);
  captionLines.push(segment.title);
  const allNames = [
    ...panelSpks.map((s) => s.name),
    ...(moderatorSpk && panel.length === 0 ? [moderatorSpk.name] : []),
  ];
  if (allNames.length > 0) captionLines.push(allNames.join(' · '));
  if (moderatorSpk && panel.length > 0) captionLines.push(`Moderator: ${moderatorSpk.name}`);

  composition.caption = {
    text: captionLines.join('\n'),
    font: 'bebas',
    size: zonesUsed ? 44 : captionLines.length >= 4 ? 40 : 56,
    color: '#FFFFFF',
    h: 'center',
    v: zonesUsed ? 'bottom' : 'middle',
  };

  return composition;
}
