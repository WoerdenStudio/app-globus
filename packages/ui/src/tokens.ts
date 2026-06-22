/**
 * Tokens de design neutres — prêts pour la charte Globus.
 * Ne pas inventer les couleurs officielles ; remplacer ces valeurs plus tard.
 */

export const colors = {
  primary: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    DEFAULT: '#334155',
  },
  accent: {
    DEFAULT: '#2563eb',
    hover: '#1d4ed8',
    light: '#dbeafe',
  },
  success: {
    DEFAULT: '#16a34a',
    light: '#dcfce7',
  },
  warning: {
    DEFAULT: '#ca8a04',
    light: '#fef9c3',
  },
  error: {
    DEFAULT: '#dc2626',
    light: '#fee2e2',
  },
  background: {
    DEFAULT: '#ffffff',
    muted: '#f8fafc',
    card: '#ffffff',
  },
  foreground: {
    DEFAULT: '#0f172a',
    muted: '#64748b',
    inverse: '#ffffff',
  },
  border: {
    DEFAULT: '#e2e8f0',
    focus: '#2563eb',
  },
} as const;

export const spacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '3rem',
  '3xl': '4rem',
} as const;

export const radius = {
  sm: '0.25rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  full: '9999px',
} as const;

export const fontSize = {
  xs: '0.75rem',
  sm: '0.875rem',
  base: '1rem',
  lg: '1.125rem',
  xl: '1.25rem',
  '2xl': '1.5rem',
  '3xl': '1.875rem',
} as const;

export const fontWeight = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export const shadow = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
} as const;

/** Variables CSS pour Tailwind / thème */
export const cssVariables = {
  '--color-primary': colors.primary.DEFAULT,
  '--color-accent': colors.accent.DEFAULT,
  '--color-background': colors.background.DEFAULT,
  '--color-foreground': colors.foreground.DEFAULT,
  '--color-muted': colors.foreground.muted,
  '--color-border': colors.border.DEFAULT,
  '--radius-md': radius.md,
} as const;
