# PRIVAGENT M1 — AI Agent Brain Handoff

## 1. Responsibility

**M1 (AI Agent Brain)** is the reasoning and cognitive planning engine for PrivAgent.
It owns:
- Decomposing high-level natural language instructions (English, Hindi, and Hinglish) into logical sub-goals.
- Mapping decomposed goals against the current, sanitized page context.
- Generating a strictly ordered sequence of atomic browser actions constrained to the 5 allowed primitives.
- Deterministically validating all actions against the DOM elements present in `pageContext` before emission.
- Rejecting unsafe requests (passwords, OTPs, financial CVV/card credentials, arbitrary JavaScript injection).
- Safe failure handling and re-planning when previous execution history indicates action failure.

**What M1 does NOT own:**
- M1 does not touch raw DOM, credentials, or browser instances (handled by M2 and M3).
- M1 is NOT the PII detection/redaction module. M1 only operates on sanitized/minimum-necessary context supplied by upstream modules, performing its own cognitive planning and downstream safety checks.
- M1 does not store, request, or process raw user passwords or secrets. Privacy enforcement and sensitive-data protection are handled by M2, with browser-side handling coordinated with M3.
- M1 does not execute actions in Chrome/Puppeteer (owned by M3).
- M1 does not make direct external network calls outside the LLM provider.

---

## 2. Architecture

```text
User instruction (Multilingual/Hinglish)
  +
Sanitized page context (IDs, types, labels, options)
  +
Previous execution history (Feedback loop)
       ↓
M1 Reasoning & Decomposer (decompose.ts)
       ↓
Task Decomposition into Sub-Goals
       ↓
Gemini 3.6 / 3.8 Flash Structured Planning (prompt.ts / planner.ts)
       ↓
Action Generation (CLICK, TYPE, SELECT, SCROLL, NAVIGATE)
       ↓
Deterministic Validation Engine (validator.ts)
  - Allowlist enforcement
  - Target element ID existence check (Anti-hallucination)
  - Element compatibility check (TYPE on input/textarea, SELECT on select)
  - Dropdown options matching check
  - Security & injection scanning (scripts, passwords, eval)
       ↓
M1PlanResponse (SUCCESS | NEEDS_CLARIFICATION | FAILED)
```

---

## 3. Input Contract

### Endpoint
`POST /api/m1/plan` (JSON Body)

### JSON Request Schema (Zod: `M1PlanRequestSchema`)
```typescript
{
  taskId?: string;             // Optional client/session tracking ID
  instruction: string;         // User instruction (English, Hindi, or Hinglish)
  pageContext: {
    url?: string;              // Current page URL
    title?: string;            // Current page title
    elements: Array<{          // Sanitized interactive elements extracted by M2
      id: string;              // Unique selector or identifier (MANDATORY)
      type: "button" | "input" | "select" | "textarea" | "link" | "checkbox" | "radio" | "text";
      label?: string;          // Visible text, aria-label, or placeholder
      value?: string;          // Current value if present
      options?: string[];      // Available options if type is "select"
      selector?: string;       // Optional CSS/XPath selector
      disabled?: boolean;      // Whether disabled
      required?: boolean;      // Whether required
    }>;
  };
  previousActions?: Array<{    // Execution feedback loop from M3
    action: M1Action;
    status: "SUCCESS" | "FAILED";
    error?: string;
  }>;
}
```

### Request Example
```json
{
  "taskId": "task-form-001",
  "instruction": "Rajasthan select karo aur form submit karo.",
  "pageContext": {
    "url": "http://localhost:3000/form",
    "title": "Demo Registration Form",
    "elements": [
      {
        "id": "state",
        "type": "select",
        "label": "State",
        "options": ["Rajasthan", "Delhi", "Gujarat"]
      },
      {
        "id": "submit-btn",
        "type": "button",
        "label": "Submit"
      }
    ]
  },
  "previousActions": []
}
```

---

## 4. Output Contract

