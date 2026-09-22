import { GoogleGenAI, Type, Schema } from '@google/genai';
import { config } from '../config/env.js';
import { M1PlanRequest } from '../schemas/input.schema.js';
import { M1PlanResponse } from '../schemas/plan.schema.js';
import { M1_SYSTEM_PROMPT, buildM1UserPrompt } from './prompt.js';
import { validatePlan } from './validator.js';
import { decomposeInstruction } from './decompose.js';

let genAIClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI | null {
  if (!config.geminiApiKey) {
    return null;
  }
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({ apiKey: config.geminiApiKey });
  }
  return genAIClient;
}

/**
 * Gemini JSON schema definition to enforce structured JSON output.
 */
const geminiResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    status: {
      type: Type.STRING,
      enum: ['SUCCESS', 'FAILED', 'NEEDS_CLARIFICATION'],
    },
    code: {
      type: Type.STRING,
      enum: [
        'ELEMENT_NOT_FOUND',
        'AMBIGUOUS_TARGET',
        'MISSING_USER_INPUT',
        'UNSUPPORTED_ACTION',
        'SENSITIVE_DATA_REQUESTED',
        'TASK_COMPLETE',
      ],
    },
    message: { type: Type.STRING },
    reasoning: {
      type: Type.OBJECT,
      properties: {
        intent: { type: Type.STRING },
        subGoals: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        contextSummary: { type: Type.STRING },
      },
    },
    actions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: {
            type: Type.STRING,
            enum: ['CLICK', 'TYPE', 'SELECT', 'SCROLL', 'NAVIGATE'],
          },
          target: { type: Type.STRING },
          value: { type: Type.STRING },
          direction: {
            type: Type.STRING,
            enum: ['UP', 'DOWN', 'TOP', 'BOTTOM'],
          },
          url: { type: Type.STRING },
          description: { type: Type.STRING },
        },
        required: ['type'],
      },
    },
  },
  required: ['status', 'actions'],
};

/**
 * Deterministic Mock/Fallback Planner for test and offline environments.
 * Strictly labeled as [TEST/MOCK PLANNER].
 */
