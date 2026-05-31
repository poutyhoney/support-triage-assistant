// ─── Domain types ─────────────────────────────────────────────────────────────

export type Category = "bug" | "config" | "billing" | "how_to" | "feature_request";
export type Severity  = "low" | "medium" | "high" | "critical";

export interface Ticket {
  subject: string;
  body:    string;
}

export interface TriageResult {
  category:                   Category;
  severity:                   Severity;
  summary:                    string;
  suggested_first_response:   string;
  needs_engineering_escalation: boolean;
}

// ─── Return types (discriminated unions) ──────────────────────────────────────

export type TriageOutcome =
  | { ok: true;  result: TriageResult; attempts: number }
  | { ok: false; reason: "api_failure" | "unparseable" | "invalid_schema"; lastErrors: string[] };

export type ValidationResult =
  | { valid: true;  value: TriageResult }
  | { valid: false; errors: string[] };

// ─── Option types ─────────────────────────────────────────────────────────────

export interface CallTriageModelOptions {
  maxAPIRetries?: number;
}

export interface TriageTicketOptions {
  maxOutputRetries?: number;
}
