const VALID_CATEGORIES = ["bug", "config", "billing", "how_to", "feature_request"];
const VALID_SEVERITIES = ["low", "medium", "high", "critical"];

/**
 * Validates a parsed triage object against the expected contract.
 * Returns { valid: true, value } or { valid: false, errors: [...]}.
 * Does NOT throw -- the caller decides whether to retry or escalate.
 */
export function validateTriage(obj) {
    const errors = [];

    if (typeof obj !== "object" || obj === null) {
        return { valid: false, errors: ["result is not an object"] };
    }

    if (!VALID_CATEGORIES.includes(obj.category)) {
        errors.push(
            `category: expected one of ${VALID_CATEGORIES.join("|")}, got ${JSON.stringify(obj.category)}`
        );
    }

    if (!VALID_SEVERITIES.includes(obj.severity)) {
        errors.push(
            `category: expected one of ${VALID_SEVERITIES.join("|")}, got ${JSON.stringify(obj.severity)}`
        );
    }

    if (typeof obj.summary !== "string" || obj.summary.trim() === "") {
        errors.push("summary: expected non-empty string");
    }

    if (typeof obj.suggested_first_response !== "string" || obj.suggested_first_response.trim() === "") {
        errors.push("suggested_first_response: expected non-empty string")
    }

    if (typeof obj.needs_engineering_escalation !== "boolean") {
        errors.push(
            `needs_engineering_escalation: expected boolean, got ${typeof obj.needs_engineering_escalation}`
        );
    }

    return errors.length === 0 ? { valid: true, value: obj } : { valid: false, errors };
}