### Output JSON Schema (`M1PlanResponseSchema`)
```typescript
// Success Plan Response (actions to execute, or goal already satisfied)
export const M1PlanSuccessResponseSchema = z.object({
  status: z.literal('SUCCESS'),
  code: z.literal('TASK_COMPLETE').optional(),
  message: z.string().optional(),
  reasoning: M1ReasoningSchema.optional(),
  actions: z.array(M1ActionSchema),
});

// Failure or Clarification Plan Response
export const M1PlanFailureResponseSchema = z.object({
  status: z.enum(['FAILED', 'NEEDS_CLARIFICATION']),
  code: z.enum([
    'ELEMENT_NOT_FOUND',
    'AMBIGUOUS_TARGET',
    'MISSING_USER_INPUT',
    'UNSUPPORTED_ACTION',
    'SENSITIVE_DATA_REQUESTED',
    'TASK_COMPLETE',
  ]),
  message: z.string(),
  details: z
    .object({
      missingTargetDescription: z.string().optional(),
      suggestedClarification: z.string().optional(),
    })
    .optional(),
  actions: z.array(z.never()).default([]),
});

export const M1PlanResponseSchema = z.union([
  M1PlanSuccessResponseSchema,
  M1PlanFailureResponseSchema,
]);
```

### Response Examples

#### 1. SUCCESS
```json
{
  "status": "SUCCESS",
  "reasoning": {
    "intent": "Select 'Rajasthan' from the state dropdown and click submit.",
    "subGoals": [
      "Select 'Rajasthan' in element state",
      "Click submit button"
    ],
    "contextSummary": "Form contains state dropdown and submit button."
  },
  "actions": [
    {
      "type": "SELECT",
      "target": "state",
      "value": "Rajasthan",
      "description": "Select 'Rajasthan' in State"
    },
    {
      "type": "CLICK",
      "target": "submit-btn",
      "description": "Click on Submit"
    }
  ]
}
```

#### 2. ELEMENT_NOT_FOUND (Anti-Hallucination)
```json
{
  "status": "FAILED",
  "code": "ELEMENT_NOT_FOUND",
  "message": "The payment button was not found in the current page context.",
  "actions": []
}
```

#### 3. AMBIGUOUS_TARGET
```json
{
  "status": "NEEDS_CLARIFICATION",
  "code": "AMBIGUOUS_TARGET",
  "message": "Multiple 'Submit' buttons found (submit-top, submit-bottom). Please clarify which section to submit.",
  "actions": []
}
```

#### 4. MISSING_USER_INPUT
```json
{
  "status": "NEEDS_CLARIFICATION",
  "code": "MISSING_USER_INPUT",
  "message": "Please specify what search term you want to query.",
  "actions": []
}
```

#### 5. UNSUPPORTED_ACTION
```json
{
  "status": "FAILED",
  "code": "UNSUPPORTED_ACTION",
  "message": "Action type 'EXECUTE_SCRIPT' is prohibited. Only [CLICK, TYPE, SELECT, SCROLL, NAVIGATE] are allowed.",
  "actions": []
}
```

#### 6. SENSITIVE_DATA_REQUESTED
```json
{
  "status": "FAILED",
  "code": "SENSITIVE_DATA_REQUESTED",
  "message": "Handling or entering sensitive credentials like passwords, OTPs, or CVVs is strictly prohibited.",
  "actions": []
}
```

#### 7. TASK_COMPLETE
```json
{
  "status": "SUCCESS",
  "code": "TASK_COMPLETE",
  "message": "Goal has already been satisfied by prior steps.",
  "actions": []
}
```

---

## 5. Allowed Actions

PrivAgent strictly enforces a closed allowlist of 5 atomic primitives. No other action types can pass deterministic validation.

| Action Primitive | Parameters | Applicable Target Types | Description |
|---|---|---|---|
| `CLICK` | `target: string` | `button`, `link`, `checkbox`, `radio`, `text` | Simulates user click on element ID |
| `TYPE` | `target: string`, `value: string`, `clearFirst?: boolean` | `input`, `textarea` | Types text into input field |
| `SELECT` | `target: string`, `value: string` | `select` | Selects option (must match element `options[]`) |
| `SCROLL` | `direction: "UP" \| "DOWN" \| "TOP" \| "BOTTOM"`, `amount?: number` | *(Global page)* | Scrolls browser viewport |
| `NAVIGATE` | `url: string` | *(Global browser)* | Navigates to a valid `http://` or `https://` URL |

---

## 6. Safety Rules

1. **No Arbitrary JavaScript**:
   - Explicit scanning for `<script>`, `eval(`, `Function(`, `javascript:`, and DOM event handlers.
   - Any attempt is rejected immediately with `UNSUPPORTED_ACTION`.
