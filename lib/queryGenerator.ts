import { callGroq } from "./groq";
import type {
  GeneratedQueryResult,
  DatabaseType,
  SchemaTable,
  QueryAlternative,
  QueryExplanation,
  QueryImpact,
  ValidationResult,
  TableInfo,
  SQLOperation,
  RiskLevel,
} from "@/types";
import { v4 as uuidv4 } from "uuid";

function buildSchemaContext(customTables?: SchemaTable[]): string {
  if (!customTables || customTables.length === 0) return "";
  return `\n\nUser-provided database schema:\n${customTables
    .map(
      (t) =>
        `Table: ${t.name}\nColumns: ${t.columns.map((c) => `${c.name} (${c.type}${c.constraints ? " " + c.constraints : ""})`).join(", ")}`
    )
    .join("\n\n")}`;
}

export async function generateQueries(
  userInput: string,
  databaseType: DatabaseType,
  schemaContext?: string,
  customTables?: SchemaTable[]
): Promise<GeneratedQueryResult> {
  const schemaInfo =
    schemaContext || buildSchemaContext(customTables) || getDefaultSchema(databaseType);

  const systemPrompt = `You are an expert SQL query generator assistant specializing in ${databaseType.toUpperCase()}. 
Your job is to analyze user requirements in natural language and generate accurate, optimized SQL queries.

You MUST respond with a valid JSON object following this exact structure:
{
  "intent": "brief description of what user wants to achieve",
  "operation": "SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|UNKNOWN",
  "alternatives": [
    {
      "label": "short name for this query approach",
      "sql": "the complete SQL query",
      "description": "when to use this approach",
      "complexity": "simple|intermediate|advanced",
      "isRecommended": true|false
    }
  ],
  "explanation": {
    "summary": "plain English summary of what the query does",
    "clauses": [
      { "clause": "SELECT/WHERE/JOIN/etc", "description": "what this clause does" }
    ],
    "tables": ["table1", "table2"],
    "columns": ["col1", "col2"],
    "hasJoins": false,
    "hasAggregations": false,
    "hasSubquery": false,
    "hasGroupBy": false,
    "hasOrderBy": false
  },
  "impact": {
    "estimatedRowsAffected": null or number,
    "estimatedRowsReturned": null or number,
    "riskLevel": "low|medium|high|critical",
    "warnings": ["warning messages"],
    "suggestions": ["improvement suggestions"],
    "isDestructive": false,
    "affectedTables": ["table names"]
  },
  "validation": {
    "isValid": true,
    "errors": [],
    "warnings": [],
    "optimizedQuery": "if different from primary query, else null",
    "optimizationNotes": ["notes about optimizations"]
  },
  "tablesInvolved": [
    {
      "name": "tableName",
      "columns": [
        { "name": "colName", "type": "dataType", "isPrimary": false, "isForeign": false }
      ],
      "estimatedRows": null or number
    }
  ],
  "executionHint": "practical tip for executing this query safely"
}

Rules:
- Generate 2-3 alternative query approaches when the intent is clear, 1 when simple/unambiguous
- Mark exactly ONE alternative as isRecommended: true (the best one)
- For destructive operations (UPDATE without WHERE, DELETE, DROP), set riskLevel to "high" or "critical"
- Provide realistic row estimates based on context clues; use null if unknown
- All SQL must be valid ${databaseType.toUpperCase()} syntax
- Explain every clause used in simple terms`;

  const userMessage = `Database: ${databaseType.toUpperCase()}
${schemaInfo}

User requirement: "${userInput}"

Generate complete SQL query alternatives with full explanation, impact analysis, and validation.`;

  const raw = await callGroq(systemPrompt, userMessage, 4096, 0.15);
  const parsed = JSON.parse(raw);

  // Attach UUIDs to alternatives
  const alternatives: QueryAlternative[] = (parsed.alternatives || []).map(
    (alt: Omit<QueryAlternative, "id">) => ({ ...alt, id: uuidv4() })
  );

  return {
    userInput,
    intent: parsed.intent || "Unknown intent",
    operation: (parsed.operation as SQLOperation) || "UNKNOWN",
    alternatives,
    explanation: parsed.explanation as QueryExplanation,
    impact: parsed.impact as QueryImpact,
    validation: parsed.validation as ValidationResult,
    tablesInvolved: (parsed.tablesInvolved || []) as TableInfo[],
    executionHint: parsed.executionHint || "",
    databaseType,
    generatedAt: new Date().toISOString(),
  };
}

