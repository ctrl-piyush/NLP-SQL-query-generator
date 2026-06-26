import { Parser } from "node-sql-parser";
import type { DatabaseType } from "@/types";

export type StatementType = "SELECT" | "INSERT" | "UPDATE" | "DELETE" | "OTHER";

export function validateSingleStatement(
  sql: string,
  databaseType: DatabaseType
): { valid: boolean; error?: string } {
  const parser = new Parser();
  const dialect = databaseType === "mysql" ? "MySQL" : "PostgresQL";

  let ast;
  try {
    ast = parser.astify(sql, { database: dialect });
  } catch (parseError) {
    // If the parser can't parse it, we let it through — the database
    // will return the real syntax error. Our job here is ONLY to block
    // multi-statement input, not to validate SQL syntax.
    return { valid: true };
  }

  // parser.astify returns a single AST node for one statement,
  // or an array of AST nodes for multiple statements
  const statements = Array.isArray(ast) ? ast : [ast];

  if (statements.length > 1) {
    return {
      valid: false,
      error:
        "Multiple statements detected. Only one statement per execution is allowed " +
        "to prevent stacked-query injection.",
    };
  }

  return { valid: true };
}

/**
 * Classifies the effective operation type of a SQL statement by extracting
 * the first meaningful DML keyword, handling:
 * - Leading whitespace
 * - Block comments (delimited by slash-star and star-slash)
 * - Line comments (prefixed by --)
 * - CTE prefixes (WITH ... AS (...) followed by DML)
 *
 * This runs BEFORE the AST parse attempt, so it's available in both the
 * success and failure paths.
 */
export function classifyStatementType(sql: string): StatementType {
  // Step 1: Strip all comments (block and line) and leading whitespace
  const stripped = sql
    .replace(/\/\*[\s\S]*?\*\//g, "")   // remove block comments
    .replace(/--[^\n]*/g, "")             // remove line comments
    .trimStart();

  // Step 2: Normalize to uppercase for case-insensitive matching
  const upper = stripped.toUpperCase();

  // Step 3: Check for CTE prefix — WITH ... AS (...) <actual DML keyword>
  if (upper.startsWith("WITH")) {
    // Walk past all CTE definitions to find the terminal DML keyword.
    // CTEs have the shape: WITH name AS (subquery) [, name AS (subquery)]* <DML>
    // We track parenthesis depth to skip past the CTE subqueries.
    let i = 4; // skip "WITH"
    let depth = 0;
    let foundClosingParen = false;

    while (i < stripped.length) {
      const ch = stripped[i];
      if (ch === "(") {
        depth++;
        foundClosingParen = false;
      } else if (ch === ")") {
        depth--;
        if (depth === 0) foundClosingParen = true;
      } else if (depth === 0 && foundClosingParen) {
        // We're outside all CTE parentheses — look for the DML keyword
        const remainder = stripped.slice(i).trimStart().toUpperCase();
        if (remainder.startsWith(",")) {
          // Another CTE follows — continue scanning
          foundClosingParen = false;
          i++;
          continue;
        }
        if (remainder.startsWith("DELETE")) return "DELETE";
        if (remainder.startsWith("UPDATE")) return "UPDATE";
        if (remainder.startsWith("SELECT")) return "SELECT";
        if (remainder.startsWith("INSERT")) return "INSERT";
        return "OTHER";
      }
      i++;
    }
    // Malformed CTE — can't determine, treat as OTHER
    return "OTHER";
  }

  // Step 4: No CTE — check the first keyword directly
  if (upper.startsWith("DELETE")) return "DELETE";
  if (upper.startsWith("UPDATE")) return "UPDATE";
  if (upper.startsWith("SELECT")) return "SELECT";
  if (upper.startsWith("INSERT")) return "INSERT";
  return "OTHER";
}

/**
 * Determines whether a SQL statement requires user confirmation before execution.
 *
 * Returns true for UPDATE/DELETE statements without a WHERE clause (detected via AST),
 * or for unparseable UPDATE/DELETE statements (fail-closed).
 * Returns false for all other cases.
 */
export function requiresConfirmation(
  sql: string,
  databaseType: DatabaseType
): boolean {
  const parser = new Parser();
  const dialect = databaseType === "mysql" ? "MySQL" : "PostgresQL";

  // Step 1: Classify the statement type BEFORE attempting parse.
  // This is available in both success and failure paths.
  const statementType = classifyStatementType(sql);

  // Step 2: Attempt AST parse
  let ast;
  try {
    ast = parser.astify(sql, { database: dialect });
  } catch {
    // ─── PARSE FAILURE PATH ───────────────────────────────────────
    // Apply fail-closed for destructive statements, fail-open for others.
    //
    // - UPDATE/DELETE that fails to parse → return TRUE (require confirmation)
    //   Rationale: may be valid vendor-specific syntax (e.g., PG DELETE ... USING)
    //   that the parser doesn't support. Better to show an unnecessary dialog
    //   than to silently skip confirmation on a destructive query.
    //
    // - SELECT/INSERT/OTHER that fails to parse → return FALSE (no confirmation)
    //   Rationale: these cannot cause mass data loss. Let the DB return the
    //   real syntax error if the SQL is truly invalid.
    // ──────────────────────────────────────────────────────────────
    return statementType === "DELETE" || statementType === "UPDATE";
  }

  // Step 3: AST parse succeeded — inspect the node structurally
  const node = Array.isArray(ast) ? ast[0] : ast;

  // Only gate UPDATE and DELETE operations
  if (node.type !== "update" && node.type !== "delete") {
    return false;
  }

  // Check if the AST node has a WHERE clause
  // node.where is null/undefined when no WHERE is present
  return node.where == null;
}