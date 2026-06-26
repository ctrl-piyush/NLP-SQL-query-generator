# Implementation Plan: Database Connectivity

## Overview

This plan implements real database connectivity and query execution for the SQL Query Generator. The approach is: types first, then utilities/stores, then API routes, then UI components, then integration wiring. Each task builds incrementally on previous work so there is no orphaned code.

## Tasks

- [x] 1. Define types and install dependencies
  - [x] 1.1 Add database connectivity types to types/index.ts
    - Add `ConnectionConfig`, `LiveTableInfo`, `LiveColumnInfo`, `ConnectRequest`, `ConnectResponse`, `ExecuteRequest`, `ExecutionResult` (union of `SelectResult | MutationResult | ExecutionError`), `SelectResult`, `MutationResult`, `ExecutionError` interfaces as specified in the design document
    - _Requirements: 1.1, 2.1, 6.1, 6.2, 6.3_

  - [x] 1.2 Install mysql2, pg, and @types/pg dependencies
    - Run `npm install mysql2 pg` and `npm install -D @types/pg`
    - Verify node-sql-parser is already in package.json (it is)
    - _Requirements: 6.4_

- [x] 2. Implement SQL validation utilities
  - [x] 2.1 Create lib/sqlValidator.ts with validateSingleStatement function
    - Use `node-sql-parser` Parser to parse SQL into AST
    - Return `{ valid: true }` for single statement, `{ valid: false, error }` for multiple statements
    - On parse error, return `{ valid: true }` (let DB return real error — only gate multi-statement)
    - Accept `databaseType` param to set dialect (MySQL/PostgresQL)
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 2.2 Add classifyStatementType function to lib/sqlValidator.ts
    - Strip block comments (`/* ... */`) and line comments (`-- ...`)
    - Case-insensitive keyword matching via toUpperCase()
    - Handle CTE prefixes by tracking parenthesis depth to zero, then reading terminal DML keyword
    - Return "SELECT" | "INSERT" | "UPDATE" | "DELETE" | "OTHER"
    - _Requirements: 4.5_

  - [x] 2.3 Add requiresConfirmation function to lib/sqlValidator.ts
    - Classify statement type first via classifyStatementType
    - Attempt AST parse; if succeeds, check node.type and node.where structurally
    - If parse fails AND type is UPDATE/DELETE → return true (fail-closed)
    - If parse fails AND type is SELECT/INSERT/OTHER → return false (fail-open)
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 2.4 Write property test for validateSingleStatement
    - **Property 3: Multi-Statement Rejection**
    - **Property 4: Single Statements With Embedded Semicolons Pass Validation**
    - **Validates: Requirements 3.1, 3.2**

  - [ ]* 2.5 Write property test for requiresConfirmation and classifyStatementType
    - **Property 5: WHERE Clause Guard**
    - **Property 6: Fail-Closed for Unparseable Destructive, Fail-Open for Non-Destructive**
    - **Property 7: classifyStatementType Correctness Through Comments and CTEs**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

- [x] 3. Implement connection store
  - [x] 3.1 Create lib/connectionStore.ts as a Zustand store without persist
    - Define `ConnectionState` interface with: connectionConfig, isConnected, databaseName, liveSchema, lastExecutionResult, isExecuting
    - Implement actions: setConnection, disconnect, setExecutionResult, setIsExecuting
    - Do NOT use persist middleware — credentials stay in memory only, cleared on page refresh
    - _Requirements: 7.3, 7.4, 7.5, 7.7_

- [x] 4. Implement API routes
  - [x] 4.1 Create app/api/connect/route.ts (POST handler)
    - Validate required fields: host, port (1–65535), user, database; password is optional (can be empty)
    - Create ephemeral database connection using mysql2 (promise API) or pg based on databaseType
    - Test connectivity with `SELECT 1`
    - On success, query `information_schema` for table/column/key metadata (exclude system schemas)
    - Return `ConnectResponse` with success status and schema array
    - Close connection in a `finally` block regardless of outcome
    - Set connection timeout to 10 seconds
    - Sanitize error messages — no raw stack traces or internal server paths
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4_

  - [x] 4.2 Create app/api/execute/route.ts (POST handler)
    - Parse request body for sql, connectionConfig, and optional confirm flag
    - Reject empty/whitespace-only SQL with HTTP 400
    - Call validateSingleStatement on original SQL — reject with MULTI_STATEMENT if invalid
    - Call requiresConfirmation on original SQL — reject with CONFIRMATION_REQUIRED if true and confirm !== true
    - Determine operation type via classifyStatementType
    - For SELECT: wrap original SQL with `SELECT * FROM ({sql}) AS __subq LIMIT 201` (MySQL) or `FETCH FIRST 201 ROWS ONLY` (PostgreSQL)
    - For non-SELECT: execute original SQL directly
    - Open connection, execute, format response (SelectResult / MutationResult / ExecutionError)
    - For SELECT: return max 200 rows, set hasMore = true if DB returned 201 rows
    - Close connection in a `finally` block
    - Catch all errors and return structured ExecutionError — never throw unhandled
    - Set connection timeout to 10 seconds
    - _Requirements: 3.1, 3.4, 3.5, 4.1, 4.7, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [ ]* 4.3 Write unit tests for /api/connect and /api/execute routes
    - Mock mysql2 and pg to test validation logic, error handling, and response formatting
    - Test missing field rejection, multi-statement rejection, WHERE guard, row capping, structured errors
    - **Property 2: Input Validation Rejects Incomplete Connection Configs**
    - **Property 8: Row Cap Wrapping by Dialect**
    - **Property 9: Response Row Cap**
    - **Property 10: Structured Error Responses**
    - **Validates: Requirements 1.2, 5.1, 5.2, 5.3, 6.3, 6.5**

