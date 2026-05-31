import type { Ticket, TriageOutcome, TriageTicketOptions } from "./types.js";
import { callTriageModel } from "./client.js";
import { extractJson }     from "./parse.js";
import { validateTriage }  from "./validate.js";

/**
 * Full triage pipeline for a single ticket.
 *
 * Error layers:
 *   API failures   → handled inside callTriageModel (typed errors + backoff)
 *   Output failures → retried here with a corrective hint injected into the prompt
 *
 * Always returns a typed TriageOutcome — never throws.
 */
export async function triageTicket(
  ticket: Ticket,
  { maxOutputRetries = 2 }: TriageTicketOptions = {}
): Promise<TriageOutcome> {
  let correctionHint = "";

  for (let attempt = 1; attempt <= maxOutputRetries + 1; attempt++) {
    const ticketForModel: Ticket = correctionHint
      ? { ...ticket, body: `${ticket.body}\n\n[SYSTEM CORRECTION]: ${correctionHint}` }
      : ticket;

    let rawText: string;
    try {
      rawText = await callTriageModel(ticketForModel);
    } catch (apiErr) {
      const message = apiErr instanceof Error ? apiErr.message : String(apiErr);
      return { ok: false, reason: "api_failure", lastErrors: [message] };
    }

    let parsed: unknown;
    try {
      parsed = extractJson(rawText);
    } catch (parseErr) {
      correctionHint =
        "Your previous response could not be parsed as JSON. Return ONLY a valid JSON object, no fences, no prose.";
      if (attempt === maxOutputRetries + 1) {
        const message = parseErr instanceof Error ? parseErr.message : String(parseErr);
        return { ok: false, reason: "unparseable", lastErrors: [message] };
      }
      continue;
    }

    const validation = validateTriage(parsed);
    if (validation.valid) {
      return { ok: true, result: validation.value, attempts: attempt };
    }

    correctionHint = `Your previous response had these problems: ${validation.errors.join("; ")}. Fix them and return ONLY valid JSON.`;
    if (attempt === maxOutputRetries + 1) {
      return { ok: false, reason: "invalid_schema", lastErrors: validation.errors };
    }
  }

  // Unreachable given the loop structure, but TypeScript requires a return
  return { ok: false, reason: "invalid_schema", lastErrors: ["exhausted retries"] };
}
