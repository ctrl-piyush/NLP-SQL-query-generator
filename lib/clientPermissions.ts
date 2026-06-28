/**
 * Client-side permission utilities for UI adaptation.
 *
 * These are lightweight checks used ONLY for disabling/enabling UI elements.
 * The actual enforcement happens server-side in the Permission Engine.
 * These functions avoid importing node-sql-parser which is too heavy for
 * client bundles.
 */

import type { Role } from "@/types/rbac";
import type { SQLOperation } from "@/types";

/** DDL operations that are blocked for all roles. */
const DDL_OPERATIONS: SQLOperation[] = ["CREATE", "DROP", "ALTER"];

/**
 * Simple regex-based operation classifier for client-side use.
 * Falls back to checking the first keyword in the SQL string.
 * Not as accurate as the server-side parser but sufficient for UI hints.
 */
export function classifyOperationClient(sql: string): SQLOperation {
  const trimmed = sql.trim().toUpperCase();

  if (trimmed.startsWith("SELECT") || trimmed.startsWith("WITH")) return "SELECT";
  if (trimmed.startsWith("INSERT")) return "INSERT";
  if (trimmed.startsWith("UPDATE")) return "UPDATE";
  if (trimmed.startsWith("DELETE")) return "DELETE";
  if (trimmed.startsWith("CREATE")) return "CREATE";
  if (trimmed.startsWith("DROP")) return "DROP";
  if (trimmed.startsWith("ALTER")) return "ALTER";

  return "UNKNOWN";
}

/**
 * Simple regex-based table extractor for client-side use.
 * Extracts table names from FROM and JOIN clauses using regex.
 * Not as comprehensive as the server-side parser but adequate for UI hints.
 */
export function extractTablesClient(sql: string): string[] {
  const tables = new Set<string>();

  // Match FROM <table> patterns (handles comma-separated lists)
  const fromRegex = /\bFROM\s+([a-zA-Z_]\w*(?:\s*,\s*[a-zA-Z_]\w*)*)/gi;
  let match: RegExpExecArray | null;

  while ((match = fromRegex.exec(sql)) !== null) {
    const tableList = match[1];
    tableList.split(",").forEach((t) => {
      const tableName = t.trim().split(/\s/)[0]; // Take first word (ignore aliases)
      if (tableName) tables.add(tableName.toLowerCase());
    });
  }

  // Match JOIN <table> patterns
  const joinRegex = /\bJOIN\s+([a-zA-Z_]\w*)/gi;
  while ((match = joinRegex.exec(sql)) !== null) {
    tables.add(match[1].toLowerCase());
  }

  return Array.from(tables);
}

export interface ExecutePermissionResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Client-side check to determine if the execute button should be enabled.
 *
 * - Viewer: always disabled
 * - Editor: enabled only for SELECT on allowed tables
 * - Admin: enabled for all non-DDL queries
 *
 * This is a convenience check — server-side enforcement is the real guard.
 */
export function canExecuteClient(
  sql: string,
  role: Role,
  allowedTables: string[]
): ExecutePermissionResult {
  // Viewer: always disabled
  if (role === "viewer") {
    return { allowed: false, reason: "Execution requires a higher role" };
  }

  const operation = classifyOperationClient(sql);

  // Admin: allow everything except DDL
  if (role === "admin") {
    if (DDL_OPERATIONS.includes(operation)) {
      return { allowed: false, reason: "DDL operations are not permitted" };
    }
    return { allowed: true };
  }

  // Editor: only SELECT on allowed tables
  if (role === "editor") {
    if (operation !== "SELECT") {
      return {
        allowed: false,
        reason: `${operation} operations are not permitted for your role`,
      };
    }

    // Check table access (if allowedTables is defined and non-empty)
    if (allowedTables.length > 0) {
      const referencedTables = extractTablesClient(sql);
      const allowedSet = new Set(allowedTables.map((t) => t.toLowerCase()));

      for (const table of referencedTables) {
        if (!allowedSet.has(table)) {
          return {
            allowed: false,
            reason: `Access denied to table '${table}'`,
          };
        }
      }
    }

    return { allowed: true };
  }

  // Fallback — shouldn't reach here
  return { allowed: false, reason: "Unknown role" };
}
