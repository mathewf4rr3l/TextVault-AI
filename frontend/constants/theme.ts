export const COLORS = {
  // Deep purple + gold brand
  background: '#0E0618',
  backgroundAlt: '#160A26',
  surface: 'rgba(255,255,255,0.05)',
  surfaceActive: 'rgba(255,255,255,0.09)',
  card: '#1B0F2E',
  cardAlt: '#22143A',

  purple: '#7C3AED',
  purpleDark: '#5B21B6',
  purpleLight: '#A78BFA',
  purpleGlow: 'rgba(124,58,237,0.28)',

  gold: '#F5C542',
  goldDark: '#D9A522',
  goldSoft: 'rgba(245,197,66,0.14)',

  white: '#FFFFFF',
  text: '#F4EEFB',
  textSecondary: '#B9AECC',
  textMuted: '#8A7DA3',

  border: 'rgba(255,255,255,0.10)',
  borderActive: 'rgba(167,139,250,0.55)',

  error: '#FF5C6C',
  success: '#3ED598',

  tabBar: '#130A22',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 26,
  pill: 9999,
};

export const GLASS = {
  backgroundColor: COLORS.card,
  borderRadius: RADIUS.lg,
  borderWidth: 1,
  borderColor: COLORS.border,
  boxShadow: '0px 6px 16px rgba(0,0,0,0.4)',
  elevation: 6,
};
