import {
  extractReferencedTables,
  classifyOperation,
  checkQueryPermission,
} from "@/lib/permissions";

describe("extractReferencedTables", () => {
  it("extracts table from simple SELECT", () => {
    const tables = extractReferencedTables("SELECT * FROM users");
    expect(tables).toEqual(["users"]);
  });

  it("extracts tables from JOIN clauses", () => {
    const tables = extractReferencedTables(
      "SELECT u.name, o.id FROM users u JOIN orders o ON u.id = o.user_id"
    );
    expect(tables).toContain("users");
    expect(tables).toContain("orders");
  });

  it("extracts tables from multiple JOINs", () => {
    const tables = extractReferencedTables(
      "SELECT * FROM users u INNER JOIN orders o ON u.id = o.user_id LEFT JOIN products p ON o.product_id = p.id"
    );
    expect(tables).toContain("users");
    expect(tables).toContain("orders");
    expect(tables).toContain("products");
  });

  it("extracts tables from subqueries", () => {
    const tables = extractReferencedTables(
      "SELECT * FROM users WHERE id IN (SELECT user_id FROM orders)"
    );
    expect(tables).toContain("users");
    expect(tables).toContain("orders");
  });

  it("extracts tables from CTEs", () => {
    const tables = extractReferencedTables(
      "WITH active_users AS (SELECT * FROM users WHERE active = 1) SELECT * FROM active_users JOIN orders ON active_users.id = orders.user_id"
    );
    expect(tables).toContain("users");
    expect(tables).toContain("orders");
  });

  it("extracts tables from INSERT statements", () => {
    const tables = extractReferencedTables(
      "INSERT INTO users (name, email) VALUES ('John', 'john@example.com')"
    );
    expect(tables).toContain("users");
  });

  it("extracts tables from UPDATE statements", () => {
    const tables = extractReferencedTables(
      "UPDATE users SET name = 'Jane' WHERE id = 1"
    );
    expect(tables).toContain("users");
  });

  it("extracts tables from DELETE statements", () => {
    const tables = extractReferencedTables("DELETE FROM users WHERE id = 1");
    expect(tables).toContain("users");
  });

  it("returns null for unparseable SQL", () => {
    const tables = extractReferencedTables("THIS IS NOT SQL AT ALL!!!");
    expect(tables).toBeNull();
  });

  it("returns null for empty string", () => {
    const tables = extractReferencedTables("");
    expect(tables).toBeNull();
  });

  it("extracts tables from nested subqueries in FROM clause", () => {
    const tables = extractReferencedTables(
      "SELECT * FROM (SELECT id FROM orders) AS sub JOIN users ON sub.id = users.order_id"
    );
    expect(tables).toContain("orders");
    expect(tables).toContain("users");
  });
});

describe("classifyOperation", () => {
  it("classifies SELECT", () => {
    expect(classifyOperation("SELECT * FROM users")).toBe("SELECT");
  });

  it("classifies INSERT", () => {
    expect(
      classifyOperation("INSERT INTO users (name) VALUES ('John')")
    ).toBe("INSERT");
  });

  it("classifies UPDATE", () => {
    expect(classifyOperation("UPDATE users SET name = 'Jane' WHERE id = 1")).toBe(
      "UPDATE"
    );
  });

  it("classifies DELETE", () => {
    expect(classifyOperation("DELETE FROM users WHERE id = 1")).toBe("DELETE");
  });

  it("classifies CREATE as DDL", () => {
    expect(
      classifyOperation("CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(255))")
    ).toBe("CREATE");
  });

  it("classifies DROP as DDL", () => {
    expect(classifyOperation("DROP TABLE users")).toBe("DROP");
  });

  it("classifies ALTER as DDL", () => {
    expect(
      classifyOperation("ALTER TABLE users ADD COLUMN email VARCHAR(255)")
    ).toBe("ALTER");
  });

  it("returns UNKNOWN for unparseable SQL", () => {
    expect(classifyOperation("THIS IS NOT VALID SQL")).toBe("UNKNOWN");
  });

  it("returns UNKNOWN for empty string", () => {
    expect(classifyOperation("")).toBe("UNKNOWN");
  });

  it("classifies CTE with SELECT", () => {
    expect(
      classifyOperation(
        "WITH cte AS (SELECT * FROM users) SELECT * FROM cte"
      )
    ).toBe("SELECT");
  });
});

