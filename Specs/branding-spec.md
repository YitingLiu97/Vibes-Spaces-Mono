# Vibes Spaces — Branding & Design Spec

The design system for Vibes Spaces. Covers brand foundations, human-centric design principles for live-event use, the visual token system, component patterns, the in-product attribution overlay, microcopy, and accessibility.

This spec is **opinionated about principles and patterns**, **agnostic about specific brand assets**. Where colors, fonts, or wordmarks are referenced, starter values are given as CSS custom properties; override with your existing brand guide (`yitingliu.com` / Vibes Studio identity).

The single hardest design constraint here: **the operator using the dashboard at an event is under stress, holding a phone, glancing at it between conversations.** Every decision in this spec serves that moment.

---

## 1. Brand foundations

### Where Spaces sits in the Vibes family

- **Vibes Studio** — creator tool. The artist's instrument. Expressive, dense, capable.
- **Vibes Spaces** — venue product. The operator's control surface. Calm, glanceable, forgiving.
- **Vibescape Worlds** — spatial experiences (separate product, separate codebase).

All three share the wordmark, color foundations, and voice. They differ in *information density* and *interaction tempo*. Studio is a workshop. Spaces is a thermostat.

### Voice

Vibes' voice is **calm, generous, and specific**.

- **Calm:** the product is built around ambient atmospheres; the UI should feel ambient too. Avoid exclamation points. Avoid "Awesome!" "Great!" toasts. Confirmation can just *be* the change, with a soft signal.
- **Generous:** never punish the operator. Invalid forms don't shame; they suggest. Empty states don't apologize; they invite.
- **Specific:** "Scene synced" is better than "Saved." "Client offline for 2 minutes" is better than "Connection issue." Specificity is care.

What Vibes is *not*: hype-y, clinical, sterile, corporate. The brand is closer to a thoughtful gallery wall text than a SaaS dashboard.

### Spaces' tone vs. Studio's tone

| | Studio | Spaces |
|---|---|---|
| Information density | High | Low |
| Color | Expressive, full spectrum | Restrained, mostly neutral |
| Motion | Reactive, real-time | Slow, calm, predictable |
| Microcopy | Playful, descriptive | Direct, scannable |
| Defaults | Open, exploratory | Safe, low-stakes |

Spaces should feel like the room itself when it's working: present but not loud.

---

## 2. Human-centric design principles

These are the seven principles every Spaces design decision answers to.

### 1. The glance test
**Every screen must be readable in one second from arm's length.** The Now tab is the canonical case: the operator looks at the phone between conversations, eyes don't fully refocus, scans for green/red and the scene name. If that takes more than a second, the design has failed.

Implications: large type for primary status (48px+ on mobile for the current scene name). High contrast. One dominant element per screen. No competing visual weight.

### 2. The one-thumb test
**Every primary action must be reachable with the operator's thumb while holding the phone.** This means bottom 2/3 of the screen for buttons, big touch targets (44×44px minimum), full-width primary actions on mobile.

Implications: form modals open from the bottom, not the center. "Resume schedule" button is the full width of the Now tab. Schedule add dialog has scroll-locked CTAs at the bottom.

### 3. Calm under pressure
**When something goes wrong at the event, the UI must become *more* legible, not less.** Errors don't shake; they fade in and persist. Failed heartbeats don't blink red; they go red and stay there with a timestamp.

Implications: no jittery animations. Error states are flat, high-contrast, and *explain themselves* without expanding accordions or follow-up clicks. The Now tab survives a complete client outage by showing the last-known scene + offline duration prominently.

### 4. Honest signals
**The interface never lies about state.** Green dot = client confirmed alive within 30 seconds, not "we hope so." Amber = heartbeat delayed (data is real, but recent). Red = no heartbeat in 90+ seconds.

This is a brand commitment, not just a UX rule. Vibes' aesthetic is honest; the UI honors that.

Implications: heartbeat status is computed live from `last_heartbeat_at`, never cached optimistically. Toasts say "Will apply when client reconnects" instead of "Done" when the client is offline.

### 5. Forgiving paths
**Every destructive or surprising action has a clear undo or confirm.** Force-play feels significant (it overrides the schedule) — so it requires a confirmation and creates a visible state badge. Delete needs confirm. Resume schedule is one tap from anywhere on the Now tab.

