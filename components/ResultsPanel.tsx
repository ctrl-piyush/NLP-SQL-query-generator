"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  Code2, BookOpen, AlertTriangle, CheckSquare, Table2,
  PlayCircle, Lightbulb, Sparkles, Copy, Check, DownloadCloud
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getOperationBadge, getRiskBg, getRiskColor } from "@/lib/utils";
import type { GeneratedQueryResult, QueryAlternative } from "@/types";
import { useConnectionStore } from "@/lib/connectionStore";
import QueryAlternatives from "./QueryAlternatives";
import ExplanationPanel from "./ExplanationPanel";
import ImpactPanel from "./ImpactPanel";
import ValidationPanel from "./ValidationPanel";
import SchemaViewer from "./SchemaViewer";
import ExecutionResultsPanel from "./ExecutionResultsPanel";
import SqlCodeBlock from "./SqlCodeBlock";
import Badge from "./Badge";

const TABS = [
  { id: "queries",     label: "Queries",     icon: Code2 },
  { id: "explanation", label: "Explanation",  icon: BookOpen },
  { id: "impact",      label: "Impact",       icon: AlertTriangle },
  { id: "validation",  label: "Validation",   icon: CheckSquare },
  { id: "schema",      label: "Schema",       icon: Table2 },
  { id: "results",     label: "Results",      icon: PlayCircle },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface ResultsPanelProps {
  result: GeneratedQueryResult;
  onSaveToHistory: (selected: QueryAlternative) => void;
}

export default function ResultsPanel({ result, onSaveToHistory }: ResultsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("queries");
  const [selectedAlt, setSelectedAlt] = useState<QueryAlternative | null>(
    result.alternatives.find((a) => a.isRecommended) ?? result.alternatives[0] ?? null
  );
  const [exportCopied, setExportCopied] = useState(false);

  const lastExecutionResult = useConnectionStore((s) => s.lastExecutionResult);
  const prevResultRef = useRef(lastExecutionResult);

  // Auto-switch to Results tab when a new execution result arrives
  useEffect(() => {
    if (lastExecutionResult && lastExecutionResult !== prevResultRef.current) {
      setActiveTab("results");
    }
    prevResultRef.current = lastExecutionResult;
  }, [lastExecutionResult]);

  const handleSwitchToResults = useCallback(() => {
    setActiveTab("results");
  }, []);

  const handleSelectAlt = useCallback((alt: QueryAlternative) => {
    setSelectedAlt(alt);
    onSaveToHistory(alt);
  }, [onSaveToHistory]);

  const handleExport = async () => {
    const text = [
      `-- SQL Query Generator Export`,
      `-- Generated: ${new Date(result.generatedAt).toLocaleString()}`,
      `-- Database: ${result.databaseType.toUpperCase()}`,
      `-- Intent: ${result.intent}`,
      `-- Operation: ${result.operation}`,
      `-- Risk Level: ${result.impact.riskLevel}`,
      ``,
      `-- Selected Query`,
      selectedAlt?.sql ?? result.alternatives[0]?.sql ?? "",
      ``,
      `-- All Alternatives`,
      ...result.alternatives.map((a, i) => [
        `-- ${i + 1}. ${a.label} (${a.complexity})`,
        a.sql,
        ``
      ].join("\n")),
    ].join("\n");

    await navigator.clipboard.writeText(text);
    setExportCopied(true);
    setTimeout(() => setExportCopied(false), 2000);
  };

  const downloadSQL = () => {
    const sql = selectedAlt?.sql ?? result.alternatives[0]?.sql ?? "";
    const blob = new Blob([sql], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `query_${result.operation.toLowerCase()}_${Date.now()}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Result header */}
      <div className="px-6 py-4 border-b border-surface-border">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <Badge className={cn("text-xs", getOperationBadge(result.operation))}>
                {result.operation}
              </Badge>
              <Badge className={cn("text-xs", getRiskBg(result.impact.riskLevel), getRiskColor(result.impact.riskLevel))}>
                {result.impact.riskLevel} risk
              </Badge>
              <Badge className="bg-surface-border text-gray-400 border-surface-border text-xs font-mono">
                {result.databaseType}
              </Badge>
            </div>
            <div className="flex items-start gap-2">
              <Sparkles size={13} className="text-brand-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gray-300 leading-relaxed">{result.intent}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-surface-border text-xs text-gray-400 hover:text-white hover:border-brand-500/50 transition-all"
            >
              {exportCopied ? <Check size={12} className="text-accent-green" /> : <Copy size={12} />}
              {exportCopied ? "Copied!" : "Copy all"}
            </button>
            <button
              onClick={downloadSQL}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-surface-border text-xs text-gray-400 hover:text-white hover:border-brand-500/50 transition-all"
            >
              <DownloadCloud size={12} />
              .sql
            </button>
          </div>
        </div>

        {/* Execution hint */}
        {result.executionHint && (
          <div className="flex items-start gap-2 mt-3 px-3 py-2 bg-brand-950/50 rounded-lg border border-brand-500/20">
            <Lightbulb size={12} className="text-brand-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-gray-400">{result.executionHint}</p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-surface-border px-4 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-all whitespace-nowrap",
              activeTab === id
                ? "border-brand-500 text-brand-400"
                : "border-transparent text-gray-500 hover:text-gray-300"
            )}
          >
            <Icon size={13} />
            {label}
            {id === "impact" && result.impact.riskLevel !== "low" && (
              <span className={cn("w-1.5 h-1.5 rounded-full", getRiskColor(result.impact.riskLevel).replace("text-", "bg-"))} />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === "queries" && (
          <div className="space-y-6">
            <QueryAlternatives
              alternatives={result.alternatives}
              selectedId={selectedAlt?.id ?? null}
              onSelect={handleSelectAlt}
              impact={result.impact}
              onSwitchToResults={handleSwitchToResults}
            />

            {/* Selected query preview */}
            {selectedAlt && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Code2 size={14} className="text-accent-green" />
                  <h3 className="text-sm font-semibold text-white">Selected Query</h3>
                  <span className="text-xs text-gray-500">— ready to execute</span>
                </div>
                <SqlCodeBlock
                  sql={selectedAlt.sql}
                  label={`${result.operation.toLowerCase()}_query.sql`}
                  showLineNumbers
                />
              </div>
            )}
          </div>
        )}

        {activeTab === "explanation" && result.explanation && (
          <ExplanationPanel explanation={result.explanation} />
        )}

        {activeTab === "impact" && result.impact && (
          <ImpactPanel impact={result.impact} />
        )}

        {activeTab === "validation" && result.validation && (
          <ValidationPanel validation={result.validation} />
        )}

        {activeTab === "schema" && (
          <SchemaViewer tables={result.tablesInvolved} />
        )}

        {activeTab === "results" && (
          <ExecutionResultsPanel result={lastExecutionResult} />
        )}
      </div>
    </div>
  );
}