describe("checkQueryPermission", () => {
  describe("viewer role", () => {
    it("rejects all execution attempts for viewer", () => {
      const result = checkQueryPermission("SELECT * FROM users", {
        role: "viewer",
        allowedTables: ["users"],
      });
      expect(result).toEqual({
        allowed: false,
        reason: "Your role (viewer) does not permit query execution.",
      });
    });

    it("rejects even with valid SQL for viewer", () => {
      const result = checkQueryPermission("INSERT INTO users (name) VALUES ('a')", {
        role: "viewer",
        allowedTables: [],
      });
      expect(result.allowed).toBe(false);
    });
  });

  describe("editor role", () => {
    it("allows SELECT on allowed tables", () => {
      const result = checkQueryPermission("SELECT * FROM users", {
        role: "editor",
        allowedTables: ["users"],
      });
      expect(result).toEqual({ allowed: true });
    });

    it("allows SELECT with case-insensitive table matching", () => {
      const result = checkQueryPermission("SELECT * FROM Users", {
        role: "editor",
        allowedTables: ["users"],
      });
      expect(result).toEqual({ allowed: true });
    });

    it("allows SELECT when allowedTables has different case", () => {
      const result = checkQueryPermission("SELECT * FROM users", {
        role: "editor",
        allowedTables: ["USERS"],
      });
      expect(result).toEqual({ allowed: true });
    });

    it("rejects SELECT on unauthorized table", () => {
      const result = checkQueryPermission("SELECT * FROM secrets", {
        role: "editor",
        allowedTables: ["users", "orders"],
      });
      expect(result).toEqual({
        allowed: false,
        reason: "Access denied to table 'secrets'. Contact your admin.",
      });
    });

    it("rejects INSERT for editor", () => {
      const result = checkQueryPermission("INSERT INTO users (name) VALUES ('a')", {
        role: "editor",
        allowedTables: ["users"],
      });
      expect(result).toEqual({
        allowed: false,
        reason: "Your role (editor) does not permit INSERT operations.",
      });
    });

    it("rejects UPDATE for editor", () => {
      const result = checkQueryPermission("UPDATE users SET name = 'b' WHERE id = 1", {
        role: "editor",
        allowedTables: ["users"],
      });
      expect(result).toEqual({
        allowed: false,
        reason: "Your role (editor) does not permit UPDATE operations.",
      });
    });

    it("rejects DELETE for editor", () => {
      const result = checkQueryPermission("DELETE FROM users WHERE id = 1", {
        role: "editor",
        allowedTables: ["users"],
      });
      expect(result).toEqual({
        allowed: false,
        reason: "Your role (editor) does not permit DELETE operations.",
      });
    });

    it("rejects DDL for editor", () => {
      const result = checkQueryPermission("DROP TABLE users", {
        role: "editor",
        allowedTables: ["users"],
      });
      expect(result).toEqual({
        allowed: false,
        reason: "Your role (editor) does not permit DROP operations.",
      });
    });

    it("rejects SELECT with mixed allowed and unauthorized tables", () => {
      const result = checkQueryPermission(
        "SELECT * FROM users JOIN secrets ON users.id = secrets.user_id",
        { role: "editor", allowedTables: ["users"] }
      );
      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        expect(result.reason).toContain("secrets");
      }
    });
  });

  describe("admin role", () => {
    it("allows SELECT on any table", () => {
      const result = checkQueryPermission("SELECT * FROM users", {
        role: "admin",
        allowedTables: [],
      });
      expect(result).toEqual({ allowed: true });
    });

    it("allows INSERT on any table", () => {
      const result = checkQueryPermission("INSERT INTO users (name) VALUES ('a')", {
        role: "admin",
        allowedTables: [],
      });
      expect(result).toEqual({ allowed: true });
    });

    it("allows UPDATE on any table", () => {
      const result = checkQueryPermission("UPDATE users SET name = 'b' WHERE id = 1", {
        role: "admin",
        allowedTables: [],
      });
      expect(result).toEqual({ allowed: true });
    });

    it("allows DELETE on any table", () => {
      const result = checkQueryPermission("DELETE FROM users WHERE id = 1", {
        role: "admin",
        allowedTables: [],
      });
      expect(result).toEqual({ allowed: true });
    });

    it("rejects CREATE for admin", () => {
      const result = checkQueryPermission(
        "CREATE TABLE test (id INT PRIMARY KEY)",
        { role: "admin", allowedTables: [] }
      );
      expect(result).toEqual({
        allowed: false,
        reason: "DDL operations (CREATE, DROP, ALTER) are not permitted.",
      });
    });

    it("rejects DROP for admin", () => {
      const result = checkQueryPermission("DROP TABLE users", {
        role: "admin",
        allowedTables: [],
      });
      expect(result).toEqual({
        allowed: false,
        reason: "DDL operations (CREATE, DROP, ALTER) are not permitted.",
      });
    });

    it("rejects ALTER for admin", () => {
      const result = checkQueryPermission(
        "ALTER TABLE users ADD COLUMN email VARCHAR(255)",
        { role: "admin", allowedTables: [] }
      );
      expect(result).toEqual({
        allowed: false,
        reason: "DDL operations (CREATE, DROP, ALTER) are not permitted.",
      });
    });
  });

  describe("unparseable SQL", () => {
    it("rejects unparseable SQL for admin", () => {
      const result = checkQueryPermission("NOT VALID SQL!!!", {
        role: "admin",
        allowedTables: [],
      });
      expect(result).toEqual({
        allowed: false,
        reason: "Could not validate query. Please check SQL syntax.",
      });
    });

    it("rejects unparseable SQL for editor", () => {
      const result = checkQueryPermission("GIBBERISH QUERY", {
        role: "editor",
        allowedTables: ["users"],
      });
      expect(result).toEqual({
        allowed: false,
        reason: "Could not validate query. Please check SQL syntax.",
      });
    });
  });
});
