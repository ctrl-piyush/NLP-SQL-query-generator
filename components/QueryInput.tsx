"use client";

import { useState, useRef, useCallback } from "react";
import { Send, Loader2, Zap, Database, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import type { DatabaseType } from "@/types";

const EXAMPLE_PROMPTS = [
  "Show all employees whose salary is greater than ₹50,000",
  "Find the top 5 students with highest CGPA",
  "Increase salary of all employees in IT department by 10%",
  "List all orders placed in the last 30 days with customer names",
  "Find customers who have never placed an order",
  "Count the number of employees in each department",
  "Delete all products with stock less than 5",
  "Show average salary by department ordered by highest first",
];

interface QueryInputProps {
  onSubmit: (input: string) => void;
  loading: boolean;
}

export default function QueryInput({ onSubmit, loading }: QueryInputProps) {
  const [input, setInput] = useState("");
  const [showExamples, setShowExamples] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { databaseType, setDatabaseType } = useAppStore();

  const handleSubmit = useCallback(() => {
    if (!input.trim() || loading) return;
    onSubmit(input.trim());
  }, [input, loading, onSubmit]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  const handleExample = (ex: string) => {
    setInput(ex);
    setShowExamples(false);
    textareaRef.current?.focus();
  };

  const charCount = input.length;
  const isOverLimit = charCount > 2000;

  return (
    <div className="space-y-3">
      {/* DB Type + Examples row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Database size={14} className="text-gray-500" />
          <span className="text-xs text-gray-500 font-medium">Database:</span>
          <div className="flex rounded-lg border border-surface-border overflow-hidden">
            {(["mysql", "postgresql"] as DatabaseType[]).map((db) => (
              <button
                key={db}
                onClick={() => setDatabaseType(db)}
                className={cn(
                  "px-3 py-1 text-xs font-medium font-mono transition-all",
                  databaseType === db
                    ? "bg-brand-600 text-white"
                    : "text-gray-400 hover:text-white hover:bg-surface-hover"
                )}
              >
                {db === "mysql" ? "MySQL" : "PostgreSQL"}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowExamples((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 transition-colors"
          >
            <Zap size={12} />
            Try an example
            <ChevronDown size={12} className={cn("transition-transform", showExamples && "rotate-180")} />
          </button>

          {showExamples && (
            <div className="absolute right-0 top-7 z-50 w-80 bg-surface-card border border-surface-border rounded-xl shadow-2xl overflow-hidden">
              <div className="p-2 space-y-0.5 max-h-72 overflow-y-auto">
                {EXAMPLE_PROMPTS.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => handleExample(ex)}
                    className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-surface-hover hover:text-white rounded-lg transition-colors"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Textarea */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe what you need in plain English…
e.g. 'Show all customers from Mumbai who placed orders worth more than ₹10,000 last month'"
          rows={4}
          maxLength={2100}
          className={cn(
            "w-full bg-surface-card border rounded-xl px-4 py-3.5 pr-16 text-sm text-white placeholder-gray-600",
            "resize-none focus:outline-none focus:ring-2 transition-all",
            "font-sans leading-relaxed",
            isOverLimit
              ? "border-accent-red/60 focus:ring-accent-red/30"
              : "border-surface-border focus:ring-brand-500/30 focus:border-brand-500/60"
          )}
        />

        {/* Submit button inside textarea */}
        <button
          onClick={handleSubmit}
          disabled={!input.trim() || loading || isOverLimit}
          className={cn(
            "absolute right-3 bottom-3 flex items-center gap-1.5 px-3 py-2 rounded-lg",
            "text-xs font-semibold transition-all",
            input.trim() && !loading && !isOverLimit
              ? "bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-900/50"
              : "bg-surface-border text-gray-600 cursor-not-allowed"
          )}
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Send size={14} />
          )}
          {loading ? "Generating…" : "Generate"}
        </button>
      </div>

      {/* Footer hints */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-600">
          Press <kbd className="px-1.5 py-0.5 bg-surface-border rounded text-gray-400 text-xs">⌘ Enter</kbd> to generate
        </span>
        <span className={cn("text-xs font-mono", isOverLimit ? "text-accent-red" : "text-gray-600")}>
          {charCount} / 2000
        </span>
      </div>
    </div>
  );
}
