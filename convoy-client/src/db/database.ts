import * as SQLite from "expo-sqlite";

/**
 * ============================================================================
 * Local Data Layer: SQLite Database (DESIGN.md §3, §14, §26 & GEMINI.md §3, §6)
 * ============================================================================
 * Manages the offline-first SQLite database for Convoy.
 * Uses Write-Ahead Logging (WAL) for high concurrency and zero UI thread stutters.
 */

let dbInstance: SQLite.SQLiteDatabase | null = null;

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync("convoy.db");
    initDatabase(dbInstance);
  }
  return dbInstance;
}

/**
 * Initializes tables, constraints, foreign keys, and indexes.
 * Runs idempotently on database boot.
 */
export function initDatabase(db: SQLite.SQLiteDatabase): void {
  // Enable WAL mode and foreign keys for relational consistency
  db.execSync("PRAGMA journal_mode = WAL;");
  db.execSync("PRAGMA foreign_keys = ON;");

  // 1. Convoys Table
  db.execSync(`
    CREATE TABLE IF NOT EXISTS convoys (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      host_id TEXT NOT NULL,
      self_id TEXT NOT NULL,
      phase TEXT NOT NULL,
      last_seq INTEGER NOT NULL DEFAULT 0,
      settings_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  // 2. Members Table
  db.execSync(`
    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      convoy_id TEXT NOT NULL,
      name TEXT NOT NULL,
      is_host INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL,
      lat REAL,
      lng REAL,
      heading REAL,
      speed REAL,
      location_ts INTEGER,
      last_seen_at TEXT,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (convoy_id) REFERENCES convoys(id) ON DELETE CASCADE
    );
  `);
  db.execSync(`
    CREATE INDEX IF NOT EXISTS idx_members_convoy ON members(convoy_id);
  `);

  // 3. Messages Table (Append-only by server sequence, supports pending state)
  db.execSync(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      convoy_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      sender_name TEXT NOT NULL,
      text TEXT NOT NULL,
      sent_at TEXT NOT NULL,
      seq INTEGER,
      status TEXT NOT NULL DEFAULT 'sent',
      created_at INTEGER NOT NULL,
      FOREIGN KEY (convoy_id) REFERENCES convoys(id) ON DELETE CASCADE
    );
  `);
  db.execSync(`
    CREATE INDEX IF NOT EXISTS idx_messages_convoy ON messages(convoy_id, created_at);
  `);

  // 4. Outbox Table (Outbox Pattern for offline resilience, DESIGN.md §14.1)
  db.execSync(`
    CREATE TABLE IF NOT EXISTS outbox (
      client_id TEXT PRIMARY KEY,
      convoy_id TEXT NOT NULL,
      type TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_attempt_at INTEGER,
      error TEXT
    );
  `);
  db.execSync(`
    CREATE INDEX IF NOT EXISTS idx_outbox_created ON outbox(created_at ASC);
  `);
}
