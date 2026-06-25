"use client";

import { useState, useCallback } from "react";
import { Toaster, toast } from "react-hot-toast";
import { Database, Cpu, Github, BookOpen, Settings2, Zap } from "lucide-react";
import { useAppStore } from "@/lib/store";
import QueryInput from "@/components/QueryInput";
import ResultsPanel from "@/components/ResultsPanel";
import HistorySidebar from "@/components/HistorySidebar";
import SchemaEditor from "@/components/SchemaEditor";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import ErrorDisplay from "@/components/ErrorDisplay";
import type { GeneratedQueryResult, QueryAlternative, QueryHistoryEntry } from "@/types";
import { v4 as uuidv4 } from "uuid";

export default function HomePage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeneratedQueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastInput, setLastInput] = useState("");

  const {
    databaseType,
    customTables,
    schemaEditorOpen,
    setSchemaEditorOpen,
    addToHistory,
  } = useAppStore();

  const handleGenerate = useCallback(
    async (userInput: string) => {
      setLoading(true);
      setError(null);
      setLastInput(userInput);

      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userInput,
            databaseType,
            customTables: customTables.length > 0 ? customTables : undefined,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to generate query");

        setResult(data as GeneratedQueryResult);

        // Auto-save recommended query to history
        const recommended =
          data.alternatives?.find((a: QueryAlternative) => a.isRecommended) ??
          data.alternatives?.[0];
        if (recommended) {
          const entry: QueryHistoryEntry = {
            id: uuidv4(),
            userInput,
            selectedQuery: recommended.sql,
            operation: data.operation,
            riskLevel: data.impact.riskLevel,
            timestamp: new Date().toISOString(),
            databaseType,
          };
          addToHistory(entry);
        }

        toast.success("Queries generated!", {
          duration: 2000,
          style: { background: "#161b27", color: "#fff", border: "1px solid #1e2535" },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Something went wrong";
        setError(message);
        toast.error("Generation failed", {
          style: { background: "#161b27", color: "#fff", border: "1px solid rgba(248,113,113,0.3)" },
        });
      } finally {
        setLoading(false);
      }
    },
    [databaseType, customTables, addToHistory]
  );

  const handleSaveToHistory = useCallback(
    (selected: QueryAlternative) => {
      if (!result) return;
      const entry: QueryHistoryEntry = {
        id: uuidv4(),
        userInput: result.userInput,
        selectedQuery: selected.sql,
        operation: result.operation,
        riskLevel: result.impact.riskLevel,
        timestamp: new Date().toISOString(),
        databaseType,
      };
      addToHistory(entry);
    },
    [result, databaseType, addToHistory]
  );

  const handleHistorySelect = useCallback(
    (entry: QueryHistoryEntry) => {
      handleGenerate(entry.userInput);
    },
    [handleGenerate]
  );

  return (
    <div className="h-screen flex flex-col bg-surface overflow-hidden">
      <Toaster position="top-right" />

      {/* Top navbar */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-surface-border bg-surface-card/80 backdrop-blur-sm z-10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-900/50">
              <Database size={16} className="text-white" />
            </div>
            <div>
              <span className="text-sm font-bold text-white tracking-tight">SQL</span>
              <span className="text-sm font-bold text-gradient tracking-tight"> QueryGen</span>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 bg-brand-600/10 border border-brand-500/20 rounded-lg">
            <Zap size={10} className="text-brand-400" />
            <span className="text-[10px] font-medium text-brand-400">Powered by Groq</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSchemaEditorOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-surface-border text-xs text-gray-400 hover:text-white hover:border-brand-500/50 transition-all"
          >
            <Settings2 size={13} />
            <span className="hidden sm:block">Schema</span>
          </button>
          <a
            href="https://console.groq.com/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-surface-border text-xs text-gray-400 hover:text-white hover:border-brand-500/50 transition-all"
          >
            <BookOpen size={13} />
            <span className="hidden sm:block">Docs</span>
          </a>
          <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-surface-border/50 text-xs">
            <Cpu size={12} className="text-accent-green" />
            <span className="text-gray-400 hidden sm:block font-mono text-[10px]">llama-3.3-70b</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <HistorySidebar onSelect={handleHistorySelect} />

        {/* Center panel */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Input area */}
          <div className="px-6 py-5 border-b border-surface-border bg-surface/50 backdrop-blur-sm">
            <div className="max-w-4xl mx-auto">
              <QueryInput onSubmit={handleGenerate} loading={loading} />
            </div>
          </div>

          {/* Results area */}
          <div className="flex-1 overflow-hidden">
            {loading ? (
              <div className="p-6 max-w-4xl mx-auto">
                <LoadingSkeleton />
              </div>
            ) : error ? (
              <div className="p-6 max-w-4xl mx-auto">
                <ErrorDisplay error={error} onRetry={() => lastInput && handleGenerate(lastInput)} />
              </div>
            ) : result ? (
              <ResultsPanel result={result} onSaveToHistory={handleSaveToHistory} />
            ) : (
              <EmptyState />
            )}
          </div>
        </div>
      </div>

      {/* Schema editor modal */}
      {schemaEditorOpen && <SchemaEditor />}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="h-full flex flex-col items-center justify-center p-8 bg-grid-pattern">
      <div className="max-w-md text-center space-y-5">
        {/* Hero icon */}
        <div className="relative mx-auto w-20 h-20">
          <div className="w-20 h-20 rounded-3xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center mx-auto glow-brand">
            <Database size={36} className="text-brand-400" />
          </div>
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-lg bg-accent-green/20 border border-accent-green/30 flex items-center justify-center">
            <Zap size={12} className="text-accent-green" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">
            Natural Language → <span className="text-gradient">SQL</span>
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            Describe what you need in plain English. Get optimized SQL queries with
            full explanations, impact analysis, and validation — instantly.
          </p>
        </div>

        {/* Feature chips */}
        <div className="flex flex-wrap justify-center gap-2">
          {[
            "Multiple alternatives",
            "Clause breakdown",
            "Risk analysis",
            "Syntax validation",
            "Schema awareness",
            "MySQL & PostgreSQL",
          ].map((f) => (
            <span
              key={f}
              className="px-2.5 py-1 text-xs text-gray-400 bg-surface-card border border-surface-border rounded-lg"
            >
              {f}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-gray-600">
          <Cpu size={12} className="text-accent-green" />
          <span>Powered by Groq's ultra-fast LLM inference</span>
        </div>
      </div>
    </div>
  );
}