Implications: `confirm()` modals for destructive actions in v0 (good enough); v0.1 upgrade to in-product confirmation cards. Toast notifications include an "Undo" button where applicable.

### 6. No surprises
**Every change the operator makes is acknowledged within 200ms.** Upload starts → progress indicator. Force-play tap → toast + Now-tab banner appears. Delete → row removes from list with a fade.

Latency is the enemy of trust at events. If something feels slow, it feels broken.

Implications: optimistic updates for everything possible (delete a row in UI immediately, roll back on error). Loading skeletons for anything that takes >200ms. Real-time-feeling polling on the Now tab (5s).

### 7. Inclusive by default
- Color contrast meets **WCAG AA minimum** (4.5:1 for body text, 3:1 for large text and UI components)
- Never communicate state through **color alone** (heartbeat dot has color + icon + text label)
- All interactive elements have **visible focus states** for keyboard navigation
- Motion respects **`prefers-reduced-motion`**
- All inputs have associated labels
- Touch targets minimum **44×44px** (Apple HIG and WCAG 2.5.5)
- Body text minimum **16px** (no zoom required on mobile)

---

## 3. Visual system

### Color tokens

Starter palette. Override `--color-accent` with your brand color from the existing Vibes guide. The neutrals and semantic colors below are tuned for the dark-default UI but include light variants for accessibility.

```css
/* shared/src/tokens.css — imported by both apps */
:root {
  /* Backgrounds */
  --color-bg-base: #0a0a0b;         /* near-black, never pure #000 — too harsh */
  --color-bg-elevated: #15151a;     /* cards, modals */
  --color-bg-overlay: rgba(255, 255, 255, 0.04);   /* hover, subtle highlight */
  --color-bg-pressed: rgba(255, 255, 255, 0.08);

  /* Foregrounds */
  --color-fg-primary: #f0ede8;      /* warm off-white, kinder than pure white */
  --color-fg-secondary: #a8a39c;    /* muted body text */
  --color-fg-tertiary: #6e6962;     /* deep mute, captions, timestamps */
  --color-fg-on-accent: #ffffff;

  /* Brand accent — placeholder; override with Vibes brand color */
  --color-accent: #7c5cff;          /* a calm violet that pairs with psybient aesthetic */
  --color-accent-soft: rgba(124, 92, 255, 0.16);
  --color-accent-hover: #8d70ff;

  /* Semantic — desaturated to feel calm, not loud */
  --color-success: #4ade80;
  --color-success-soft: rgba(74, 222, 128, 0.12);
  --color-warning: #f5b942;
  --color-warning-soft: rgba(245, 185, 66, 0.14);
  --color-danger: #e26b6b;          /* not pure red — softer, less alarming */
  --color-danger-soft: rgba(226, 107, 107, 0.14);

  /* Borders */
  --color-border-subtle: rgba(255, 255, 255, 0.08);
  --color-border-default: rgba(255, 255, 255, 0.14);
  --color-border-strong: rgba(255, 255, 255, 0.24);
  --color-border-focus: var(--color-accent);
}

/* Light mode (v0.1 — dark is canonical) */
@media (prefers-color-scheme: light) {
  :root {
    --color-bg-base: #faf9f7;
    --color-bg-elevated: #ffffff;
    --color-fg-primary: #14131a;
    --color-fg-secondary: #4a4640;
    --color-fg-tertiary: #807a72;
    /* ... etc */
  }
}
```

Token export for non-CSS consumers (Electron renderer can also use these):

```typescript
// shared/src/tokens.ts
export const colors = {
  bg: { base: '#0a0a0b', elevated: '#15151a' /* ... */ },
  fg: { primary: '#f0ede8', secondary: '#a8a39c' /* ... */ },
  accent: '#7c5cff',
  success: '#4ade80',
  warning: '#f5b942',
  danger: '#e26b6b',
} as const;
```

### Color usage rules

- **Brand accent (`--color-accent`) is rare on purpose.** Use it only for: primary CTAs, the active state of the current navigation tab, the focused input ring. If it appears more than three times on a single screen, something is wrong.
- **Body text is `--color-fg-primary`. Captions and metadata are `--color-fg-secondary`.** Never use the accent for body text.
- **Semantic colors are for *state*, never for emphasis.** Don't make a button red because it's important; make it red because it's destructive.
- **Borders default to `--color-border-subtle`.** Hierarchy comes from spacing, not from heavier borders.

