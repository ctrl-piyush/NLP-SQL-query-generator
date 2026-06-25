import { NextRequest, NextResponse } from "next/server";
import { generateQueries } from "@/lib/queryGenerator";
import type { GenerateQueryRequest } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
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

    const result = await generateQueries(
      userInput.trim(),
      databaseType || "mysql",
      schemaContext,
      customTables
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
