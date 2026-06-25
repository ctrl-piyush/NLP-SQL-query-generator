"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { QueryHistoryEntry, DatabaseType, SchemaTable } from "@/types";

interface AppState {
  // Settings
  databaseType: DatabaseType;
  setDatabaseType: (db: DatabaseType) => void;

  // Custom schema
  customTables: SchemaTable[];
  setCustomTables: (tables: SchemaTable[]) => void;
  addTable: (table: SchemaTable) => void;
  removeTable: (name: string) => void;

  // History
  history: QueryHistoryEntry[];
  addToHistory: (entry: QueryHistoryEntry) => void;
  clearHistory: () => void;
  removeFromHistory: (id: string) => void;

  // UI state
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  schemaEditorOpen: boolean;
  setSchemaEditorOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      databaseType: "mysql",
      setDatabaseType: (db) => set({ databaseType: db }),

      customTables: [],
      setCustomTables: (tables) => set({ customTables: tables }),
      addTable: (table) =>
        set((state) => {
          const exists = state.customTables.find((t) => t.name === table.name);
          if (exists) return { customTables: state.customTables.map((t) => (t.name === table.name ? table : t)) };
          return { customTables: [...state.customTables, table] };
        }),
      removeTable: (name) =>
        set((state) => ({ customTables: state.customTables.filter((t) => t.name !== name) })),

      history: [],
      addToHistory: (entry) =>
        set((state) => ({
          history: [entry, ...state.history].slice(0, 50), // keep last 50
        })),
      clearHistory: () => set({ history: [] }),
      removeFromHistory: (id) =>
        set((state) => ({ history: state.history.filter((h) => h.id !== id) })),

      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      schemaEditorOpen: false,
      setSchemaEditorOpen: (open) => set({ schemaEditorOpen: open }),
    }),
    {
      name: "sql-generator-store",
      partialize: (state) => ({
        databaseType: state.databaseType,
        customTables: state.customTables,
        history: state.history,
      }),
    }
  )
);
