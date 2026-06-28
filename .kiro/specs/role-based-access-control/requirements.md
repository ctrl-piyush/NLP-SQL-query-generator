# Requirements Document

## Introduction

This document defines the requirements for adding Role-Based Access Control (RBAC) to the SQL Query Generator application. The system currently allows any user to connect to databases, generate SQL queries, and execute them without restriction. The RBAC feature introduces user authentication, role definitions, and permission enforcement to prevent unauthorized data modification and restrict table visibility based on assigned roles.

## Glossary

- **RBAC_System**: The role-based access control module responsible for authenticating users, managing roles, and enforcing permissions across the SQL Query Generator application.
- **Auth_Service**: The authentication service responsible for verifying user identity through credentials (email and password) and issuing session tokens.
- **Permission_Engine**: The component that evaluates whether a user's assigned role grants access to a requested operation on a specific table.
- **Role**: A named set of permissions that defines what tables a user can access and what SQL operations the user can perform. Roles are: viewer, editor, and admin.
- **Viewer**: A role that allows generating and viewing SQL queries but does not allow executing any queries against the database.
- **Editor**: A role that allows executing SELECT queries on explicitly allowed tables only.
- **Admin**: A role that grants full access to all tables and all SQL operations (SELECT, INSERT, UPDATE, DELETE).
- **Allowed_Tables**: The set of database tables that a specific role is permitted to access.
- **Session_Token**: A secure token issued after successful authentication that identifies the user and their role for subsequent requests.
- **Admin_Panel**: A protected UI page accessible only to admin users for managing user accounts, role assignments, and table permissions.

## Requirements

### Requirement 1: User Authentication

**User Story:** As a user, I want to authenticate with my credentials before accessing the application, so that the system can identify me and enforce appropriate permissions.

#### Acceptance Criteria

1. WHEN a user navigates to the application without a valid Session_Token, THE Auth_Service SHALL redirect the user to a login page.
2. WHEN a user submits valid email and password credentials, THE Auth_Service SHALL issue a Session_Token with a maximum lifetime of 24 hours and redirect the user to the main application page.
3. IF a user submits invalid credentials, THEN THE Auth_Service SHALL display an error message indicating authentication failure without revealing which field is incorrect.
4. WHEN a user clicks the logout button, THE Auth_Service SHALL invalidate the Session_Token and redirect the user to the login page.
5. WHEN a Session_Token expires or becomes invalid, THE Auth_Service SHALL redirect the user to the login page on the next request.
6. IF a user fails authentication 5 consecutive times for the same email address, THEN THE Auth_Service SHALL lock the account for 15 minutes and display a message indicating the account is temporarily locked.
7. THE Auth_Service SHALL accept email addresses with a maximum length of 254 characters and passwords between 8 and 128 characters.

### Requirement 2: Role Definitions

**User Story:** As an administrator, I want predefined roles with distinct permission levels, so that I can assign appropriate access to each user.

#### Acceptance Criteria

1. THE RBAC_System SHALL define exactly three roles with the following permission hierarchy: viewer (read-only access to resources), editor (read and write access to resources), and admin (read, write, and manage-users access to resources).
2. WHEN a new user account is created, THE RBAC_System SHALL automatically assign the viewer role to that account before the account becomes active.
3. THE RBAC_System SHALL store role assignments persistently so that role assignments survive application restarts without data loss.
4. THE RBAC_System SHALL treat the three roles as immutable, preventing creation, deletion, or modification of role definitions.
5. IF a non-admin user attempts to assign or change a role, THEN THE RBAC_System SHALL reject the operation and return an error message indicating insufficient permissions.
6. IF an admin attempts to assign a role that does not match one of the three defined roles, THEN THE RBAC_System SHALL reject the assignment and return an error message indicating an invalid role.

### Requirement 3: Viewer Role Permissions

**User Story:** As a viewer, I want to generate and view SQL queries without executing them, so that I can explore query possibilities safely.

#### Acceptance Criteria

