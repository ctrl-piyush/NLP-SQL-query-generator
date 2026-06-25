import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { RiskLevel, SQLOperation } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getRiskColor(risk: RiskLevel): string {
  switch (risk) {
    case "low":      return "text-accent-green";
    case "medium":   return "text-accent-amber";
    case "high":     return "text-orange-400";
    case "critical": return "text-accent-red";
    default:         return "text-gray-400";
  }
}

export function getRiskBg(risk: RiskLevel): string {
  switch (risk) {
    case "low":      return "bg-accent-green/10 border-accent-green/30";
    case "medium":   return "bg-accent-amber/10 border-accent-amber/30";
    case "high":     return "bg-orange-400/10 border-orange-400/30";
    case "critical": return "bg-accent-red/10 border-accent-red/30";
    default:         return "bg-gray-500/10 border-gray-500/30";
  }
}

export function getOperationColor(op: SQLOperation): string {
  switch (op) {
    case "SELECT": return "text-accent-cyan";
    case "INSERT": return "text-accent-green";
    case "UPDATE": return "text-accent-amber";
    case "DELETE": return "text-accent-red";
    case "CREATE": return "text-accent-purple";
    case "DROP":   return "text-red-600";
    case "ALTER":  return "text-orange-400";
    default:       return "text-gray-400";
  }
}

export function getOperationBadge(op: SQLOperation): string {
  switch (op) {
    case "SELECT": return "bg-accent-cyan/15 text-accent-cyan border-accent-cyan/30";
    case "INSERT": return "bg-accent-green/15 text-accent-green border-accent-green/30";
    case "UPDATE": return "bg-accent-amber/15 text-accent-amber border-accent-amber/30";
    case "DELETE": return "bg-accent-red/15 text-accent-red border-accent-red/30";
    case "CREATE": return "bg-accent-purple/15 text-accent-purple border-accent-purple/30";
    case "DROP":   return "bg-red-900/30 text-red-400 border-red-500/30";
    case "ALTER":  return "bg-orange-400/15 text-orange-400 border-orange-400/30";
    default:       return "bg-gray-500/15 text-gray-400 border-gray-500/30";
  }
}

export function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function truncate(str: string, n: number): string {
  return str.length > n ? str.slice(0, n - 1) + "…" : str;
}

export function estimateLabel(n: number | null): string {
  if (n === null || n === undefined) return "Unknown";
  if (n === 0) return "0 rows";
  if (n === 1) return "1 row";
  return `~${n.toLocaleString()} rows`;
}
