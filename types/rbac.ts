/**
 * RBAC Type Definitions
 *
 * Core types for the Role-Based Access Control system including roles,
 * users, permissions, and JWT payload structures.
 */

/** The three fixed roles in the RBAC system. */
export type Role = "viewer" | "editor" | "admin";

/** SQL operation types that the Permission Engine classifies. */
export type SQLOperation =
  | "SELECT"
  | "INSERT"
  | "UPDATE"
  | "DELETE"
  | "CREATE"
  | "DROP"
  | "ALTER"
  | "UNKNOWN";

/** The full user record as stored in SQLite. */
export interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  role: Role;
  allowedTables: string[];
  lockedUntil: number | null;
  failedAttempts: number;
  createdAt: string;
}

/**
 * The user object returned after authentication.
 * A subset of StoredUser suitable for session/token use.
 */
export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  allowedTables: string[];
}

/** Context passed to the Permission Engine for access decisions. */
export interface PermissionContext {
  role: Role;
  allowedTables: string[];
}

/** Result of a permission check — either allowed or denied with a reason. */
export type PermissionResult =
  | { allowed: true }
  | { allowed: false; reason: string };

/** JWT payload structure for session tokens issued by NextAuth. */
export interface JWTPayload {
  sub: string;
  email: string;
  role: Role;
  allowedTables: string[];
  iat: number;
  exp: number;
}
