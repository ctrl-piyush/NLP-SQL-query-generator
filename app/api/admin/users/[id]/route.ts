import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getUserById,
  updateUserRole,
  updateAllowedTables,
} from "@/lib/rbac/userStore";
import type { Role } from "@/types/rbac";

export const runtime = "nodejs";

/**
 * PATCH /api/admin/users/[id]
 *
 * Updates a user's role and/or allowed tables. Requires admin role.
 * Body: { role?: Role, allowedTables?: string[] }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required." },
        { status: 403 }
      );
    }

    const { id } = params;
    const body = await req.json();
    const { role, allowedTables } = body;

    // Verify user exists
    const existingUser = getUserById(id);
    if (!existingUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // Update role if provided
    if (role !== undefined) {
      const validRoles: Role[] = ["viewer", "editor", "admin"];
      if (!validRoles.includes(role)) {
        return NextResponse.json(
          { error: "Role must be 'viewer', 'editor', or 'admin'." },
          { status: 400 }
        );
      }
      updateUserRole(id, role);
    }

    // Update allowed tables if provided
    if (allowedTables !== undefined) {
      if (!Array.isArray(allowedTables)) {
        return NextResponse.json(
          { error: "allowedTables must be an array of strings." },
          { status: 400 }
        );
      }
      updateAllowedTables(id, allowedTables);
    }

    // Fetch and return the updated user
    const updatedUser = getUserById(id);
    return NextResponse.json({
      id: updatedUser!.id,
      email: updatedUser!.email,
      role: updatedUser!.role,
      allowedTables: updatedUser!.allowedTables,
      createdAt: updatedUser!.createdAt,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred.";

    // Handle known business errors
    if (message.includes("last admin")) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    if (message.includes("Role must be")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (message.includes("User not found")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
