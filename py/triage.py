from dataclasses import dataclass, field
from models import Ticket, TriageResult
from client import call_triage_model
from parse import extract_json
from validate import validate_triage


# ─── Return types ─────────────────────────────────────────────────────────────
# Compare to TriageOutcome in types.ts.
# Python uses two dataclasses joined by a union instead of a discriminated union type.
# The isinstance() check in run-py.py is the equivalent of TypeScript's type narrowing.

@dataclass
class TriageSuccess:
    ok:       bool         = True
    result:   TriageResult = None
    attempts: int          = 0

@dataclass
class TriageFailure:
    ok:          bool      = False
    reason:      str       = ""
    last_errors: list[str] = field(default_factory=list)

TriageOutcome = TriageSuccess | TriageFailure


# ─── Pipeline ─────────────────────────────────────────────────────────────────

async def triage_ticket(
    ticket: Ticket,
    max_output_retries: int = 2,
) -> TriageOutcome:
    """
    Full triage pipeline for a single ticket.
    Logic is identical to triage.ts — the structure maps directly:

    JS/TS                          Python
    ─────────────────────────────  ──────────────────────────────
    for (let attempt = 1; ...)     for attempt in range(1, n + 2):
    { ...ticket, body: `...` }     Ticket(subject=..., body=...)
    return { ok: false, ... }      return TriageFailure(...)
    return { ok: true,  ... }      return TriageSuccess(...)
    """
    correction_hint = ""

    for attempt in range(1, max_output_retries + 2):
        ticket_for_model = (
            Ticket(
                subject=ticket.subject,
                body=f"{ticket.body}\n\n[SYSTEM CORRECTION]: {correction_hint}",
            )
            if correction_hint
            else ticket
        )

        try:
            raw_text = await call_triage_model(ticket_for_model)
        except Exception as err:
            return TriageFailure(reason="api_failure", last_errors=[str(err)])

        try:
            parsed = extract_json(raw_text)
        except ValueError as err:
            correction_hint = (
                "Your previous response could not be parsed as JSON. "
                "Return ONLY a valid JSON object, no fences, no prose."
            )
            if attempt == max_output_retries + 1:
                return TriageFailure(reason="unparseable", last_errors=[str(err)])
            continue

        validation = validate_triage(parsed)
        if validation.valid:
            return TriageSuccess(result=validation.value, attempts=attempt)

        correction_hint = (
            f"Your previous response had these problems: "
            f"{'; '.join(validation.errors)}. Fix them and return ONLY valid JSON."
        )
        if attempt == max_output_retries + 1:
            return TriageFailure(reason="invalid_schema", last_errors=validation.errors)

    return TriageFailure(reason="invalid_schema", last_errors=["exhausted retries"])
