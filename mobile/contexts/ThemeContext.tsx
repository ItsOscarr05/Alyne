import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme, Appearance } from 'react-native';
import { storage } from '../utils/storage';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeColors {
  // Background colors
  background: string;
  surface: string;
  surfaceElevated: string;
  
  // Text colors
  text: string;
  textSecondary: string;
  textTertiary: string;
  
  // Border colors
  border: string;
  borderLight: string;
  
  // Primary colors (same in light/dark)
  primary: string;
  primaryLight: string;
  primaryDark: string;
  
  // Semantic colors
  success: string;
  error: string;
  warning: string;
  info: string;
  
  // Overlay
  overlay: string;
  
  // Special
  white: string;
  black: string;
}

interface Theme {
  colors: ThemeColors;
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    '2xl': number;
  };
  radii: {
    sm: number;
    md: number;
    lg: number;
    full: number;
  };
  typography: {
    display: {
      fontSize: number;
      fontWeight: '700';
    };
    h1: {
      fontSize: number;
      fontWeight: '600';
    };
    h2: {
      fontSize: number;
      fontWeight: '600';
    };
    body: {
      fontSize: number;
      fontWeight: '400';
    };
    caption: {
      fontSize: number;
      fontWeight: '400';
    };
  };
  shadows: {
    card: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
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
  surface: '#1E2C50', // Soft Blue for better visual hierarchy
  surfaceElevated: '#1E2C50', // Use same soft blue for elevated surfaces (active tabs, etc.)
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
      fontWeight: '700',
    },
    h1: {
      fontSize: 24,
      fontWeight: '600',
    },
    h2: {
      fontSize: 20,
      fontWeight: '600',
    },
    body: {
      fontSize: 16,
      fontWeight: '400',
    },
    caption: {
      fontSize: 13,
      fontWeight: '400',
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
});

const THEME_STORAGE_KEY = 'theme_mode';

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
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [isDark, setIsDark] = useState(systemColorScheme === 'dark');

  // Load saved theme preference
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const saved = await storage.getItem(THEME_STORAGE_KEY);
        if (saved && (saved === 'light' || saved === 'dark' || saved === 'system')) {
          setThemeModeState(saved as ThemeMode);
        }
      } catch (error) {
        console.error('Error loading theme preference', error);
      }
    };
    loadTheme();
  }, []);

  // Update isDark based on themeMode and system preference
  useEffect(() => {
    if (themeMode === 'system') {
      setIsDark(systemColorScheme === 'dark');
    } else {
      setIsDark(themeMode === 'dark');
    }
  }, [themeMode, systemColorScheme]);

  // Listen for system theme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (themeMode === 'system') {
        setIsDark(colorScheme === 'dark');
      }
    });

    return () => subscription.remove();
  }, [themeMode]);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await storage.setItem(THEME_STORAGE_KEY, mode);
    } catch (error) {
      console.error('Error saving theme preference', error);
    }
  };

  const toggleTheme = () => {
    const newMode = isDark ? 'light' : 'dark';
    setThemeMode(newMode);
  };

  const theme = createTheme(isDark ? darkColors : lightColors);
  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ theme, colors, themeMode, isDark, setThemeMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

