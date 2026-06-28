"use client";

import { useState, useEffect, FormEvent } from "react";
import Link from "next/link";

interface User {
  id: string;
  email: string;
  role: "viewer" | "editor" | "admin";
  allowedTables: string[];
  createdAt: string;
}

export default function AdminPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Create user form state
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  // Track which user's allowed tables are being edited
  const [editingTables, setEditingTables] = useState<Record<string, string>>(
    {}
  );

  useEffect(() => {
    fetchUsers();
  }, []);

  // Auto-clear success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  async function fetchUsers() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/users");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch users.");
      }
      const data = await res.json();
      setUsers(data.users);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch users.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateUser(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setCreateLoading(true);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail, password: newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create user.");
      }

      setUsers((prev) => [...prev, data]);
      setNewEmail("");
      setNewPassword("");
      setSuccessMessage(`User "${data.email}" created successfully.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create user.");
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    setError(null);

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update role.");
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, ...data } : u))
      );
      setSuccessMessage(`Role updated to "${newRole}" successfully.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update role.");
    }
  }

  async function handleUpdateAllowedTables(userId: string) {
    setError(null);

    const rawValue = editingTables[userId];
    if (rawValue === undefined) return;

    const tables = rawValue
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowedTables: tables }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update allowed tables.");
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, ...data } : u))
      );
      // Clear editing state for this user
      setEditingTables((prev) => {
        const copy = { ...prev };
        delete copy[userId];
        return copy;
      });
      setSuccessMessage("Allowed tables updated successfully.");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to update allowed tables."
      );
    }
  }

  function startEditingTables(userId: string, currentTables: string[]) {
    setEditingTables((prev) => ({
      ...prev,
      [userId]: currentTables.join(", "),
    }));
  }

  return (
    <div className="min-h-screen bg-surface bg-grid-pattern bg-grid-size px-4 py-8">
      <div className="max-w-4xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
            <p className="text-sm text-gray-400 mt-1">
              Manage users, roles, and table permissions
            </p>
          </div>
          <Link
            href="/"
            className="px-4 py-2 rounded-lg bg-surface-card border border-surface-border text-gray-300 hover:text-white hover:border-brand-500/50 transition-colors text-sm"
          >
            ← Back to App
          </Link>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div
            className="mb-6 p-3 rounded-lg bg-accent-green/10 border border-accent-green/30 text-accent-green text-sm"
            role="status"
            aria-live="polite"
          >
            {successMessage}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div
            className="mb-6 p-3 rounded-lg bg-accent-red/10 border border-accent-red/30 text-accent-red text-sm"
            role="alert"
            aria-live="polite"
          >
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-3 text-accent-red/70 hover:text-accent-red underline text-xs"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Create User Form */}
        <div className="bg-surface-card border border-surface-border rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">
            Create New User
          </h2>
          <form onSubmit={handleCreateUser} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label htmlFor="new-email" className="sr-only">
                Email
              </label>
              <input
                id="new-email"
                type="email"
                placeholder="Email address"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
                maxLength={254}
                disabled={createLoading}
                className="w-full px-4 py-2.5 rounded-lg bg-surface border border-surface-border text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-colors disabled:opacity-50"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="new-password" className="sr-only">
                Password
              </label>
              <input
                id="new-password"
                type="password"
                placeholder="Password (min 8 chars)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                maxLength={128}
                disabled={createLoading}
                className="w-full px-4 py-2.5 rounded-lg bg-surface border border-surface-border text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-colors disabled:opacity-50"
              />
            </div>
            <button
              type="submit"
              disabled={createLoading}
              className="px-6 py-2.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/50 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {createLoading ? "Creating…" : "Create User"}
            </button>
          </form>
          <p className="mt-2 text-xs text-gray-500">
            New users are assigned the viewer role by default.
          </p>
        </div>

        {/* Users Table */}
        <div className="bg-surface-card border border-surface-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-surface-border">
            <h2 className="text-lg font-semibold text-white">Users</h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-400">
              Loading users…
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              No users found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border text-gray-400">
                    <th className="text-left px-6 py-3 font-medium">Email</th>
                    <th className="text-left px-6 py-3 font-medium">Role</th>
                    <th className="text-left px-6 py-3 font-medium">
                      Allowed Tables
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-surface-border last:border-b-0 hover:bg-surface-hover transition-colors"
                    >
                      {/* Email */}
                      <td className="px-6 py-4 text-white">{user.email}</td>

                      {/* Role Dropdown */}
                      <td className="px-6 py-4">
                        <select
                          value={user.role}
                          onChange={(e) =>
                            handleRoleChange(user.id, e.target.value)
                          }
                          aria-label={`Role for ${user.email}`}
                          className="px-3 py-1.5 rounded-lg bg-surface border border-surface-border text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-colors cursor-pointer"
                        >
                          <option value="viewer">viewer</option>
                          <option value="editor">editor</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>

                      {/* Allowed Tables */}
                      <td className="px-6 py-4">
                        {user.role === "editor" ? (
                          <div className="flex items-center gap-2">
                            {editingTables[user.id] !== undefined ? (
                              <>
                                <input
                                  type="text"
                                  value={editingTables[user.id]}
                                  onChange={(e) =>
                                    setEditingTables((prev) => ({
                                      ...prev,
                                      [user.id]: e.target.value,
                                    }))
                                  }
                                  placeholder="table1, table2, table3"
                                  aria-label={`Allowed tables for ${user.email}`}
                                  className="flex-1 px-3 py-1.5 rounded-lg bg-surface border border-surface-border text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-colors text-xs"
                                />
                                <button
                                  onClick={() =>
                                    handleUpdateAllowedTables(user.id)
                                  }
                                  className="px-3 py-1.5 rounded-lg bg-accent-green/20 border border-accent-green/30 text-accent-green hover:bg-accent-green/30 transition-colors text-xs font-medium"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() =>
                                    setEditingTables((prev) => {
                                      const copy = { ...prev };
                                      delete copy[user.id];
                                      return copy;
                                    })
                                  }
                                  className="px-3 py-1.5 rounded-lg bg-surface border border-surface-border text-gray-400 hover:text-white transition-colors text-xs"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <span className="text-gray-300 text-xs">
                                  {user.allowedTables.length > 0
                                    ? user.allowedTables.join(", ")
                                    : "None"}
                                </span>
                                <button
                                  onClick={() =>
                                    startEditingTables(
                                      user.id,
                                      user.allowedTables
                                    )
                                  }
                                  className="px-2 py-1 rounded bg-surface border border-surface-border text-gray-400 hover:text-white hover:border-brand-500/50 transition-colors text-xs"
                                >
                                  Edit
                                </button>
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-500 text-xs italic">
                            {user.role === "admin"
                              ? "All tables (admin)"
                              : "N/A (viewer)"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
