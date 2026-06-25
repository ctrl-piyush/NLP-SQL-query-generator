"use client";

import { Trash2, Clock, ChevronLeft, ChevronRight, Database } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { cn, formatTimestamp, truncate, getOperationBadge, getRiskColor } from "@/lib/utils";
import Badge from "./Badge";
import type { QueryHistoryEntry } from "@/types";

interface HistorySidebarProps {
  onSelect: (entry: QueryHistoryEntry) => void;
}

export default function HistorySidebar({ onSelect }: HistorySidebarProps) {
  const { history, clearHistory, removeFromHistory, sidebarOpen, setSidebarOpen } = useAppStore();

  return (
    <div
      className={cn(
        "flex flex-col bg-surface-card border-r border-surface-border transition-all duration-300",
        sidebarOpen ? "w-72" : "w-12"
      )}
    >
      {/* Toggle button */}
      <div className="flex items-center justify-between px-3 py-4 border-b border-surface-border">
        {sidebarOpen && (
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-brand-400" />
            <span className="text-sm font-semibold text-white">History</span>
            {history.length > 0 && (
              <span className="text-xs bg-brand-600/30 text-brand-300 px-1.5 py-0.5 rounded-md font-mono">
                {history.length}
              </span>
            )}
          </div>
        )}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="w-7 h-7 rounded-lg hover:bg-surface-hover flex items-center justify-center text-gray-500 hover:text-white transition-colors ml-auto"
        >
          {sidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>
      </div>

      {sidebarOpen && (
        <>
          {history.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <Clock size={32} className="text-gray-700 mb-3" />
              <p className="text-sm text-gray-500 font-medium">No history yet</p>
              <p className="text-xs text-gray-600 mt-1">Generated queries will appear here</p>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto">
                {history.map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => onSelect(entry)}
                    className="w-full text-left px-3 py-3 border-b border-surface-border hover:bg-surface-hover transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs text-gray-300 leading-relaxed flex-1 min-w-0 group-hover:text-white transition-colors">
                        {truncate(entry.userInput, 60)}
                      </p>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeFromHistory(entry.id); }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-accent-red/10 text-gray-600 hover:text-accent-red transition-all flex-shrink-0"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge className={cn("text-[10px] px-1.5", getOperationBadge(entry.operation))}>
                        {entry.operation}
                      </Badge>
                      <span className={cn("text-[10px] font-medium", getRiskColor(entry.riskLevel))}>
                        {entry.riskLevel}
                      </span>
                      <div className="flex items-center gap-1 ml-auto">
                        <Database size={9} className="text-gray-600" />
                        <span className="text-[10px] text-gray-600 uppercase">{entry.databaseType}</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-600 mt-1">{formatTimestamp(entry.timestamp)}</p>
                  </button>
                ))}
              </div>

              {/* Clear all */}
              <div className="p-3 border-t border-surface-border">
                <button
                  onClick={() => clearHistory()}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-gray-600 hover:text-accent-red hover:bg-accent-red/5 rounded-lg transition-colors"
                >
                  <Trash2 size={12} />
                  Clear history
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
