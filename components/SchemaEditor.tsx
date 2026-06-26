"use client";

import { useState } from "react";
import { X, Plus, Trash2, Table2, Save, Database, Plug, Key, Link } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useConnectionStore } from "@/lib/connectionStore";
import type { SchemaTable } from "@/types";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const COLUMN_TYPES = [
  "INT", "BIGINT", "SMALLINT", "TINYINT", "DECIMAL", "FLOAT", "DOUBLE",
  "VARCHAR(255)", "VARCHAR(100)", "VARCHAR(50)", "TEXT", "LONGTEXT",
  "DATE", "DATETIME", "TIMESTAMP", "TIME", "YEAR",
  "BOOLEAN", "ENUM", "JSON", "BLOB",
];

const DEFAULT_TABLE: SchemaTable = {
  name: "",
  columns: [{ name: "id", type: "INT", constraints: "PRIMARY KEY AUTO_INCREMENT" }],
};

export default function SchemaEditor() {
  const { customTables, addTable, removeTable, setSchemaEditorOpen } = useAppStore();
  const { isConnected, databaseName, liveSchema } = useConnectionStore();
  const [editingTable, setEditingTable] = useState<SchemaTable>({ ...DEFAULT_TABLE, columns: [...DEFAULT_TABLE.columns] });
  const [mode, setMode] = useState<"list" | "add">("list");

  const handleAddColumn = () => {
    setEditingTable((t) => ({
      ...t,
      columns: [...t.columns, { name: "", type: "VARCHAR(255)", constraints: "" }],
    }));
  };

  const handleRemoveColumn = (idx: number) => {
    setEditingTable((t) => ({
      ...t,
      columns: t.columns.filter((_, i) => i !== idx),
    }));
  };

  const handleColumnChange = (idx: number, field: string, value: string) => {
    setEditingTable((t) => ({
      ...t,
      columns: t.columns.map((c, i) => (i === idx ? { ...c, [field]: value } : c)),
    }));
  };

  const handleSaveTable = () => {
    if (!editingTable.name.trim()) {
      toast.error("Please enter a table name");
      return;
    }
    if (editingTable.columns.some((c) => !c.name.trim())) {
      toast.error("All columns must have a name");
      return;
    }
    addTable({ ...editingTable, name: editingTable.name.trim().toUpperCase() });
    toast.success(`Table "${editingTable.name.trim().toUpperCase()}" saved!`);
    setEditingTable({ ...DEFAULT_TABLE, columns: [{ name: "id", type: "INT", constraints: "PRIMARY KEY AUTO_INCREMENT" }] });
    setMode("list");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-600/20 flex items-center justify-center">
              <Database size={16} className="text-brand-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Schema Editor</h2>
              <p className="text-xs text-gray-500">Define your database tables for better query generation</p>
            </div>
          </div>
          <button
            onClick={() => setSchemaEditorOpen(false)}
            className="w-8 h-8 rounded-lg hover:bg-surface-hover flex items-center justify-center text-gray-500 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {mode === "list" ? (
            <>
              {/* Live database schema section */}
              {isConnected && liveSchema.length > 0 && (
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Live Database Schema
                    </h3>
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-accent-green/10 border border-accent-green/30 rounded-md">
                      <Plug size={10} className="text-accent-green" />
                      <span className="text-[10px] text-accent-green font-medium">{databaseName}</span>
                    </span>
                  </div>
                  {liveSchema.map((t) => (
                    <div key={t.name} className="bg-surface-border/30 rounded-xl border border-surface-border overflow-hidden">
                      <div className="flex items-center gap-3 px-4 py-3">
                        <Table2 size={16} className="text-accent-cyan flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-mono font-semibold text-white">{t.name}</p>
                          <p className="text-xs text-gray-500">{t.columns.length} columns</p>
                        </div>
                      </div>
                      <div className="border-t border-surface-border/50 px-4 py-2 space-y-1">
                        {t.columns.map((col) => (
                          <div key={col.name} className="flex items-center gap-2 text-xs">
                            {col.isPrimary && <Key size={9} className="text-accent-amber flex-shrink-0" />}
                            {col.foreignKey && <Link size={9} className="text-accent-purple flex-shrink-0" />}
                            {!col.isPrimary && !col.foreignKey && <span className="w-[9px]" />}
                            <span className="font-mono text-gray-300">{col.name}</span>
                            <span className="font-mono text-brand-400">{col.type}</span>
                            {col.foreignKey && (
                              <span className="text-gray-500">→ {col.foreignKey.referencedTable}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Existing custom tables */}
              {customTables.length > 0 ? (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Your Tables ({customTables.length})</h3>
                  {customTables.map((t) => (
                    <div key={t.name} className="flex items-center gap-3 bg-surface-border/30 rounded-xl border border-surface-border px-4 py-3">
                      <Table2 size={16} className="text-accent-cyan flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-mono font-semibold text-white">{t.name}</p>
                        <p className="text-xs text-gray-500">{t.columns.length} columns: {t.columns.map(c => c.name).slice(0, 4).join(", ")}{t.columns.length > 4 ? "…" : ""}</p>
                      </div>
                      <button
                        onClick={() => { removeTable(t.name); toast.success("Table removed"); }}
                        className="p-1.5 rounded-lg hover:bg-accent-red/10 text-gray-500 hover:text-accent-red transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-600">
                  <Table2 size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No custom tables yet</p>
                  <p className="text-xs mt-1">Add your schema for more accurate query generation</p>
                </div>
              )}

              <button
                onClick={() => setMode("add")}
                className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-surface-border hover:border-brand-500/50 text-gray-500 hover:text-brand-400 rounded-xl py-3 text-sm transition-all"
              >
                <Plus size={16} />
                Add Table
              </button>
            </>
          ) : (
            <>
              {/* Add table form */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Table Name</label>
                <input
                  value={editingTable.name}
                  onChange={(e) => setEditingTable((t) => ({ ...t, name: e.target.value.toUpperCase().replace(/\s/g, "_") }))}
                  placeholder="e.g. EMPLOYEE"
                  className="w-full bg-surface-border/30 border border-surface-border rounded-xl px-3 py-2.5 text-sm font-mono text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/60"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-400">Columns</label>
                  <button onClick={handleAddColumn} className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300">
                    <Plus size={12} /> Add Column
                  </button>
                </div>
                <div className="space-y-2">
                  {editingTable.columns.map((col, i) => (
                    <div key={i} className="grid grid-cols-[1fr_1fr_1.5fr_auto] gap-2 items-center">
                      <input
                        value={col.name}
                        onChange={(e) => handleColumnChange(i, "name", e.target.value)}
                        placeholder="column_name"
                        className="bg-surface-border/30 border border-surface-border rounded-lg px-2.5 py-2 text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-500/30"
                      />
                      <select
                        value={col.type}
                        onChange={(e) => handleColumnChange(i, "type", e.target.value)}
                        className="bg-surface-border/30 border border-surface-border rounded-lg px-2.5 py-2 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-brand-500/30"
                      >
                        {COLUMN_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      <input
                        value={col.constraints || ""}
                        onChange={(e) => handleColumnChange(i, "constraints", e.target.value)}
                        placeholder="e.g. NOT NULL, PRIMARY KEY"
                        className="bg-surface-border/30 border border-surface-border rounded-lg px-2.5 py-2 text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-500/30"
                      />
                      <button
                        onClick={() => handleRemoveColumn(i)}
                        disabled={editingTable.columns.length === 1}
                        className={cn(
                          "p-1.5 rounded-lg transition-colors",
                          editingTable.columns.length === 1
                            ? "text-gray-700 cursor-not-allowed"
                            : "text-gray-500 hover:text-accent-red hover:bg-accent-red/10"
                        )}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-border">
          {mode === "add" ? (
            <>
              <button
                onClick={() => setMode("list")}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTable}
                className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm rounded-xl transition-colors font-medium"
              >
                <Save size={14} />
                Save Table
              </button>
            </>
          ) : (
            <button
              onClick={() => setSchemaEditorOpen(false)}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm rounded-xl transition-colors font-medium"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
