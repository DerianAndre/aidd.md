// ---------------------------------------------------------------------------
// Shared validation types used across all validator tools
// ---------------------------------------------------------------------------

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  message: string;
  file?: string;
  line?: number;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  summary: string;
}

export interface ValidatorInput {
  content?: string;
  filePath?: string;
}

/** Pure validator function signature */
export type ValidatorFn = (content: string, filePath?: string) => ValidationResult;
