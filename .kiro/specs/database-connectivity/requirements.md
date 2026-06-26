# Requirements Document

## Introduction

This document defines the formal requirements for adding database connectivity and query execution to the SQL Query Generator application. The feature enables users to connect to MySQL or PostgreSQL databases directly from the UI, inspect live schema metadata, and execute generated queries against real databases — all within a session-scoped, security-first architecture where credentials never persist beyond a single HTTP request lifecycle.

## Glossary

- **Connection_API**: The POST /api/connect endpoint that accepts database credentials, tests connectivity, and returns schema metadata
- **Execution_API**: The POST /api/execute endpoint that validates and runs a single SQL statement against a connected database
- **ConnectionModal**: The client-side modal dialog component for entering database connection credentials
- **ConnectionStore**: The Zustand state store (without persist middleware) that holds connection configuration and schema in browser memory only
- **ConnectionStatusIndicator**: The navbar component that displays current connection state
- **ExecutionResultsPanel**: The tabbed panel component that renders query execution results (data table, mutation summary, or error)
- **ConfirmationDialog**: The modal dialog that warns users before executing high/critical risk or unguarded destructive queries
- **AST_Parser**: The node-sql-parser library used for structural SQL analysis (single-statement validation and WHERE clause detection)
- **classifyStatementType**: A function that determines the effective DML type of a SQL string by stripping comments, handling CTE prefixes, and performing case-insensitive keyword matching
- **Row_Cap**: The mechanism that limits SELECT query results to 200 rows by wrapping queries with database-level LIMIT/FETCH FIRST clauses
- **Fail_Closed**: A safety strategy where an operation defaults to the more restrictive outcome when analysis is inconclusive (e.g., requiring confirmation when a destructive statement cannot be parsed)

## Requirements

### Requirement 1: Database Connection

**User Story:** As a developer, I want to connect to my MySQL or PostgreSQL database from the SQL Query Generator UI, so that I can inspect real schema metadata and execute queries against live data.

#### Acceptance Criteria

1. WHEN a user submits valid connection credentials via the ConnectionModal, THE Connection_API SHALL test the connection by executing `SELECT 1`, fetch schema metadata from `information_schema`, and return a success response containing an array of LiveTableInfo objects
2. WHEN the Connection_API receives a request with missing required fields (host, port, user, or database) or a port value outside the range 1–65535, THE Connection_API SHALL return a failure response with a validation error message indicating which field is missing or invalid
3. IF a connection test fails due to authentication errors or unreachable hosts, THEN THE Connection_API SHALL return a failure response within 10 seconds containing an error message that indicates the failure category (e.g., authentication rejected, host unreachable, timeout) without exposing raw stack traces or internal server paths
4. THE Connection_API SHALL close the database connection in a finally block before returning a response, regardless of whether the connection test succeeds or fails
5. THE Connection_API SHALL NOT write the password field to any file, database, log, or persistent storage at any point during request handling
6. THE Connection_API SHALL NOT require the password field to be non-empty, allowing connections to databases configured without password authentication

### Requirement 2: Schema Metadata Retrieval

**User Story:** As a developer, I want to see my database's table and column information after connecting, so that I can understand the schema structure when working with generated queries.

#### Acceptance Criteria

1. WHEN a connection is successfully established, THE Connection_API SHALL query information_schema within 10 seconds and return all user-schema tables, where each table includes: table name, and for each column: column name, data type, primary key status (boolean), nullability (boolean), default value (string or null), and foreign key references (referenced table and column, or null)
2. IF the connected database contains no user-schema tables, THEN THE Connection_API SHALL return an empty array with no error indication
3. THE Connection_API SHALL exclude tables belonging to database engine system schemas (information_schema, mysql, performance_schema, sys for MySQL; pg_catalog, information_schema for PostgreSQL) from the schema response
4. IF the schema retrieval query fails or times out, THEN THE Connection_API SHALL return an error response indicating that schema metadata could not be retrieved, without exposing raw database error details to the caller

### Requirement 3: Single Statement Validation

**User Story:** As a developer, I want the system to prevent multi-statement (stacked query) execution, so that SQL injection via concatenated statements is blocked.

#### Acceptance Criteria

1. WHEN the Execution_API receives a SQL input, THE AST_Parser SHALL parse the input into an abstract syntax tree and reject the request with HTTP 400 and error code MULTI_STATEMENT if the AST contains more than one statement node
2. WHEN a SQL input contains semicolons inside single-quoted string literals, double-quoted identifiers, block comments, line comments, or as the final character of a single statement, THE AST_Parser SHALL correctly identify it as a single statement by relying on grammatical structure rather than text splitting
3. IF the AST_Parser fails to parse a SQL input due to vendor-specific or dialect-specific syntax that the parser does not support, THEN THE Execution_API SHALL allow the statement through for execution (letting the database return any real syntax error) because the validation goal is multi-statement prevention only
4. THE Execution_API SHALL perform single-statement validation on the original user SQL before any row-cap wrapping occurs
5. IF the SQL input provided to the Execution_API is empty or contains only whitespace after trimming, THEN THE Execution_API SHALL reject the request with HTTP 400 and an error message indicating that the SQL input is required

