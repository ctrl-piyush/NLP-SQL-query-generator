"use client";

import { useSession, signOut } from "next-auth/react";
import { LogOut, Shield, ShieldCheck, ShieldAlert, Settings2 } from "lucide-react";
import Link from "next/link";
import type { Role } from "@/types/rbac";

const roleBadgeStyles: Record<Role, string> = {
  viewer: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  editor: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  admin: "bg-purple-500/15 text-purple-400 border-purple-500/30",
};

const roleIcons: Record<Role, typeof Shield> = {
  viewer: Shield,
  editor: ShieldCheck,
  admin: ShieldAlert,
};

export default function RoleBadge() {
  const { data: session, status } = useSession();

  if (status !== "authenticated" || !session?.user) {
    return null;
  }

  const role = session.user.role;
  const email = session.user.email;
  const RoleIcon = roleIcons[role];

  return (
    <div className="flex items-center gap-2">
      {/* User email */}
      <span className="text-xs text-gray-400 hidden md:block truncate max-w-[160px]">
        {email}
      </span>

      {/* Role badge */}
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-medium capitalize ${roleBadgeStyles[role]}`}
      >
        <RoleIcon size={11} />
        {role}
      </span>

      {/* Admin Panel link - visible only for admin users */}
      {role === "admin" && (
        <Link
          href="/admin"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-purple-500/30 bg-purple-500/10 text-xs text-purple-400 hover:text-purple-300 hover:border-purple-500/50 transition-all"
          aria-label="Admin Panel"
        >
          <Settings2 size={13} />
          <span className="hidden sm:block">Admin Panel</span>
        </Link>
      )}

      {/* Logout button */}
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="flex items-center gap-1 px-2 py-1 rounded-lg border border-surface-border text-xs text-gray-400 hover:text-red-400 hover:border-red-500/50 transition-all"
        aria-label="Sign out"
      >
        <LogOut size={13} />
        <span className="hidden sm:block">Logout</span>
      </button>
    </div>
  );
}
