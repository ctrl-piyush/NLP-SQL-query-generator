/**
 * Unit tests for authentication helpers in userStore.ts
 * Tests: verifyUser, recordFailedAttempt, resetFailedAttempts, isAccountLocked
 */

import { getDb, closeDb, resetDbInstance } from "@/lib/rbac/db";
import {
  createUser,
  verifyUser,
  recordFailedAttempt,
  resetFailedAttempts,
  isAccountLocked,
  getUserByEmail,
} from "@/lib/rbac/userStore";
import path from "path";
import fs from "fs";

const TEST_DB_PATH = path.join(__dirname, "test-auth-helpers.db");

beforeAll(() => {
  process.env.RBAC_DB_PATH = TEST_DB_PATH;
  // Initialize the database once
  getDb();
});

beforeEach(() => {
  // Clear the users table between tests and re-seed
  const db = getDb();
  db.exec("DELETE FROM users");
});

afterAll(() => {
  closeDb();
  resetDbInstance();
  try {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    // Also remove WAL/SHM files if they exist
    if (fs.existsSync(TEST_DB_PATH + "-wal")) {
      fs.unlinkSync(TEST_DB_PATH + "-wal");
    }
    if (fs.existsSync(TEST_DB_PATH + "-shm")) {
      fs.unlinkSync(TEST_DB_PATH + "-shm");
    }
  } catch {
    // Ignore cleanup errors on Windows
  }
  delete process.env.RBAC_DB_PATH;
});

describe("verifyUser", () => {
  it("returns AuthUser on valid credentials", () => {
    createUser("test@example.com", "password123");
    const result = verifyUser("test@example.com", "password123");
    expect(result).not.toBeNull();
    expect(result!.email).toBe("test@example.com");
    expect(result!.role).toBe("viewer");
    expect(result!.allowedTables).toEqual([]);
  });

  it("returns null on wrong password", () => {
    createUser("test@example.com", "password123");
    const result = verifyUser("test@example.com", "wrongpassword");
    expect(result).toBeNull();
  });

  it("returns null on non-existent email", () => {
    const result = verifyUser("nobody@example.com", "password123");
    expect(result).toBeNull();
  });

  it("returns null when email is empty", () => {
    const result = verifyUser("", "password123");
    expect(result).toBeNull();
  });

  it("returns null when password is too short (< 8 chars)", () => {
    createUser("test@example.com", "password123");
    const result = verifyUser("test@example.com", "short");
    expect(result).toBeNull();
  });

  it("returns null when password exceeds 128 chars", () => {
    createUser("test@example.com", "password123");
    const longPassword = "a".repeat(129);
    const result = verifyUser("test@example.com", longPassword);
    expect(result).toBeNull();
  });

  it("returns null when account is locked", () => {
    createUser("test@example.com", "password123");
    // Lock the account by failing 5 times
    for (let i = 0; i < 5; i++) {
      recordFailedAttempt("test@example.com");
    }
    // Now even valid credentials should fail
    const result = verifyUser("test@example.com", "password123");
    expect(result).toBeNull();
  });

  it("resets failed attempts after successful login", () => {
    createUser("test@example.com", "password123");
    // Record 3 failed attempts
    recordFailedAttempt("test@example.com");
    recordFailedAttempt("test@example.com");
    recordFailedAttempt("test@example.com");

    // Successful login should reset
    verifyUser("test@example.com", "password123");

    const user = getUserByEmail("test@example.com");
    expect(user!.failedAttempts).toBe(0);
    expect(user!.lockedUntil).toBeNull();
  });
});

describe("recordFailedAttempt", () => {
  it("increments failed attempts counter", () => {
    createUser("test@example.com", "password123");
    recordFailedAttempt("test@example.com");
    const user = getUserByEmail("test@example.com");
    expect(user!.failedAttempts).toBe(1);
  });

  it("returns locked: false when under threshold", () => {
    createUser("test@example.com", "password123");
    const result = recordFailedAttempt("test@example.com");
    expect(result.locked).toBe(false);
  });

  it("returns locked: true on 5th consecutive failure", () => {
    createUser("test@example.com", "password123");
    for (let i = 0; i < 4; i++) {
      const result = recordFailedAttempt("test@example.com");
      expect(result.locked).toBe(false);
    }
    const result = recordFailedAttempt("test@example.com");
    expect(result.locked).toBe(true);
  });

  it("sets locked_until when threshold reached", () => {
    createUser("test@example.com", "password123");
    for (let i = 0; i < 5; i++) {
      recordFailedAttempt("test@example.com");
    }
    const user = getUserByEmail("test@example.com");
    expect(user!.lockedUntil).not.toBeNull();
    // locked_until should be ~15 minutes from now
    const fifteenMinutesMs = 15 * 60 * 1000;
    const expectedMin = Date.now() - 1000; // allow 1s tolerance
    const expectedMax = Date.now() + fifteenMinutesMs + 1000;
    expect(user!.lockedUntil!).toBeGreaterThan(expectedMin);
    expect(user!.lockedUntil!).toBeLessThan(expectedMax);
  });

  it("returns locked: false for non-existent email", () => {
    const result = recordFailedAttempt("nobody@example.com");
    expect(result.locked).toBe(false);
  });
});

describe("resetFailedAttempts", () => {
  it("resets counter to 0 and clears locked_until", () => {
    createUser("test@example.com", "password123");
    // Lock the account
    for (let i = 0; i < 5; i++) {
      recordFailedAttempt("test@example.com");
    }
    // Reset
    resetFailedAttempts("test@example.com");
    const user = getUserByEmail("test@example.com");
    expect(user!.failedAttempts).toBe(0);
    expect(user!.lockedUntil).toBeNull();
  });
});

describe("isAccountLocked", () => {
  it("returns false for a non-locked account", () => {
    createUser("test@example.com", "password123");
    expect(isAccountLocked("test@example.com")).toBe(false);
  });

  it("returns true for a locked account", () => {
    createUser("test@example.com", "password123");
    for (let i = 0; i < 5; i++) {
      recordFailedAttempt("test@example.com");
    }
    expect(isAccountLocked("test@example.com")).toBe(true);
  });

  it("returns false for non-existent email", () => {
    expect(isAccountLocked("nobody@example.com")).toBe(false);
  });

  it("returns false after lockout period has expired", () => {
    createUser("test@example.com", "password123");
    // Manually set locked_until to a past time
    const db = getDb();
    const pastTime = Date.now() - 1000; // 1 second in the past
    db.prepare("UPDATE users SET locked_until = ? WHERE email = ?").run(
      pastTime,
      "test@example.com"
    );
    expect(isAccountLocked("test@example.com")).toBe(false);
  });
});
