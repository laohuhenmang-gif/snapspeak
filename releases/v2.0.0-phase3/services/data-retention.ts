import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadTasks, deleteTask } from './storage';

const RETENTION_KEY = '@snapspeak_retention_days';
const DEFAULT_RETENTION = 90;

export async function getRetentionDays(): Promise<number> {
  try {
    const val = await AsyncStorage.getItem(RETENTION_KEY);
    return val ? parseInt(val, 10) : DEFAULT_RETENTION;
  } catch {
    return DEFAULT_RETENTION;
  }
}

export async function setRetentionDays(days: number): Promise<void> {
  await AsyncStorage.setItem(RETENTION_KEY, days.toString());
}

export async function cleanupOldTasks(): Promise<number> {
  const days = await getRetentionDays();
  const cutoff = new Date(Date.now() - days * 86400000).toISOString();
  const tasks = await loadTasks();
  let deleted = 0;

  for (const task of tasks) {
    if (task.completed && task.completedAt && task.completedAt < cutoff) {
      await deleteTask(task.id);
      deleted++;
    }
  }

  return deleted;
}

export async function getTaskStats(): Promise<{ total: number; completed: number; pending: number; overdue: number }> {
  const tasks = await loadTasks();
  const now = new Date().toISOString();
  return {
    total: tasks.length,
    completed: tasks.filter(t => t.completed).length,
    pending: tasks.filter(t => !t.completed).length,
    overdue: tasks.filter(t => !t.completed && t.datetime && t.datetime < now).length,
  };
}
