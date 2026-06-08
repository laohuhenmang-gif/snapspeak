import * as SQLite from 'expo-sqlite';
import { Task, TaskInput, Category, Priority, SourceType } from '../types';

// ──────────────────────────────────────
// Database initialization
// ──────────────────────────────────────

let db: SQLite.SQLiteDatabase | null = null;

function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync('snapspeak.db');
    initSchema();
  }
  return db;
}

function initSchema(): void {
  const d = getDb();

  d.execSync(`PRAGMA journal_mode = WAL;`);
  d.execSync(`PRAGMA foreign_keys = ON;`);

  // Core: tasks
  d.execSync(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      planned_at TEXT DEFAULT '',
      due_at TEXT DEFAULT '',
      reminder_at TEXT DEFAULT '',
      priority TEXT DEFAULT '中',
      status TEXT DEFAULT 'pending',
      source_type TEXT DEFAULT 'text',
      source_id TEXT DEFAULT '',
      project_name TEXT DEFAULT '',
      category TEXT DEFAULT '其他',
      recurring TEXT DEFAULT 'none',
      completed INTEGER DEFAULT 0,
      completed_at TEXT DEFAULT '',
      postponed_count INTEGER DEFAULT 0,
      current_blocker_reason TEXT DEFAULT '',
      needs_precheck INTEGER DEFAULT 0,
      created_at TEXT DEFAULT '',
      updated_at TEXT DEFAULT ''
    );
  `);

  // Captures: raw inputs
  d.execSync(`
    CREATE TABLE IF NOT EXISTS captures (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      raw_text TEXT DEFAULT '',
      image_uri TEXT DEFAULT '',
      audio_uri TEXT DEFAULT '',
      transcribed_text TEXT DEFAULT '',
      ocr_text TEXT DEFAULT '',
      processed_status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT ''
    );
  `);

  // Reminders
  d.execSync(`
    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      remind_at TEXT NOT NULL,
      remind_type TEXT DEFAULT 'due',
      status TEXT DEFAULT 'pending',
      notification_id TEXT DEFAULT '',
      created_at TEXT DEFAULT '',
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );
  `);

  // AI actions
  d.execSync(`
    CREATE TABLE IF NOT EXISTS ai_actions (
      id TEXT PRIMARY KEY,
      action_type TEXT NOT NULL,
      payload_json TEXT DEFAULT '{}',
      status TEXT DEFAULT 'pending',
      user_confirmed_at TEXT DEFAULT '',
      executed_at TEXT DEFAULT '',
      error_message TEXT DEFAULT '',
      created_at TEXT DEFAULT ''
    );
  `);

  // Memory / knowledge base
  d.execSync(`
    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      memory_type TEXT NOT NULL,
      content TEXT NOT NULL,
      source_id TEXT DEFAULT '',
      confidence REAL DEFAULT 0.5,
      user_confirmed INTEGER DEFAULT 0,
      enabled INTEGER DEFAULT 1,
      created_at TEXT DEFAULT '',
      updated_at TEXT DEFAULT ''
    );
  `);

  // Daily/weekly reflections
  d.execSync(`
    CREATE TABLE IF NOT EXISTS reflections (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      planned_count INTEGER DEFAULT 0,
      completed_count INTEGER DEFAULT 0,
      completion_rate REAL DEFAULT 0,
      overdue_count INTEGER DEFAULT 0,
      main_blockers_json TEXT DEFAULT '[]',
      ai_summary TEXT DEFAULT '',
      ai_suggestion TEXT DEFAULT '',
      created_at TEXT DEFAULT ''
    );
  `);

  // Blockers / prechecks
  d.execSync(`
    CREATE TABLE IF NOT EXISTS blockers (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      blocker_type TEXT DEFAULT 'other',
      blocker_text TEXT DEFAULT '',
      suggested_action TEXT DEFAULT '',
      next_remind_at TEXT DEFAULT '',
      resolved INTEGER DEFAULT 0,
      created_at TEXT DEFAULT '',
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );
  `);

  // Conversations
  d.execSync(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      message_type TEXT DEFAULT 'text',
      related_task_id TEXT DEFAULT '',
      related_action_id TEXT DEFAULT '',
      created_at TEXT DEFAULT ''
    );
  `);
}

// ──────────────────────────────────────
// Helpers
// ──────────────────────────────────────

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function nowISO(): string {
  return new Date().toISOString();
}

function taskFromRow(row: any): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    planned_at: row.planned_at || '',
    due_at: row.due_at || '',
    reminder_at: row.reminder_at || '',
    priority: (row.priority as Priority) || '中',
    source: (row.source_type as SourceType) || 'text',
    source_id: row.source_id || '',
    project_name: row.project_name || '',
    category: (row.category as Category) || '其他',
    recurring: row.recurring || 'none',
    completed: !!row.completed,
    completedAt: row.completed_at || '',
    postponed_count: row.postponed_count || 0,
    current_blocker_reason: row.current_blocker_reason || '',
    needs_precheck: !!row.needs_precheck,
    datetime: row.planned_at || row.due_at || row.reminder_at || row.created_at || '',
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}

