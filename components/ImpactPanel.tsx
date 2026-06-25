"use client";

import {
  AlertTriangle,
  Shield,
  Rows,
  ArrowDownToLine,
  Lightbulb,
  TriangleAlert,
} from "lucide-react";
import type { QueryImpact } from "@/types";
import { getRiskBg, getRiskColor, estimateLabel } from "@/lib/utils";
import { cn } from "@/lib/utils";
import Badge from "./Badge";

interface ImpactPanelProps {
  impact: QueryImpact;
}

export default function ImpactPanel({ impact }: ImpactPanelProps) {
  const riskBg = getRiskBg(impact.riskLevel);
  const riskText = getRiskColor(impact.riskLevel);

  return (
    <div className="space-y-4">
      {/* Risk level banner */}
      <div className={cn("rounded-xl border p-4 flex items-start gap-3", riskBg)}>
        <div className="mt-0.5">
          {impact.riskLevel === "low" ? (
            <Shield size={18} className={riskText} />
          ) : (
            <TriangleAlert size={18} className={riskText} />
          )}
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("text-sm font-bold uppercase tracking-wide", riskText)}>
              {impact.riskLevel} Risk
            </span>
            {impact.isDestructive && (
              <Badge className="bg-accent-red/10 text-accent-red border-accent-red/30">
                Destructive
              </Badge>
            )}
          </div>
          <p className="text-xs text-gray-400">
            {impact.riskLevel === "low" && "This query is safe to run without any special precautions."}
            {impact.riskLevel === "medium" && "Review the query carefully before executing. Consider running on test data first."}
            {impact.riskLevel === "high" && "High risk operation. Always backup your data before executing. Use transactions."}
            {impact.riskLevel === "critical" && "CRITICAL: This operation is irreversible and can cause major data loss. Proceed only if absolutely sure."}
          </p>
        </div>
      </div>

      {/* Row estimates */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface-card rounded-xl border border-surface-border p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-2">
            <Rows size={14} className="text-accent-cyan" />
            <span className="text-xs text-gray-500 font-medium">Rows Affected</span>
          </div>
          <p className="text-xl font-bold font-mono text-white">
            {estimateLabel(impact.estimatedRowsAffected)}
          </p>
          <p className="text-xs text-gray-600 mt-1">estimated</p>
        </div>

        <div className="bg-surface-card rounded-xl border border-surface-border p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-2">
            <ArrowDownToLine size={14} className="text-accent-green" />
            <span className="text-xs text-gray-500 font-medium">Rows Returned</span>
          </div>
          <p className="text-xl font-bold font-mono text-white">
            {estimateLabel(impact.estimatedRowsReturned)}
          </p>
          <p className="text-xs text-gray-600 mt-1">estimated</p>
        </div>
      </div>

      {/* Affected tables */}
      {impact.affectedTables && impact.affectedTables.length > 0 && (
        <div className="bg-surface-card rounded-xl border border-surface-border p-4">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">
            Affected Tables
          </h4>
          <div className="flex flex-wrap gap-2">
            {impact.affectedTables.map((t) => (
              <span
                key={t}
                className="px-2.5 py-1 text-xs font-mono text-white bg-surface-border rounded-lg border border-surface-border"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {impact.warnings && impact.warnings.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Warnings</h4>
          {impact.warnings.map((w, i) => (
            <div
              key={i}
              className="flex items-start gap-2.5 bg-accent-amber/5 border border-accent-amber/20 rounded-lg p-3"
            >
              <AlertTriangle size={13} className="text-accent-amber mt-0.5 flex-shrink-0" />
              <p className="text-xs text-gray-300 leading-relaxed">{w}</p>
            </div>
          ))}
        </div>
      )}

      {/* Suggestions */}
      {impact.suggestions && impact.suggestions.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Suggestions</h4>
          {impact.suggestions.map((s, i) => (
            <div
              key={i}
              className="flex items-start gap-2.5 bg-brand-500/5 border border-brand-500/20 rounded-lg p-3"
            >
              <Lightbulb size={13} className="text-brand-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-gray-300 leading-relaxed">{s}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
