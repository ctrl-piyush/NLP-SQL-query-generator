import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAllUsers, createUser } from "@/lib/rbac/userStore";

export const runtime = "nodejs";

/**
 * GET /api/admin/users
 *
 * Returns all registered users (excluding password hashes).
 * Requires admin role.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required." },
        { status: 403 }
      );
    }

    const users = getAllUsers().map((user) => ({
      id: user.id,
      email: user.email,
      role: user.role,
      allowedTables: user.allowedTables,
      createdAt: user.createdAt,
    }));

    return NextResponse.json({ users });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/admin/users
 *
 * Creates a new user account. Requires admin role.
 * Body: { email: string, password: string }
 * Assigns viewer role by default.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { email, password } = body;

    // Validate required fields
    if (!email || typeof email !== "string" || email.trim().length === 0) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const user = createUser(email.trim(), password);

    return NextResponse.json(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        allowedTables: user.allowedTables,
        createdAt: user.createdAt,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred.";

    // Handle known business errors with appropriate status codes
    if (message.includes("already exists")) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    if (
      message.includes("Email must be") ||
      message.includes("Password must be")
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