- [x] 5. Checkpoint - Ensure backend logic is solid
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement UI components
  - [x] 6.1 Create components/ConnectionModal.tsx
    - Modal dialog with form fields: databaseType dropdown (MySQL/PostgreSQL), host, port, user, password, database name
    - Auto-fill port on databaseType change (3306 for MySQL, 5432 for PostgreSQL)
    - Submit calls POST /api/connect with form data
    - Show loading state during connection test
    - On success: update connectionStore via setConnection, show success toast, close modal
    - On failure: show error toast with message from API
    - Style with Tailwind dark theme (surface-card, border-surface-border, brand-500 accents)
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 6.2 Create components/ConnectionStatusIndicator.tsx
    - Read connection state from useConnectionStore
    - Connected: green dot + database name text
    - Disconnected: gray dot + "Disconnected" text
    - On click: open ConnectionModal (accept onOpenModal prop or manage state internally)
    - _Requirements: 7.3, 7.4, 7.6_

  - [x] 6.3 Create components/ConfirmationDialog.tsx
    - Modal dialog showing risk level (amber for high, red for critical), warning messages, and the SQL statement
    - "Execute Anyway" button triggers onConfirm callback
    - "Cancel" button triggers onCancel callback and returns focus to Execute button
    - Style risk levels with appropriate accent colors (accent-amber, red-500)
    - _Requirements: 8.3, 8.4, 8.5_

  - [x] 6.4 Create components/ExecutionResultsPanel.tsx
    - Accept `result: ExecutionResult | null` prop
    - For SELECT: render scrollable data table with column headers, row data (max 200 rows), execution time badge
    - For SELECT with 0 rows: render column headers + empty state message + execution time badge
    - For SELECT with hasMore=true: render truncation notice ("Showing 200 of more rows")
    - For mutation: render success indicator with operation type, affected rows, execution time
    - For error: render error indicator with code, message, and optional detail
    - Null state: render empty placeholder
    - _Requirements: 9.2, 9.3, 9.4, 9.5, 9.6_

- [x] 7. Integrate Execute button and confirmation flow
  - [x] 7.1 Update components/QueryAlternatives.tsx with Execute button
    - Add "Execute" button next to each "Use this" button
    - Disabled state when not connected (reduced opacity + tooltip "Connect to a database to execute")
    - On click: check risk level from parent result.impact
    - Low/medium risk: call execute API immediately without confirm flag
    - High/critical risk: show ConfirmationDialog with warnings
    - Loading state on button while executing (spinner, disabled)
    - On result: store in connectionStore via setExecutionResult
    - On error response: re-enable button, show error
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

  - [x] 7.2 Update components/ResultsPanel.tsx to add "Results" tab
    - Add 6th tab: `{ id: "results", label: "Results", icon: PlayCircle }` after "schema"
    - Import and render ExecutionResultsPanel in the "results" tab content area
    - Read lastExecutionResult from useConnectionStore
    - Auto-switch to Results tab when a new execution result arrives
    - _Requirements: 9.1_

- [x] 8. Wire components into page layout
  - [x] 8.1 Update app/page.tsx to integrate ConnectionModal and ConnectionStatusIndicator
    - Import ConnectionModal and ConnectionStatusIndicator
    - Add ConnectionStatusIndicator to the navbar area
    - Add ConnectionModal (controlled by isOpen state, opened via status indicator click)
    - Pass connection and schema data through to existing components as needed
    - _Requirements: 7.3, 7.6_

- [x] 9. Update documentation
  - [x] 9.1 Update .env.example with database connectivity placeholders
    - Add commented-out entries for DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
    - Add comments stating these are provided by the browser at runtime, never read from server env
    - _Requirements: 10.1_

  - [x] 9.2 Update README.md with Security Notes section
    - Document that the app should not be exposed to untrusted users without per-user auth and rate limiting
    - Document that credentials exist only in browser JS heap memory until page refresh/tab close
    - Document that credentials are transmitted only over HTTPS in POST request bodies
    - Document that the server opens a new connection per request with no persistent pool
    - _Requirements: 10.2, 10.3, 10.4_

- [x] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The project uses TypeScript with Next.js 14 App Router, Tailwind CSS dark theme, Zustand for state, and lucide-react for icons

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "3.1"] },
    { "id": 2, "tasks": ["2.2"] },
    { "id": 3, "tasks": ["2.3"] },
    { "id": 4, "tasks": ["2.4", "2.5", "4.1"] },
    { "id": 5, "tasks": ["4.2"] },
    { "id": 6, "tasks": ["4.3", "6.1", "6.2", "6.3", "6.4"] },
    { "id": 7, "tasks": ["7.1", "7.2"] },
    { "id": 8, "tasks": ["8.1"] },
    { "id": 9, "tasks": ["9.1", "9.2"] }
  ]
}
```
