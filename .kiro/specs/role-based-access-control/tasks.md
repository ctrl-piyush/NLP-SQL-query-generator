# Implementation Plan: Role-Based Access Control

## Overview

This plan implements RBAC for the SQL Query Generator application by introducing authentication via NextAuth.js, a SQLite-backed user/role store, a pure-function Permission Engine, middleware-based route protection, schema visibility filtering, and an admin panel for user management. Each task builds incrementally, starting with data models and core logic, then layering in auth, API enforcement, and UI adaptations.

## Tasks

- [x] 1. Set up RBAC dependencies and project structure
  - [x] 1.1 Install dependencies and create directory structure
    - Install `next-auth`, `better-sqlite3`, `bcrypt`, and `fast-check` (dev)
    - Install `@types/better-sqlite3` and `@types/bcrypt` as dev dependencies
    - Create directories: `lib/rbac/`, `app/login/`, `app/admin/`, `app/api/auth/[...nextauth]/`, `app/api/admin/`, `__tests__/rbac/`
    - _Requirements: 10.4, 10.7_

  - [x] 1.2 Define TypeScript types and interfaces for RBAC
    - Create `types/rbac.ts` with `Role`, `StoredUser`, `AuthUser`, `PermissionContext`, `PermissionResult`, `JWTPayload`, and `SQLOperation` type definitions
    - Extend NextAuth session types with role and allowedTables in `types/next-auth.d.ts`
    - _Requirements: 2.1, 2.4_

- [x] 2. Implement RBAC store (SQLite user/role persistence)
  - [x] 2.1 Create SQLite database initialization and schema
    - Create `lib/rbac/db.ts` that initializes SQLite via `better-sqlite3`
    - Create the `users` table with columns: id, email, password_hash, role, allowed_tables, failed_attempts, locked_until, created_at, updated_at
    - Add unique constraint on email and CHECK constraint on role
    - Seed a default admin account on first initialization
    - _Requirements: 2.3, 8.6_

  - [x] 2.2 Implement user store CRUD functions
    - Create `lib/rbac/userStore.ts` with functions: `createUser`, `getUserByEmail`, `getUserById`, `getAllUsers`, `updateUserRole`, `updateAllowedTables`, `countAdmins`
    - `createUser` must hash passwords with bcrypt (cost factor 10+), assign viewer role by default, and set allowed_tables to empty array
    - `updateUserRole` must check admin count invariant before demoting the last admin
    - _Requirements: 2.2, 2.3, 8.3, 8.6, 8.7, 10.4_

  - [x] 2.3 Implement authentication helpers (verify, lockout)
    - Add `verifyUser`, `recordFailedAttempt`, `resetFailedAttempts`, and `isAccountLocked` functions to `lib/rbac/userStore.ts`
    - `recordFailedAttempt` increments counter and locks account for 15 minutes after 5 consecutive failures
    - `verifyUser` checks lockout status before comparing passwords
    - _Requirements: 1.6, 1.7, 10.4_

  - [ ]* 2.4 Write property tests for user store (Properties 6, 7, 8, 10, 11, 12)
    - **Property 6: Account lockout threshold** — verify lockout triggers at exactly 5 failures and lasts 15 minutes
    - **Property 7: Credential length validation** — verify email 1-254 chars and password 8-128 chars accepted/rejected
    - **Property 8: Default role assignment on user creation** — verify new users always get viewer role with empty allowed tables
    - **Property 10: Invalid role string rejection** — verify non-"viewer"/"editor"/"admin" strings are rejected
    - **Property 11: Admin count invariant** — verify last admin cannot be demoted
    - **Property 12: Duplicate email rejection** — verify duplicate emails are rejected
    - Create `__tests__/rbac/userStore.property.test.ts` using fast-check
    - **Validates: Requirements 1.6, 1.7, 2.2, 2.5, 2.6, 8.3, 8.6, 8.7**

