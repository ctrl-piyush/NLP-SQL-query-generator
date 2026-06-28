"use client";

import { create } from "zustand";
import type { ConnectionConfig, LiveTableInfo, ExecutionResult } from "@/types";
// NOTE: No persist middleware — credentials stay in memory only

interface ConnectionState {
  connectionConfig: ConnectionConfig | null;
  isConnected: boolean;
  isDemo: boolean;
  databaseName: string | null;
  liveSchema: LiveTableInfo[];
  lastExecutionResult: ExecutionResult | null;
  isExecuting: boolean;

  setConnection: (config: ConnectionConfig, schema: LiveTableInfo[]) => void;
  setDemoConnection: (schema: LiveTableInfo[], dbName: string) => void;
  disconnect: () => void;
  setExecutionResult: (result: ExecutionResult | null) => void;
  setIsExecuting: (executing: boolean) => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  connectionConfig: null,
  isConnected: false,
  isDemo: false,
  databaseName: null,
  liveSchema: [],
  lastExecutionResult: null,
  isExecuting: false,

  setConnection: (config, schema) =>
    set({
      connectionConfig: config,
      isConnected: true,
      isDemo: false,
      databaseName: config.database,
      liveSchema: schema,
    }),

  setDemoConnection: (schema, dbName) =>
    set({
      connectionConfig: null,
      isConnected: true,
      isDemo: true,
      databaseName: dbName,
      liveSchema: schema,
    }),

  disconnect: () =>
    set({
      connectionConfig: null,
      isConnected: false,
      isDemo: false,
      databaseName: null,
      liveSchema: [],
      lastExecutionResult: null,
    }),

  setExecutionResult: (result) => set({ lastExecutionResult: result }),
  setIsExecuting: (executing) => set({ isExecuting: executing }),
}));