1. WHILE a user has the viewer role, THE RBAC_System SHALL allow the user to generate SQL queries through the natural language input.
2. WHILE a user has the viewer role, THE RBAC_System SHALL allow the user to view generated query alternatives, explanations, and impact analysis.
3. WHILE a user has the viewer role, IF a query execution request is submitted, THEN THE Permission_Engine SHALL reject the request, return an error message indicating that the viewer role does not permit query execution, and perform no changes to the database.
4. WHILE a user has the viewer role, THE RBAC_System SHALL hide the query execution button from the user interface.
5. WHILE a user has the viewer role, THE RBAC_System SHALL hide the database connection controls from the user interface.
6. WHILE a user has the viewer role, THE RBAC_System SHALL allow the user to view query history entries previously generated during the session.

### Requirement 4: Editor Role Permissions

**User Story:** As an editor, I want to execute SELECT queries on my allowed tables, so that I can retrieve data without modifying it.

#### Acceptance Criteria

1. WHILE a user has the editor role, THE Permission_Engine SHALL allow execution of SELECT queries that reference only tables in the user's Allowed_Tables set.
2. WHILE a user has the editor role, THE Permission_Engine SHALL reject execution of INSERT, UPDATE, DELETE, CREATE, DROP, or ALTER queries regardless of the target table and return an error message indicating the operation type is not permitted for the editor role.
3. WHILE a user has the editor role, IF a SELECT query references at least one table not in the user's Allowed_Tables set, THEN THE Permission_Engine SHALL reject the query and return an error message identifying the unauthorized table name.
4. WHILE a user has the editor role, THE RBAC_System SHALL display only the tables in the user's Allowed_Tables set within the schema viewer.
5. WHILE a user has the editor role, THE RBAC_System SHALL allow the user to connect to the database using the connection modal.

### Requirement 5: Admin Role Permissions

**User Story:** As an admin, I want unrestricted access to all tables and operations, so that I can fully manage and query the database.

#### Acceptance Criteria

1. WHILE a user has the admin role, THE Permission_Engine SHALL allow execution of SELECT, INSERT, UPDATE, and DELETE queries on any table in the connected database, regardless of any Allowed_Tables configuration.
2. WHILE a user has the admin role, THE RBAC_System SHALL display all tables in the connected database within the schema viewer without filtering.
3. WHILE a user has the admin role, THE RBAC_System SHALL allow the user to navigate to and load the Admin_Panel route.
4. WHILE a user has the admin role, THE RBAC_System SHALL allow the user to connect to the database using the connection modal.
5. IF a user with the admin role submits a DDL query (CREATE, DROP, or ALTER), THEN THE Permission_Engine SHALL reject the query and return an error message indicating that only SELECT, INSERT, UPDATE, and DELETE operations are permitted.

### Requirement 6: Query Execution Enforcement

**User Story:** As a system operator, I want all query execution requests validated against the user's permissions, so that unauthorized operations are blocked at the server level.

#### Acceptance Criteria

1. WHEN a query execution request is received, THE Permission_Engine SHALL extract all table names referenced in the SQL statement, including tables in JOIN clauses, subqueries, and Common Table Expressions (CTEs).
2. IF a query execution request references a table not in the user's Allowed_Tables set, THEN THE Permission_Engine SHALL reject the request and return an error message specifying the first unauthorized table encountered.
3. IF a query execution request contains an operation type (INSERT, UPDATE, DELETE) not permitted for the user's role, THEN THE Permission_Engine SHALL reject the request and return an error message specifying the disallowed operation and the user's current role.
4. THE Permission_Engine SHALL validate permissions on the server-side API route before executing any query, regardless of client-side UI restrictions.
5. IF the Permission_Engine cannot parse the SQL statement to extract table names, THEN THE Permission_Engine SHALL reject the query execution request and return an error indicating the query could not be validated.
6. WHEN a query execution request passes both table-level and operation-level permission checks, THE Permission_Engine SHALL proceed with query execution within 200ms of receiving the request.

### Requirement 7: Schema Visibility Filtering

**User Story:** As a user, I want to see only the tables I am authorized to access, so that I am not confused by tables I cannot query.

#### Acceptance Criteria

