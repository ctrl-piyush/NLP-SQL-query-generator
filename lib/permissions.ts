import { Parser } from "node-sql-parser";
import type { SQLOperation, PermissionContext, PermissionResult } from "@/types/rbac";
import type { LiveTableInfo } from "@/types";

/**
 * Permission Engine — pure-function module for RBAC enforcement.
 *
 * This module has no I/O or side effects. All functions are deterministic
 * and depend only on their inputs.
 */

const parser = new Parser();

/**
 * Extracts all table names referenced in a SQL statement, including tables
 * in FROM clauses, JOIN clauses, subqueries, and Common Table Expressions (CTEs).
 *
 * Returns null when the SQL cannot be parsed.
 */
export function extractReferencedTables(sql: string): string[] | null {
  try {
    const ast = parser.astify(sql, { database: "MySQL" });
    const statements = Array.isArray(ast) ? ast : [ast];

    // Empty input parses to an empty array — treat as unparseable
    if (statements.length === 0) {
      return null;
    }

    const tables = new Set<string>();

    for (const statement of statements) {
      collectTablesFromNode(statement, tables);
    }

    return Array.from(tables);
  } catch {
    return null;
  }
}

/**
 * Classifies the SQL operation type from the statement.
 * Returns "UNKNOWN" when the SQL cannot be parsed or the operation type
 * is not recognized.
 */
export function classifyOperation(sql: string): SQLOperation {
  try {
    const ast = parser.astify(sql, { database: "MySQL" });
    const statements = Array.isArray(ast) ? ast : [ast];

    // Empty input parses to an empty array
    if (statements.length === 0) {
      return "UNKNOWN";
    }

    const statement = statements[0];

    if (!statement || !statement.type) {
      return "UNKNOWN";
    }

    const type = statement.type.toLowerCase();

    switch (type) {
      case "select":
        return "SELECT";
      case "insert":
        return "INSERT";
      case "update":
        return "UPDATE";
      case "delete":
        return "DELETE";
      case "create":
        return "CREATE";
      case "drop":
        return "DROP";
      case "alter":
        return "ALTER";
      default:
        return "UNKNOWN";
    }
  } catch {
    return "UNKNOWN";
  }
}

/**
 * Checks if a user can execute a given SQL statement.
 * Pure function: no I/O, no side effects.
 *
 * Enforces the role permission matrix:
 * - Viewer: reject all execution attempts
 * - Editor: allow SELECT only on allowed tables, reject all other operations
 * - Admin: allow SELECT/INSERT/UPDATE/DELETE on any table, reject DDL
 * - Unparseable SQL is always rejected (fail-closed)
 */
export function checkQueryPermission(
  sql: string,
  context: PermissionContext
): PermissionResult {
  const { role, allowedTables } = context;

  // Viewer role: reject all execution attempts
  if (role === "viewer") {
    return {
      allowed: false,
      reason: "Your role (viewer) does not permit query execution.",
    };
  }

  // Classify the operation
  const operation = classifyOperation(sql);

  // If the SQL is unparseable (UNKNOWN operation and tables can't be extracted), reject
  if (operation === "UNKNOWN") {
    return {
      allowed: false,
      reason: "Could not validate query. Please check SQL syntax.",
    };
  }

  // Admin role logic
  if (role === "admin") {
    // Reject DDL operations
    if (operation === "CREATE" || operation === "DROP" || operation === "ALTER") {
      return {
        allowed: false,
        reason: "DDL operations (CREATE, DROP, ALTER) are not permitted.",
      };
    }
    // Allow SELECT, INSERT, UPDATE, DELETE on any table
    return { allowed: true };
  }

  // Editor role logic
  if (role === "editor") {
    // Reject non-SELECT operations
    if (operation !== "SELECT") {
      return {
        allowed: false,
        reason: `Your role (editor) does not permit ${operation} operations.`,
      };
    }

    // For SELECT, check table access
    const tables = extractReferencedTables(sql);

    // If tables can't be extracted, fail-closed
    if (tables === null) {
      return {
        allowed: false,
        reason: "Could not validate query. Please check SQL syntax.",
      };
    }

    // Case-insensitive comparison for table names
    const allowedTablesLower = allowedTables.map((t) => t.toLowerCase());

    for (const table of tables) {
      if (!allowedTablesLower.includes(table.toLowerCase())) {
        return {
          allowed: false,
          reason: `Access denied to table '${table}'. Contact your admin.`,
        };
      }
    }

    // All tables are allowed
    return { allowed: true };
  }

  // Fallback — should never reach here with valid Role types, but fail-closed
  return {
    allowed: false,
    reason: "Could not validate query. Please check SQL syntax.",
  };
}

/**
 * Recursively collects table names from an AST node.
 * Handles FROM clauses, JOIN clauses, subqueries, and CTEs.
 */
