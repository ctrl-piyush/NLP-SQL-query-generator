import { NextRequest, NextResponse } from "next/server";
import type { ConnectRequest, ConnectResponse, LiveTableInfo, LiveColumnInfo } from "@/types";

export const runtime = "nodejs";

/**
 * POST /api/connect
 *
 * Tests database connectivity and fetches schema metadata.
 * Creates an ephemeral connection that is closed in a finally block.
 * Password is never logged or persisted.
 */
export async function POST(req: NextRequest) {
  let connection: MysqlConnection | PgConnection | null = null;

  try {
    const body: ConnectRequest = await req.json();

    // ── Step 1: Validate required fields ──────────────────────────────────────
    const validationError = validateRequest(body);
    if (validationError) {
      return NextResponse.json(
        { success: false, message: validationError } satisfies ConnectResponse,
        { status: 400 }
      );
    }

    const { databaseType, host, port, user, password, database } = body;

    // ── Step 2: Create ephemeral connection ───────────────────────────────────
    try {
      connection = await createConnection(databaseType, host, port, user, password, database);
    } catch (err: unknown) {
      return NextResponse.json(
        { success: false, message: classifyConnectionError(err, host, port) } satisfies ConnectResponse,
        { status: 200 }
      );
    }

    // ── Step 3: Test connectivity ─────────────────────────────────────────────
    await connection.query("SELECT 1");

    // ── Step 4: Fetch schema metadata ─────────────────────────────────────────
    let schema: LiveTableInfo[];
    try {
      schema = await fetchLiveSchema(connection, databaseType, database);
    } catch {
      return NextResponse.json(
        { success: false, message: "Schema metadata could not be retrieved." } satisfies ConnectResponse,
        { status: 200 }
      );
    }

    // ── Step 5: Return success response ───────────────────────────────────────
    const response: ConnectResponse = {
      success: true,
      message: `Connected to ${database}. Found ${schema.length} table${schema.length !== 1 ? "s" : ""}.`,
      schema,
    };

    return NextResponse.json(response);
  } catch (err: unknown) {
    // Catch-all for unexpected errors — sanitize output
    return NextResponse.json(
      { success: false, message: sanitizeError(err) } satisfies ConnectResponse,
      { status: 200 }
    );
  } finally {
    // ── GUARANTEED cleanup — always close connection ───────────────────────────
    if (connection) {
      await connection.end().catch(() => {});
    }
  }
}

// ─── Request Validation ─────────────────────────────────────────────────────────

function validateRequest(body: ConnectRequest): string | null {
  if (!body.host || typeof body.host !== "string" || body.host.trim() === "") {
    return "Missing required field: host";
  }
  if (body.port == null || typeof body.port !== "number" || !Number.isInteger(body.port) || body.port < 1 || body.port > 65535) {
    return "Invalid field: port must be an integer between 1 and 65535";
  }
  if (!body.user || typeof body.user !== "string" || body.user.trim() === "") {
    return "Missing required field: user";
  }
  if (!body.database || typeof body.database !== "string" || body.database.trim() === "") {
    return "Missing required field: database";
  }
  // password is optional — can be empty string or undefined
  return null;
}

// ─── Connection Abstractions ────────────────────────────────────────────────────

interface MysqlConnection {
  query(sql: string): Promise<unknown>;
  end(): Promise<void>;
}

interface PgConnection {
  query(sql: string): Promise<{ rows: Record<string, unknown>[] }>;
  end(): Promise<void>;
}

type UnifiedConnection = {
  query(sql: string): Promise<unknown>;
  end(): Promise<void>;
};

