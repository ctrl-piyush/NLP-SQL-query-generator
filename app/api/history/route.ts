import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";

// History is stored client-side via Zustand + localStorage persistence.
// This endpoint provides the history schema / documentation.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Please log in to continue." }, { status: 401 });
  }

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
