import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { filterSchema } from "@/lib/permissions";
import { generateQueries } from "@/lib/queryGenerator";
import type { GenerateQueryRequest, LiveTableInfo } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Please log in to continue." },
        { status: 401 }
      );
    }

    const body: GenerateQueryRequest = await req.json();
    const { userInput, databaseType, schemaContext, customTables } = body;

    if (!userInput || userInput.trim().length < 3) {
      return NextResponse.json(
        { error: "Please provide a meaningful query description (at least 3 characters)." },
        { status: 400 }
      );
    }

    if (userInput.trim().length > 2000) {
      return NextResponse.json(
        { error: "Query description is too long. Please keep it under 2000 characters." },
        { status: 400 }
      );
    }

    // Filter schema context based on user's role and allowed tables
    let filteredSchemaContext = schemaContext;
    let filteredCustomTables = customTables;

    if (session.user.role !== "admin") {
      const permissionContext = {
        role: session.user.role,
        allowedTables: session.user.allowedTables || [],
      };

      // Filter schemaContext string: parse as LiveTableInfo[] if possible
      if (schemaContext) {
        try {
          const parsed: LiveTableInfo[] = JSON.parse(schemaContext);
          if (Array.isArray(parsed)) {
            const filtered = filterSchema(parsed, permissionContext);
            filteredSchemaContext = JSON.stringify(filtered);
          }
        } catch {
          // schemaContext is a plain string (not JSON-parseable LiveTableInfo[]),
          // clear it for non-admin users to prevent exposing unauthorized tables
          filteredSchemaContext = undefined;
        }
      }

      // Filter customTables to only include allowed tables
      if (customTables && customTables.length > 0) {
        const allowedSet = new Set(
          (session.user.allowedTables || []).map((t: string) => t.toLowerCase())
        );
        filteredCustomTables = customTables.filter((table) =>
          allowedSet.has(table.name.toLowerCase())
        );
      }
    }

    const result = await generateQueries(
      userInput.trim(),
      databaseType || "mysql",
      filteredSchemaContext,
      filteredCustomTables
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Generate query error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate query";
    const isApiKey = message.includes("GROQ_API_KEY");
    return NextResponse.json(
      {
        error: isApiKey
          ? "GROQ_API_KEY is not configured. Please add it to your environment variables."
          : message,
      },
      { status: isApiKey ? 503 : 500 }
    );
  }
}
