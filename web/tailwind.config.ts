import type { Config } from 'tailwindcss';
import { colors, space, radius } from '@vibes/shared/tokens';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          base: colors.bg.base,
          elevated: colors.bg.elevated,
          overlay: colors.bg.overlay,
          pressed: colors.bg.pressed,
        },
        fg: {
          primary: colors.fg.primary,
          secondary: colors.fg.secondary,
          tertiary: colors.fg.tertiary,
          'on-accent': colors.fg.onAccent,
        },
        accent: {
          DEFAULT: colors.accent,
          soft: colors.accentSoft,
          hover: colors.accentHover,
        },
        success: {
          DEFAULT: colors.success,
          soft: colors.successSoft,
        },
        warning: {
          DEFAULT: colors.warning,
          soft: colors.warningSoft,
        },
        danger: {
          DEFAULT: colors.danger,
          soft: colors.dangerSoft,
        },
        border: {
          subtle: colors.border.subtle,
          DEFAULT: colors.border.default,
          strong: colors.border.strong,
        },
      },
      spacing: {
        1: space[1],
        2: space[2],
        3: space[3],
        4: space[4],
        5: space[5],
        6: space[6],
        7: space[7],
        8: space[8],
        9: space[9],
      },
      borderRadius: {
        sm: radius.sm,
        md: radius.md,
        lg: radius.lg,
        xl: radius.xl,
        full: radius.full,
      },
      fontFamily: {
        display: ['var(--font-display)', 'Inter', 'sans-serif'],
        body: ['var(--font-body)', 'Inter', 'sans-serif'],
        mono: ['var(--font-mono)', 'Menlo', 'monospace'],
      },
      fontSize: {
        xs: '12px',
        sm: '14px',
        base: '16px',
        lg: '18px',
        xl: '22px',
        '2xl': '28px',
        '3xl': '36px',
        '4xl': '48px',
        '5xl': '64px',
      },
    },
  },
  plugins: [],
};

export default config;