export async function explainQuery(sql: string, databaseType: DatabaseType): Promise<QueryExplanation> {
  const systemPrompt = `You are a SQL expert. Explain the given SQL query in detail. 
Respond ONLY with a valid JSON object:
{
  "summary": "plain English summary",
  "clauses": [
    { "clause": "clause name", "description": "what it does" }
  ],
  "tables": ["tables used"],
  "columns": ["columns referenced"],
  "hasJoins": false,
  "hasAggregations": false,
  "hasSubquery": false,
  "hasGroupBy": false,
  "hasOrderBy": false
}`;

  const raw = await callGroq(systemPrompt, `Explain this ${databaseType.toUpperCase()} query:\n${sql}`, 2048, 0.1);
  return JSON.parse(raw) as QueryExplanation;
}

export async function validateQuery(sql: string, databaseType: DatabaseType): Promise<ValidationResult> {
  const systemPrompt = `You are a SQL syntax validator and optimizer. Analyze the given SQL query.
Respond ONLY with a valid JSON object:
{
  "isValid": true,
  "errors": ["syntax errors if any"],
  "warnings": ["potential issues"],
  "optimizedQuery": "optimized version or null if no changes needed",
  "optimizationNotes": ["what was optimized and why"]
}

Be strict about ${databaseType.toUpperCase()} syntax. Check for:
- Missing WHERE clauses on UPDATE/DELETE (warn as dangerous)
- Inefficient patterns (SELECT *, missing indexes hints)
- Syntax errors
- Reserved keyword conflicts`;

  const raw = await callGroq(systemPrompt, `Validate and optimize:\n${sql}`, 2048, 0.1);
  return JSON.parse(raw) as ValidationResult;
}

export async function analyzeImpact(sql: string, databaseType: DatabaseType): Promise<QueryImpact> {
  const systemPrompt = `You are a database impact analyzer. Analyze the potential impact of running the given SQL query.
Respond ONLY with a valid JSON object:
{
  "operation": "SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|UNKNOWN",
  "estimatedRowsAffected": null or number,
  "estimatedRowsReturned": null or number,
  "riskLevel": "low|medium|high|critical",
  "warnings": ["warnings about running this"],
  "suggestions": ["safety suggestions"],
  "isDestructive": false,
  "affectedTables": ["table names"]
}

Risk levels:
- low: SELECT queries, safe operations
- medium: INSERT, UPDATE/DELETE with WHERE clause
- high: UPDATE/DELETE without WHERE, large data modifications
- critical: DROP TABLE, TRUNCATE, DROP DATABASE`;

  const raw = await callGroq(systemPrompt, `Analyze the impact of:\n${sql}`, 2048, 0.1);
  const parsed = JSON.parse(raw);
  return {
    ...parsed,
    operation: parsed.operation as SQLOperation,
    riskLevel: parsed.riskLevel as RiskLevel,
  } as QueryImpact;
}

function getDefaultSchema(dbType: DatabaseType): string {
  return `
Common example tables (use as reference if user doesn't specify schema):
- Employee(EmployeeID INT PK, Name VARCHAR, Department VARCHAR, Salary DECIMAL, JoinDate DATE, ManagerID INT FK)
- Department(DeptID INT PK, DeptName VARCHAR, Location VARCHAR, Budget DECIMAL)
- Students(StudentID INT PK, Name VARCHAR, CGPA DECIMAL, Course VARCHAR, Year INT, Email VARCHAR)
- Orders(OrderID INT PK, CustomerID INT FK, ProductID INT FK, Quantity INT, OrderDate DATE, Status VARCHAR)
- Customers(CustomerID INT PK, Name VARCHAR, Email VARCHAR, Phone VARCHAR, City VARCHAR)
- Products(ProductID INT PK, Name VARCHAR, Category VARCHAR, Price DECIMAL, Stock INT)

Use these tables when the user's requirement matches but no specific schema is given.
`;
}