- [ ] 3. Implement Permission Engine
  - [x] 3.1 Implement SQL table extraction and operation classification
    - Create `lib/permissions.ts` with `extractReferencedTables` function using `node-sql-parser`
    - Handle FROM clauses, JOIN clauses, subqueries, and CTEs
    - Implement `classifyOperation` to categorize SQL as SELECT, INSERT, UPDATE, DELETE, or DDL
    - Return null from `extractReferencedTables` when SQL is unparseable
    - _Requirements: 6.1, 6.5_

  - [x] 3.2 Implement permission check logic (`checkQueryPermission`)
    - Implement `checkQueryPermission` that enforces the role permission matrix:
      - Viewer: reject all execution
      - Editor: allow SELECT only on allowed tables, reject all other operations
      - Admin: allow SELECT/INSERT/UPDATE/DELETE on any table, reject DDL
    - Return structured `PermissionResult` with descriptive reason on denial
    - _Requirements: 3.3, 4.1, 4.2, 4.3, 5.1, 5.5, 6.2, 6.3_

  - [x] 3.3 Implement schema filtering function (`filterSchema`)
    - Implement `filterSchema` that returns full schema for admin, filtered subset for editor/viewer
    - Ensure output never contains tables not in original schema
    - _Requirements: 4.4, 5.2, 7.1, 7.2_

  - [ ]* 3.4 Write property tests for Permission Engine (Properties 1-5)
    - **Property 1: Operation permission by role** — verify role/operation matrix holds for all combinations
    - **Property 2: Table permission for editor role** — verify editor allowed iff all tables in allowed set
    - **Property 3: Schema filtering by role** — verify admin gets full schema, others get subset
    - **Property 4: Table extraction completeness** — verify all referenced tables are extracted
    - **Property 5: Unparseable SQL rejection** — verify invalid SQL is always rejected
    - Create `__tests__/rbac/permissions.property.test.ts` using fast-check
    - **Validates: Requirements 3.3, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.5, 6.1, 6.2, 6.3, 6.5, 7.1, 7.2**

- [x] 4. Checkpoint - Core logic verification
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement authentication layer (NextAuth.js)
  - [x] 5.1 Configure NextAuth.js with Credentials provider
    - Create `lib/auth.ts` with authOptions using CredentialsProvider
    - Wire authorize function to `verifyUser` from userStore
    - Configure JWT strategy with 24h maxAge
    - Add jwt and session callbacks to include role and allowedTables in session
    - _Requirements: 1.2, 10.1, 10.2, 10.7_

  - [x] 5.2 Create NextAuth API route
    - Create `app/api/auth/[...nextauth]/route.ts` exporting GET and POST handlers from NextAuth
    - _Requirements: 1.2, 1.4_

  - [x] 5.3 Create authentication middleware
    - Create `middleware.ts` using `withAuth` from next-auth/middleware
    - Configure matcher to exclude `/login`, `/api/auth`, `_next/static`, `_next/image`, and `favicon.ico`
    - Unauthenticated requests redirect to `/login`
    - _Requirements: 1.1, 1.5, 10.3, 10.5_

- [x] 6. Implement login page
  - [x] 6.1 Create login page UI component
    - Create `app/login/page.tsx` with email/password form
    - Display generic error message on invalid credentials (do not reveal which field is wrong)
    - Display account lockout message with remaining time when locked
    - Validate email max 254 chars and password 8-128 chars client-side before submission
    - Redirect to main page on successful authentication
    - _Requirements: 1.1, 1.2, 1.3, 1.6, 1.7_

- [x] 7. Enforce permissions in API routes
  - [x] 7.1 Add session validation and permission checks to execute route
    - Modify `app/api/execute/route.ts` to get session via `getServerSession`
    - Return 401 if no session, call `checkQueryPermission` with user's role and allowed tables
    - Return 403 with structured error if permission denied
    - Ensure permission check completes before query execution
    - _Requirements: 3.3, 4.1, 4.2, 4.3, 5.1, 5.5, 6.2, 6.3, 6.4_

  - [x] 7.2 Add session validation to generate route with schema filtering
    - Modify `app/api/generate/route.ts` to get session and filter schema context
    - Pass only allowed tables to query generation LLM for non-admin users
    - Pass all tables for admin users
    - _Requirements: 7.3, 7.4_

  - [x] 7.3 Add session validation to connect route
    - Modify `app/api/connect/route.ts` to validate session and check role
    - Reject connection requests from viewer role (return 403)
    - Allow editor and admin roles to connect
    - _Requirements: 3.5, 4.5, 5.4_

  - [x] 7.4 Add session validation to remaining API routes
    - Add session validation to `app/api/explain/route.ts`, `app/api/validate/route.ts`, and `app/api/history/route.ts`
    - Return 401 for unauthenticated requests
    - _Requirements: 6.4, 10.3, 10.5_

