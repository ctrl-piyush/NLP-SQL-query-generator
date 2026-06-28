import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { ConnectResponse, LiveTableInfo, LiveColumnInfo } from "@/types";

export const runtime = "nodejs";

/**
 * POST /api/connect-demo
 *
 * Connects to the pre-configured demo database using server-side credentials.
 * Credentials are never exposed to the client.
 * Demo database is read-only (SELECT only) — enforced by RBAC permission engine.
 */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { success: false, message: "Please log in to continue." } satisfies ConnectResponse,
      { status: 401 }
    );
  }

  const host = process.env.DEMO_DB_HOST;
  const port = parseInt(process.env.DEMO_DB_PORT || "3306", 10);
  const user = process.env.DEMO_DB_USER;
  const password = process.env.DEMO_DB_PASSWORD;
  const database = process.env.DEMO_DB_NAME;

  if (!host || !user || !password || !database) {
    return NextResponse.json(
      { success: false, message: "Demo database is not configured." } satisfies ConnectResponse,
      { status: 503 }
    );
  }

  let connection: { query(sql: string): Promise<unknown>; end(): Promise<void> } | null = null;

  try {
    // Create connection using mysql2
    const mysql = await import("mysql2/promise");
    const conn = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
      connectTimeout: 10000,
      ssl: { rejectUnauthorized: true },
    });

    connection = {
      query: async (sql: string) => {
        const [rows] = await conn.query(sql);
        return rows;
      },
      end: async () => {
        await conn.end();
      },
    };

    // Test connectivity
    await connection.query("SELECT 1");

    // Fetch schema
    const schema = await fetchMysqlSchema(connection, database);

    const response: ConnectResponse = {
      success: true,
      message: `Connected to demo database. Found ${schema.length} table${schema.length !== 1 ? "s" : ""}.`,
      schema,
      isDemo: true,
    };

    return NextResponse.json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to connect to demo database.";
    return NextResponse.json(
      { success: false, message: `Demo connection failed: ${message}` } satisfies ConnectResponse,
      { status: 200 }
    );
  } finally {
    if (connection) {
      await connection.end().catch(() => {});
    }
  }
}

// ─── Schema Fetching (MySQL only for demo) ──────────────────────────────────────

async function fetchMysqlSchema(
  connection: { query(sql: string): Promise<unknown> },
  database: string
): Promise<LiveTableInfo[]> {
  const escapedDb = database.replace(/'/g, "''");

  const columnsResult = (await connection.query(`
    SELECT c.TABLE_NAME, c.COLUMN_NAME, c.DATA_TYPE, c.IS_NULLABLE, c.COLUMN_DEFAULT
    FROM information_schema.COLUMNS c
    WHERE c.TABLE_SCHEMA = '${escapedDb}'
    ORDER BY c.TABLE_NAME, c.ORDINAL_POSITION
  `)) as Record<string, unknown>[];

  const pkResult = (await connection.query(`
    SELECT kcu.TABLE_NAME, kcu.COLUMN_NAME
    FROM information_schema.KEY_COLUMN_USAGE kcu
    JOIN information_schema.TABLE_CONSTRAINTS tc
      ON kcu.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
      AND kcu.TABLE_SCHEMA = tc.TABLE_SCHEMA
      AND kcu.TABLE_NAME = tc.TABLE_NAME
    WHERE tc.TABLE_SCHEMA = '${escapedDb}' AND tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
  `)) as Record<string, unknown>[];

  const fkResult = (await connection.query(`
    SELECT kcu.TABLE_NAME, kcu.COLUMN_NAME, kcu.REFERENCED_TABLE_NAME, kcu.REFERENCED_COLUMN_NAME
    FROM information_schema.KEY_COLUMN_USAGE kcu
    JOIN information_schema.TABLE_CONSTRAINTS tc
      ON kcu.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
      AND kcu.TABLE_SCHEMA = tc.TABLE_SCHEMA
      AND kcu.TABLE_NAME = tc.TABLE_NAME
    WHERE tc.TABLE_SCHEMA = '${escapedDb}' AND tc.CONSTRAINT_TYPE = 'FOREIGN KEY'
      AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
  `)) as Record<string, unknown>[];

  const primaryKeys = new Set<string>();
  for (const row of pkResult) {
    primaryKeys.add(`${row.TABLE_NAME}.${row.COLUMN_NAME}`);
  }

  const foreignKeys = new Map<string, { referencedTable: string; referencedColumn: string }>();
  for (const row of fkResult) {
    foreignKeys.set(`${row.TABLE_NAME}.${row.COLUMN_NAME}`, {
      referencedTable: row.REFERENCED_TABLE_NAME as string,
      referencedColumn: row.REFERENCED_COLUMN_NAME as string,
    });
  }

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
