/**
 * NextAuth.js Configuration
 *
 * Configures authentication using the Credentials provider backed by
 * the RBAC user store. JWT strategy with 24-hour session lifetime.
 * Includes role and allowedTables in the session for downstream
 * permission checks.
 */

import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { verifyUser, getUserById } from "@/lib/rbac/userStore";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        return verifyUser(credentials.email, credentials.password);
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        // Initial login — populate token from the authenticated user
        token.role = user.role;
        token.allowedTables = user.allowedTables;
      } else if (trigger === "update" || token.sub) {
        // Session refresh or revalidation — re-read role from DB
        // This ensures role changes propagate within 30 seconds (Requirement 9.6)
        const freshUser = getUserById(token.sub as string);
        if (freshUser) {
          token.role = freshUser.role;
          token.allowedTables = freshUser.allowedTables;
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.user.role = token.role;
      session.user.allowedTables = token.allowedTables;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
