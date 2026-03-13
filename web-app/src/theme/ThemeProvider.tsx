import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useMemo,
} from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'theme_mode';

function getInitialThemeMode(): ThemeMode {
  if (typeof window !== 'undefined' && window.localStorage) {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
  }
  return 'light';
}

function getSystemPrefersDark(): boolean {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return false;
}

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceElevated: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  borderLight: string;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  success: string;
  error: string;
  warning: string;
  info: string;
  overlay: string;
  white: string;
  black: string;
}

export interface Theme {
  colors: ThemeColors;
  spacing: { xs: number; sm: number; md: number; lg: number; xl: number; '2xl': number };
  radii: { sm: number; md: number; lg: number; full: number };
  typography: {
    display: { fontSize: number; fontWeight: string };
    h1: { fontSize: number; fontWeight: string };
    h2: { fontSize: number; fontWeight: string };
    body: { fontSize: number; fontWeight: string };
    caption: { fontSize: number; fontWeight: string };
  };
  shadows: {
    card: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
    };
  };
}

const lightColors: ThemeColors = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  text: '#0F172A',
  textSecondary: '#334155',
  textTertiary: '#64748B',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  primary: '#2563EB',
  primaryLight: '#EFF6FF',
  primaryDark: '#1D4ED8',
  success: '#16A34A',
  error: '#DC2626',
  warning: '#F97316',
  info: '#0EA5E9',
  overlay: 'rgba(0, 0, 0, 0.5)',
  white: '#FFFFFF',
  black: '#000000',
};

const darkColors: ThemeColors = {
  background: '#0F172A',
  surface: '#1E2C50',
  surfaceElevated: '#1E2C50',
  text: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textTertiary: '#94A3B8',
  border: '#64748B',
  borderLight: '#94A3B8',
  primary: '#3B82F6',
  primaryLight: '#1E3A8A',
  primaryDark: '#2563EB',
  success: '#22C55E',
  error: '#EF4444',
  warning: '#FB923C',
  info: '#38BDF8',
  overlay: 'rgba(0, 0, 0, 0.7)',
  white: '#FFFFFF',
  black: '#000000',
};

const createTheme = (colors: ThemeColors): Theme => ({
  colors,
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, '2xl': 32 },
  radii: { sm: 6, md: 10, lg: 16, full: 999 },
  typography: {
    display: { fontSize: 32, fontWeight: '700' },
    h1: { fontSize: 24, fontWeight: '600' },
    h2: { fontSize: 20, fontWeight: '600' },
    body: { fontSize: 16, fontWeight: '400' },
    caption: { fontSize: 13, fontWeight: '400' },
  },
  shadows: {
    card: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.06,
      shadowRadius: 20,
    },
  },
});

interface ThemeContextType {
  theme: Theme;
  colors: ThemeColors;
  themeMode: ThemeMode;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(getInitialThemeMode);
  const [systemPrefersDark, setSystemPrefersDark] = useState(getSystemPrefersDark);
  const isDark =
    themeMode === 'system' ? systemPrefersDark : themeMode === 'dark';

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => setSystemPrefersDark(mediaQuery.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(themeMode === 'system' ? (isDark ? 'dark' : 'light') : themeMode);
  }, [themeMode, isDark]);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      // ignore
    }
  };

  const toggleTheme = () => {
    setThemeMode(isDark ? 'light' : 'dark');
  };

  const colors = isDark ? darkColors : lightColors;
  const theme = useMemo(() => createTheme(colors), [colors]);

  const value: ThemeContextType = useMemo(
    () => ({
      theme,
      colors,
      themeMode,
      isDark,
      setThemeMode,
      toggleTheme,
    }),
    [theme, colors, themeMode, isDark]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
