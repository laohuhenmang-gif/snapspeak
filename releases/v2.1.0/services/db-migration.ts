import * as SQLite from 'expo-sqlite';

const MIGRATION_VERSION_KEY = 'schema_version';
const CURRENT_VERSION = 2;

export interface Migration {
  version: number;
  up: string[];
}

const migrations: Migration[] = [
  {
    version: 2,
    up: [
      `CREATE INDEX IF NOT EXISTS idx_tasks_planned_at ON tasks(planned_at);`,
      `CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);`,
      `CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);`,
      `CREATE INDEX IF NOT EXISTS idx_reminders_task_id ON reminders(task_id);`,
      `CREATE INDEX IF NOT EXISTS idx_reminders_remind_at ON reminders(remind_at);`,
      `CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(memory_type);`,
      `CREATE INDEX IF NOT EXISTS idx_conversations_created ON conversations(created_at);`,
    ],
  },
];

export async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    db.execSync(`CREATE TABLE IF NOT EXISTS _meta (key TEXT PRIMARY KEY, value TEXT);`);
    const row = db.getAllSync(`SELECT value FROM _meta WHERE key = '${MIGRATION_VERSION_KEY}';`);
    const currentVersion = row.length > 0 ? parseInt((row[0] as any).value || '0', 10) : 1;

    for (const migration of migrations) {
      if (migration.version > currentVersion) {
        for (const sql of migration.up) {
          db.execSync(sql);
        }
        db.execSync(`INSERT OR REPLACE INTO _meta (key, value) VALUES ('${MIGRATION_VERSION_KEY}', '${migration.version}');`);
      }
    }
  } catch (e) {
    console.warn('Migration error:', e);
  }
}

export function getCurrentSchemaVersion(): number {
  return CURRENT_VERSION;
}
