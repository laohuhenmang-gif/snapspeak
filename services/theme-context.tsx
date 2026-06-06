import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ThemeColors } from '../constants/themes';
import themes, { getThemeById } from '../constants/themes';
import { getSavedTheme, saveTheme } from './theme-config';

interface ThemeContextType {
  theme: ThemeColors;
  themeId: string;
  setTheme: (id: string) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: themes[0].colors,
  themeId: 'doubao',
  setTheme: async () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useState('doubao');
  const [theme, setThemeColors] = useState<ThemeColors>(themes[0].colors);

  useEffect(() => {
    getSavedTheme().then(id => {
      setThemeId(id);
      setThemeColors(getThemeById(id).colors);
    });
  }, []);

  const handleSetTheme = async (id: string) => {
    setThemeId(id);
    setThemeColors(getThemeById(id).colors);
    await saveTheme(id);
  };

  return (
    <ThemeContext.Provider value={{ theme, themeId, setTheme: handleSetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
