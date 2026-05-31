import Anthropic from "@anthropic-ai/sdk";
import "dotenv/config";
import { writeFileSync } from "fs";

const client = new Anthropic();

const GEN_PROMPT = `Generate 20 realistic customer support tickets for a SaaS company
that sells an API-driven cloud communications / contact center platform (lean heavily on Twilio documentation for Flex and other individual products here: https://www.twilio.com/docs). Think webhooks, SMS/Voice APIs, SSO/OAuth, a React-based agent UI, and different types of billing usage.

Vary them deliberately across:
- category: bug, config, billing, how_to, feature_request
- severity: low, medium, high, critical
- clarity: some crisp, some vague/rambling, some with the real issue buried in paragraph 3
- a few that are genuinely ambiguous between two categories (e.g. is it a bug or a misconfiguration?)

Return ONLY a JSON array of 20 objects, each:
{ "id": "T01", "subject": "...", "body": "..." }
No prose, no fences.`;

const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    messages: [{ role: "user", content: GEN_PROMPT }],
});

const raw = message.content.find((b) => b.type === "text").text;
const firstBracket = raw.indexOf("[");
const lastBracket = raw.lastIndexOf("]");
const tickets = JSON.parse(raw.slice(firstBracket, lastBracket + 1));

writeFileSync(
    "data/tickets.json",
    JSON.stringify(tickets, null, 2)
);
console.log(`Wrote ${tickets.length} ticket to data/tickets.json`);