// ──────────────────────────────────────
// Task CRUD
// ──────────────────────────────────────

export async function loadTasks(): Promise<Task[]> {
  try {
    const rows = getDb().getAllSync('SELECT * FROM tasks ORDER BY created_at DESC');
    return rows.map(taskFromRow);
  } catch {
    return [];
  }
}

export async function saveTasks(_tasks: Task[]): Promise<void> {
  // No-op in SQLite mode - each operation writes directly
}

export async function addTask(input: TaskInput): Promise<Task> {
  const id = generateId();
  const now = nowISO();

  const title = input.title;
  const description = input.description || '';
  const planned_at = input.datetime || now;
  const priority = input.priority || '中';
  const category = input.category || '其他';
  const recurring = input.recurring || 'none';
  const source_type = input.source || 'text';
  const completed = input.completed ? 1 : 0;
  const postponed_count = input.postponed_count || 0;
  const current_blocker_reason = input.current_blocker_reason || '';
  const needs_precheck = input.needs_precheck ? 1 : 0;
  const project_name = input.project_name || '';

  getDb().runSync(
    `INSERT INTO tasks (id, title, description, planned_at, priority, status, source_type, category, recurring, completed, postponed_count, current_blocker_reason, needs_precheck, project_name, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, title, description, planned_at, priority, source_type, category, recurring, completed, postponed_count, current_blocker_reason, needs_precheck, project_name, now, now],
  );

  return {
    id,
    title,
    description,
    planned_at,
    due_at: '',
    reminder_at: '',
    priority,
    source_id: '',
    project_name,
    category: category as Category,
    recurring,
    completed: !!completed,
    postponed_count,
    current_blocker_reason,
    needs_precheck: !!needs_precheck,
    datetime: planned_at,
    createdAt: now,
    source: source_type as SourceType || 'text',
  };
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
  const now = nowISO();
  const sets: string[] = [];
  const values: any[] = [];

  const map: Record<string, string> = {
    title: 'title',
    description: 'description',
    priority: 'priority',
    category: 'category',
    recurring: 'recurring',
    completed: 'completed',
    postponed_count: 'postponed_count',
    current_blocker_reason: 'current_blocker_reason',
    needs_precheck: 'needs_precheck',
    project_name: 'project_name',
    status: 'status',
  };

  for (const [key, col] of Object.entries(map)) {
    if (key in updates) {
      let val = (updates as any)[key];
      if (key === 'completed' || key === 'needs_precheck') val = val ? 1 : 0;
      sets.push(`${col} = ?`);
      values.push(val);
    }
  }

  // datetime field maps to planned_at
  if ('datetime' in updates && updates.datetime) {
    sets.push('planned_at = ?');
    values.push(updates.datetime);
  }

  if (sets.length === 0) {
    return (await loadTasks()).find(t => t.id === id) || null;
  }

  sets.push('updated_at = ?');
  values.push(now);
  values.push(id);

  getDb().runSync(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`, values);

  const rows = getDb().getAllSync('SELECT * FROM tasks WHERE id = ?', [id]);
  return rows.length > 0 ? taskFromRow(rows[0]) : null;
}

export async function deleteTask(id: string): Promise<boolean> {
  const result = getDb().runSync('DELETE FROM tasks WHERE id = ?', [id]);
  return result.changes > 0;
}

export async function toggleComplete(id: string): Promise<Task | null> {
  const rows = getDb().getAllSync('SELECT * FROM tasks WHERE id = ?', [id]);
  if (rows.length === 0) return null;

  const task = taskFromRow(rows[0]);
  const newCompleted = !task.completed;
  const now = nowISO();

  getDb().runSync(
    'UPDATE tasks SET completed = ?, completed_at = ?, updated_at = ? WHERE id = ?',
    [newCompleted ? 1 : 0, newCompleted ? now : '', now, id],
  );

  return { ...task, completed: newCompleted, completedAt: newCompleted ? now : '' };
}

export async function findTaskByTitle(title: string): Promise<Task | null> {
  const q = `%${title.trim().toLowerCase()}%`;
  const rows = getDb().getAllSync('SELECT * FROM tasks WHERE LOWER(title) LIKE ? LIMIT 1', [q]);
  return rows.length > 0 ? taskFromRow(rows[0]) : null;
}