async function createConnection(
  databaseType: string,
  host: string,
  port: number,
  user: string,
  password: string,
  database: string
): Promise<UnifiedConnection> {
  if (databaseType === "postgresql") {
    const { Client } = await import("pg");
    const client = new Client({
      host,
      port,
      user,
      password: password || undefined,
      database,
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
      host,
      port,
      user,
      password: password || undefined,
      database,
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

// ─── Schema Fetching ────────────────────────────────────────────────────────────

async function fetchLiveSchema(
  connection: UnifiedConnection,
  databaseType: string,
  database: string
): Promise<LiveTableInfo[]> {
  if (databaseType === "postgresql") {
    return fetchPostgresSchema(connection);
  } else {
    return fetchMysqlSchema(connection, database);
  }
}

async function fetchMysqlSchema(
  connection: UnifiedConnection,
  database: string
): Promise<LiveTableInfo[]> {
  // Fetch columns
  const columnsResult = await connection.query(`
    SELECT 
      c.TABLE_NAME,
      c.COLUMN_NAME,
      c.DATA_TYPE,
      c.IS_NULLABLE,
      c.COLUMN_DEFAULT
    FROM information_schema.COLUMNS c
    WHERE c.TABLE_SCHEMA = '${escapeSql(database)}'
    ORDER BY c.TABLE_NAME, c.ORDINAL_POSITION
  `) as Record<string, unknown>[];

  // Fetch primary keys
  const pkResult = await connection.query(`
    SELECT 
      kcu.TABLE_NAME,
      kcu.COLUMN_NAME
    FROM information_schema.KEY_COLUMN_USAGE kcu
    JOIN information_schema.TABLE_CONSTRAINTS tc
      ON kcu.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
      AND kcu.TABLE_SCHEMA = tc.TABLE_SCHEMA
      AND kcu.TABLE_NAME = tc.TABLE_NAME
    WHERE tc.TABLE_SCHEMA = '${escapeSql(database)}'
      AND tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
  `) as Record<string, unknown>[];

  // Fetch foreign keys
  const fkResult = await connection.query(`
    SELECT 
      kcu.TABLE_NAME,
      kcu.COLUMN_NAME,
      kcu.REFERENCED_TABLE_NAME,
      kcu.REFERENCED_COLUMN_NAME
    FROM information_schema.KEY_COLUMN_USAGE kcu
    JOIN information_schema.TABLE_CONSTRAINTS tc
      ON kcu.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
      AND kcu.TABLE_SCHEMA = tc.TABLE_SCHEMA
      AND kcu.TABLE_NAME = tc.TABLE_NAME
    WHERE tc.TABLE_SCHEMA = '${escapeSql(database)}'
      AND tc.CONSTRAINT_TYPE = 'FOREIGN KEY'
      AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
  `) as Record<string, unknown>[];

  // Build lookup sets
  const primaryKeys = new Set<string>();
  for (const row of pkResult) {
    primaryKeys.add(`${row.TABLE_NAME}.${row.COLUMN_NAME}`);
  }

  const foreignKeys = new Map<string, { referencedTable: string; referencedColumn: string }>();
  for (const row of fkResult) {
    foreignKeys.set(
      `${row.TABLE_NAME}.${row.COLUMN_NAME}`,
      {
        referencedTable: row.REFERENCED_TABLE_NAME as string,
        referencedColumn: row.REFERENCED_COLUMN_NAME as string,
      }
    );
  }

  // Assemble LiveTableInfo[]
  const tablesMap = new Map<string, LiveColumnInfo[]>();
  for (const row of columnsResult) {
    const tableName = row.TABLE_NAME as string;
    const columnName = row.COLUMN_NAME as string;
    const key = `${tableName}.${columnName}`;

    const column: LiveColumnInfo = {
      name: columnName,
      type: row.DATA_TYPE as string,
      isPrimary: primaryKeys.has(key),
      isNullable: (row.IS_NULLABLE as string) === "YES",
      defaultValue: row.COLUMN_DEFAULT != null ? String(row.COLUMN_DEFAULT) : null,
      foreignKey: foreignKeys.get(key) || null,
    };

    if (!tablesMap.has(tableName)) {
      tablesMap.set(tableName, []);
    }
    tablesMap.get(tableName)!.push(column);
  }

  const tables: LiveTableInfo[] = [];
  tablesMap.forEach((columns, name) => {
    tables.push({ name, columns });
  });

  return tables;
}

async function fetchPostgresSchema(
  connection: UnifiedConnection
): Promise<LiveTableInfo[]> {
  // Fetch columns (exclude system schemas)
  const columnsRaw = await connection.query(`
    SELECT 
      c.table_name,
      c.column_name,
      c.data_type,
      c.is_nullable,
      c.column_default
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
    ORDER BY c.table_name, c.ordinal_position
  `);
  const columnsResult = extractRows(columnsRaw);

  // Fetch primary keys
  const pkRaw = await connection.query(`
    SELECT 
      kcu.table_name,
      kcu.column_name
    FROM information_schema.key_column_usage kcu
    JOIN information_schema.table_constraints tc
      ON kcu.constraint_name = tc.constraint_name
      AND kcu.table_schema = tc.table_schema
      AND kcu.table_name = tc.table_name
    WHERE tc.table_schema = 'public'
      AND tc.constraint_type = 'PRIMARY KEY'
  `);
  const pkResult = extractRows(pkRaw);

  // Fetch foreign keys
  const fkRaw = await connection.query(`
    SELECT 
      kcu.table_name,
      kcu.column_name,
      ccu.table_name AS referenced_table_name,
      ccu.column_name AS referenced_column_name
    FROM information_schema.key_column_usage kcu
    JOIN information_schema.table_constraints tc
      ON kcu.constraint_name = tc.constraint_name
      AND kcu.table_schema = tc.table_schema
      AND kcu.table_name = tc.table_name
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
      AND tc.table_schema = ccu.table_schema
    WHERE tc.table_schema = 'public'
      AND tc.constraint_type = 'FOREIGN KEY'
  `);
  const fkResult = extractRows(fkRaw);

  // Build lookup sets
  const primaryKeys = new Set<string>();
  for (const row of pkResult) {
    primaryKeys.add(`${row.table_name}.${row.column_name}`);
  }

  const foreignKeys = new Map<string, { referencedTable: string; referencedColumn: string }>();
  for (const row of fkResult) {
    foreignKeys.set(
      `${row.table_name}.${row.column_name}`,
      {
        referencedTable: row.referenced_table_name as string,
        referencedColumn: row.referenced_column_name as string,
      }
    );
  }

  // Assemble LiveTableInfo[]
  const tablesMap = new Map<string, LiveColumnInfo[]>();
  for (const row of columnsResult) {
    const tableName = row.table_name as string;
    const columnName = row.column_name as string;
    const key = `${tableName}.${columnName}`;

    const column: LiveColumnInfo = {
      name: columnName,
      type: row.data_type as string,
      isPrimary: primaryKeys.has(key),
      isNullable: (row.is_nullable as string) === "YES",
      defaultValue: row.column_default != null ? String(row.column_default) : null,
      foreignKey: foreignKeys.get(key) || null,
    };

    if (!tablesMap.has(tableName)) {
      tablesMap.set(tableName, []);
    }
    tablesMap.get(tableName)!.push(column);
  }

  const tables: LiveTableInfo[] = [];
  tablesMap.forEach((columns, name) => {
    tables.push({ name, columns });
  });

  return tables;
}

// ─── Error Classification ───────────────────────────────────────────────────────

function classifyConnectionError(err: unknown, host: string, port: number): string {
  const error = err as { code?: string; message?: string };
  const code = error.code || "";
  const message = error.message || "";

  // Connection refused / host not found
  if (code === "ECONNREFUSED" || code === "ENOTFOUND" || message.includes("ECONNREFUSED") || message.includes("ENOTFOUND")) {
    return `Connection failed: Unable to reach ${host}:${port}. Verify the host and port are correct and the database server is running.`;
  }

  // Authentication errors
  if (code === "ER_ACCESS_DENIED_ERROR" || code === "28P01" || message.includes("Access denied") || message.includes("password authentication failed")) {
    return "Authentication failed: Access denied. Check your username and password.";
  }

  // Timeout
  if (code === "ETIMEDOUT" || code === "ECONNRESET" || message.includes("timeout") || message.includes("timed out")) {
    return `Connection failed: Timed out after 10 seconds. Verify the host and port are correct.`;
  }

  // Unknown database
  if (code === "ER_BAD_DB_ERROR" || message.includes("does not exist") || message.includes("Unknown database")) {
    return "Connection failed: The specified database does not exist.";
  }

  // Generic fallback — no stack trace
  return "Connection failed: Unable to establish a database connection. Check your credentials and try again.";
}

function sanitizeError(err: unknown): string {
  // Never expose raw stack traces or internal paths
  if (err instanceof Error) {
    const msg = err.message;
    // Strip any file paths
    const sanitized = msg.replace(/\s*(at\s+.*|\/[^\s]+\.(js|ts):[0-9]+:[0-9]+)/g, "").trim();
    if (sanitized.length > 0 && sanitized.length < 200) {
      return sanitized;
    }
  }
  return "An unexpected error occurred. Please try again.";
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function escapeSql(value: string): string {
  // Basic SQL escape for use in information_schema queries (no user-controlled dangerous input expected here)
  return value.replace(/'/g, "''");
}

function extractRows(result: unknown): Record<string, unknown>[] {
  // pg client returns { rows: [...] }, mysql returns the rows directly
  if (result && typeof result === "object" && "rows" in result) {
    return (result as { rows: Record<string, unknown>[] }).rows;
  }
  if (Array.isArray(result)) {
    return result;
  }
  return [];
}
