/**
 * Extracts a JSON object from raw model output.
 * Returns `unknown` — the caller is responsible for validation.
 * Handles: markdown fences, leading/trailing prose, chatty models.
 */
export function extractJson(rawText: string): unknown {
  if (typeof rawText !== "string" || rawText.trim() === "") {
    throw new Error("extractJson: received empty or non-string input");
  }

  let text = rawText.trim();

  // Only strip fences if the string actually starts with one
  if (text.startsWith("```")) {
    text = text
      .replace(/^```(?:json)?\s*\n?/, "")
      .replace(/\n?```\s*$/, "")
      .trim();
  }

  // Locate the outermost JSON object by first { and last }
  const firstBrace = text.indexOf("{");
  const lastBrace  = text.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    throw new Error(
      `extractJson: no JSON object found in model output. Raw: ${rawText.slice(0, 200)}`
    );
  }

  const candidate = text.slice(firstBrace, lastBrace + 1);

  try {
    return JSON.parse(candidate);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `extractJson: found JSON-like text but failed to parse: ${message}. Candidate: ${candidate.slice(0, 200)}`
    );
  }
}