### Requirement 4: WHERE Clause Guard

**User Story:** As a developer, I want the system to require explicit confirmation before executing UPDATE or DELETE statements without a WHERE clause, so that accidental mass data modifications are prevented.

#### Acceptance Criteria

1. WHEN the AST_Parser successfully parses an UPDATE or DELETE statement and the AST node's where property is null, THE Execution_API SHALL reject the request with error code CONFIRMATION_REQUIRED and an error message indicating the statement lacks a WHERE clause, unless the request includes the confirm field set to the boolean value true
2. WHEN the AST_Parser successfully parses an UPDATE or DELETE statement and the AST node's where property is present, THE Execution_API SHALL allow execution without requiring the confirm field
3. WHEN the AST_Parser fails to parse a SQL input AND classifyStatementType identifies it as UPDATE or DELETE, THE Execution_API SHALL require confirmation by rejecting the request with error code CONFIRMATION_REQUIRED (fail-closed behavior), regardless of whether the statement actually contains a WHERE clause
4. WHEN the AST_Parser fails to parse a SQL input AND classifyStatementType identifies it as SELECT, INSERT, or OTHER, THE Execution_API SHALL allow execution without requiring confirmation (fail-open behavior for non-destructive operations)
5. THE classifyStatementType function SHALL strip SQL block comments (delimited by /* and */) and single-line comments (prefixed by --), apply case-insensitive comparison, and walk past CTE prefixes (WITH ... AS (...)) by tracking parenthesis depth to zero before identifying the first DML keyword (SELECT, INSERT, UPDATE, DELETE) as the statement type, returning OTHER if no DML keyword is found
6. IF the SQL input provided to the Execution_API is empty or contains only whitespace, THEN THE Execution_API SHALL reject the request with an error message indicating that the SQL input is invalid, without requiring confirmation
7. IF the confirm field is absent or set to any value other than boolean true, THEN THE Execution_API SHALL treat the request as unconfirmed for purposes of the WHERE clause guard check

### Requirement 5: Row Cap Enforcement

**User Story:** As a developer, I want SELECT query results limited to 200 rows with the cap enforced at the database level, so that the server never materializes unbounded result sets into memory.

#### Acceptance Criteria

1. WHEN the Execution_API processes a statement classified as SELECT (via classifyStatementType) for a MySQL database, THE Execution_API SHALL wrap the original SQL in a subquery with LIMIT 201 before sending it to the database
2. WHEN the Execution_API processes a statement classified as SELECT (via classifyStatementType) for a PostgreSQL database, THE Execution_API SHALL wrap the original SQL in a subquery with FETCH FIRST 201 ROWS ONLY before sending it to the database
3. THE Execution_API SHALL return at most 200 rows in the response and use the 201st row solely to determine whether additional data exists beyond the cap
4. THE Execution_API SHALL apply the row-cap wrapping after all validation (single-statement check and WHERE-clause guard) has passed on the original user SQL
5. THE Execution_API SHALL NOT apply row-cap wrapping to INSERT, UPDATE, DELETE, or other non-SELECT statements
6. IF the row-cap-wrapped query causes a database error (e.g., syntax error from the wrapping), THEN THE Execution_API SHALL return a structured error response and SHALL NOT fall back to executing the unwrapped original query

### Requirement 6: Query Execution and Response

**User Story:** As a developer, I want to execute queries against my connected database and receive structured results, so that I can verify generated SQL against real data.

#### Acceptance Criteria

1. WHEN the Execution_API executes a SELECT query successfully, THE Execution_API SHALL return a JSON response containing: type "select", columns (array of column name strings), rows (array of row objects, capped at 200), rowCount (number of rows in the response), hasMore (boolean indicating if additional rows exist beyond 200), and executionTimeMs (integer milliseconds)
2. WHEN the Execution_API executes an INSERT, UPDATE, or DELETE query successfully, THE Execution_API SHALL return a JSON response containing: type "mutation", operation (the DML keyword), affectedRows (integer count of affected rows), and executionTimeMs (integer milliseconds)
3. WHEN a database error occurs during query execution, THE Execution_API SHALL return a structured JSON response containing: type "error", code (the database's native error code, or "QUERY_ERROR" if unavailable), message (the database's error message text), and detail (additional error detail string when available from the database, or omitted)
4. THE Execution_API SHALL open a new database connection for each request and close it in a finally block regardless of execution success or failure
5. THE Execution_API SHALL NOT throw unhandled exceptions for any category of database error including authentication failures, network timeouts, syntax errors, and permission denials
6. WHEN a SELECT query returns zero rows, THE Execution_API SHALL return a response with type "select", an empty rows array, rowCount 0, hasMore false, and columns derived from the query metadata if available
7. THE Execution_API SHALL enforce a connection timeout of 10 seconds; if the database connection cannot be established within this window, the API SHALL return a structured error response with code "ETIMEDOUT"