1. WHEN the schema is loaded for a connected database, THE RBAC_System SHALL filter the schema to include only tables in the user's Allowed_Tables set, with their columns, before displaying in the schema viewer.
2. WHEN a user with the admin role views the schema, THE RBAC_System SHALL display all tables without filtering.
3. WHEN a non-admin user generates a query, THE RBAC_System SHALL provide only the tables in the user's Allowed_Tables set as schema context to the query generation LLM.
4. WHEN a user with the admin role generates a query, THE RBAC_System SHALL provide all tables as schema context to the query generation LLM.
5. IF the user's Allowed_Tables set is empty when the schema is loaded, THEN THE RBAC_System SHALL display an empty state message in the schema viewer indicating no tables are available and SHALL pass no schema context to the query generation LLM.

### Requirement 8: Admin Panel for User Management

**User Story:** As an admin, I want to manage user accounts and role assignments through an admin panel, so that I can control who has access to the system.

#### Acceptance Criteria

1. WHEN an admin navigates to the Admin_Panel, THE RBAC_System SHALL display a list of all registered user accounts showing each user's email address and currently assigned role.
2. WHEN an admin changes a user's role assignment, THE RBAC_System SHALL persist the change and enforce the new permissions on the user's next request.
3. IF an admin attempts to change the role of the only remaining admin account to a non-admin role, THEN THE RBAC_System SHALL reject the change and return an error message indicating at least one admin account must exist.
4. WHEN an admin configures Allowed_Tables for an editor user, THE RBAC_System SHALL persist the table list and enforce the updated access on the user's next request.
5. WHEN a non-admin user attempts to access the Admin_Panel route, THE RBAC_System SHALL reject the request and return an authorization error.
6. WHEN an admin creates a new user account, THE RBAC_System SHALL require an email address and a password of at least 8 characters, and assign the viewer role by default.
7. IF an admin attempts to create a user account with an email address that already exists in the system, THEN THE RBAC_System SHALL reject the creation and return an error message indicating the email is already registered.

### Requirement 9: UI Adaptation Based on Role

**User Story:** As a user, I want the interface to reflect my permissions, so that I only see actions I am allowed to perform.

#### Acceptance Criteria

1. WHEN a user is authenticated, THE RBAC_System SHALL display the user's current role (viewer, editor, or admin) as a visible label in the application header.
2. WHILE a user has the viewer role, THE RBAC_System SHALL disable the execute query button and display a tooltip indicating execution requires a higher role.
3. WHILE a user has the editor role, THE RBAC_System SHALL disable the execute button for queries containing INSERT, UPDATE, DELETE, CREATE, DROP, or ALTER operations, and SHALL enable the execute button only for SELECT queries referencing tables in the user's Allowed_Tables set.
4. WHILE a user has the admin role, THE RBAC_System SHALL display an Admin_Panel navigation link in the application header.
5. WHILE a user has the viewer or editor role, THE RBAC_System SHALL hide the Admin_Panel navigation link from the application header.
6. WHEN an admin changes a user's role assignment while that user has an active session, THE RBAC_System SHALL update the affected user's UI to reflect the new role permissions within 30 seconds or upon the user's next page navigation, whichever occurs first.

### Requirement 10: Session and Token Security

**User Story:** As a system operator, I want secure session management, so that unauthorized parties cannot impersonate authenticated users.

#### Acceptance Criteria

1. THE Auth_Service SHALL store Session_Tokens as HTTP-only secure cookies to prevent client-side JavaScript access.
2. THE Auth_Service SHALL set Session_Token expiration to 24 hours from the time of issuance.
3. WHEN a request is received with an expired Session_Token, THE Auth_Service SHALL return an authentication error response indicating the session has expired and SHALL NOT process the requested operation, requiring the user to authenticate again before further requests are accepted.
4. THE Auth_Service SHALL hash all stored passwords using bcrypt with a minimum cost factor of 10.
5. IF a request is received with a Session_Token that is missing, malformed, or fails integrity validation, THEN THE Auth_Service SHALL reject the request with an authentication error response and SHALL NOT process the requested operation.
6. WHEN a user initiates a logout action, THE Auth_Service SHALL invalidate the associated Session_Token server-side within 2 seconds so that subsequent requests using that token are rejected.
7. THE Auth_Service SHALL generate Session_Tokens using a cryptographically secure random number generator with a minimum of 128 bits of entropy.
