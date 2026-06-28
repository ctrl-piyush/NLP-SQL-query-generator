/**
 * RBAC Database Initialization
 *
 * Initializes a SQLite database via better-sqlite3 for storing users, roles,
 * and access control data. Seeds a default admin account on first run.
 *
 * The database file location is configurable via the RBAC_DB_PATH environment variable.
 * Defaults to `data/rbac.db` relative to the project root.
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";

const DEFAULT_DB_PATH = process.env.VERCEL
  ? path.join("/tmp", "rbac.db")
  : path.join(process.cwd(), "data", "rbac.db");

function getDbPath(): string {
  return process.env.RBAC_DB_PATH || DEFAULT_DB_PATH;
}

let dbInstance: Database.Database | null = null;

/**
 * Returns the singleton SQLite database instance.
 * Creates the database file and schema on first access.
 */
export function getDb(): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = getDbPath();
  const dbDir = path.dirname(dbPath);

  // Ensure the directory exists
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  dbInstance = new Database(dbPath);

  // Enable WAL mode for better concurrent read performance
  dbInstance.pragma("journal_mode = WAL");

  initializeSchema(dbInstance);
  seedDefaultAdmin(dbInstance);

  return dbInstance;
}

/**
 * Creates the users table if it does not already exist.
 */
function initializeSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL CHECK(length(email) <= 254),
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('viewer', 'editor', 'admin')),
      allowed_tables TEXT NOT NULL DEFAULT '[]',
      failed_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until INTEGER NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}

/**
 * Seeds a default admin account if no users exist in the database.
 * Also seeds a demo editor account for visitors.
 * Default admin: admin@admin.com / admin1234
 * Demo account: demo@demo.com / demo1234 (editor role)
 */
function seedDefaultAdmin(db: Database.Database): void {
  const row = db.prepare("SELECT COUNT(*) as count FROM users").get() as {
    count: number;
  };

  if (row.count === 0) {
    const now = new Date().toISOString();

    // Admin account
    const adminHash = bcrypt.hashSync("admin1234", 10);
    db.prepare(
      `INSERT INTO users (id, email, password_hash, role, allowed_tables, failed_attempts, locked_until, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(uuidv4(), "admin@admin.com", adminHash, "admin", "[]", 0, null, now, now);

    // Demo account (editor role — can generate + execute SELECT)
    const demoHash = bcrypt.hashSync("demo1234", 10);
    db.prepare(
      `INSERT INTO users (id, email, password_hash, role, allowed_tables, failed_attempts, locked_until, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(uuidv4(), "demo@demo.com", demoHash, "editor", "[]", 0, null, now, now);
  }
}

/**
 * Closes the database connection. Useful for testing and graceful shutdown.
 */
export function closeDb(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

/**
 * Resets the singleton instance (for testing purposes).
 * Does NOT close the previous connection — call closeDb() first if needed.
 */
export function resetDbInstance(): void {
  dbInstance = null;
}
