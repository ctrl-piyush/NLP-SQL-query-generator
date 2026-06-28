import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { explainQuery } from "@/lib/queryGenerator";
import type { DatabaseType } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Please log in to continue." }, { status: 401 });
  }

  try {
    const { sql, databaseType }: { sql: string; databaseType: DatabaseType } = await req.json();

    if (!sql || sql.trim().length < 5) {
      return NextResponse.json({ error: "Please provide a valid SQL query." }, { status: 400 });
    }

    const explanation = await explainQuery(sql.trim(), databaseType || "mysql");
    return NextResponse.json(explanation);
  } catch (error: unknown) {
    console.error("Explain query error:", error);
    const message = error instanceof Error ? error.message : "Failed to explain query";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
