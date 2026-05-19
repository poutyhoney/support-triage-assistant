import Anthropic from "@anthropic-ai/sdk";
import "dotenv/config";

const client = new Anthropic();

const SYSTEM_PROMPT = `You are a support ticket triage assistant for a SaaS company company.
For each ticket, return a JSON object with exactly these fields:
{
    "category": one of "bug" | "config" | "billing" | "how_to" | "feature_request",
    "severity": one of "low" | "medium"| "high" | "critical",
    "summary": a one-sentence summary of the issue,
    "suggested_first_response": a brief, professional response that support engineer could send,
    "needs_engineering_escalation": boolean
}
Return only valid JSON. No prose, no markdown fences, no commentary.`;

const sample_ticket = {
    subject: "Outbound SMS webhooks not firing",
    body: `Hi, since yesterday our outbound SMS messages are sending fine (customers are receiving them) but we're not getting any status callback webhooks for delivered/failed events. Our endpoint hasn't changed. This is affecting the reporting dashboard for our support team. We're on the Flex platform, account sid redacted.`,
};

async function triage(ticket) {
    const message = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [
            {
                role: "user",
                content: `Subject: ${ticket.subject}\n\nBody: ${ticket.body}`,
            },
        ],
    });

    const rawText = message.content[0].text;
    return JSON.parse(rawText);
}

const result = await triage(sample_ticket);
console.log(JSON.stringify(result, null, 2));