2. **No Invented / Hallucinated Targets**:
   - M1 must never invent, synthesize, or modify DOM selectors/target IDs.
   - M1 may only reference target IDs explicitly supplied in pageContext.elements.
   - Every `target` specified in an action MUST exist in `pageContext.elements`.
   - If an element is missing or not present in `pageContext.elements`, the planner returns `ELEMENT_NOT_FOUND`.
3. **No Raw Sensitive Data & Privacy Boundary**:
   - M1 is NOT the PII detection/redaction module (PII redaction and sensitive data protection are handled by M2). M1 operates strictly on sanitized, minimum-necessary context.
   - M1 enforces downstream safety: regular expressions and prompt instructions detect and block passwords, OTPs, credit cards/CVVs, and Aadhaar numbers.
   - Any detected sensitive entry returns `SENSITIVE_DATA_REQUESTED` with an empty `actions` list.
4. **Deterministic Validation Guarantee**:
   - LLM generation is never blindly trusted.
   - Output passes through `validatePlan()` in `validator.ts`, which enforces allowlists, dropdown options, and schema types before returning to M5/M3.
5. **Safe Failure**:
   - Whenever an action cannot be safely determined, `actions` is guaranteed to be `[]`.

---

## 7. Gemini Integration

- **SDK**: `@google/genai` (v2.4.0)
- **Primary Model**: `gemini-3.6-flash`
- **Fallback Candidate**: `gemini-3.8-flash` (auto-failover in case of transient 503 capacity spikes)
- **Structured Outputs**: Uses `responseMimeType: "application/json"` and `responseSchema` to guarantee strict JSON output.
- **Calling Contract for M5**:
  - M5 Security Gateway calls `POST http://localhost:3001/api/m1/plan`.
  - M1 expects sanitized data from M5/M2 with NO raw passwords or confidential user data.

---

## 8. M3 Integration

- M3 consumes `res.actions: M1Action[]` sequentially.
- For each action:
  1. `CLICK`: M3 finds element by `action.target` and executes click.
  2. `TYPE`: M3 focuses `action.target`, optionally clears existing content, and enters `action.value`.
  3. `SELECT`: M3 selects `action.value` in the select element.
  4. `SCROLL`: M3 scrolls window in `action.direction`.
  5. `NAVIGATE`: M3 routes to `action.url`.
- If an action fails during execution, M3 records `{ action, status: "FAILED", error: string }` and sends it back to M1 in the feedback loop.

---

## 9. Feedback Loop (`previousActions[]`)

When a browser action fails in M3 (e.g. element became unclickable or was covered by a modal), M3 sends the failed history back:
```json
{
  "instruction": "Click checkout",
  "pageContext": { ...updatedContext... },
  "previousActions": [
    {
      "action": { "type": "CLICK", "target": "checkout-btn" },
      "status": "FAILED",
      "error": "Target obscured by cookie banner modal"
    }
  ]
}
```
M1's system prompt and planner analyze `previousActionsHistory`:
- Recognizes the failure cause.
- Re-plans alternative actions (e.g., first click "Accept cookies" button, then click "checkout-btn").

---

## 10. Environment Setup

Configure environment variables in `.env` (copy from `.env.example`):

```env
# Server Port
PORT=3001

# Gemini API Key (Secret - loaded server-side only)
GEMINI_API_KEY=""

# Gemini Model
GEMINI_MODEL="gemini-3.6-flash"

# Offline Test/Mock Mode (set to 'false' for production/live Gemini)
M1_ENABLE_MOCK_FALLBACK="false"
```

*Note: Never commit `.env` containing actual keys to version control.*

---

## 11. Run Commands

All commands run inside `/m1-brain`:

```bash
# 1. Install dependencies
cd m1-brain && npm install

# 2. Run unit & deterministic test suite (15/15 tests)
npm test

# 3. Run real Gemini integration test suite (requires GEMINI_API_KEY)
npm run test:gemini

# 4. Typecheck TypeScript codebase
npm run typecheck

# 5. Build
npm run build

# 6. Start production server on port 3001
PORT=3001 npm start

# 7. Start development watch mode
PORT=3001 npm run dev
```

---

## 12. Verification Results

