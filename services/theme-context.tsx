import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { ThemeColors } from '../constants/themes';
import themes, { getThemeById } from '../constants/themes';
import { getSavedTheme, saveTheme } from './theme-config';
import AsyncStorage from '@react-native-async-storage/async-storage';

type DarkMode = 'system' | 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeColors;
  themeId: string;
  setTheme: (id: string) => Promise<void>;
  darkMode: DarkMode;
  setDarkMode: (mode: DarkMode) => Promise<void>;
}

const DM_KEY = '@snapspeak_dark_mode';

const ThemeContext = createContext<ThemeContextType>({
  theme: themes[0].colors,
  themeId: 'pixel',
  setTheme: async () => {},
  darkMode: 'system',
  setDarkMode: async () => {},
});

function resolveThemeId(baseId: string, darkMode: DarkMode, systemIsDark: boolean): string {
  if (darkMode === 'dark') return baseId.endsWith('-dark') ? baseId : `${baseId}-dark`;
  if (darkMode === 'light') return baseId.replace('-dark', '');
  if (darkMode === 'system') return systemIsDark ? `${baseId}-dark` : baseId;
  return baseId;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const systemIsDark = systemColorScheme === 'dark';
  const [baseThemeId, setBaseThemeId] = useState('pixel');
  const [darkMode, setDarkModeState] = useState<DarkMode>('system');
  const [resolvedId, setResolvedId] = useState('pixel');
  const [theme, setThemeColors] = useState<ThemeColors>(themes[0].colors);

  useEffect(() => {
    getSavedTheme().then(id => setBaseThemeId(id));
    AsyncStorage.getItem(DM_KEY).then(v => { if (v) setDarkModeState(v as DarkMode); });
  }, []);

  useEffect(() => {
    const rid = resolveThemeId(baseThemeId, darkMode, systemIsDark);
    setResolvedId(rid);
    const td = getThemeById(rid);
    if (td) setThemeColors(td.colors);
    else setThemeColors(themes[0].colors);
  }, [baseThemeId, darkMode, systemIsDark]);

  const handleSetTheme = async (id: string) => {
    setBaseThemeId(id);
    await saveTheme(id);
  };

  const handleSetDarkMode = async (mode: DarkMode) => {
    setDarkModeState(mode);
    await AsyncStorage.setItem(DM_KEY, mode);
  };

  return (
    <ThemeContext.Provider value={{ theme, themeId: resolvedId, setTheme: handleSetTheme, darkMode, setDarkMode: handleSetDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
