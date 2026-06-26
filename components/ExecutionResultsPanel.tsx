"use client";

import { Table2, CheckCircle2, AlertCircle, Clock, Info } from "lucide-react";
import type { ExecutionResult } from "@/types";
import Badge from "./Badge";

interface ExecutionResultsPanelProps {
  result: ExecutionResult | null;
}

export default function ExecutionResultsPanel({ result }: ExecutionResultsPanelProps) {
  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-500">
        <Table2 size={32} className="mb-3 text-gray-600" />
        <p className="text-sm">No execution results yet</p>
        <p className="text-xs text-gray-600 mt-1">
          Execute a query to see results here
        </p>
      </div>
    );
  }

  if (result.type === "select") {
    return <SelectResultView result={result} />;
  }

  if (result.type === "mutation") {
    return <MutationResultView result={result} />;
  }

  return <ErrorResultView result={result} />;
}

/* ─── SELECT Result ─────────────────────────────────────────────────────────── */

function SelectResultView({
  result,
}: {
  result: Extract<ExecutionResult, { type: "select" }>;
}) {
  const { columns, rows, rowCount, hasMore, executionTimeMs } = result;

  return (
    <div className="space-y-3">
      {/* Header row with stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Table2 size={14} className="text-accent-cyan" />
          <span className="text-xs text-gray-400">
            {rowCount} {rowCount === 1 ? "row" : "rows"} returned
          </span>
        </div>
        <ExecutionTimeBadge ms={executionTimeMs} />
      </div>

      {/* Truncation notice */}
      {hasMore && (
        <div className="flex items-center gap-2 bg-accent-amber/5 border border-accent-amber/20 rounded-lg px-3 py-2">
          <Info size={13} className="text-accent-amber flex-shrink-0" />
          <p className="text-xs text-gray-300">
            Showing 200 of more rows. Results are capped at 200 rows.
          </p>
        </div>
      )}

      {/* Data table or empty state */}
      {rowCount === 0 ? (
        <div className="bg-surface-card rounded-xl border border-surface-border">
          {/* Column headers even for empty result */}
          {columns.length > 0 && (
            <div className="overflow-x-auto border-b border-surface-border">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-border">
                    {columns.map((col) => (
                      <th
                        key={col}
                        className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
              </table>
            </div>
          )}
          <div className="flex flex-col items-center justify-center py-10 text-gray-500">
            <Info size={20} className="mb-2 text-gray-600" />
            <p className="text-sm">No rows matched the query</p>
          </div>
        </div>
      ) : (
        <div className="bg-surface-card rounded-xl border border-surface-border overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto max-h-[400px]">
            <table className="w-full">
              <thead className="sticky top-0 bg-surface-card z-10">
                <tr className="border-b border-surface-border">
                  {columns.map((col) => (
                    <th
                      key={col}
                      className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIdx) => (
                  <tr
                    key={rowIdx}
                    className="border-b border-surface-border last:border-b-0 even:bg-surface-border/20"
                  >
                    {columns.map((col) => (
                      <td
                        key={col}
                        className="px-3 py-1.5 text-xs font-mono text-gray-300 whitespace-nowrap"
                      >
                        {formatCellValue(row[col])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Mutation Result ───────────────────────────────────────────────────────── */

function MutationResultView({
  result,
}: {
  result: Extract<ExecutionResult, { type: "mutation" }>;
}) {
  const { operation, affectedRows, executionTimeMs } = result;

  return (
    <div className="space-y-3">
      <div className="bg-accent-green/5 border border-accent-green/20 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 size={20} className="text-accent-green mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-accent-green mb-1">
              Query executed successfully
            </p>
            <p className="text-xs text-gray-300">
              <span className="font-mono font-semibold text-white">{operation}</span>
              {" "}affected{" "}
              <span className="font-mono font-semibold text-white">{affectedRows}</span>
              {" "}{affectedRows === 1 ? "row" : "rows"}
            </p>
          </div>
          <ExecutionTimeBadge ms={executionTimeMs} />
        </div>
      </div>
    </div>
  );
}

/* ─── Error Result ──────────────────────────────────────────────────────────── */

function ErrorResultView({
  result,
}: {
  result: Extract<ExecutionResult, { type: "error" }>;
}) {
  const { code, message, detail } = result;

  return (
    <div className="space-y-3">
      <div className="bg-red-500/5 border border-red-400/20 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="text-red-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-red-400">Execution failed</p>
              <Badge className="bg-red-500/10 text-red-400 border-red-500/30">
                {code}
              </Badge>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">{message}</p>
            {detail && (
              <p className="text-xs text-gray-500 leading-relaxed border-t border-surface-border pt-2 mt-2">
                {detail}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Shared Components ─────────────────────────────────────────────────────── */

function ExecutionTimeBadge({ ms }: { ms: number }) {
  return (
    <Badge className="bg-surface-border/50 text-gray-400 border-surface-border">
      <Clock size={10} />
      {ms} ms
    </Badge>
  );
}

/* ─── Utilities ─────────────────────────────────────────────────────────────── */

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
