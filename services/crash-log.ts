import AsyncStorage from '@react-native-async-storage/async-storage';

const LOG_KEY = '@snapspeak_crash_log';
const MAX_LOG_SIZE = 50 * 1000;

export async function logCrash(error: Error, componentStack?: string): Promise<void> {
  const entry = [
    `[${new Date().toISOString()}]`,
    `ERROR: ${error.message}`,
    `STACK: ${error.stack || ''}`,
    componentStack ? `COMPONENT: ${componentStack}` : '',
    '---',
  ].filter(Boolean).join('\n') + '\n';

  try {
    const existing = await AsyncStorage.getItem(LOG_KEY) || '';
    let content = existing + entry;
    if (content.length > MAX_LOG_SIZE) {
      const lines = content.split('\n');
      content = lines.slice(Math.floor(lines.length / 2)).join('\n');
    }
    await AsyncStorage.setItem(LOG_KEY, content);
  } catch {}
}

export async function readCrashLog(): Promise<string> {
  try {
    return (await AsyncStorage.getItem(LOG_KEY)) || '';
  } catch {
    return '';
  }
}

export async function clearCrashLog(): Promise<void> {
  try {
    await AsyncStorage.removeItem(LOG_KEY);
  } catch {}
}

export async function getCrashLogSize(): Promise<number> {
  try {
    const log = await AsyncStorage.getItem(LOG_KEY);
    return log ? log.length : 0;
  } catch {
    return 0;
  }
}