### Typography

```css
:root {
  /* Stack — override --font-display with Vibes brand font when available */
  --font-display: 'YourBrandDisplay', 'Inter', system-ui, sans-serif;
  --font-body: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Menlo', monospace;

  /* Scale — modular, generous */
  --text-xs: 12px;   /* timestamps, badges */
  --text-sm: 14px;   /* secondary UI */
  --text-base: 16px; /* body — minimum, never smaller */
  --text-lg: 18px;
  --text-xl: 22px;
  --text-2xl: 28px;
  --text-3xl: 36px;
  --text-4xl: 48px;  /* Now tab "current scene name" on mobile */
  --text-5xl: 64px;  /* Now tab on desktop */

  /* Weights — sparse, restrained */
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  /* Bold is for the wordmark only; the UI doesn't need it */

  /* Line heights */
  --leading-tight: 1.2;   /* headlines */
  --leading-normal: 1.5;  /* body */
  --leading-relaxed: 1.7; /* long-form, empty states */
}
```

**Type usage rules:**
- Display font (`--font-display`) is for the Vibes wordmark, hero headlines, and the Now tab's "current scene name." Nowhere else.
- Body font (`--font-body`) is everything else.
- Mono font (`--font-mono`) is for technical readouts: timestamps in the log viewer, scene IDs in debug panes, version strings.
- Set `font-feature-settings: "ss01", "cv11"` if using Inter — its single-story `a` and `g` are calmer.
- Avoid italic. Avoid all-caps headers except for small uppercase labels (badges, section eyebrows at 11px, +0.08em letter-spacing).

### Spacing

A 4px base scale. Generous by default — the design breathes.

```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 48px;
  --space-8: 64px;
  --space-9: 96px;
}
```

Rules of thumb:
- Page padding on mobile: `--space-5` (24px) horizontal, `--space-6` (32px) vertical
- Form input vertical rhythm: `--space-4` (16px) between fields, `--space-5` (24px) between groups
- Card padding: `--space-5` (24px)
- Buttons: `--space-3` (12px) vertical padding, `--space-5` (24px) horizontal — gives a 44px touch target

### Radii

```css
:root {
  --radius-sm: 4px;    /* badges, tags */
  --radius-md: 8px;    /* buttons, inputs */
  --radius-lg: 12px;   /* cards, modals */
  --radius-xl: 20px;   /* hero containers */
  --radius-full: 9999px; /* pills, the heartbeat dot, avatars */
}
```

### Motion

```css
:root {
  --motion-duration-fast: 120ms;     /* hover transitions */
  --motion-duration-default: 200ms;  /* state changes */
  --motion-duration-slow: 400ms;     /* modals, larger movements */
  --motion-duration-scene: 1000ms;   /* the video crossfade — matches the player */

  --motion-easing-default: cubic-bezier(0.2, 0, 0.2, 1);   /* fast start, gentle end */
  --motion-easing-emphasize: cubic-bezier(0.3, 0, 0, 1);   /* for important transitions */
  --motion-easing-enter: cubic-bezier(0, 0, 0.2, 1);
  --motion-easing-exit: cubic-bezier(0.4, 0, 1, 1);
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Motion rules:**
- The heartbeat dot's green-pulse is the *only* continuous animation in the UI. Everything else is event-driven.
- Modals enter from the bottom (mobile) or fade-and-scale-from-98% (desktop). Both use `--motion-duration-slow`.
- Toasts slide up from bottom, `--motion-duration-default`.
- Force-play activation: the Now tab's "FORCED" banner does NOT shake or bounce — it fades in, then stays. Calm under pressure.
- Never animate the wordmark.

### Iconography

Use **Lucide** (already in shadcn) for consistency. Stroke width 1.5 (calmer than default 2). Size matches text: `--text-base` icon = 16px.

Reserved icons:
- `Play` — force-play action
- `RotateCcw` — resume schedule
- `Upload` — scene upload
- `Trash` — delete (red on hover only, never red at rest)
- `Sparkles` — Generate from reference (disabled state)
- `Circle` (filled) — heartbeat dot
- `AlertCircle` — error states (paired with `--color-danger`)
- `Check` — confirmation toasts

---

## 4. Component patterns

### Status: the heartbeat dot

The single most important visual in the product. Lives in the Now tab top-left.

```tsx
// components/HeartbeatDot.tsx
interface Props {
  health: 'green' | 'amber' | 'red';
  lastHeartbeatAt: Date | null;
}

