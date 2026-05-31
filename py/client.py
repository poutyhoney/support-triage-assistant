import asyncio
from anthropic import AsyncAnthropic, APIStatusError
from dotenv import load_dotenv
from models import Ticket

load_dotenv()

_client = AsyncAnthropic()
MODEL   = "claude-sonnet-4-6"

# Same contract as client.ts — field names here must match TriageResult in models.py.
# Python still can't enforce that at the type level; validate.py catches the drift.
SYSTEM_PROMPT = """You are a support ticket triage assistant for a SaaS company.
For each ticket, return a JSON object with exactly these fields:
{
    "category": one of "bug" | "config" | "billing" | "how_to" | "feature_request",
    "severity": one of "low" | "medium" | "high" | "critical",
    "summary": a one-sentence summary of the issue,
    "suggested_first_response": a brief, professional response the support engineer could send,
    "needs_engineering_escalation": boolean
}
Return ONLY valid JSON. No prose. No markdown fences. No commentary."""


async def call_triage_model(ticket: Ticket, max_api_retries: int = 3) -> str:
    """
    Makes a single triage API call.
    Retries ONLY on transient errors (rate limit, overloaded, 5xx).
    Bad-output handling is triage.py's job.

    Compare to client.ts:
    - APIStatusError.status_code vs err.status (Python SDK uses status_code)
    - asyncio.sleep() vs setTimeout() — same concept, different spelling
    - No optional chaining needed; Python raises typed exceptions directly
    """
    last_error: APIStatusError | None = None

    for attempt in range(1, max_api_retries + 1):
        try:
            message = await _client.messages.create(
                model=MODEL,
                max_tokens=1024,
                system=SYSTEM_PROMPT,
                messages=[{
                    "role":    "user",
                    "content": f"Subject: {ticket.subject}\n\nBody: {ticket.body}",
                }],
            )
            block = message.content[0]
            if block.type != "text":
                raise RuntimeError(f"call_triage_model: unexpected content block type '{block.type}'")
            return block.text

        except APIStatusError as err:
            last_error  = err
            retryable   = err.status_code in (429, 529) or err.status_code >= 500

            if not retryable or attempt == max_api_retries:
                raise RuntimeError(
                    f"call_triage_model: API call failed after {attempt} attempt(s): {err}"
                ) from err

            backoff = 2 ** (attempt - 1)  # 1s, 2s, 4s — matches JS version
            print(f"API error (status {err.status_code}), retry {attempt}/{max_api_retries} in {backoff}s")
            await asyncio.sleep(backoff)

    raise last_error or RuntimeError("call_triage_model: exhausted retries")
