"use client";

import { BookOpen, Table2, Columns3, GitBranch, BarChart3, Layers, ArrowUpDown } from "lucide-react";
import type { QueryExplanation } from "@/types";
import { cn } from "@/lib/utils";

interface ExplanationPanelProps {
  explanation: QueryExplanation;
}

const clauseIcons: Record<string, React.ReactNode> = {
  SELECT:   <span className="text-accent-cyan font-mono text-xs">SELECT</span>,
  FROM:     <span className="text-accent-green font-mono text-xs">FROM</span>,
  WHERE:    <span className="text-accent-amber font-mono text-xs">WHERE</span>,
  JOIN:     <span className="text-accent-purple font-mono text-xs">JOIN</span>,
  "LEFT JOIN":  <span className="text-accent-purple font-mono text-xs">LEFT JOIN</span>,
  "RIGHT JOIN": <span className="text-accent-purple font-mono text-xs">RIGHT JOIN</span>,
  "INNER JOIN": <span className="text-accent-purple font-mono text-xs">INNER JOIN</span>,
  "GROUP BY": <span className="text-brand-400 font-mono text-xs">GROUP BY</span>,
  "ORDER BY": <span className="text-brand-400 font-mono text-xs">ORDER BY</span>,
  HAVING:   <span className="text-orange-400 font-mono text-xs">HAVING</span>,
  LIMIT:    <span className="text-gray-400 font-mono text-xs">LIMIT</span>,
  UPDATE:   <span className="text-accent-amber font-mono text-xs">UPDATE</span>,
  SET:      <span className="text-accent-amber font-mono text-xs">SET</span>,
  DELETE:   <span className="text-accent-red font-mono text-xs">DELETE</span>,
  INSERT:   <span className="text-accent-green font-mono text-xs">INSERT</span>,
};

function FeaturePill({ active, label, icon }: { active: boolean; label: string; icon: React.ReactNode }) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border",
        active
          ? "bg-brand-600/20 text-brand-300 border-brand-500/30"
          : "bg-surface-border/50 text-gray-600 border-surface-border opacity-50"
      )}
    >
      {icon}
      {label}
    </div>
  );
}

export default function ExplanationPanel({ explanation }: ExplanationPanelProps) {
  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="bg-surface-card rounded-xl border border-surface-border p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <BookOpen size={15} className="text-brand-400" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">What this query does</h4>
            <p className="text-sm text-gray-200 leading-relaxed">{explanation.summary}</p>
          </div>
        </div>
      </div>

      {/* Query features */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">Query Features</h4>
        <div className="flex flex-wrap gap-2">
          <FeaturePill active={explanation.hasJoins}       label="JOINs"        icon={<GitBranch size={11} />} />
          <FeaturePill active={explanation.hasAggregations} label="Aggregations"  icon={<BarChart3 size={11} />} />
          <FeaturePill active={explanation.hasSubquery}    label="Subquery"     icon={<Layers size={11} />} />
          <FeaturePill active={explanation.hasGroupBy}     label="GROUP BY"     icon={<Columns3 size={11} />} />
          <FeaturePill active={explanation.hasOrderBy}     label="ORDER BY"     icon={<ArrowUpDown size={11} />} />
        </div>
      </div>

      {/* Tables & Columns */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface-card rounded-xl border border-surface-border p-3.5">
          <div className="flex items-center gap-2 mb-2">
            <Table2 size={13} className="text-accent-cyan" />
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tables</span>
          </div>
          {explanation.tables && explanation.tables.length > 0 ? (
            <div className="space-y-1">
              {explanation.tables.map((t) => (
                <div key={t} className="text-xs font-mono text-white bg-surface-border/50 px-2 py-1 rounded">
                  {t}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-600">None identified</p>
          )}
        </div>

        <div className="bg-surface-card rounded-xl border border-surface-border p-3.5">
          <div className="flex items-center gap-2 mb-2">
            <Columns3 size={13} className="text-accent-purple" />
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Columns</span>
          </div>
          {explanation.columns && explanation.columns.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {explanation.columns.slice(0, 12).map((c) => (
                <div key={c} className="text-xs font-mono text-gray-300 bg-surface-border/50 px-2 py-0.5 rounded">
                  {c}
                </div>
              ))}
              {explanation.columns.length > 12 && (
                <span className="text-xs text-gray-500">+{explanation.columns.length - 12} more</span>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-600">All columns (*)</p>
          )}
        </div>
      </div>

      {/* Clause breakdown */}
      {explanation.clauses && explanation.clauses.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">Clause Breakdown</h4>
          <div className="space-y-2">
            {explanation.clauses.map((cl, i) => (
              <div
                key={i}
                className="flex gap-3 items-start bg-surface-card rounded-lg border border-surface-border p-3"
              >
                <div className="w-24 flex-shrink-0 flex items-center">
                  {clauseIcons[cl.clause.toUpperCase()] ?? (
                    <span className="text-gray-400 font-mono text-xs">{cl.clause}</span>
                  )}
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">{cl.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