export function HeartbeatDot({ health, lastHeartbeatAt }: Props) {
  const colors = {
    green: { fill: 'var(--color-success)', label: 'Online' },
    amber: { fill: 'var(--color-warning)', label: 'Delayed' },
    red:   { fill: 'var(--color-danger)',  label: 'Offline' },
  };
  const { fill, label } = colors[health];

  return (
    <div className="flex items-center gap-2">
      <span
        className="relative inline-block w-3 h-3 rounded-full"
        style={{ background: fill }}
        aria-hidden
      >
        {health === 'green' && (
          <span
            className="absolute inset-0 rounded-full animate-pulse-soft"
            style={{ background: fill, opacity: 0.6 }}
          />
        )}
      </span>
      <span className="text-sm font-medium" style={{ color: 'var(--color-fg-primary)' }}>
        {label}
      </span>
      {lastHeartbeatAt && health !== 'green' && (
        <span className="text-xs" style={{ color: 'var(--color-fg-tertiary)' }}>
          last seen {timeAgo(lastHeartbeatAt)}
        </span>
      )}
    </div>
  );
}
```

```css
@keyframes pulse-soft {
  0%, 100% { transform: scale(1); opacity: 0.6; }
  50% { transform: scale(1.8); opacity: 0; }
}
.animate-pulse-soft {
  animation: pulse-soft 2s var(--motion-easing-default) infinite;
}
```

The pulse is the *only* continuous animation. It's calming — a heartbeat — not attention-seeking. Stops on amber and red.

**Critical:** the dot is paired with a text label always. Color-blind users get the same info.

### The Now tab — hero layout

This is the screen the operator sees most during events. Maximize legibility.

Layout (mobile, top to bottom):
1. **Heartbeat dot row** (~32px tall) — small, top-left
2. **"Now playing" eyebrow** (12px, uppercase, +0.08em letter-spacing, tertiary color)
3. **Current scene name** (48px on mobile, 64px on desktop, display font, primary color)
4. **Source badge** (small, rounded-full, soft accent or warning background)
5. **Force-play banner** (only visible when forced) — full-width card with explanation + Resume button
6. **Quick scene jumper** (horizontal scroll of scene cards with Play-now buttons) — added in v0.1; deferred for v0

### Primary action: Force-play button

```tsx
<Button
  onClick={() => forcePlay(scene.id, scene.name)}
  variant="ghost"
  size="sm"
  className="gap-2"
>
  <Play className="w-4 h-4" />
  Play now
