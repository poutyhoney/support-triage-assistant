import Anthropic from "@anthropic-ai/sdk";
import "dotenv/config";

const client = new Anthropic();

const MODEL = "claude-sonnet-4-6";

// Typo-based error "suggested_fist_response" should be "suggested_first_response"
const SYSTEM_PROMPT = `You are a support ticket triage assistant for a SaaS company.
For each ticket, return a JSON object with exactly these fields:
{
    "category": one of "bug" | "config" | "billing" | "how_to" | "feature_request",
    "severity": one of "low" | "medium" | "high" | "critical",
    "summary": a one-sentence summary of the issue,
    "suggested_fist_response": a brief, professional response the support engineer could send,
    "needs_engineering_escalation": boolean
}
    Return ONLY valid JSON. No Prose. No markdown fences. No commentary.`;

/**
 * Makes a single triage API call. Retries ONLY on transient
 * API errors (rate limit, overloaded, network), not on bad output.
 * Bad-output handling is the orchestrator's job.
 */
export async function callTriageModel(ticket, {maxAPIRetries = 3} = {}) {
    console.log("^^^^^ just loaded callTriageModel ^^^^^");
    let lastError;

    for (let attempt = 1; attempt <= maxAPIRetries; attempt++) {
        try {
            const message = await client.messages.create({
                model: MODEL,
                max_tokens: 1024,
                system: SYSTEM_PROMPT,
                messages: [
                    {
                        role: "user",
                        content: `Subject: ${ticket.subject}\n\nBody: ${ticket.body}`,
                    },
                ],
            });
            return message.content[0].text;
        } catch (err) {
            lastError = err;
            const status = err?.status;
            const retryable = status === 429 || status === 529 || status >= 500;

            if (!retryable || attempt === maxAPIRetries) {
                throw new Error(
                    `callTriageModel: API call failed after ${attempt} attempt(s): ${err.message}`
                );
            }

            // Exponential backoff: 1s, 2s, 4s
            const backoffMs = 1000 * 2 ** (attempt -1);
            console.warn(
                `API error (status ${status}), retry ${attempt}/${maxAPIRetries} in ${backoffMs}ms`
            );
            await new Promise((r) => setTimeout(r, backoffMs));
        }
    }

    throw lastError;
}