from typing import Literal
from pydantic import BaseModel

# ─── Domain types ─────────────────────────────────────────────────────────────
# Compare to types.ts: same shape, but Pydantic handles validation automatically.
# There is no separate validate.py equivalent needed for enum checking —
# Pydantic rejects invalid values at construction time.

Category = Literal["bug", "config", "billing", "how_to", "feature_request"]
Severity  = Literal["low", "medium", "high", "critical"]


class Ticket(BaseModel):
    subject: str
    body:    str


class TriageResult(BaseModel):
    category:                     Category
    severity:                     Severity
    summary:                      str
    suggested_first_response:     str
    needs_engineering_escalation: bool