</Button>
```

Visual weight: **ghost variant** by default (not a primary CTA — destructive in spirit). On hover, fill with `--color-accent-soft`. The actual primary action of a scene card is *previewing* or *editing*, not playing.

When tapped:
1. `confirm()` modal: "Force-play 'Calm focus' until you tap Resume?" (v0)
2. On confirm: optimistic UI update (the scene gets a "FORCED" badge immediately)
3. Toast: "Now forcing: Calm focus" with Undo button
4. The Now tab banner appears on next 5s poll

### Destructive action: Delete + Resume

Delete uses the danger color **only on hover** at rest, the trash icon is `--color-fg-tertiary`. This avoids the dashboard feeling alarming.

Resume schedule is a *neutral* action visually (default button) even though it changes state — because it returns the system to normal, which is calming, not alarming.

### Forms: schedule add dialog

Full-screen modal on mobile (slides up from bottom). Centered, max-width 480px on desktop.

Field rhythm:
- **Target** (scene or playlist) — first, because everything else depends on it
- **Time window** (start, end) — second
- **Recurrence** (weekly or one-off) — third
- **Days or date** — fourth, conditional on recurrence

CTAs at the bottom, always visible (sticky on mobile):
- Primary: **Add to schedule** (accent background, full-width on mobile)
- Secondary: **Cancel** (ghost, smaller)

Validation:
- Inline error below the field, never a top banner
- Errors appear on blur, not on every keystroke
- Submit button disabled only when truly invalid; otherwise let people try and fail with a clear message

### Empty states

Three lines, never more:
1. **What's missing** (one sentence, neutral tone)
2. **Why it matters** (one sentence, optional)
3. **What to do** (a single CTA)

Example for the Scenes tab when empty:
> No scenes yet.
> Upload a video to start building your schedule.
> **[ Upload scene ]**

Tone is invitational, not apologetic. Never "Oops!" or "It looks like..." — just say what's true.

### Loading states

- **<200ms expected:** no indicator. Acting is faster than acknowledging.
- **200ms–1s:** subtle indicator on the action button (spinner replaces icon).
- **1s+:** skeleton placeholder for content area. Never a centered spinner — those feel like waiting; skeletons feel like building.

### Error states

- **Inline** for form fields and field-specific errors
- **Toast** for transient errors (failed save, retry-able)
- **Banner** at the top of the section for sustained errors (Supabase unreachable, persists across navigation)

Error copy template: "{What failed}. {What you can do.}"
- Bad: "Error saving"
- Good: "Couldn't save changes. Check your connection and try again."

---

## 5. The Vibes attribution overlay

The in-product wordmark that appears on the venue display during playback. This is both a brand asset and a product feature — operators can toggle it.

### Specs

- **Position:** bottom-right of the display, 16px from each edge
- **Font:** `--font-display`, regular weight, **not bold**
- **Size:** 14px on 1080p displays, 18px on 4K (scales by display height)
- **Color:** `--color-fg-primary` with 50% opacity (`rgba(240, 237, 232, 0.5)`)
- **Background:** none — overlays directly on the video
- **Animation:** fades in/out with the scene crossfade (matches `--motion-duration-scene`). Never pops on or off.
- **Hide conditions:** `org_settings.attribution_enabled = false` OR `scenes.hide_attribution = true`

### Why these specs

- 50% opacity is the highest legibility/lowest distraction tradeoff against varied video content. On dark scenes it reads cleanly; on bright scenes it recedes.
- Bottom-right is the standard broadcast position — viewers' eyes are pre-trained to ignore it during content and find it when curious.
- Fading with the crossfade ties the brand to the *experience*, not to a static UI overlay.
- Per-scene hide is essential for sponsor cards — never compete with someone else's logo.

### Implementation (Electron renderer)

```tsx
{attributionVisible && (
  <div
    className="vibes-wordmark"
    aria-hidden  // not for screen readers — it's a visual signature
  >
    Vibes
  </div>
)}
```

```css
.vibes-wordmark {
  position: fixed;
  right: 16px;
  bottom: 16px;
  font-family: var(--font-display);
  font-size: clamp(14px, 1.5vw, 22px);
  font-weight: var(--font-weight-regular);
  color: rgba(240, 237, 232, 0.5);
  pointer-events: none;
  user-select: none;
  transition: opacity var(--motion-duration-scene) var(--motion-easing-default);
}
```

For the actual wordmark glyphs, replace with your existing Vibes logotype (SVG ideal). The CSS above assumes a typographic wordmark.

---

## 6. Microcopy guidelines

Voice in action. Apply these patterns; don't make people read the brand doc to write a button label.

### Buttons

- **Verb-first.** "Add scene" not "New scene". "Play now" not "Play".
- **Specific objects.** "Resume schedule" not "Resume". "Delete scene" not "Delete".
- **No "Please".** It's softer in spoken language, weaker in UI. "Confirm your email" not "Please confirm your email."

### Confirmations

- **State what changed, not that you did the changing.**
  - Bad: "Successfully saved"
  - Good: "Scene synced"
- **Past tense for what's done; present for what's happening.**
  - "Uploaded" (toast on success)
  - "Uploading…" (in-progress button state)

### Errors

- **Always actionable.** Tell the operator what to do, not just what went wrong.
- **Quantify time.** "Client offline for 2 minutes" not "Client offline."
- **Avoid blame language.** "Couldn't reach Supabase" not "Failed to connect" — failure implies someone failed.

### Empty states

- **Invitational, not apologetic.**
  - Bad: "No scenes yet. Why don't you upload one?"
  - Good: "No scenes yet. Upload a video to start."

### Confirmations for destructive actions

- **Name the thing.** "Delete 'Calm focus'?" not "Delete this scene?"
- **State consequence.** "This can't be undone." (Only if true.)
- **CTAs are honest verbs.** "Delete" / "Cancel". Not "Yes" / "No". Not "OK" / "Cancel".

### Sensitive moments

When the client goes offline mid-event:
- **Banner:** "Client offline since 2:14pm. Last scene: Calm focus. Changes you make here will apply when it reconnects."

That sentence does four things: states the fact, anchors in time, names the last-known state, and reassures the operator that their work isn't wasted. That's the voice.

---

## 7. Accessibility checklist

Every screen must pass:

- [ ] Contrast: body text ≥ 4.5:1, large text ≥ 3:1, interactive UI ≥ 3:1
- [ ] No state communicated by color alone (always color + icon + text)
- [ ] All form fields have visible labels (not just placeholders)
- [ ] Focus indicators visible on all interactive elements (`--color-border-focus` outline)
- [ ] Touch targets ≥ 44×44px
- [ ] Body text ≥ 16px (so iOS Safari doesn't auto-zoom on focus)
- [ ] Heading levels semantic and sequential (no `<h1>` then `<h3>`)
- [ ] All images have alt text (decorative images `alt=""`, meaningful images describe content)
- [ ] All icon-only buttons have `aria-label`
- [ ] Motion respects `prefers-reduced-motion`
- [ ] Modals trap focus and close on Escape
- [ ] Toasts are announced via `role="status"` (polite)
- [ ] Critical errors via `role="alert"` (assertive)
- [ ] Tab order is logical (mostly top-to-bottom, left-to-right)

Test with: VoiceOver on iPhone (the actual event device), keyboard-only navigation on desktop, Chrome's "Emulate vision deficiencies" (achromatopsia + tritanopia minimum).

---

## 8. Spaces-specific design notes

A few patterns unique to this product's live-event context.

### The 5-second rule for the Now tab

If the operator is at the venue, looking at their phone, and the system is healthy — they should be able to look away within **5 seconds**, having confirmed everything's fine. If they need to read more than two pieces of information (dot color + scene name), the design is over-built.

Inversely, if something's wrong, they should know within 5 seconds: red dot + error message visible above the fold without scrolling.

### Force-play badge contagion

When force-play is active, the FORCED badge appears in three places simultaneously:
1. Now tab (large banner)
2. The scene card on the Scenes tab (small badge in the corner)
3. The favicon (small dot — v0.1; nice to have)

The badge is the same visual everywhere: `--color-warning-soft` background, `--color-warning` text, small caps "FORCED" with the duration ("FORCED 3M"). Visual continuity across tabs reduces the operator's cognitive load when switching.

### The 30-second latency cue

The client polls every 30 seconds. After any dashboard change, show a subtle cue: "Syncing to venue…" appearing as a small note for ~30 seconds, then resolving to a checkmark when the next heartbeat confirms the change. This makes the latency *felt* rather than mysterious.

### "Generate from reference" — the disabled state that sells

This button is intentionally disabled but visible. Design specs:
- Same styling as enabled buttons (don't dim it to invisibility)
- A small "Soon" badge in the corner
- Sparkle icon (`Sparkles` from Lucide), pulsing very subtly (1.5s cycle, opacity 0.7 ↔ 1.0)
- On click: toast announcement (calm, not hype-y) + log to `feature_interest`

The sparkle pulse signals "magic is coming." The toast captures intent. The disabled-but-present pattern is doing two jobs: setting expectations and gathering demand data.

---

## 9. Where this spec lives

This document is the canonical design system for Vibes Spaces. The dashboard and client specs reference it for visual specifics. When in doubt, principle 1–7 in section 2 are the constitution; the visual tokens in section 3 are the rule book; the components in section 4 are the precedent.

When a new pattern is needed, add it here first. Then build it.

When a token changes, change it in `shared/src/tokens.ts` and `shared/src/tokens.css`. Both apps consume from there.

When the voice feels off in a piece of microcopy, reread section 1: calm, generous, specific.
