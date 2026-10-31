import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppearanceMode, Theme, ThemeName } from './types';
import { getTheme } from './themes';

interface ThemeContextType {
  theme: Theme;
  themeName: ThemeName;
  appearanceMode: AppearanceMode;
  setThemeName: (name: ThemeName) => Promise<void>;
  setAppearanceMode: (mode: AppearanceMode) => Promise<void>;
}

const THEME_NAME_KEY = '@playgrounditor:theme_name';
const APPEARANCE_MODE_KEY = '@playgrounditor:appearance_mode';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeName, setThemeNameState] = useState<ThemeName>('playgrounditor');
  const [appearanceMode, setAppearanceModeState] = useState<AppearanceMode>('system');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const storedName = await AsyncStorage.getItem(THEME_NAME_KEY);
        const storedMode = await AsyncStorage.getItem(APPEARANCE_MODE_KEY);
        if (storedName && (storedName in themesList)) {
          setThemeNameState(storedName as ThemeName);
        }
        if (storedMode && ['system', 'light', 'dark'].includes(storedMode)) {
          setAppearanceModeState(storedMode as AppearanceMode);
        }
      } catch {
        // use defaults
      } finally {
        setLoaded(true);
      }
    }
    void loadSettings();
  }, []);

  const themesList = { playgrounditor: true, dracula: true, solarized: true, nord: true, github: true };

  async function setThemeName(name: ThemeName) {
    setThemeNameState(name);
    try {
      await AsyncStorage.setItem(THEME_NAME_KEY, name);
    } catch {
      // ignore
    }
  }

  async function setAppearanceMode(mode: AppearanceMode) {
    setAppearanceModeState(mode);
    try {
      await AsyncStorage.setItem(APPEARANCE_MODE_KEY, mode);
    } catch {
      // ignore
    }
  }

  const resolvedMode: 'light' | 'dark' =
    appearanceMode === 'system'
      ? systemColorScheme === 'dark'
        ? 'dark'
        : 'light'
      : appearanceMode;

  const theme = getTheme(themeName, resolvedMode);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, themeName, appearanceMode, setThemeName, setAppearanceMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