### A. Deterministic Test Suite (`npm test`)
```text
======================================================
🧪 RUNNING PRIVAGENT M1 AI AGENT BRAIN TEST SUITE
======================================================
Test [1-click-action] Single CLICK action on valid button: ✅ PASS
Test [2-type-action] Single TYPE action on text input: ✅ PASS
Test [3-select-action] Single SELECT action with valid option: ✅ PASS
Test [4-scroll-action] Single SCROLL action DOWN: ✅ PASS
Test [5-navigate-action] Single NAVIGATE action with valid URL: ✅ PASS
Test [6-multistep-task] Multi-step task (SELECT and then CLICK): ✅ PASS
Test [7-missing-target] Missing target element in page context (Anti-hallucination check): ✅ PASS
Test [8-invalid-select-option] Invalid SELECT option not present in element options: ✅ PASS
Test [9-unsupported-action] Unsupported action type rejected by allowlist: ✅ PASS
Test [10-ambiguous-target] Ambiguous/Incompatible target (TYPE on non-typing element): ✅ PASS
Test [11-sensitive-password-otp] Rejection of raw password/OTP typing request: ✅ PASS
Test [12-arbitrary-js-attempt] Rejection of arbitrary JavaScript injection attempt: ✅ PASS
Test [13-empty-page-context] Empty page context when interaction requested: ✅ PASS
Test [14-hinglish-instruction] Hinglish instruction: Rajasthan select karo aur form submit karo: ✅ PASS
Test [15-task-complete] TASK_COMPLETE response when goal is already satisfied: ✅ PASS
------------------------------------------------------
Test Summary: 15 Passed, 0 Failed out of 15
------------------------------------------------------
```

### B. TypeScript Typecheck (`npm run typecheck`)
```text
> privagent-m1-brain@0.1.0 typecheck
> tsc --noEmit
Exit code: 0 (Zero errors)
```

### C. Build (`npm run build`)
```text
> privagent-m1-brain@0.1.0 build
> tsc
Exit code: 0 (Zero errors)
```

### D. Real Gemini Integration Test (`npm run test:gemini`)
```text
[Config Check] GEMINI_API_KEY present: true
[Config Check] Configured Model: gemini-3.6-flash
--- TEST 1: Real Hinglish Instruction: ✅ PASSED (Generated SELECT state=Rajasthan, CLICK submit)
--- TEST 2: Real Gemini Safety / Password Case: ✅ PASSED (Rejected with SENSITIVE_DATA_REQUESTED)
--- TEST 3: Real Gemini Anti-Hallucination: ✅ PASSED (Rejected with ELEMENT_NOT_FOUND)
--- TEST 4: Invalid SELECT Option: ✅ PASSED (Rejected with ELEMENT_NOT_FOUND)
REAL GEMINI INTEGRATION SUMMARY: 4 Passed, 0 Failed out of 4
```

---

## 13. Known Limitations

- **DOM Density**: Current context expects up to ~50-100 sanitized interactive elements per page. If a page has 500+ elements, M2 should pre-filter or prioritize visible viewport elements.
- **Multilingual Nuances**: Tested primarily on English, Hindi, and Hinglish. Highly localized regional colloquialisms outside standard Hindi/Hinglish may require clarification.
- **Cap on Sequential Actions**: M1 produces up to 10 atomic actions per planning step; complex 20+ step workflows should be executed incrementally with intermediate page context updates.

---

## 14. Handoff Notes

### What M5 (Security Gateway) Needs From M1
- Stable, standardized HTTP REST endpoint: `POST /api/m1/plan` returning `M1PlanResponse`.
- Guarantee that M1 does NOT store or request unencrypted credentials.
- Reliable safety codes (`SENSITIVE_DATA_REQUESTED`, `UNSUPPORTED_ACTION`) to display actionable safety prompts to the user.

### What M3 (Execution Engine) Needs From M1
- An ordered, atomic `actions[]` array using only `[CLICK, TYPE, SELECT, SCROLL, NAVIGATE]`.
- Reliable `target` IDs that map 1:1 to DOM elements without hallucinated IDs.
- Deterministic dropdown `value` strings verified against `options[]`.

### What M1 Expects From Upstream (M2 / M3)
- Sanitized, minimum-necessary page contexts where PII detection, redaction, and sensitive data protection are already handled by M2.
- Explicit, distinct, and consistent `id` attributes on all interactive elements. M1 will never invent, synthesize, or modify DOM selectors or target IDs, and will strictly reject any action whose target is not in `pageContext.elements`.
- Accurate element `type` attributes (e.g. distinguishing `select` from `input` or `button`).
- For dropdowns, `options[]` array containing the valid option string values.
- In `previousActions[]`, concise error messages describing execution failures so M1 can synthesize intelligent recovery actions.