- [x] 8. Implement Admin Panel
  - [x] 8.1 Create admin API routes
    - Create `app/api/admin/users/route.ts` with GET (list users) and POST (create user) handlers
    - Create `app/api/admin/users/[id]/route.ts` with PATCH handler for role and allowed_tables updates
    - All admin routes check session has admin role, return 403 otherwise
    - POST validates email uniqueness, password length, assigns viewer role by default
    - PATCH checks admin count invariant before role demotion
    - _Requirements: 2.5, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

  - [x] 8.2 Create Admin Panel page UI
    - Create `app/admin/page.tsx` with user list table showing email and role
    - Add role assignment dropdown per user (viewer/editor/admin)
    - Add allowed tables editor for editor users (multi-select or text input)
    - Add "Create User" form with email and password fields
    - Display error messages for failed operations (last admin, duplicate email, invalid role)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.6, 8.7_

  - [ ]* 8.3 Write unit tests for admin API routes
    - Test non-admin access rejection
    - Test user creation with defaults
    - Test last admin protection
    - Test duplicate email rejection
    - _Requirements: 2.5, 8.3, 8.5, 8.7_

- [x] 9. Checkpoint - Auth and admin verification
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement UI adaptation based on role
  - [x] 10.1 Add role display and session context to layout
    - Wrap app in NextAuth `SessionProvider` in `app/layout.tsx`
    - Create a `components/RoleBadge.tsx` that displays the user's current role in the header
    - Add logout button to header that calls NextAuth signOut
    - _Requirements: 1.4, 9.1_

  - [x] 10.2 Adapt query execution UI by role
    - Modify `components/QueryInput.tsx` or relevant component to disable execute button for viewers with tooltip "Execution requires a higher role"
    - For editors: disable execute for non-SELECT queries or queries referencing unauthorized tables, enable only for valid SELECT on allowed tables
    - For admins: enable execute for all non-DDL queries
    - _Requirements: 3.4, 9.2, 9.3_

  - [x] 10.3 Adapt schema viewer and connection controls by role
    - Modify `components/SchemaViewer.tsx` to display only filtered tables (use `filterSchema` result)
    - Hide connection controls (`components/ConnectionModal.tsx`) for viewer role
    - Display empty state message when user has no allowed tables
    - _Requirements: 3.5, 4.4, 7.1, 7.5, 9.5_

  - [x] 10.4 Add admin panel navigation link
    - Show "Admin Panel" link in header only for admin users
    - Hide for viewer and editor roles
    - _Requirements: 5.3, 9.4, 9.5_

  - [ ]* 10.5 Write unit tests for role-based UI rendering
    - Test role badge displays correct role
    - Test execute button disabled/enabled states per role
    - Test admin link visibility per role
    - Test schema viewer filtering
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 11. Implement session refresh and role propagation
  - [x] 11.1 Handle role changes for active sessions
    - Implement a mechanism to refresh session data on navigation (refetch session on route change or use short JWT revalidation interval)
    - Ensure role changes propagate within 30 seconds or on next navigation
    - _Requirements: 9.6_

- [x] 12. Final checkpoint - Full integration verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design's Correctness Properties section
- Unit tests validate specific examples and edge cases
- The Permission Engine is a pure function module, making it highly testable independent of I/O
- NextAuth.js handles token generation, HTTP-only cookies, and CSRF protection out of the box
- SQLite via better-sqlite3 provides zero-config persistent storage for the RBAC user store

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["2.1", "3.1"] },
    { "id": 3, "tasks": ["2.2", "2.3", "3.2", "3.3"] },
    { "id": 4, "tasks": ["2.4", "3.4"] },
    { "id": 5, "tasks": ["5.1"] },
    { "id": 6, "tasks": ["5.2", "5.3"] },
    { "id": 7, "tasks": ["6.1", "7.1", "7.2", "7.3", "7.4"] },
    { "id": 8, "tasks": ["8.1"] },
    { "id": 9, "tasks": ["8.2", "8.3"] },
    { "id": 10, "tasks": ["10.1"] },
    { "id": 11, "tasks": ["10.2", "10.3", "10.4"] },
    { "id": 12, "tasks": ["10.5", "11.1"] }
  ]
}
```