export function generateMockPlan(request: M1PlanRequest): any {
  const { instruction, pageContext } = request;
  const elements = pageContext.elements || [];
  const normalizedInst = instruction.toLowerCase().trim();

  // Safety check 1: Sensitive request (passwords, OTPs, PINs, card)
  if (/\b(password|otp|pin|cvv|aadhaar|pan)\b/i.test(normalizedInst)) {
    return {
      status: 'FAILED',
      code: 'SENSITIVE_DATA_REQUESTED',
      message: 'Direct automated handling of passwords, OTPs, or financial secrets is restricted.',
      actions: [],
    };
  }

  // Safety check 2: Arbitrary JavaScript code injection attempt
  if (/(javascript:|eval\(|<script|document\.|window\.)/i.test(instruction)) {
    return {
      status: 'FAILED',
      code: 'UNSUPPORTED_ACTION',
      message: 'Arbitrary JavaScript execution is strictly prohibited in M1 action plans.',
      actions: [],
    };
  }

  // Check 3: Empty page context handling
  if (elements.length === 0) {
    if (/navigate|go to|open|kholo/i.test(normalizedInst)) {
      const urlMatch = instruction.match(/https?:\/\/[^\s]+/i);
      if (urlMatch) {
        return {
          status: 'SUCCESS',
          reasoning: {
            intent: `Navigate to URL: ${urlMatch[0]}`,
            subGoals: [`Navigate to ${urlMatch[0]}`],
            contextSummary: 'Empty page context; initial navigation initiated.',
          },
          actions: [{ type: 'NAVIGATE', url: urlMatch[0] }],
        };
      }
    }
    return {
      status: 'FAILED',
      code: 'ELEMENT_NOT_FOUND',
      message: 'No interactable elements found in the current page context.',
      actions: [],
    };
  }

  // Heuristic mock parser for MVP testing (supports English & Hinglish)
  const actions: any[] = [];
  const subGoals: string[] = [];

  // Check 4: Explicit NAVIGATE
  const urlMatch = instruction.match(/https?:\/\/[^\s]+/i);
  if (urlMatch && /navigate|go to|open|kholo/i.test(normalizedInst)) {
    actions.push({
      type: 'NAVIGATE',
      url: urlMatch[0],
      description: `Navigate to ${urlMatch[0]}`,
    });
    subGoals.push(`Navigate to ${urlMatch[0]}`);
  }

  // Check 5: Explicit SCROLL
  if (/scroll|neeche|upar/i.test(normalizedInst)) {
    let direction = 'DOWN';
    if (/upar|up|top/i.test(normalizedInst)) direction = 'UP';
    if (/bottom/i.test(normalizedInst)) direction = 'BOTTOM';
    actions.push({
      type: 'SCROLL',
      direction,
      description: `Scroll ${direction}`,
    });
    subGoals.push(`Scroll page ${direction}`);
  }

  // Check 6: Check for SELECT candidates
  for (const el of elements) {
    if (el.type === 'select' && el.options) {
      for (const opt of el.options) {
        if (normalizedInst.includes(opt.toLowerCase())) {
          actions.push({
            type: 'SELECT',
            target: el.id,
            value: opt,
            description: `Select ${opt} in ${el.label || el.id}`,
          });
          subGoals.push(`Select '${opt}' from dropdown '${el.label || el.id}'`);
          break;
        }
      }
    }
  }

  // Check 7: Check for TYPE candidates
  for (const el of elements) {
    if (el.type === 'input' || el.type === 'textarea') {
      const label = (el.label || '').toLowerCase();
      const id = el.id.toLowerCase();
      const placeholder = (el.placeholder || '').toLowerCase();

      // Check if user requested typing into this field
      // e.g., "type Vaishali in name", "name me Vaishali likho", "search for 12345"
      const typeMatches = [
        new RegExp(`${label}\\s+(?:me|in)?\\s*['"]?([a-zA-Z0-9@. ]+)['"]?\\s*(?:likho|type|enter|daalo)`, 'i'),
        new RegExp(`(?:type|enter|write|likho|daalo)\\s+['"]?([a-zA-Z0-9@. ]+)['"]?\\s+(?:in|me|into)\\s+${label}`, 'i'),
        new RegExp(`(?:search|search for|khojo)\\s+['"]?([a-zA-Z0-9@. ]+)['"]?`, 'i'),
      ];

      for (const rx of typeMatches) {
        const match = instruction.match(rx);
        if (match && match[1]) {
          const val = match[1].trim();
          actions.push({
            type: 'TYPE',
            target: el.id,
            value: val,
            description: `Type '${val}' into ${el.label || el.id}`,
          });
          subGoals.push(`Enter '${val}' into '${el.label || el.id}'`);
          break;
        }
      }
    }
  }

  // Check 8: Check for CLICK candidates
  for (const el of elements) {
    if (el.type === 'button' || el.type === 'link') {
      const label = (el.label || '').toLowerCase();
      const id = el.id.toLowerCase();

      if (
        (label && (normalizedInst.includes(label) || (label === 'submit' && /submit|bhejo|jama karo/i.test(normalizedInst)))) ||
        (id && (normalizedInst.includes(id) || (id === 'submit' && /submit|bhejo/i.test(normalizedInst))))
      ) {
        actions.push({
          type: 'CLICK',
          target: el.id,
          description: `Click ${el.label || el.id}`,
        });
        subGoals.push(`Click button '${el.label || el.id}'`);
      }
    }
  }

  // If instruction mentions a target that clearly does NOT exist in pageContext
  // e.g. "Click delete button" or "City select karo" when city doesn't exist
  if (actions.length === 0) {
    const decomposition = decomposeInstruction(instruction, elements);
    if (decomposition.unmatchedPhrases.length > 0) {
      return {
        status: 'FAILED',
        code: 'ELEMENT_NOT_FOUND',
        message: `Could not find target element matching "${decomposition.unmatchedPhrases[0]}" in the page context.`,
        actions: [],
      };
    }
  }

  return {
    status: 'SUCCESS',
    reasoning: {
      intent: instruction,
      subGoals: subGoals.length > 0 ? subGoals : [instruction],
      contextSummary: `[TEST/MOCK PLANNER] Generated ${actions.length} action(s) for ${elements.length} element(s).`,
    },
    actions,
  };
}

/**
 * Main M1 Planner function.
 * Attempts LLM planning via Gemini if API key is present; otherwise falls back to
 * the labeled deterministic test planner, then validates via validator.ts.
 */
export async function planActions(
  request: M1PlanRequest,
  options?: { forceMock?: boolean; allowMockFallback?: boolean }
): Promise<M1PlanResponse> {
  const elements = request.pageContext.elements || [];
  const ai = getGenAI();

  // If forced mock or Gemini API key not present, use isolated test/mock planner
  if (options?.forceMock || !ai) {
    const rawMockPlan = generateMockPlan(request);
    return validatePlan(rawMockPlan, elements);
  }

  // Live Gemini invocation
  try {
    const promptText = buildM1UserPrompt(
      request.instruction,
      request.pageContext,
      request.previousActions
    );

    const fallbackModel = config.geminiModel === 'gemini-3.6-flash' ? 'gemini-3.8-flash' : 'gemini-3.6-flash';
    const modelsToTry = [config.geminiModel, fallbackModel];
    let response: any;
    let lastErr: any;

    for (const model of modelsToTry) {
      try {
        response = await ai.models.generateContent({
          model,
          contents: promptText,
          config: {
            systemInstruction: M1_SYSTEM_PROMPT,
            responseMimeType: 'application/json',
            responseSchema: geminiResponseSchema,
          },
        });
        if (response?.text) break;
      } catch (err: any) {
        lastErr = err;
        console.warn(`[M1 Planner] Model ${model} invocation notice: ${err?.message || err}. Trying next candidate...`);
      }
    }

    if (!response?.text) {
      throw lastErr || new Error('Failed to generate response from Gemini models');
    }

    const text = response.text?.trim() || '{}';
    console.log('[M1 Planner] Raw Gemini Output JSON:', text);
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed.actions)) {
      parsed.actions = [];
    }

    // Pass through post-generation deterministic validator
    return validatePlan(parsed, elements);
  } catch (err: any) {
    console.error('[M1 Planner] Gemini invocation error:', err?.message || err);

    const allowFallback = options?.allowMockFallback ?? config.enableMockFallback;

    // If Gemini fails or errors, return structured safe failure or test fallback if allowed
    if (allowFallback) {
      console.warn('[M1 Planner] Falling back to [TEST/MOCK PLANNER] due to LLM error.');
      const fallback = generateMockPlan(request);
      return validatePlan(fallback, elements);
    }

    return validatePlan(
      {
        status: 'FAILED',
        code: 'UNSUPPORTED_ACTION',
        message: `M1 AI Brain LLM execution failure: ${err?.message || 'Unknown error'}`,
        actions: [],
      },
      elements
    );
  }
}
