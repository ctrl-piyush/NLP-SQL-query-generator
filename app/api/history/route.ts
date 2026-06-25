import { NextResponse } from "next/server";

export const runtime = "nodejs";

// History is stored client-side via Zustand + localStorage persistence.
// This endpoint provides the history schema / documentation.
export async function GET() {
  return NextResponse.json({
    message: "Query history is stored in the browser via localStorage.",
    schema: {
      id: "string (uuid)",
      userInput: "string",
      selectedQuery: "string (SQL)",
      operation: "SELECT | INSERT | UPDATE | DELETE | CREATE | DROP | ALTER | UNKNOWN",
      riskLevel: "low | medium | high | critical",
      timestamp: "ISO 8601 string",
      databaseType: "mysql | postgresql",
    },
    note: "Use the Zustand store (lib/store.ts) to access and manage history on the client side.",
  });
}
