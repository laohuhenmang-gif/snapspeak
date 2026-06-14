import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = '@snapspeak_theme';

export async function getSavedTheme(): Promise<string> {
  try { return (await AsyncStorage.getItem(THEME_KEY)) || 'pixel'; }
  catch { return 'pixel'; }
}

export async function saveTheme(id: string): Promise<void> {
  await AsyncStorage.setItem(THEME_KEY, id);
}
