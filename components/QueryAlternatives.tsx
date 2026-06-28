"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Star, ChevronDown, ChevronUp, Zap, Code2, Play, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QueryAlternative, QueryImpact, ExecutionResult } from "@/types";
import { useConnectionStore } from "@/lib/connectionStore";
import { canExecuteClient } from "@/lib/clientPermissions";
import ConfirmationDialog from "./ConfirmationDialog";
import SqlCodeBlock from "./SqlCodeBlock";
import Badge from "./Badge";

interface QueryAlternativesProps {
  alternatives: QueryAlternative[];
  selectedId: string | null;
  onSelect: (alt: QueryAlternative) => void;
  impact?: QueryImpact;
  onSwitchToResults?: () => void;
}

const complexityColor: Record<string, string> = {
  simple:       "bg-accent-green/10 text-accent-green border-accent-green/30",
  intermediate: "bg-accent-amber/10 text-accent-amber border-accent-amber/30",
  advanced:     "bg-accent-purple/10 text-accent-purple border-accent-purple/30",
};

export default function QueryAlternatives({
  alternatives,
  selectedId,
  onSelect,
  impact,
  onSwitchToResults,
}: QueryAlternativesProps) {
  const [expandedId, setExpandedId] = useState<string | null>(
    alternatives.find((a) => a.isRecommended)?.id ?? alternatives[0]?.id ?? null
  );
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [pendingExecuteAlt, setPendingExecuteAlt] = useState<QueryAlternative | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const { data: session } = useSession();
  const userRole = session?.user?.role ?? "viewer";
  const allowedTables = session?.user?.allowedTables ?? [];

  const { isConnected, connectionConfig, setExecutionResult, setIsExecuting } =
    useConnectionStore();

  const executeQuery = useCallback(
    async (alt: QueryAlternative, confirm?: boolean) => {
      if (!connectionConfig) return;

      setExecutingId(alt.id);
      setIsExecuting(true);

      try {
        const body: Record<string, unknown> = {
          sql: alt.sql,
          connectionConfig,
        };

        // CRITICAL INVARIANT: confirm:true is ONLY included when user clicked "Execute Anyway"
        if (confirm === true) {
          body.confirm = true;
        }

        const response = await fetch("/api/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const result: ExecutionResult = await response.json();
        setExecutionResult(result);
        onSwitchToResults?.();
      } catch (err: unknown) {
        const errorResult: ExecutionResult = {
          type: "error",
          code: "NETWORK_ERROR",
          message:
            err instanceof Error ? err.message : "Failed to execute query",
        };
        setExecutionResult(errorResult);
      } finally {
        setExecutingId(null);
        setIsExecuting(false);
      }
    },
    [connectionConfig, setExecutionResult, setIsExecuting, onSwitchToResults]
  );

  const handleExecuteClick = useCallback(
    (alt: QueryAlternative) => {
      if (!isConnected || !connectionConfig) return;

      const riskLevel = impact?.riskLevel ?? "low";

      if (riskLevel === "high" || riskLevel === "critical") {
        // Show confirmation dialog for high/critical risk
        setPendingExecuteAlt(alt);
        setShowConfirmDialog(true);
      } else {
        // Low/medium risk: execute immediately without confirm flag
        executeQuery(alt);
      }
    },
    [isConnected, connectionConfig, impact, executeQuery]
  );

  const handleConfirmExecution = useCallback(() => {
    if (pendingExecuteAlt) {
      setShowConfirmDialog(false);
      executeQuery(pendingExecuteAlt, true);
      setPendingExecuteAlt(null);
    }
  }, [pendingExecuteAlt, executeQuery]);

  const handleCancelConfirmation = useCallback(() => {
    setShowConfirmDialog(false);
    setPendingExecuteAlt(null);
  }, []);

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-3">
          <Code2 size={16} className="text-brand-400" />
          <h3 className="text-sm font-semibold text-white">Generated Queries</h3>
          <span className="text-xs text-gray-500">({alternatives.length} alternative{alternatives.length !== 1 ? "s" : ""})</span>
        </div>

        {alternatives.map((alt, idx) => {
          const isSelected  = selectedId === alt.id;
          const isExpanded  = expandedId === alt.id;
          const isExecuting = executingId === alt.id;

          return (
            <div
              key={alt.id}
              className={cn(
                "rounded-xl border transition-all duration-200",
                isSelected
                  ? "border-brand-500/60 bg-brand-950/40 shadow-lg shadow-brand-900/20"
                  : "border-surface-border bg-surface-card hover:border-surface-hover"
              )}
            >
              {/* Header */}
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : alt.id)}
              >
                {/* Radio */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(alt);
                  }}
                  className={cn(
                    "w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all",
                    isSelected
                      ? "border-brand-500 bg-brand-500"
                      : "border-gray-600 hover:border-brand-400"
                  )}
                >
                  {isSelected && <span className="block w-1.5 h-1.5 bg-white rounded-full m-auto" />}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-white">
                      {idx + 1}. {alt.label}
                    </span>
                    {alt.isRecommended && (
                      <Badge className="bg-brand-600/20 text-brand-300 border-brand-500/30">
                        <Star size={10} className="fill-brand-300" />
                        Recommended
                      </Badge>
                    )}
                    <Badge className={complexityColor[alt.complexity] || ""}>
                      <Zap size={10} />
                      {alt.complexity}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{alt.description}</p>
                </div>

                <div className="flex items-center gap-2">
                  {/* Use this / Selected button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); onSelect(alt); }}
                    className={cn(
                      "px-3 py-1 rounded-lg text-xs font-medium transition-all",
                      isSelected
                        ? "bg-brand-600 text-white"
                        : "bg-surface-border text-gray-400 hover:bg-brand-800 hover:text-white"
                    )}
                  >
                    {isSelected ? "Selected" : "Use this"}
                  </button>

                  {/* Execute button */}
                  <div className="relative group/exec">
                    {(() => {
                      const permission = canExecuteClient(alt.sql, userRole, allowedTables);
                      const isDisabledByRole = !permission.allowed;
                      const isDisabled = !isConnected || isExecuting || isDisabledByRole;
                      const tooltipText = isDisabledByRole
                        ? permission.reason
                        : !isConnected
                          ? "Connect to a database to execute"
                          : undefined;

                      return (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExecuteClick(alt);
                            }}
                            disabled={isDisabled}
                            className={cn(
                              "flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all",
                              !isDisabled
                                ? "bg-accent-green/10 text-accent-green border border-accent-green/30 hover:bg-accent-green/20"
                                : "bg-surface-border text-gray-500 border border-surface-border opacity-50 cursor-not-allowed"
                            )}
                            aria-label={tooltipText ?? "Execute query"}
                          >
                            {isExecuting ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Play size={12} />
                            )}
                            {isExecuting ? "Running" : "Execute"}
                          </button>
                          {/* Tooltip when disabled */}
                          {tooltipText && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded bg-gray-900 border border-surface-border text-xs text-gray-300 whitespace-nowrap opacity-0 group-hover/exec:opacity-100 transition-opacity pointer-events-none z-10">
                              {tooltipText}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  {/* Chevron expand icon */}
                  {isExpanded ? (
                    <ChevronUp size={16} className="text-gray-500" />
                  ) : (
                    <ChevronDown size={16} className="text-gray-500" />
                  )}
                </div>
              </div>

              {/* Expanded SQL */}
              {isExpanded && (
                <div className="px-4 pb-4">
                  <SqlCodeBlock
                    sql={alt.sql}
                    label="query.sql"
                    showLineNumbers={alt.sql.split("\n").length > 3}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Confirmation Dialog for high/critical risk queries */}
      <ConfirmationDialog
        isOpen={showConfirmDialog}
        title="High Risk Query"
        message={`This query has been classified as ${impact?.riskLevel ?? "high"} risk. Review the warnings below before proceeding.`}
        riskLevel={impact?.riskLevel ?? "high"}
        warnings={impact?.warnings ?? []}
        sql={pendingExecuteAlt?.sql ?? ""}
        onConfirm={handleConfirmExecution}
        onCancel={handleCancelConfirmation}
      />
    </>
  );
}
