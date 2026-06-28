"use client";

import { Key, Link, ChevronDown, ChevronRight, Table2 } from "lucide-react";
import { useState } from "react";
import { useSession } from "next-auth/react";
import type { TableInfo } from "@/types";
import { cn } from "@/lib/utils";

interface SchemaViewerProps {
  tables: TableInfo[];
}

function TableCard({ table }: { table: TableInfo }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="bg-surface-card rounded-xl border border-surface-border overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-hover transition-colors text-left"
      >
        <div className="w-7 h-7 rounded-lg bg-accent-cyan/10 flex items-center justify-center flex-shrink-0">
          <Table2 size={13} className="text-accent-cyan" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold font-mono text-white">{table.name}</p>
          {table.estimatedRows != null && (
            <p className="text-xs text-gray-500">~{table.estimatedRows.toLocaleString()} rows</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600">{table.columns?.length ?? 0} cols</span>
          {open ? <ChevronDown size={14} className="text-gray-500" /> : <ChevronRight size={14} className="text-gray-500" />}
        </div>
      </button>

      {open && table.columns && table.columns.length > 0 && (
        <div className="border-t border-surface-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-surface-border bg-surface-border/30">
                <th className="text-left px-4 py-2 text-gray-500 font-medium">Column</th>
                <th className="text-left px-4 py-2 text-gray-500 font-medium">Type</th>
                <th className="text-left px-4 py-2 text-gray-500 font-medium">Flags</th>
              </tr>
            </thead>
            <tbody>
              {table.columns.map((col, i) => (
                <tr
                  key={col.name}
                  className={cn(
                    "border-b border-surface-border/50 last:border-0",
                    i % 2 === 0 ? "bg-transparent" : "bg-surface-border/10"
                  )}
                >
                  <td className="px-4 py-2 font-mono text-white flex items-center gap-1.5">
                    {col.isPrimary && <Key size={10} className="text-accent-amber flex-shrink-0" />}
                    {col.isForeign && <Link size={10} className="text-accent-purple flex-shrink-0" />}
                    {col.name}
                  </td>
                  <td className="px-4 py-2 font-mono text-brand-400">{col.type}</td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1 flex-wrap">
                      {col.isPrimary && (
                        <span className="px-1.5 py-0.5 bg-accent-amber/10 text-accent-amber rounded text-[10px] border border-accent-amber/20">PK</span>
                      )}
                      {col.isForeign && (
                        <span className="px-1.5 py-0.5 bg-accent-purple/10 text-accent-purple rounded text-[10px] border border-accent-purple/20">FK</span>
                      )}
                      {col.isNullable === false && (
                        <span className="px-1.5 py-0.5 bg-gray-600/20 text-gray-400 rounded text-[10px] border border-gray-600/20">NOT NULL</span>
                      )}
                      {col.references && (
                        <span className="px-1.5 py-0.5 bg-surface-border text-gray-500 rounded text-[10px] border border-surface-border">→ {col.references}</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function SchemaViewer({ tables }: SchemaViewerProps) {
  const { data: session, status } = useSession();

  if (!tables || tables.length === 0) {
    const isAuthenticated = status === "authenticated" && !!session?.user;

    return (
      <div className="text-center py-8">
        <Table2 size={32} className="text-gray-700 mx-auto mb-2" />
        {isAuthenticated ? (
          <>
            <p className="text-sm text-gray-500">No tables are available for your account. Contact your admin for access.</p>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-500">No tables identified</p>
            <p className="text-xs text-gray-600 mt-1">Add your schema in the Schema Editor for richer analysis</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
        <Key size={12} className="text-accent-amber" />
        <span>= Primary Key</span>
        <Link size={12} className="text-accent-purple ml-2" />
        <span>= Foreign Key</span>
      </div>
      {tables.map((t) => (
        <TableCard key={t.name} table={t} />
      ))}
    </div>
  );
}