export async function batchComplete(filter: string): Promise<number> {
  const now = nowISO();
  const today = now.slice(0, 10);
  let rows: any[] = [];

  if (filter === 'today') {
    rows = getDb().getAllSync("SELECT id FROM tasks WHERE completed = 0 AND planned_at LIKE ?", [`${today}%`]);
  } else if (filter === 'all') {
    rows = getDb().getAllSync('SELECT id FROM tasks WHERE completed = 0');
  } else {
    rows = getDb().getAllSync('SELECT id FROM tasks WHERE completed = 0 AND category = ?', [filter]);
  }

  if (rows.length === 0) return 0;

  const ids = rows.map((r: any) => r.id);
  getDb().runSync(
    `UPDATE tasks SET completed = 1, completed_at = ?, updated_at = ? WHERE id IN (${ids.map(() => '?').join(',')})`,
    [now, now, ...ids],
  );
  return ids.length;
}

export async function getTasksByDate(date: string): Promise<Task[]> {
  const rows = getDb().getAllSync('SELECT * FROM tasks WHERE planned_at LIKE ? ORDER BY planned_at ASC', [`${date}%`]);
  return rows.map(taskFromRow);
}

// ──────────────────────────────────────
// Conversations
// ──────────────────────────────────────

export async function saveConversation(msg: {
  role: string;
  content: string;
  message_type?: string;
  related_task_id?: string;
  related_action_id?: string;
}): Promise<string> {
  const id = generateId();
  const now = nowISO();
  getDb().runSync(
    'INSERT INTO conversations (id, role, content, message_type, related_task_id, related_action_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, msg.role, msg.content, msg.message_type || 'text', msg.related_task_id || '', msg.related_action_id || '', now],
  );
  return id;
}

export async function loadRecentConversations(limit = 50): Promise<any[]> {
  const rows = getDb().getAllSync('SELECT * FROM conversations ORDER BY created_at DESC LIMIT ?', [limit]);
  return rows.reverse();
}

// ──────────────────────────────────────
// Captures
// ──────────────────────────────────────

export async function saveCapture(capture: {
  type: string;
  raw_text?: string;
  image_uri?: string;
  audio_uri?: string;
  transcribed_text?: string;
  ocr_text?: string;
}): Promise<string> {
  const id = generateId();
  const now = nowISO();
  getDb().runSync(
    'INSERT INTO captures (id, type, raw_text, image_uri, audio_uri, transcribed_text, ocr_text, processed_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, capture.type, capture.raw_text || '', capture.image_uri || '', capture.audio_uri || '', capture.transcribed_text || '', capture.ocr_text || '', 'pending', now],
  );
  return id;
}

// ──────────────────────────────────────
// Reminders
// ──────────────────────────────────────

export async function saveReminder(reminder: {
  task_id: string;
  remind_at: string;
  remind_type?: string;
  notification_id?: string;
}): Promise<string> {
  const id = generateId();
  const now = nowISO();
  getDb().runSync(
    'INSERT INTO reminders (id, task_id, remind_at, remind_type, status, notification_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, reminder.task_id, reminder.remind_at, reminder.remind_type || 'due', 'pending', reminder.notification_id || '', now],
  );
  return id;
}

// ──────────────────────────────────────
// AI Actions
// ──────────────────────────────────────

export async function saveAIAction(action: {
  action_type: string;
  payload_json?: string;
}): Promise<string> {
  const id = generateId();
  const now = nowISO();
  getDb().runSync(
    'INSERT INTO ai_actions (id, action_type, payload_json, status, created_at) VALUES (?, ?, ?, ?, ?)',
    [id, action.action_type, action.payload_json || '{}', 'pending', now],
  );
  return id;
}

// ──────────────────────────────────────
// Memories / Knowledge Base
// ──────────────────────────────────────

export async function saveMemory(memory: {
  memory_type: string;
  content: string;
  source_id?: string;
  confidence?: number;
  user_confirmed?: boolean;
}): Promise<string> {
  const id = generateId();
  const now = nowISO();
  getDb().runSync(
    'INSERT INTO memories (id, memory_type, content, source_id, confidence, user_confirmed, enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)',
    [id, memory.memory_type, memory.content, memory.source_id || '', memory.confidence ?? 0.5, memory.user_confirmed ? 1 : 0, now, now],
  );
  return id;
}

export async function loadMemoriesByType(memory_type: string): Promise<any[]> {
  return getDb().getAllSync('SELECT * FROM memories WHERE memory_type = ? AND enabled = 1 ORDER BY created_at DESC', [memory_type]);
}

export async function loadConfirmedMemories(): Promise<any[]> {
  return getDb().getAllSync('SELECT * FROM memories WHERE user_confirmed = 1 AND enabled = 1 ORDER BY updated_at DESC');
}

export async function loadAllMemories(): Promise<any[]> {
  return getDb().getAllSync('SELECT * FROM memories ORDER BY updated_at DESC');
}

