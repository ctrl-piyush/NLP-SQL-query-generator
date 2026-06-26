"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, ShieldAlert, X } from "lucide-react";
import type { RiskLevel } from "@/types";
import { cn } from "@/lib/utils";

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  riskLevel: RiskLevel;
  warnings: string[];
  sql: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmationDialog({
  isOpen,
  title,
  message,
  riskLevel,
  warnings,
  sql,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      cancelButtonRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const isCritical = riskLevel === "critical";

  const iconColor = isCritical ? "text-red-500" : "text-accent-amber";
  const borderColor = isCritical
    ? "border-red-500/30"
    : "border-accent-amber/30";
  const bgTint = isCritical ? "bg-red-500/10" : "bg-accent-amber/10";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-dialog-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog panel */}
      <div className="relative w-full max-w-lg mx-4 bg-surface-card border border-surface-border rounded-xl shadow-2xl animate-fade-in">
        {/* Header */}
        <div className={cn("flex items-start gap-3 p-5 border-b", borderColor)}>
          <div className={cn("p-2 rounded-lg", bgTint)}>
            {isCritical ? (
              <ShieldAlert size={20} className={iconColor} />
            ) : (
              <AlertTriangle size={20} className={iconColor} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2
              id="confirmation-dialog-title"
              className="text-sm font-semibold text-white"
            >
              {title}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">{message}</p>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded-lg text-gray-500 hover:text-white hover:bg-surface-hover transition-colors"
            aria-label="Close dialog"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Risk level badge */}
          <div
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wide border",
              isCritical
                ? "bg-red-500/10 text-red-500 border-red-500/30"
                : "bg-accent-amber/10 text-accent-amber border-accent-amber/30"
            )}
          >
            {isCritical ? (
              <ShieldAlert size={12} />
            ) : (
              <AlertTriangle size={12} />
            )}
            {riskLevel} risk
          </div>

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Warnings
              </h3>
              {warnings.map((warning, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-start gap-2.5 rounded-lg p-3 border",
                    isCritical
                      ? "bg-red-500/5 border-red-500/20"
                      : "bg-accent-amber/5 border-accent-amber/20"
                  )}
                >
                  <AlertTriangle
                    size={13}
                    className={cn("mt-0.5 flex-shrink-0", iconColor)}
                  />
                  <p className="text-xs text-gray-300 leading-relaxed">
                    {warning}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* SQL statement */}
          {sql && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                SQL Statement
              </h3>
              <pre className="bg-[#13131f] border border-surface-border rounded-lg p-3 overflow-x-auto">
                <code className="text-xs font-mono text-gray-300 whitespace-pre-wrap break-all">
                  {sql}
                </code>
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-surface-border">
          <button
            ref={cancelButtonRef}
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-300 bg-transparent border border-surface-border rounded-lg hover:bg-surface-hover transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={cn(
              "px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors",
              isCritical
                ? "bg-red-500 hover:bg-red-600"
                : "bg-accent-amber hover:bg-amber-500 text-black"
            )}
          >
            Execute Anyway
          </button>
        </div>
      </div>
    </div>
  );
}