function collectTablesFromNode(node: any, tables: Set<string>): void {
  if (!node || typeof node !== "object") {
    return;
  }

  // Handle CTE (WITH clause) — collect tables from CTE bodies
  if (node.with) {
    const withClauses = Array.isArray(node.with) ? node.with : [node.with];
    for (const cte of withClauses) {
      if (cte.stmt) {
        collectTablesFromNode(cte.stmt, tables);
      }
    }
  }

  // Handle FROM clause — can be an array of table references
  if (node.from) {
    const fromItems = Array.isArray(node.from) ? node.from : [node.from];
    for (const item of fromItems) {
      extractTableFromRef(item, tables);
    }
  }

  // Handle JOIN clauses in from items (the parser puts joins in `from` array)
  // Additional JOIN handling for explicit join property
  if (node.join) {
    const joins = Array.isArray(node.join) ? node.join : [node.join];
    for (const join of joins) {
      extractTableFromRef(join, tables);
      // Recurse into join ON conditions for subqueries
      if (join.on) {
        collectTablesFromNode(join.on, tables);
      }
    }
  }

  // Handle table references in INSERT/UPDATE/DELETE targets
  if (node.table) {
    const tableRefs = Array.isArray(node.table) ? node.table : [node.table];
    for (const ref of tableRefs) {
      extractTableFromRef(ref, tables);
    }
  }

  // Handle WHERE clause (may contain subqueries)
  if (node.where) {
    collectTablesFromNode(node.where, tables);
  }

  // Handle HAVING clause (may contain subqueries)
  if (node.having) {
    collectTablesFromNode(node.having, tables);
  }

  // Handle SET clause in UPDATE (may contain subqueries)
  if (node.set) {
    const sets = Array.isArray(node.set) ? node.set : [node.set];
    for (const setItem of sets) {
      if (setItem && setItem.value) {
        collectTablesFromNode(setItem.value, tables);
      }
    }
  }

  // Handle VALUES in INSERT (may contain subqueries)
  if (node.values) {
    const values = Array.isArray(node.values) ? node.values : [node.values];
    for (const val of values) {
      collectTablesFromNode(val, tables);
    }
  }

  // Handle subqueries in expressions (e.g., WHERE col IN (SELECT ...))
  if (node.type === "select" && node !== undefined) {
    // This is a subquery — already handled by recursion
  }

  // Handle AST expression nodes with left/right
  if (node.left) {
    collectTablesFromNode(node.left, tables);
  }
  if (node.right) {
    collectTablesFromNode(node.right, tables);
  }

  // Handle expr property (common in node-sql-parser AST for expressions)
  if (node.expr) {
    collectTablesFromNode(node.expr, tables);
  }

  // Handle args for function calls that may contain subqueries
  if (node.args) {
    if (Array.isArray(node.args)) {
      for (const arg of node.args) {
        collectTablesFromNode(arg, tables);
      }
    } else if (typeof node.args === "object") {
      collectTablesFromNode(node.args, tables);
    }
  }

  // Handle columns array (may contain subqueries as column expressions)
  if (node.columns && Array.isArray(node.columns)) {
    for (const col of node.columns) {
      if (col && typeof col === "object") {
        collectTablesFromNode(col, tables);
      }
    }
  }

  // Handle UNION and compound SELECT statements
  if (node._next) {
    collectTablesFromNode(node._next, tables);
  }

  // Handle 'ast' property for subqueries wrapped in node-sql-parser format
  if (node.ast) {
    collectTablesFromNode(node.ast, tables);
  }

  // Handle value property for subquery expressions
  // node.value can be an array (e.g., expr_list in IN clauses) or an object
  if (node.value) {
    if (Array.isArray(node.value)) {
      for (const item of node.value) {
        if (item && typeof item === "object") {
          collectTablesFromNode(item, tables);
        }
      }
    } else if (typeof node.value === "object") {
      collectTablesFromNode(node.value, tables);
    }
  }
}

/**
 * Extracts table name from a table reference node.
 * Handles both direct table references and subquery sources.
 */
function extractTableFromRef(ref: any, tables: Set<string>): void {
  if (!ref || typeof ref !== "object") {
    return;
  }

  // Direct table reference — has a `table` property with the table name
  if (ref.table && typeof ref.table === "string") {
    tables.add(ref.table);
  }

  // Subquery in FROM clause — the `expr` field contains the subquery AST
  if (ref.expr) {
    collectTablesFromNode(ref.expr, tables);
  }

  // Handle join property on from items
  if (ref.join) {
    extractTableFromRef(ref.join, tables);
  }

  // Handle ON clause in joins
  if (ref.on) {
    collectTablesFromNode(ref.on, tables);
  }
}


/**
 * Filters a database schema to only include tables the user is authorized to see.
 *
 * - Admin role: returns the full schema unmodified.
 * - Editor/Viewer roles: returns only tables whose names appear in the user's
 *   allowedTables set (case-insensitive comparison).
 * - Output never contains tables not present in the original schema.
 *
 * Pure function: no I/O, no side effects.
 */
export function filterSchema(
  schema: LiveTableInfo[],
  context: PermissionContext
): LiveTableInfo[] {
  // Admin gets the full schema unmodified
  if (context.role === "admin") {
    return schema;
  }

  // Build a lowercase set of allowed table names for case-insensitive lookup
  const allowedSet = new Set(
    context.allowedTables.map((t) => t.toLowerCase())
  );

  // Return only tables whose names match the allowed set (case-insensitive)
  return schema.filter((table) => allowedSet.has(table.name.toLowerCase()));
}
