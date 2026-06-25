"use client";

import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SqlCodeBlockProps {
  sql: string;
  label?: string;
  className?: string;
  showLineNumbers?: boolean;
}

export default function SqlCodeBlock({
  sql,
  label,
  className,
  showLineNumbers = false,
}: SqlCodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("rounded-xl overflow-hidden border border-surface-border", className)}>
      <div className="flex items-center justify-between px-4 py-2 bg-[#1e1e2e] border-b border-surface-border">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500/70" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
            <span className="w-3 h-3 rounded-full bg-green-500/70" />
          </div>
          {label && (
            <span className="text-xs font-mono text-gray-400 ml-2">{label}</span>
          )}
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/10"
        >
          {copied ? (
            <>
              <Check size={12} className="text-accent-green" />
              <span className="text-accent-green">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <SyntaxHighlighter
        language="sql"
        style={vscDarkPlus}
        showLineNumbers={showLineNumbers}
        customStyle={{
          margin: 0,
          padding: "1rem 1.25rem",
          background: "#13131f",
          fontSize: "0.875rem",
          lineHeight: "1.6",
          borderRadius: 0,
        }}
        codeTagProps={{ style: { fontFamily: "'JetBrains Mono', 'Fira Code', monospace" } }}
      >
        {sql}
      </SyntaxHighlighter>
    </div>
  );
}
