"use client";

import { CheckCircle2, XCircle, AlertTriangle, Sparkles } from "lucide-react";
import type { ValidationResult } from "@/types";
import { cn } from "@/lib/utils";
import SqlCodeBlock from "./SqlCodeBlock";

interface ValidationPanelProps {
  validation: ValidationResult;
}

export default function ValidationPanel({ validation }: ValidationPanelProps) {
  return (
    <div className="space-y-4">
      {/* Valid / Invalid banner */}
      <div
        className={cn(
          "rounded-xl border p-4 flex items-center gap-3",
          validation.isValid
            ? "bg-accent-green/10 border-accent-green/30"
            : "bg-accent-red/10 border-accent-red/30"
        )}
      >
        {validation.isValid ? (
          <CheckCircle2 size={20} className="text-accent-green flex-shrink-0" />
        ) : (
          <XCircle size={20} className="text-accent-red flex-shrink-0" />
        )}
        <div>
          <p
            className={cn(
              "text-sm font-semibold",
              validation.isValid ? "text-accent-green" : "text-accent-red"
            )}
          >
            {validation.isValid ? "Query is Valid" : "Query has Errors"}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {validation.isValid
              ? "The SQL syntax is correct and ready to execute."
              : "Fix the errors below before executing."}
          </p>
        </div>
      </div>

      {/* Errors */}
      {validation.errors && validation.errors.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-accent-red uppercase tracking-wider">Errors</h4>
          {validation.errors.map((e, i) => (
            <div
              key={i}
              className="flex items-start gap-2.5 bg-accent-red/5 border border-accent-red/20 rounded-lg p-3"
            >
              <XCircle size={13} className="text-accent-red mt-0.5 flex-shrink-0" />
              <p className="text-xs text-gray-300 font-mono">{e}</p>
            </div>
          ))}
        </div>
      )}

      {/* Warnings */}
      {validation.warnings && validation.warnings.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-accent-amber uppercase tracking-wider">Warnings</h4>
          {validation.warnings.map((w, i) => (
            <div
              key={i}
              className="flex items-start gap-2.5 bg-accent-amber/5 border border-accent-amber/20 rounded-lg p-3"
            >
              <AlertTriangle size={13} className="text-accent-amber mt-0.5 flex-shrink-0" />
              <p className="text-xs text-gray-300">{w}</p>
            </div>
          ))}
        </div>
      )}

      {/* Optimized query */}
      {validation.optimizedQuery && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={14} className="text-accent-purple" />
            <h4 className="text-xs font-semibold text-accent-purple uppercase tracking-wider">
              Optimized Version
            </h4>
          </div>
          <SqlCodeBlock sql={validation.optimizedQuery} label="optimized.sql" />

          {validation.optimizationNotes && validation.optimizationNotes.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {validation.optimizationNotes.map((n, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-accent-purple text-xs mt-0.5">→</span>
                  <p className="text-xs text-gray-400">{n}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* All good, no optimizations */}
      {validation.isValid &&
        (!validation.optimizedQuery) &&
        validation.errors.length === 0 &&
        validation.warnings.length === 0 && (
          <div className="text-center py-4">
            <CheckCircle2 size={32} className="text-accent-green mx-auto mb-2 opacity-50" />
            <p className="text-xs text-gray-500">No issues detected. Query looks great!</p>
          </div>
        )}
    </div>
  );
}