### Requirement 7: Client Connection Management

**User Story:** As a developer, I want to manage my database connection through a modal interface with visual status feedback, so that I can easily connect, disconnect, and see my current connection state.

#### Acceptance Criteria

1. WHEN a user opens the ConnectionModal, THE ConnectionModal SHALL display form fields for database type (MySQL or PostgreSQL), host, port, user, password, and database name
2. WHEN a user selects a database type in the ConnectionModal, THE ConnectionModal SHALL pre-fill the port field with the default port (3306 for MySQL, 5432 for PostgreSQL)
3. WHEN a connection succeeds, THE ConnectionStore SHALL save the connection configuration and live schema in memory and the ConnectionStatusIndicator SHALL display a green dot with the connected database name
4. WHEN no connection is active, THE ConnectionStatusIndicator SHALL display a gray dot with the text "Disconnected"
5. THE ConnectionStore SHALL NOT use Zustand persist middleware, ensuring that connection configuration including passwords exists only in JavaScript heap memory and is cleared on page refresh
6. WHEN a user clicks the ConnectionStatusIndicator, THE ConnectionStatusIndicator SHALL open the ConnectionModal
7. WHEN a user refreshes the page or navigates away, THE ConnectionStore SHALL reset to its initial disconnected state with all credential fields cleared

### Requirement 8: Execute Button Integration

**User Story:** As a developer, I want to execute generated queries directly from the query alternatives panel with appropriate safety guards, so that I can test SQL against my real database without leaving the application.

#### Acceptance Criteria

1. WHILE no database connection is active, THE Execute button SHALL be disabled, styled with reduced opacity (visually distinct from the enabled state), and display a tooltip stating that a connection is required when hovered
2. WHEN a user clicks Execute on a query with a low or medium risk level, THE application SHALL send the execution request immediately without displaying the ConfirmationDialog
3. WHEN a user clicks Execute on a query with high or critical risk level, THE application SHALL display the ConfirmationDialog showing the risk level and associated warnings from the query impact analysis before making any API call
4. WHEN the user clicks "Execute Anyway" in the ConfirmationDialog, THE application SHALL close the dialog, disable the Execute button, display a loading indicator on the button, and send the execution request with confirm set to true
5. WHEN the user clicks "Cancel" in the ConfirmationDialog, THE application SHALL close the dialog without making any API call and return focus to the Execute button
6. IF the execution API call fails or returns an error response, THEN THE application SHALL re-enable the Execute button, remove the loading indicator, and display an error message indicating the failure reason
7. THE confirm flag with value true SHALL only be included in an execution request as a direct result of the user clicking "Execute Anyway" in the ConfirmationDialog, with no code path that defaults confirm to true

### Requirement 9: Execution Results Display

**User Story:** As a developer, I want to see query execution results in a dedicated panel with appropriate formatting for different result types, so that I can quickly understand what my query produced.

#### Acceptance Criteria

1. THE ExecutionResultsPanel SHALL be rendered as a tab labeled "Results" in the results area, positioned after the existing tabs (Explanation, Impact, Validation, Alternatives, Schema)
2. WHEN a SELECT result containing one or more rows is displayed, THE ExecutionResultsPanel SHALL render a data table with column headers matching the result columns, row data for up to 200 rows, and vertical and horizontal scrolling when content exceeds the panel viewport, along with an execution time badge displaying the duration in milliseconds (e.g., "124 ms")
3. WHEN a SELECT result returns zero rows, THE ExecutionResultsPanel SHALL render the column headers with an empty-state message indicating no rows matched the query, along with the execution time badge
4. WHEN a SELECT result is truncated (more than 200 rows available), THE ExecutionResultsPanel SHALL display a truncation notice stating the number of rows displayed (200) and indicating that additional rows exist
5. WHEN a mutation result is displayed, THE ExecutionResultsPanel SHALL render a success indicator showing the operation type (INSERT, UPDATE, or DELETE), the number of affected rows, and the execution time in milliseconds
6. IF an execution error occurs, THEN THE ExecutionResultsPanel SHALL render an error indicator displaying the error code, the error message, and the error detail when the detail is provided by the database response

### Requirement 10: Documentation Updates

**User Story:** As a developer setting up the project, I want clear documentation about database connectivity configuration and security considerations, so that I can safely use and deploy the feature.

#### Acceptance Criteria

1. THE .env.example file SHALL include commented-out placeholder entries for DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, and DB_NAME variables, each with a comment stating that these values are provided by the browser at runtime and are never read from the server environment or stored server-side
2. THE README SHALL include a section with the heading "Security Notes" documenting that the application should not be exposed to untrusted users without per-user authentication and rate limiting, and that database credentials are supplied by the client on each request
3. THE README SHALL document in the "Security Notes" section that credentials exist only in browser JavaScript heap memory until the page is refreshed or the tab is closed, and are transmitted only over HTTPS in POST request bodies
4. THE README "Security Notes" section SHALL state that the server opens a new database connection per request and does not maintain a persistent connection pool, so no credentials or connections persist between HTTP requests
