export const colors = {
  bg: {
    base: '#141418',
    elevated: '#1c1c22',
    overlay: 'rgba(240, 234, 245, 0.04)',
    pressed: 'rgba(240, 234, 245, 0.08)',
  },
  fg: {
    primary: '#F0EAF5',
    secondary: '#a8a0b3',
    tertiary: '#6e6878',
    onAccent: '#141418',
  },
  accent: '#C07FD4',
  accentSoft: 'rgba(192, 127, 212, 0.16)',
  accentHover: '#D4A0E8',
  success: '#88d49a',
  successSoft: 'rgba(136, 212, 154, 0.14)',
  warning: '#f5b942',
  warningSoft: 'rgba(245, 185, 66, 0.14)',
  danger: '#e26b6b',
  dangerSoft: 'rgba(226, 107, 107, 0.14)',
  border: {
    subtle: 'rgba(240, 234, 245, 0.08)',
    default: 'rgba(240, 234, 245, 0.14)',
    strong: 'rgba(240, 234, 245, 0.24)',
  },
} as const;

export const space = {
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '24px',
  6: '32px',
  7: '48px',
  8: '64px',
  9: '96px',
} as const;

export const radius = {
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '20px',
  full: '9999px',
} as const;

export const motion = {
  durationFast: '120ms',
  durationDefault: '200ms',
  durationSlow: '400ms',
  durationScene: '1000ms',
  easingDefault: 'cubic-bezier(0.2, 0, 0.2, 1)',
  easingEmphasize: 'cubic-bezier(0.3, 0, 0, 1)',
  easingEnter: 'cubic-bezier(0, 0, 0.2, 1)',
  easingExit: 'cubic-bezier(0.4, 0, 1, 1)',
} as const;

export const text = {
  xs: '12px',
  sm: '14px',
  base: '16px',
  lg: '18px',
  xl: '22px',
  '2xl': '28px',
  '3xl': '36px',
  '4xl': '48px',
  '5xl': '64px',
} as const;

export const fonts = {
  display: "'Bebas Neue', 'Inter', system-ui, sans-serif",
  serif: "'DM Serif Display', 'Cormorant Garamond', serif",
  body: "'Space Mono', 'JetBrains Mono', monospace",
  mono: "'Space Mono', 'JetBrains Mono', monospace",
} as const;

export type ColorToken = keyof typeof colors;
