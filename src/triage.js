import { parse } from "dotenv";
import { callTriageModel } from "./client.js";
import { extractJson } from "./parse.js";
import { validateTriage } from "./validate.js";

/**
 * Full triage pipeline for a single ticket.
 * - API failures: handled inside callTriageModel (with backoff)
 * - Output failures: retried with a corrective hint
 * Returns { ok: true, result } or { ok: false, reason, lastErrors }.
 */
export async function triageTicket(ticket, { maxOutputRetries = 2 } = {}) {
    console.log("^^^^^ just loaded triageTicket ^^^^^");
    let correctionHint = "";

    for (let attempt = 1; attempt <= maxOutputRetries + 1; attempt++) {
        console.log(`\n========= TRIAGE ATTEMPT ${attempt} =========`);
        let rawText;
        try {
            const ticketForModel = correctionHint ? {
                    subject: ticket.subject,
                    body: `${ticket.body}\n\n[SYSTEM CORRECTION]: ${correctionHint}`,
                } : ticket;
            rawText = await callTriageModel(ticketForModel);
        } catch (apiErr) {
            // API totally failed even after backoff - don't retry output loop
            return { ok: false, reason: "api_failure", lastErrors: [apiErr.message] };
        }

        let parsed;
        try {
            parsed = extractJson(rawText);
        } catch (parseErr) {
            correctionHint = "Your previous response could not be parsed as JSON. Return ONLY a valid JSON object, no fences, no prose.";
            if (attempt === maxOutputRetries + 1) {
                return { ok: false, reason: "unparseable", lastErrors: [parseErr.message] };
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
}