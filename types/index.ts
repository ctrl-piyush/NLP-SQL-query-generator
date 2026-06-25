export type SQLOperation = "SELECT" | "INSERT" | "UPDATE" | "DELETE" | "CREATE" | "DROP" | "ALTER" | "UNKNOWN";
export type DatabaseType = "mysql" | "postgresql";
export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface TableInfo {
  name: string;
  columns: ColumnInfo[];
  estimatedRows?: number;
}

export interface ColumnInfo {
  name: string;
  type: string;
  isPrimary?: boolean;
  isForeign?: boolean;
  isNullable?: boolean;
  references?: string;
}

export interface QueryAlternative {
  id: string;
  sql: string;
  label: string;
  description: string;
  complexity: "simple" | "intermediate" | "advanced";
  isRecommended: boolean;
}

export interface QueryExplanation {
  summary: string;
  clauses: ClauseExplanation[];
  tables: string[];
  columns: string[];
  hasJoins: boolean;
  hasAggregations: boolean;
  hasSubquery: boolean;
  hasGroupBy: boolean;
  hasOrderBy: boolean;
}

export interface ClauseExplanation {
  clause: string;
  description: string;
}

export interface QueryImpact {
  operation: SQLOperation;
  estimatedRowsAffected: number | null;
  estimatedRowsReturned: number | null;
  riskLevel: RiskLevel;
  warnings: string[];
  suggestions: string[];
  isDestructive: boolean;
  affectedTables: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  optimizedQuery?: string;
  optimizationNotes: string[];
}

export interface GeneratedQueryResult {
  userInput: string;
  intent: string;
  operation: SQLOperation;
  alternatives: QueryAlternative[];
  explanation: QueryExplanation;
  impact: QueryImpact;
  validation: ValidationResult;
  tablesInvolved: TableInfo[];
  executionHint: string;
  databaseType: DatabaseType;
  generatedAt: string;
}

export interface SchemaTable {
  name: string;
  columns: Array<{
    name: string;
    type: string;
    constraints?: string;
  }>;
}

export interface QueryHistoryEntry {
  id: string;
  userInput: string;
  selectedQuery: string;
  operation: SQLOperation;
  riskLevel: RiskLevel;
  timestamp: string;
  databaseType: DatabaseType;
}

export interface GenerateQueryRequest {
  userInput: string;
  databaseType: DatabaseType;
  schemaContext?: string;
  customTables?: SchemaTable[];
}
