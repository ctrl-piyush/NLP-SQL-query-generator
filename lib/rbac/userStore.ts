/**
 * RBAC User Store
 *
 * Provides user management functions for the RBAC system including
 * CRUD operations, authentication helpers, and account lockout logic.
 */

import { getDb } from "./db";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import type { Role, StoredUser, AuthUser } from "@/types/rbac";

/** Lockout duration in milliseconds (15 minutes). */
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

/** Number of consecutive failed attempts before account lockout. */
const MAX_FAILED_ATTEMPTS = 5;

/** Minimum bcrypt cost factor. */
const BCRYPT_COST = 10;

// ─── Row type from SQLite ──────────────────────────────────────────────────────

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  role: string;
  allowed_tables: string;
  failed_attempts: number;
  locked_until: number | null;
  created_at: string;
  updated_at: string;
}

// ─── Helper: map DB row → StoredUser ───────────────────────────────────────────

function rowToStoredUser(row: UserRow): StoredUser {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role as Role,
    allowedTables: JSON.parse(row.allowed_tables),
    lockedUntil: row.locked_until,
    failedAttempts: row.failed_attempts,
    createdAt: row.created_at,
  };
}

// ─── CRUD Functions (Task 2.2) ─────────────────────────────────────────────────

/**
 * Creates a new user with the given email and password.
 * Assigns the viewer role by default with an empty allowed_tables set.
 */
export function createUser(email: string, password: string): StoredUser {
  const db = getDb();

  // Validate email length (1-254 chars)
  if (!email || email.length > 254) {
    throw new Error("Email must be between 1 and 254 characters.");
  }

  // Validate password length (8-128 chars)
  if (!password || password.length < 8 || password.length > 128) {
    throw new Error("Password must be between 8 and 128 characters.");
  }

  // Check for duplicate email
  const existing = db
    .prepare("SELECT id FROM users WHERE email = ?")
    .get(email) as UserRow | undefined;
  if (existing) {
    throw new Error("A user with this email already exists.");
  }

  const id = uuidv4();
  const passwordHash = bcrypt.hashSync(password, BCRYPT_COST);
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO users (id, email, password_hash, role, allowed_tables, failed_attempts, locked_until, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, email, passwordHash, "viewer", "[]", 0, null, now, now);

  return {
    id,
    email,
    passwordHash,
    role: "viewer",
    allowedTables: [],
    lockedUntil: null,
    failedAttempts: 0,
    createdAt: now,
  };
}

/**
 * Retrieves a user by email address. Returns null if not found.
 */
export function getUserByEmail(email: string): StoredUser | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as
    | UserRow
    | undefined;
  if (!row) return null;
  return rowToStoredUser(row);
}

/**
 * Retrieves a user by ID. Returns null if not found.
 */
export function getUserById(id: string): StoredUser | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as
    | UserRow
    | undefined;
  if (!row) return null;
  return rowToStoredUser(row);
}

/**
 * Returns all users in the store.
 */
export function getAllUsers(): StoredUser[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM users").all() as UserRow[];
  return rows.map(rowToStoredUser);
}

/**
 * Updates a user's role. Rejects if it would remove the last admin.
 */
export function updateUserRole(userId: string, role: Role): void {
  const validRoles: Role[] = ["viewer", "editor", "admin"];
  if (!validRoles.includes(role)) {
    throw new Error("Role must be 'viewer', 'editor', or 'admin'.");
  }

  const db = getDb();

  // Check admin count invariant
  const user = db.prepare("SELECT role FROM users WHERE id = ?").get(userId) as
    | { role: string }
    | undefined;
  if (!user) {
    throw new Error("User not found.");
  }

  if (user.role === "admin" && role !== "admin") {
    const adminCount = db
      .prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'")
      .get() as { count: number };
    if (adminCount.count <= 1) {
      throw new Error(
        "Cannot remove the last admin. Assign another admin first."
      );
    }
  }

  const now = new Date().toISOString();
  db.prepare("UPDATE users SET role = ?, updated_at = ? WHERE id = ?").run(
    role,
    now,
    userId
  );
}

/**
 * Updates a user's allowed tables list.
 */
export function updateAllowedTables(userId: string, tables: string[]): void {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(
    "UPDATE users SET allowed_tables = ?, updated_at = ? WHERE id = ?"
  ).run(JSON.stringify(tables), now, userId);
}

/**
 * Returns the number of users with the admin role.
 */
export function countAdmins(): number {
  const db = getDb();
  const row = db
    .prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'")
    .get() as { count: number };
  return row.count;
}

// ─── Authentication Helpers (Task 2.3) ─────────────────────────────────────────

/**
 * Checks if an account is currently locked based on the locked_until timestamp.
 * Returns true if the current time is before the locked_until value.
 */
export function isAccountLocked(email: string): boolean {
  const db = getDb();
  const row = db
    .prepare("SELECT locked_until FROM users WHERE email = ?")
    .get(email) as { locked_until: number | null } | undefined;

  if (!row || row.locked_until === null) {
    return false;
  }

  return Date.now() < row.locked_until;
}

/**
 * Records a failed login attempt for the given email.
 * Increments the failed_attempts counter and locks the account
 * for 15 minutes if the counter reaches 5 consecutive failures.
 *
 * Returns an object indicating whether the account is now locked.
 */
export function recordFailedAttempt(email: string): { locked: boolean } {
  const db = getDb();
  const now = new Date().toISOString();

  const row = db
    .prepare("SELECT failed_attempts FROM users WHERE email = ?")
    .get(email) as { failed_attempts: number } | undefined;

  if (!row) {
    return { locked: false };
  }

  const newAttempts = row.failed_attempts + 1;

  if (newAttempts >= MAX_FAILED_ATTEMPTS) {
    // Lock the account for 15 minutes from now
    const lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
    db.prepare(
      "UPDATE users SET failed_attempts = ?, locked_until = ?, updated_at = ? WHERE email = ?"
    ).run(newAttempts, lockedUntil, now, email);
    return { locked: true };
  }

  db.prepare(
    "UPDATE users SET failed_attempts = ?, updated_at = ? WHERE email = ?"
  ).run(newAttempts, now, email);
  return { locked: false };
}

/**
 * Resets failed login attempts and clears any lockout for the given email.
 * Called after a successful login.
 */
export function resetFailedAttempts(email: string): void {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(
    "UPDATE users SET failed_attempts = 0, locked_until = NULL, updated_at = ? WHERE email = ?"
  ).run(now, email);
}

/**
 * Verifies a user's credentials.
 * Checks lockout status first, then compares the provided password against the stored hash.
 * On success, resets failed attempts and returns the AuthUser object.
 * On failure, records a failed attempt and returns null.
 */
export function verifyUser(
  email: string,
  password: string
): AuthUser | null {
  // Validate input lengths (Requirement 1.7)
  if (!email || email.length > 254) {
    return null;
  }
  if (!password || password.length < 8 || password.length > 128) {
    return null;
  }

  // Check if account is locked (Requirement 1.6)
  if (isAccountLocked(email)) {
    return null;
  }

  const db = getDb();
  const row = db
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(email) as UserRow | undefined;

  if (!row) {
    return null;
  }

  // Compare passwords using bcrypt
  const passwordMatch = bcrypt.compareSync(password, row.password_hash);

  if (!passwordMatch) {
    recordFailedAttempt(email);
    return null;
  }

  // Successful login — reset failed attempts
  resetFailedAttempts(email);

  return {
    id: row.id,
    email: row.email,
    role: row.role as Role,
    allowedTables: JSON.parse(row.allowed_tables),
  };
}
