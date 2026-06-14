import AsyncStorage from '@react-native-async-storage/async-storage';
import { exportAllData } from './storage';

const BACKUP_KEY = '@snapspeak_last_backup';
const BACKUP_INTERVAL = 24 * 60 * 60 * 1000;

export async function shouldAutoBackup(): Promise<boolean> {
  try {
    const lastBackup = await AsyncStorage.getItem(BACKUP_KEY);
    if (!lastBackup) return true;
    return Date.now() - parseInt(lastBackup, 10) > BACKUP_INTERVAL;
  } catch {
    return true;
  }
}

export async function performAutoBackup(): Promise<boolean> {
  try {
    const data = await exportAllData();
    const json = JSON.stringify(data, null, 2);
    const filename = `snapspeak-backup-${new Date().toISOString().slice(0, 10)}.json`;

    const FileSystem = require('expo-file-system');
    const path = FileSystem.documentDirectory + 'backups/' + filename;
    await FileSystem.makeDirectoryAsync(FileSystem.documentDirectory + 'backups/', { intermediates: true });
    await FileSystem.writeAsStringAsync(path, json);

    await AsyncStorage.setItem(BACKUP_KEY, Date.now().toString());
    return true;
  } catch {
    return false;
  }
}

export async function getLastBackupTime(): Promise<string | null> {
  try {
    const ts = await AsyncStorage.getItem(BACKUP_KEY);
    if (!ts) return null;
    return new Date(parseInt(ts, 10)).toLocaleString('zh-CN');
  } catch {
    return null;
  }
}
