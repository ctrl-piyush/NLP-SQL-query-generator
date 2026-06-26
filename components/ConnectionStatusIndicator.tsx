"use client";

import { Database, Plug, PlugZap } from "lucide-react";
import { useConnectionStore } from "@/lib/connectionStore";

interface ConnectionStatusIndicatorProps {
  onOpenModal: () => void;
}

export default function ConnectionStatusIndicator({
  onOpenModal,
}: ConnectionStatusIndicatorProps) {
  const { isConnected, databaseName } = useConnectionStore();

  return (
    <button
      onClick={onOpenModal}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-surface-border text-xs text-gray-400 hover:text-white hover:border-brand-500/50 transition-all"
      title={isConnected ? `Connected to ${databaseName}` : "Connect to database"}
    >
      {isConnected ? (
        <>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-green" />
          </span>
          <Database size={13} className="text-accent-green" />
          <span className="hidden sm:block text-accent-green font-mono text-[10px]">
            {databaseName}
          </span>
        </>
      ) : (
        <>
          <span className="relative flex h-2 w-2">
            <span className="relative inline-flex rounded-full h-2 w-2 bg-gray-500" />
          </span>
          <Plug size={13} />
          <span className="hidden sm:block">Disconnected</span>
        </>
      )}
    </button>
  );
}
