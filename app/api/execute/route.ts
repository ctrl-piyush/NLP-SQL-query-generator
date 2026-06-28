import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkQueryPermission } from "@/lib/permissions";
import {
  validateSingleStatement,
  requiresConfirmation,
  classifyStatementType,
} from "@/lib/sqlValidator";
import type {
  ExecuteRequest,
  ExecutionError,
  SelectResult,
  MutationResult,
  ConnectionConfig,
} from "@/types";

export const runtime = "nodejs";

/**
 * POST /api/execute
 *
 * Validates and executes a single SQL statement against a user-provided database.
 *
 * Order of operations:
 * 1. Validate original SQL (single-statement check + WHERE guard)
 * 2. Wrap for row cap (SELECT only)
 * 3. Execute against database
 * 4. Format and return structured response
 *
 * Connection is always closed in a finally block.
 */
export async function POST(req: NextRequest) {
  let connection: UnifiedConnection | null = null;

  try {
    const body: ExecuteRequest = await req.json();
    const { sql, connectionConfig, confirm } = body;

    // ── Authentication check ──────────────────────────────────────────────────
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        {
          type: "error",
          code: "AUTH_REQUIRED",
          message: "Please log in to continue.",
        } satisfies ExecutionError,
        { status: 401 }
      );
    }

    // ── Permission check ──────────────────────────────────────────────────────
    if (sql && sql.trim().length > 0) {
      const permissionResult = checkQueryPermission(sql, {
        role: session.user.role,
        allowedTables: session.user.allowedTables,
      });
      if (!permissionResult.allowed) {
        return NextResponse.json(
          {
            type: "error",
            code: "PERMISSION_DENIED",
            message: permissionResult.reason,
          } satisfies ExecutionError,
          { status: 403 }
        );
      }
    }

    // ── Reject empty/whitespace SQL ───────────────────────────────────────────
    if (!sql || sql.trim().length === 0) {
      return NextResponse.json(
        {
          type: "error",
          code: "EMPTY_SQL",
          message: "SQL input is required.",
        } satisfies ExecutionError,
        { status: 400 }
      );
    }

    const trimmedSql = sql.trim();

    // ══════════════════════════════════════════════════════════════════════════
    // PHASE 1: VALIDATION (on ORIGINAL user SQL)
    // ══════════════════════════════════════════════════════════════════════════

    // Single statement validation
    const validation = validateSingleStatement(trimmedSql, connectionConfig.databaseType);
    if (!validation.valid) {
      return NextResponse.json(
        {
          type: "error",
          code: "MULTI_STATEMENT",
          message: validation.error!,
        } satisfies ExecutionError,
        { status: 400 }
      );
    }

    // WHERE clause guard
    if (requiresConfirmation(trimmedSql, connectionConfig.databaseType) && confirm !== true) {
      return NextResponse.json(
        {
          type: "error",
          code: "CONFIRMATION_REQUIRED",
          message:
            "This UPDATE/DELETE has no WHERE clause. Execution requires explicit confirmation to prevent accidental mass data modification.",
        } satisfies ExecutionError,
        { status: 400 }
      );
    }

    // Determine operation type
    const operationType = classifyStatementType(trimmedSql);

    // ══════════════════════════════════════════════════════════════════════════
    // PHASE 2: WRAPPING (only for SELECT — row cap at DB level)
    // ══════════════════════════════════════════════════════════════════════════

    // Strip trailing semicolons before wrapping — they break subquery syntax
    const cleanedSql = trimmedSql.replace(/;\s*$/, "");

    let executableSql = cleanedSql;
    if (operationType === "SELECT") {
      if (connectionConfig.databaseType === "mysql") {
        executableSql = `SELECT * FROM (${cleanedSql}) AS __subq LIMIT 201`;
      } else {
        executableSql = `SELECT * FROM (${cleanedSql}) AS __subq FETCH FIRST 201 ROWS ONLY`;
      }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // PHASE 3: EXECUTION
    // ══════════════════════════════════════════════════════════════════════════

    connection = await createConnection(connectionConfig);
    const startTime = performance.now();
    const result = await connection.query(executableSql);
    const executionTimeMs = Math.round(performance.now() - startTime);

    if (operationType === "SELECT") {
      const allRows = extractRows(result);
      const hasMore = allRows.length > 200;
      const rows = allRows.slice(0, 200); // 201st row never leaves the server
      const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

      return NextResponse.json({
        type: "select",
        columns,
        rows,
        rowCount: rows.length,
        hasMore,
        executionTimeMs,
      } satisfies SelectResult);
    } else {
      const affectedRows = extractAffectedRows(result);
      return NextResponse.json({
        type: "mutation",
        operation: operationType as "INSERT" | "UPDATE" | "DELETE",
        affectedRows,
        executionTimeMs,
      } satisfies MutationResult);
    }
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string; detail?: string };
    return NextResponse.json(
      {
        type: "error",
        code: error.code ?? "QUERY_ERROR",
        message: error.message ?? "Query execution failed",
        detail: error.detail ?? undefined,
      } satisfies ExecutionError,
      { status: 200 }
    );
  } finally {
    // ── GUARANTEED cleanup — always close connection ───────────────────────────
    if (connection) {
      await connection.end().catch(() => {});
    }
  }
}

// ─── Connection Abstraction ─────────────────────────────────────────────────────

interface UnifiedConnection {
  query(sql: string): Promise<unknown>;
  end(): Promise<void>;
}

async function createConnection(config: ConnectionConfig): Promise<UnifiedConnection> {
  if (config.databaseType === "postgresql") {
    const { Client } = await import("pg");
    const client = new Client({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password || undefined,
      database: config.database,
      connectionTimeoutMillis: 10000,
    });
    await client.connect();
    return {
      query: async (sql: string) => {
        const result = await client.query(sql);
        return result;
      },
      end: async () => {
        await client.end();
      },
    };
  } else {
    // Default: MySQL
    const mysql = await import("mysql2/promise");
    const conn = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password || undefined,
      database: config.database,
      connectTimeout: 10000,
    });
    return {
      query: async (sql: string) => {
        const [rows] = await conn.query(sql);
        return rows;
      },
      end: async () => {
        await conn.end();
      },
    };
  }
}

// ─── Result Extraction Helpers ──────────────────────────────────────────────────

/**
 * Extracts rows from the query result.
 * - pg returns { rows: [...] }
 * - mysql2 returns the rows array directly (via our wrapper)
 */
function extractRows(result: unknown): Record<string, unknown>[] {
  if (result && typeof result === "object" && "rows" in result) {
    return (result as { rows: Record<string, unknown>[] }).rows;
  }
  if (Array.isArray(result)) {
    return result;
  }
  return [];
}

/**
 * Extracts affected row count from mutation results.
 * - mysql2: result.affectedRows
 * - pg: result.rowCount
 */
function extractAffectedRows(result: unknown): number {
  if (result && typeof result === "object") {
    const r = result as Record<string, unknown>;
    if (typeof r.affectedRows === "number") return r.affectedRows;
    if (typeof r.rowCount === "number") return r.rowCount;
  }
  return 0;
}
