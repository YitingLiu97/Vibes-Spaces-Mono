// Event-level branding constants for Future of NYC Design.
//
// The composition JSON only stores a boolean toggle (SceneBranding.enabled);
// the actual logo / wordmark / website live here so both renderers (web
// preview + Electron client) display the same lockup without duplicating
// strings or paths.
//
// To change the asset, drop a new file at web/public/logos/fond.svg (or
// update FOND_BRANDING.logoUrl to point elsewhere).

export const FOND_BRANDING = {
  logoUrl: '/logos/fond.svg',
  wordmark: 'Future of NYC Design',
  website: 'futureofnycdesign.com',
  // Persistent stream-overlay frame — rendered on every scene above the video
  // and tint, below the accent frame. Lives at /public/fixed/ so it can be
  // swapped without redeploying. The header is a static graphic; the footer
  // is a looping muted video ticker.
  headerImageUrl: '/fixed/fond-header.png',
  footerVideoUrl: '/fixed/fond-footer-ticker.webm',
  // Event-level visibility flags. Each scene's branding.enabled gates the
  // whole lockup; these gate the individual pieces inside it. Flip a flag
  // here to hide that piece across every scene + both renderers.
  showHeader: true,
  showFooter: true,
  // Header strip is the only thing in the top band — the logo + wordmark
  // already live inside the strip graphic, so the lockup duplicates them.
  showLogo: false,
  showUrl: false,
} as const;