export async function updateMemory(id: string, updates: { content?: string; memory_type?: string; user_confirmed?: boolean; enabled?: boolean }): Promise<void> {
  const fields: string[] = [];
  const values: any[] = [];
  if (updates.content !== undefined) { fields.push('content = ?'); values.push(updates.content); }
  if (updates.memory_type !== undefined) { fields.push('memory_type = ?'); values.push(updates.memory_type); }
  if (updates.user_confirmed !== undefined) { fields.push('user_confirmed = ?'); values.push(updates.user_confirmed ? 1 : 0); }
  if (updates.enabled !== undefined) { fields.push('enabled = ?'); values.push(updates.enabled ? 1 : 0); }
  if (fields.length === 0) return;
  fields.push('updated_at = ?');
  values.push(nowISO());
  values.push(id);
  getDb().runSync(`UPDATE memories SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function deleteMemory(id: string): Promise<void> {
  getDb().runSync('DELETE FROM memories WHERE id = ?', [id]);
}

// ──────────────────────────────────────
// Reflections
// ──────────────────────────────────────

export async function saveReflection(reflection: {
  date: string;
  planned_count?: number;
  completed_count?: number;
  completion_rate?: number;
  overdue_count?: number;
  main_blockers_json?: string;
  ai_summary?: string;
  ai_suggestion?: string;
}): Promise<string> {
  const id = generateId();
  const now = nowISO();
  getDb().runSync(
    'INSERT INTO reflections (id, date, planned_count, completed_count, completion_rate, overdue_count, main_blockers_json, ai_summary, ai_suggestion, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, reflection.date, reflection.planned_count || 0, reflection.completed_count || 0, reflection.completion_rate || 0, reflection.overdue_count || 0, reflection.main_blockers_json || '[]', reflection.ai_summary || '', reflection.ai_suggestion || '', now],
  );
  return id;
}

export async function loadReflectionByDate(date: string): Promise<any | null> {
  const rows = getDb().getAllSync('SELECT * FROM reflections WHERE date = ? LIMIT 1', [date]);
  return rows.length > 0 ? rows[0] : null;
}

// ──────────────────────────────────────
// Blockers
// ──────────────────────────────────────

export async function saveBlocker(blocker: {
  task_id: string;
  blocker_type?: string;
  blocker_text?: string;
  suggested_action?: string;
}): Promise<string> {
  const id = generateId();
  const now = nowISO();
  getDb().runSync(
    'INSERT INTO blockers (id, task_id, blocker_type, blocker_text, suggested_action, resolved, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)',
    [id, blocker.task_id, blocker.blocker_type || 'other', blocker.blocker_text || '', blocker.suggested_action || '', now],
  );
  return id;
}

export async function loadBlockersByTask(task_id: string): Promise<any[]> {
  return getDb().getAllSync('SELECT * FROM blockers WHERE task_id = ? ORDER BY created_at DESC', [task_id]);
}

// ──────────────────────────────────────
// Export / Import
// ──────────────────────────────────────

export interface ExportData {
  version: string;
  exported_at: string;
  tasks: any[];
  captures: any[];
  reminders: any[];
  ai_actions: any[];
  memories: any[];
  reflections: any[];
  blockers: any[];
  conversations: any[];
}

export async function exportAllData(): Promise<ExportData> {
  const db = getDb();
  const tables = ['tasks', 'captures', 'reminders', 'ai_actions', 'memories', 'reflections', 'blockers', 'conversations'];
  const data: ExportData = {
    version: '1.0',
    exported_at: nowISO(),
    tasks: [],
    captures: [],
    reminders: [],
    ai_actions: [],
    memories: [],
    reflections: [],
    blockers: [],
    conversations: [],
  };
  for (const table of tables) {
    try {
      (data as any)[table] = db.getAllSync(`SELECT * FROM ${table}`);
    } catch {
      // Table may not exist yet — skip
    }
  }
  return data;
}

export async function importAllData(data: ExportData): Promise<{ imported: number; errors: string[] }> {
  const db = getDb();
  const errors: string[] = [];
  let imported = 0;

  const tables = ['tasks', 'captures', 'reminders', 'ai_actions', 'memories', 'reflections', 'blockers', 'conversations'];

  // Clear existing data
  for (const table of tables) {
    try {
      db.runSync(`DELETE FROM ${table}`);
    } catch {}
  }

  // Import each table
  for (const table of tables) {
    const rows = (data as any)[table];
    if (!Array.isArray(rows) || rows.length === 0) continue;
    for (const row of rows) {
      try {
        const columns = Object.keys(row);
        const placeholders = columns.map(() => '?').join(', ');
        const values = columns.map((col) => (row[col] === undefined ? null : row[col]));
        db.runSync(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`, values);
        imported++;
      } catch (e: any) {
        errors.push(`${table}: ${e?.message || 'unknown'}`);
      }
    }
  }

  return { imported, errors };
}