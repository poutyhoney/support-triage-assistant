# Lessons — Support Triage Assistant

---

## Day 1 — JavaScript foundation

Built the core pipeline in plain JavaScript across four files with clear, single responsibilities:

- `client.js` — Anthropic API calls with exponential backoff retry
- `parse.js` — JSON extraction from raw model output
- `validate.js` — Schema validation against the triage contract
- `triage.js` — Orchestration: ties the three layers together

### Key patterns learned

**Two-layer retry strategy.**
API failures (rate limits, 5xx) are retried inside `client.js` with backoff.
Output failures (bad JSON, schema violations) are retried inside `triage.js` with a
corrective hint injected into the next prompt. Keeping these separate means neither
layer takes on responsibilities it shouldn't own.

**Corrective hint injection.**
When the model returns malformed output, the retry doesn't just repeat the same call —
it appends a description of the failure to the next prompt. This gives the model
information it needs to self-correct rather than making the same mistake twice.

**Non-throwing validator.**
`validateTriage` returns `{ valid, errors }` instead of throwing. This keeps the
orchestration layer in control of retry/escalation decisions rather than forcing
try/catch everywhere.

**Bugs caught in review (fixed before TypeScript port):**
- Typo in system prompt: `suggested_fist_response` → `suggested_first_response`.
  Because the prompt and validator used different spellings, every call failed
  validation on the first attempt and burned a retry. The type system didn't catch
  this because the field name lived inside a string literal.
- `validate.js` error message said `"category:"` for the severity field.
- `VALID_SEVERIITIES` — extra 'I' in the constant name.
- Unused `import { parse } from "dotenv"` in `triage.js`.

---

## Day 2 — TypeScript port

Ported the JavaScript version to TypeScript. Logic is identical — the goal was to see
what types add, what they can't catch, and where the two versions diverge.

### What types changed

**Discriminated unions replace documentation.**
In JS, the return shape of `triageTicket` was described only in comments.
In TS, `TriageOutcome` is a union type that the compiler enforces at every call site:

```typescript
type TriageOutcome =
  | { ok: true;  result: TriageResult; attempts: number }
  | { ok: false; reason: "api_failure" | "unparseable" | "invalid_schema"; lastErrors: string[] }
```

The `if (outcome.ok)` branch in `run.ts` now narrows the type automatically —
`outcome.result` is only accessible in the true branch.

**`unknown` for unvalidated data.**
`extractJson` returns `unknown` instead of `any`. This forces `validate.ts` to
narrow the type explicitly before trusting any field. Nothing from the model
can be used as a `TriageResult` until it passes validation.

**Typed SDK errors replace status guessing.**
The JS version used `err?.status` with optional chaining because `err` was `unknown`.
The TS version uses `err instanceof Anthropic.APIError`, which gives direct access
to `err.status` as a typed number and makes the intent explicit.

**Content block narrowing.**
`message.content[0]` is typed as a union of block types. Accessing `.text` directly
would be a compile error — the code now narrows to `block.type === "text"` first.

### What types still can't catch

The system prompt is a string literal. If the field name in the prompt drifts from
the field name in `TriageResult`, the compiler won't notice. The prompt says
`"suggested_first_response"` and the interface says `suggested_first_response` —
those happen to match, but that's discipline, not enforcement.

This is the boundary where runtime validation (validate.ts) remains essential
regardless of how good the static types are.

### Setup additions for TypeScript

```bash
npm install -D typescript @types/node tsx
```

```json
// package.json scripts to add:
"typecheck": "tsc --noEmit",
"dev:ts":    "tsx run.ts",
"build":     "tsc"
```
