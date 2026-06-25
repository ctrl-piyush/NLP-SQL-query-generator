"use client";

import { useState } from "react";
import { Star, ChevronDown, ChevronUp, Zap, Code2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QueryAlternative } from "@/types";
import SqlCodeBlock from "./SqlCodeBlock";
import Badge from "./Badge";

interface QueryAlternativesProps {
  alternatives: QueryAlternative[];
  selectedId: string | null;
  onSelect: (alt: QueryAlternative) => void;
}

const complexityColor: Record<string, string> = {
  simple:       "bg-accent-green/10 text-accent-green border-accent-green/30",
  intermediate: "bg-accent-amber/10 text-accent-amber border-accent-amber/30",
  advanced:     "bg-accent-purple/10 text-accent-purple border-accent-purple/30",
};

export default function QueryAlternatives({ alternatives, selectedId, onSelect }: QueryAlternativesProps) {
  const [expandedId, setExpandedId] = useState<string | null>(
    alternatives.find((a) => a.isRecommended)?.id ?? alternatives[0]?.id ?? null
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <Code2 size={16} className="text-brand-400" />
        <h3 className="text-sm font-semibold text-white">Generated Queries</h3>
        <span className="text-xs text-gray-500">({alternatives.length} alternative{alternatives.length !== 1 ? "s" : ""})</span>
      </div>

      {alternatives.map((alt, idx) => {
        const isSelected  = selectedId === alt.id;
        const isExpanded  = expandedId === alt.id;

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
  );
}
