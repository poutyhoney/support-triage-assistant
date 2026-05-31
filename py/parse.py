import json
import re


def extract_json(raw_text: str) -> object:
    """
    Extracts a JSON object from raw model output.
    Returns object (unvalidated) — the caller is responsible for validation.
    Handles: markdown fences, leading/trailing prose, chatty models.

    Logic is identical to parse.ts — this is one of the places where
    the two languages look most similar.
    """
    if not isinstance(raw_text, str) or not raw_text.strip():
        raise ValueError("extract_json: received empty or non-string input")

    text = raw_text.strip()

    # Only strip fences if the string actually starts with one
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*\n?", "", text)
        text = re.sub(r"\n?```\s*$",          "", text)
        text = text.strip()

    first_brace = text.find("{")
    last_brace  = text.rfind("}")

    if first_brace == -1 or last_brace == -1 or last_brace < first_brace:
        raise ValueError(
            f"extract_json: no JSON object found in model output. Raw: {raw_text[:200]}"
        )

    candidate = text[first_brace : last_brace + 1]

    try:
        return json.loads(candidate)
    except json.JSONDecodeError as err:
        raise ValueError(
            f"extract_json: found JSON-like text but failed to parse: {err}. "
            f"Candidate: {candidate[:200]}"
        ) from err
