import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

export async function initDb() {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      niche TEXT,
      platform TEXT,
      monthly_budget REAL,
      status TEXT DEFAULT 'ativo',
      meta_link TEXT,
      google_link TEXT,
      next_action TEXT,
      tags TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      type TEXT DEFAULT 'diaria',
      completed INTEGER DEFAULT 0,
      archived INTEGER DEFAULT 0,
      last_completed_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER,
      title TEXT NOT NULL,
      description TEXT,
      date TEXT NOT NULL,
      time TEXT,
      recurrence TEXT DEFAULT 'none',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS finance_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      day INTEGER NOT NULL,
      entrada REAL DEFAULT 0,
      saida REAL DEFAULT 0,
      diario REAL DEFAULT 0,
      UNIQUE(year, month, day)
    );

    CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS habits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      color TEXT DEFAULT '#3b82f6',
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS habit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      habit_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE,
      UNIQUE(habit_id, date)
    );
  `);
}

export default db;
