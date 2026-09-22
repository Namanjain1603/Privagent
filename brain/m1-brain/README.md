# PRIVAGENT — M1: AI Agent Brain

## Overview

M1 is the cognitive core of **PRIVAGENT**. It receives natural language user instructions alongside sanitized page context, performs multi-step task decomposition and reasoning, and generates strictly allowlisted, deterministic browser action plans.

> **M1 Boundary:**
> - Responsible for: Task Understanding, Task Decomposition, Reasoning, Next-Action Planning, Structured Browser Action Generation.
> - Out of Scope: PII Detection/Redaction (M2), Browser Execution (M3), Vision/OCR (M4), Database/Backend (M5), Dashboard (M6).

---

## Allowed Browser Actions (Strict Allowlist)

M1 emits **only** these 5 atomic browser actions:
1. `CLICK`: Target button, link, or clickable node.
2. `TYPE`: Target input/textarea with sanitized value.
3. `SELECT`: Target `<select>` dropdown with valid matching option.
4. `SCROLL`: Viewport scrolling (`UP`, `DOWN`, `TOP`, `BOTTOM`).
5. `NAVIGATE`: Safe http/https destination navigation.

**All arbitrary JavaScript, eval, and unapproved action types are strictly rejected.**

---

## Core Endpoint

### `POST /api/m1/plan`

#### Request Body
```json
{
  "taskId": "demo-001",
  "instruction": "Rajasthan select karo aur form submit karo.",
  "pageContext": {
    "url": "http://localhost:3000/form",
    "title": "Demo Form",
    "elements": [
      {
        "id": "state",
        "type": "select",
        "label": "State",
        "options": ["Rajasthan", "Delhi", "Gujarat"]
      },
      {
        "id": "submit",
        "type": "button",
        "label": "Submit"
      }
    ]
  },
  "previousActions": []
}
```

#### Success Response
```json
{
  "status": "SUCCESS",
  "reasoning": {
    "intent": "Rajasthan select karo aur form submit karo.",
    "subGoals": [
      "Select 'Rajasthan' from dropdown 'State'",
      "Click button 'Submit'"
    ],
    "contextSummary": "Observed 2 interactable DOM element(s)."
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
      "target": "submit",
      "description": "Click Submit"
    }
  ]
}
```

#### Task Already Complete Response
```json
{
  "status": "SUCCESS",
  "code": "TASK_COMPLETE",
  "message": "Goal has already been satisfied by prior steps.",
  "actions": []
}
```

#### Failure / Clarification Response
```json
{
  "status": "FAILED",
  "code": "ELEMENT_NOT_FOUND",
  "message": "Target element 'delete-btn' for CLICK does not exist in the page context.",
  "actions": []
}
```

---

## Project Structure

```text
m1-brain/
├── src/
│   ├── index.ts              # Express REST server & routes
│   ├── config/
│   │   └── env.ts            # Environment and config variables
│   ├── schemas/
│   │   ├── input.schema.ts   # Sanitized DOM & request Zod schemas
│   │   ├── action.schema.ts  # Strict 5-action union schemas
│   │   └── plan.schema.ts    # Success & failure plan response schemas
│   └── core/
│       ├── prompt.ts         # System prompt & structured user prompt
│       ├── decompose.ts      # Multi-step task decomposition & reasoning
│       ├── planner.ts        # Gemini LLM caller & test fallback
│       └── validator.ts      # Post-generation deterministic validator
├── tests/
│   ├── test-cases.json       # 15 benchmark test fixtures
│   └── planner.test.ts       # Automated test runner
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

---

## How to Run Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
*(Optional: Add `GEMINI_API_KEY="your-key"`. If omitted, M1 runs in deterministic test mode with full validator coverage).*

### 3. Run Automated Tests
```bash
npm test
```
*(Executes all 15 deterministic benchmark test fixtures)*

### 4. Run TypeScript Check
```bash
npm run typecheck
```

### 5. Start the REST Server
```bash
npm start
```
The server will start on `http://localhost:3001` (or the configured `PORT`).

---

## Future Integrations

- **With M3 (Browser Agent / Chrome Extension):** M3 sends sanitized DOM snapshots to `POST /api/m1/plan` and receives sequential browser actions to execute via Chrome DevTools Protocol (CDP).
- **With M5 (Backend Orchestrator):** M5 mediates session storage, manages task IDs, audits plans, and invokes M1 with historical retry feedback.
