import Anthropic, { APIError } from "@anthropic-ai/sdk";
import "dotenv/config";
import type { Ticket, CallTriageModelOptions } from "./types.js";

const client = new Anthropic();
const MODEL  = "claude-sonnet-4-6";

// The contract between this prompt and TriageResult in types.ts must stay in sync.
// TypeScript won't enforce the JSON field names inside a string literal —
// that's the job of validate.ts.
const SYSTEM_PROMPT = `You are a support ticket triage assistant for a SaaS company.
For each ticket, return a JSON object with exactly these fields:
{
    "category": one of "bug" | "config" | "billing" | "how_to" | "feature_request",
    "severity": one of "low" | "medium" | "high" | "critical",
    "summary": a one-sentence summary of the issue,
    "suggested_first_response": a brief, professional response the support engineer could send,
    "needs_engineering_escalation": boolean
}
Return ONLY valid JSON. No prose. No markdown fences. No commentary.`;

/**
 * Makes a single triage API call.
 * Retries ONLY on transient API errors (rate limit, overloaded, network).
 * Bad-output handling is the orchestrator's job (triage.ts).
 */
export async function callTriageModel(
  ticket: Ticket,
  { maxAPIRetries = 3 }: CallTriageModelOptions = {}
): Promise<string> {
  let lastError: APIError | undefined;

  for (let attempt = 1; attempt <= maxAPIRetries; attempt++) {
    try {
      const message = await client.messages.create({
        model:      MODEL,
        max_tokens: 1024,
        system:     SYSTEM_PROMPT,
        messages:   [
          {
            role:    "user",
            content: `Subject: ${ticket.subject}\n\nBody: ${ticket.body}`,
          },
        ],
      });

      // SDK types message.content as an array of blocks — narrow before accessing
      const block = message.content[0];
      if (block.type !== "text") {
        throw new Error(`callTriageModel: unexpected content block type "${block.type}"`);
      }
      return block.text;

    } catch (err) {
      // Anthropic SDK exports typed error classes — no need for err?.status guessing
      if (err instanceof APIError) {
        lastError = err;
        const retryable = err.status === 429 || err.status === 529 || err.status >= 500;

        if (!retryable || attempt === maxAPIRetries) {
          throw new Error(
            `callTriageModel: API call failed after ${attempt} attempt(s): ${err.message}`
          );
        }
        const backoffMs = 1000 * 2 ** (attempt - 1); // 1s, 2s, 4s
        console.warn(`API error (status ${err.status}), retry ${attempt}/${maxAPIRetries} in ${backoffMs}ms`);
        await new Promise((r) => setTimeout(r, backoffMs));
      } else {
        throw err; // Non-API errors propagate immediately
      }
    }
  }

  throw lastError ?? new Error("callTriageModel: exhausted retries");
}
