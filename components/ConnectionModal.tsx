"use client";

import { useState, useEffect } from "react";
import { Database, X, Loader2, Plug } from "lucide-react";
import { useConnectionStore } from "@/lib/connectionStore";
import toast from "react-hot-toast";
import type { DatabaseType, ConnectResponse } from "@/types";

interface ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_PORTS: Record<DatabaseType, number> = {
  mysql: 3306,
  postgresql: 5432,
};

export default function ConnectionModal({ isOpen, onClose }: ConnectionModalProps) {
  const { setConnection } = useConnectionStore();

  const [databaseType, setDatabaseType] = useState<DatabaseType>("postgresql");
  const [host, setHost] = useState("localhost");
  const [port, setPort] = useState(5432);
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [database, setDatabase] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Auto-fill port when databaseType changes
  useEffect(() => {
    setPort(DEFAULT_PORTS[databaseType]);
  }, [databaseType]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch("/api/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          databaseType,
          host,
          port,
          user,
          password,
          database,
        }),
      });

      const data: ConnectResponse = await res.json();

      if (data.success && data.schema) {
        setConnection(
          { databaseType, host, port, user, password, database },
          data.schema
        );
        toast.success(data.message || "Connected successfully");
        onClose();
      } else {
        toast.error(data.message || "Connection failed");
      }
    } catch {
      toast.error("Network error — could not reach the server");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-md flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-600/20 flex items-center justify-center">
              <Database size={16} className="text-brand-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Connect Database</h2>
              <p className="text-xs text-gray-500">Enter your database credentials</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="w-8 h-8 rounded-lg hover:bg-surface-hover flex items-center justify-center text-gray-500 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Database Type */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Database Type
            </label>
            <select
              value={databaseType}
              onChange={(e) => setDatabaseType(e.target.value as DatabaseType)}
              disabled={isLoading}
              className="w-full bg-surface-border/30 border border-surface-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/60 disabled:opacity-50"
            >
              <option value="mysql">MySQL</option>
              <option value="postgresql">PostgreSQL</option>
            </select>
          </div>

          {/* Host & Port */}
          <div className="grid grid-cols-[1fr_100px] gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Host
              </label>
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="localhost"
                disabled={isLoading}
                className="w-full bg-surface-border/30 border border-surface-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/60 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Port
              </label>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(Number(e.target.value))}
                min={1}
                max={65535}
                disabled={isLoading}
                className="w-full bg-surface-border/30 border border-surface-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/60 disabled:opacity-50"
              />
            </div>
          </div>

          {/* User */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              User
            </label>
            <input
              type="text"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              placeholder="root"
              disabled={isLoading}
              className="w-full bg-surface-border/30 border border-surface-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/60 disabled:opacity-50"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isLoading}
              className="w-full bg-surface-border/30 border border-surface-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/60 disabled:opacity-50"
            />
          </div>

          {/* Database Name */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Database Name
            </label>
            <input
              type="text"
              value={database}
              onChange={(e) => setDatabase(e.target.value)}
              placeholder="my_database"
              disabled={isLoading}
              className="w-full bg-surface-border/30 border border-surface-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/60 disabled:opacity-50"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading || !host.trim() || !user.trim() || !database.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:bg-brand-600/50 disabled:cursor-not-allowed text-white text-sm rounded-xl transition-colors font-medium"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Testing Connection…
                </>
              ) : (
                <>
                  <Plug size={16} />
                  Connect
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
