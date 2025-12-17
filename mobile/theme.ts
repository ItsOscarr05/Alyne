export const theme = {
  colors: {
    primary: {
      50: '#EFF6FF',
      500: '#2563EB',
      600: '#1D4ED8',
    },
    neutral: {
      900: '#0F172A',
      700: '#334155',
      500: '#64748B',
      200: '#E2E8F0',
      50: '#F8FAFC',
    },
    semantic: {
      success: '#16A34A',
      error: '#DC2626',
      warning: '#F97316',
      info: '#0EA5E9',
    },
    white: '#FFFFFF',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    '2xl': 32,
  },
  radii: {
    sm: 6,
    md: 10,
    lg: 16,
    full: 999,
  },
  typography: {
    display: {
      fontSize: 32,
      fontWeight: '700' as const,
    },
    h1: {
      fontSize: 24,
      fontWeight: '600' as const,
    },
    h2: {
      fontSize: 20,
      fontWeight: '600' as const,
    },
    body: {
      fontSize: 16,
      fontWeight: '400' as const,
    },
    caption: {
      fontSize: 13,
      fontWeight: '400' as const,
    },
  },
  shadows: {
    card: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.06,
      shadowRadius: 20,
      elevation: 4,
    },
  },
} as const;


