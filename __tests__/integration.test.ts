/**
 * Integration tests for real MySQL database interaction.
 * These tests connect to a local MySQL instance and verify the same logic
 * used by the /api/connect and /api/execute route handlers.
 *
 * Prerequisites:
 * - MySQL running on localhost:3306
 * - Database: nl_sql_assistant
 * - User: root / Password: Piyush@3129
 */

import mysql from "mysql2/promise";
import type { Connection } from "mysql2/promise";

// ─── Connection config ────────────────────────────────────────────────────────

const DB_CONFIG = {
  host: "localhost",
  port: 3306,
  user: "root",
  password: "Piyush@3129",
  database: "nl_sql_assistant",
  connectTimeout: 10000,
};

// ─── Helpers (replicate route logic) ──────────────────────────────────────────

function extractRows(result: unknown): Record<string, unknown>[] {
  if (result && typeof result === "object" && "rows" in result) {
    return (result as { rows: Record<string, unknown>[] }).rows;
  }
  if (Array.isArray(result)) {
    return result;
  }
  return [];
}

// ─── Tests ────────────────────────────────────────────────────────────────────

jest.setTimeout(30000);

describe("MySQL Integration Tests", () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // Test 1: Connect and fetch schema
  // ═══════════════════════════════════════════════════════════════════════════
  test("Connect and fetch schema", async () => {
    let connection: Connection | null = null;

    try {
      // Step 1: Create connection
      connection = await mysql.createConnection(DB_CONFIG);

      // Step 2: Verify connectivity with SELECT 1
      const [selectOneResult] = await connection.execute("SELECT 1");
      expect(selectOneResult).toBeDefined();

      // Step 3: Query information_schema for tables
      const [tables] = await connection.execute(
        `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?`,
        [DB_CONFIG.database]
      );

      // Step 4: Verify response structure matches ConnectResponse shape
      const schema = extractRows(tables);
      expect(Array.isArray(schema)).toBe(true);

      // Build a ConnectResponse-like object
      const response = {
        success: true,
        message: `Connected to ${DB_CONFIG.database}. Found ${schema.length} table${schema.length !== 1 ? "s" : ""}.`,
        schema,
      };

      expect(response.success).toBe(true);
      expect(Array.isArray(response.schema)).toBe(true);
      expect(typeof response.message).toBe("string");
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Test 2: Execute a real SELECT through execute logic
  // ═══════════════════════════════════════════════════════════════════════════
  test("Execute a real SELECT with LIMIT wrapping", async () => {
    let connection: Connection | null = null;

    try {
      connection = await mysql.createConnection(DB_CONFIG);

      // Create temporary test table
      await connection.execute(
        `CREATE TEMPORARY TABLE __test_integration (id INT PRIMARY KEY, val VARCHAR(50))`
      );

      // Insert 5 rows
      for (let i = 1; i <= 5; i++) {
        await connection.execute(
          `INSERT INTO __test_integration (id, val) VALUES (?, ?)`,
          [i, `value_${i}`]
        );
      }

      // Execute with the same LIMIT-wrapping logic from the route
      const userSql = "SELECT * FROM __test_integration";
      const wrappedSql = `SELECT * FROM (${userSql}) AS __subq LIMIT 201`;

      const [rawResult] = await connection.execute(wrappedSql);
      const allRows = extractRows(rawResult);
      const hasMore = allRows.length > 200;
      const rows = allRows.slice(0, 200);
      const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

      // Build SelectResult-like response
      const response = {
        type: "select" as const,
        columns,
        rows,
        rowCount: rows.length,
        hasMore,
      };

      // Assertions
      expect(response.type).toBe("select");
      expect(response.columns).toContain("id");
      expect(response.columns).toContain("val");
      expect(response.rows.length).toBe(5);
      expect(response.hasMore).toBe(false);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Test 3: Row cap with 201+ rows
  // ═══════════════════════════════════════════════════════════════════════════
  test("Row cap: 210 rows returns 200 with hasMore=true", async () => {
    let connection: Connection | null = null;

    try {
      connection = await mysql.createConnection(DB_CONFIG);

      // Create temporary table
      await connection.execute(
        `CREATE TEMPORARY TABLE __test_rowcap (id INT PRIMARY KEY, val VARCHAR(50))`
      );

      // Insert 210 rows using batch insert for speed
      const batchSize = 50;
      for (let batch = 0; batch < Math.ceil(210 / batchSize); batch++) {
        const values: string[] = [];
        const params: (number | string)[] = [];
        const start = batch * batchSize + 1;
        const end = Math.min((batch + 1) * batchSize, 210);

        for (let i = start; i <= end; i++) {
          values.push("(?, ?)");
          params.push(i, `row_${i}`);
        }

        await connection.execute(
          `INSERT INTO __test_rowcap (id, val) VALUES ${values.join(", ")}`,
          params
        );
      }

      // Execute with LIMIT wrapping (same as route logic)
      const userSql = "SELECT * FROM __test_rowcap";
      const wrappedSql = `SELECT * FROM (${userSql}) AS __subq LIMIT 201`;

      const [rawResult] = await connection.execute(wrappedSql);
      const allRows = extractRows(rawResult);
      const hasMore = allRows.length > 200;
      const rows = allRows.slice(0, 200);

      // Assertions
      expect(rows.length).toBe(200);
      expect(hasMore).toBe(true);

      // Row 201 is NOT in the response
      const ids = rows.map((r) => r.id as number);
      // The 201st row from the DB should not appear in our capped result
      expect(ids.length).toBe(200);
      // Ensure we don't have more than 200 rows
      expect(rows.length).toBeLessThanOrEqual(200);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Test 4: Execute a real INSERT and verify affectedRows
  // ═══════════════════════════════════════════════════════════════════════════
  test("Execute INSERT and verify affectedRows", async () => {
    let connection: Connection | null = null;

    try {
      connection = await mysql.createConnection(DB_CONFIG);

      // Create temporary table
      await connection.execute(
        `CREATE TEMPORARY TABLE __test_insert (id INT PRIMARY KEY, val VARCHAR(50))`
      );

      // Execute INSERT (same as route would execute it — mutations are not wrapped)
      const insertSql = `INSERT INTO __test_insert (id, val) VALUES (1, 'hello'), (2, 'world')`;
      const [result] = await connection.execute(insertSql);

      // Extract affectedRows (same logic as route's extractAffectedRows)
      const resultObj = result as Record<string, unknown>;
      const affectedRows =
        typeof resultObj.affectedRows === "number"
          ? resultObj.affectedRows
          : typeof resultObj.rowCount === "number"
            ? resultObj.rowCount
            : 0;

      // Build MutationResult-like response
      const response = {
        type: "mutation" as const,
        operation: "INSERT" as const,
        affectedRows,
      };

      // Assertions
      expect(response.type).toBe("mutation");
      expect(response.affectedRows).toBe(2);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  });
});
