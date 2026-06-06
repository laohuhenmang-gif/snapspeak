import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task, TaskInput, Category } from '../types';

const TASKS_KEY = '@snapspeak_tasks';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function migrateTask(task: any): Task {
  return {
    ...task,
    category: (task.category as Category) || '其他',
    recurring: task.recurring || 'none',
    description: task.description || '',
  };
}

export async function loadTasks(): Promise<Task[]> {
  try {
    const json = await AsyncStorage.getItem(TASKS_KEY);
    const tasks: Task[] = json ? JSON.parse(json) : [];
    return tasks.map(migrateTask);
  } catch {
    return [];
  }
}

export async function saveTasks(tasks: Task[]): Promise<void> {
  await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

export async function addTask(input: TaskInput): Promise<Task> {
  const tasks = await loadTasks();
  const task: Task = {
    ...input,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  tasks.push(task);
  await saveTasks(tasks);
  return task;
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
  const tasks = await loadTasks();
  const index = tasks.findIndex(t => t.id === id);
  if (index === -1) return null;
  tasks[index] = { ...tasks[index], ...updates };
  await saveTasks(tasks);
  return tasks[index];
}

export async function deleteTask(id: string): Promise<boolean> {
  const tasks = await loadTasks();
  const filtered = tasks.filter(t => t.id !== id);
  if (filtered.length === tasks.length) return false;
  await saveTasks(filtered);
  return true;
}

export async function toggleComplete(id: string): Promise<Task | null> {
  const tasks = await loadTasks();
  const task = tasks.find(t => t.id === id);
  if (!task) return null;
  task.completed = !task.completed;
  await saveTasks(tasks);
  return task;
}

export async function getTasksByDate(date: string): Promise<Task[]> {
  const tasks = await loadTasks();
  return tasks.filter(t => t.datetime.startsWith(date));
}
