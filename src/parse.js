/**
 * Extracts a JSON object from raw model output.
 * Handles: markdown code fences, leading/trailing prose,
 * and the model occasionally being chatty despite instructions.
 * Throws a descriptive error if no parseable JSON is found.
 */
export function extractJson(rawText) {
    // --- Temp Debug ---
    console.log("=== extractJson received ===");
    console.log("\nRAW TEXT");
    console.log(rawText);
    console.log("END RAW TEXT\n");
    console.log("typeof:", typeof rawText);
    console.log("length:", rawText?.length);
    console.log("JSON.stringify of input:", JSON.stringify(rawText));
    console.log("=== end ===");
    // --- End Temp Debug ---

    if (typeof rawText !== "string" || rawText.trim() === "") {
        throw new Error("extractJson: received empty or non-string input");
    }

    let text = rawText.trim();
    console.log("[1] after trim, length:", text.length, "has {:", text.includes("{"));

    // Only strip fences if the string ACTUALLY starts with a code fence.
    if (text.startsWith("```")) {
    // Remove opening fence line (``` or ```json) and closing fence
    text = text
        .replace(/^```(?:json)?\s*\n?/, "")
        .replace(/\n?```\s*$/, "")
        .trim();
    }

    // Locate the outermost JSON object by first { and last }
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    console.log("[4] firstBrace:", firstBrace, "lastBrace:", lastBrace);

    if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
        throw new Error(
            `extractJson: no JSON object found in model output. Raw: ${rawText.slice(0, 200)}`
        );
    }

    const candidate = text.slice(firstBrace, lastBrace + 1);

    try {
        return JSON.parse(candidate);
    } catch (err) {
        throw new Error(
            `extractJson: found JSON-like text but failed to parse: ${err.message}. Candidate: ${candidate.slice(0, 200)}`
        );
    }
}