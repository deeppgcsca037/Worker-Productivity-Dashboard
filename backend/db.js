import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dataDir = join(__dirname, 'data');
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

// Use Render's /tmp directory for ephemeral storage, or persistent if using Render's disk
const dbPath = process.env.DATABASE_URL || process.env.SQLITE_PATH || join(dataDir, 'productivity.db');
const db = new sqlite3.Database(dbPath);

export function initDb() {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS workers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        worker_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL
      )
    `);
    db.run(`
      CREATE TABLE IF NOT EXISTS workstations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        station_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL
      )
    `);
    db.run(`
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        worker_id TEXT NOT NULL,
        workstation_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        confidence REAL DEFAULT 1.0,
        count INTEGER DEFAULT 0,
        event_source_id TEXT UNIQUE,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);
    db.run(`CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_events_worker ON events(worker_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_events_station ON events(workstation_id)`);
  });
}

export { db };
