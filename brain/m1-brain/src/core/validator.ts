import { SanitizedElement } from '../schemas/input.schema.js';
import { MVP_ACTION_TYPES, M1Action } from '../schemas/action.schema.js';
import {
  M1PlanResponse,
  M1PlanSuccessResponse,
  M1PlanFailureResponse,
  M1FailureCode,
} from '../schemas/plan.schema.js';

const SENSITIVE_KEYWORDS = [
  'password',
  'passwd',
  'pwd',
  'otp',
  'cvv',
  'pin',
  'aadhaar',
  'pan card',
];

const JS_INJECTION_PATTERNS = [
  /javascript:/i,
  /eval\s*\(/i,
  /<script/i,
  /\bwindow\b/i,
  /\bdocument\b/i,
  /\bfunction\s*\(/i,
  /=>/,
  /;\s*alert\s*\(/i,
];

export interface ValidationResult {
  isValid: boolean;
  validatedPlan: M1PlanResponse;
}

/**
 * Deterministically checks an action plan against the sanitized page context
 * and strict security / allowlist rules.
 */
export function validatePlan(
  rawPlan: any,
  elements: SanitizedElement[]
): M1PlanResponse {
  // 1. If already marked as failure or clarification by the planner
  if (rawPlan && (rawPlan.status === 'FAILED' || rawPlan.status === 'NEEDS_CLARIFICATION')) {
    const validCodes: M1FailureCode[] = [
      'ELEMENT_NOT_FOUND',
      'AMBIGUOUS_TARGET',
      'MISSING_USER_INPUT',
      'UNSUPPORTED_ACTION',
      'SENSITIVE_DATA_REQUESTED',
      'TASK_COMPLETE',
    ];

    const code: M1FailureCode = validCodes.includes(rawPlan.code)
      ? rawPlan.code
      : 'ELEMENT_NOT_FOUND';

    return {
      status: rawPlan.status,
      code,
      message: String(rawPlan.message || 'Action planning could not be completed.'),
      details: rawPlan.details || undefined,
      actions: [],
    };
  }

  // Handle explicit TASK_COMPLETE response
  if (rawPlan && rawPlan.code === 'TASK_COMPLETE') {
    return {
      status: 'SUCCESS',
      code: 'TASK_COMPLETE',
      message: String(rawPlan.message || 'Goal has already been satisfied by prior steps.'),
      reasoning: rawPlan.reasoning
        ? {
            intent: String(rawPlan.reasoning.intent || 'Goal already satisfied'),
            subGoals: Array.isArray(rawPlan.reasoning.subGoals)
              ? rawPlan.reasoning.subGoals.map(String)
              : ['Goal already satisfied'],
            contextSummary: String(rawPlan.reasoning.contextSummary || 'No further actions required'),
          }
        : undefined,
      actions: [],
    };
  }

  // 2. Validate top-level shape
  if (!rawPlan || typeof rawPlan !== 'object' || !Array.isArray(rawPlan.actions)) {
    return createFailure(
      'UNSUPPORTED_ACTION',
      'Planner returned an invalid or missing action list structure.'
    );
  }

  const elementMap = new Map<string, SanitizedElement>();
  for (const el of elements) {
    elementMap.set(el.id, el);
  }

  const validatedActions: M1Action[] = [];

  // 3. Validate each action in the sequence
  for (let i = 0; i < rawPlan.actions.length; i++) {
    const action = rawPlan.actions[i];

    if (!action || typeof action !== 'object') {
      return createFailure(
        'UNSUPPORTED_ACTION',
        `Action at index ${i} is not a valid object.`
      );
    }

    // A. Check allowlisted action type
    if (!MVP_ACTION_TYPES.includes(action.type)) {
      return createFailure(
        'UNSUPPORTED_ACTION',
        `Action type '${action.type}' at index ${i} is not in the approved allowlist (CLICK, TYPE, SELECT, SCROLL, NAVIGATE).`
      );
    }

    // B. Check for arbitrary JavaScript / code execution
    const stringified = JSON.stringify(action);
    for (const pattern of JS_INJECTION_PATTERNS) {
      if (pattern.test(stringified)) {
        return createFailure(
          'UNSUPPORTED_ACTION',
          `Security violation: Prohibited script or JavaScript pattern detected in action at index ${i}.`
        );
      }
    }

    // C. Action-specific validation
    switch (action.type) {
      case 'CLICK': {
        if (!action.target || typeof action.target !== 'string') {
          return createFailure(
            'ELEMENT_NOT_FOUND',
            `CLICK action at index ${i} is missing target element ID.`
          );
        }

        const targetEl = elementMap.get(action.target);
        if (!targetEl) {
          return createFailure(
            'ELEMENT_NOT_FOUND',
            `Target element '${action.target}' for CLICK does not exist in the page context.`
          );
        }

        validatedActions.push({
          type: 'CLICK',
          target: action.target,
          description: action.description || `Click on ${targetEl.label || targetEl.id}`,
        });
        break;
      }

      case 'TYPE': {
        if (!action.target || typeof action.target !== 'string') {
          return createFailure(
            'ELEMENT_NOT_FOUND',
            `TYPE action at index ${i} is missing target element ID.`
          );
        }

        const targetEl = elementMap.get(action.target);
        if (!targetEl) {
          return createFailure(
            'ELEMENT_NOT_FOUND',
            `Target element '${action.target}' for TYPE does not exist in the page context.`
          );
        }

        // Check element type compatibility
        const validTypingTypes = ['input', 'textarea', 'text'];
        if (!validTypingTypes.includes(targetEl.type)) {
          return createFailure(
            'UNSUPPORTED_ACTION',
            `Cannot TYPE into element '${action.target}' of type '${targetEl.type}'. Must be input or textarea.`
          );
        }

        if (typeof action.value !== 'string') {
          return createFailure(
            'MISSING_USER_INPUT',
            `TYPE action at index ${i} requires a valid string value.`
          );
        }

        // Check for sensitive credentials in value or target name/label
        const checkTargetText = `${targetEl.id} ${targetEl.name || ''} ${targetEl.label || ''}`.toLowerCase();
        const containsSensitiveTarget = SENSITIVE_KEYWORDS.some((kw) =>
          checkTargetText.includes(kw)
        );

        if (containsSensitiveTarget) {
          return createFailure(
            'SENSITIVE_DATA_REQUESTED',
            `Direct automated typing of sensitive credentials (passwords, OTPs, PINs) into '${targetEl.id}' is prohibited.`
          );
        }

        validatedActions.push({
          type: 'TYPE',
          target: action.target,
          value: action.value,
          description: action.description || `Type into ${targetEl.label || targetEl.id}`,
        });
        break;
      }

      case 'SELECT': {
        if (!action.target || typeof action.target !== 'string') {
          return createFailure(
            'ELEMENT_NOT_FOUND',
            `SELECT action at index ${i} is missing target element ID.`
          );
        }

        const targetEl = elementMap.get(action.target);
        if (!targetEl) {
          return createFailure(
            'ELEMENT_NOT_FOUND',
            `Target element '${action.target}' for SELECT does not exist in the page context.`
          );
        }

        if (targetEl.type !== 'select') {
          return createFailure(
            'UNSUPPORTED_ACTION',
            `Element '${action.target}' is of type '${targetEl.type}', not a select element.`
          );
        }

        if (!action.value || typeof action.value !== 'string') {
          return createFailure(
            'MISSING_USER_INPUT',
            `SELECT action at index ${i} is missing a selected value.`
          );
        }

        const availableOptions = targetEl.options || [];
        const optionMatch = availableOptions.find(
          (opt) => opt.toLowerCase() === action.value.toLowerCase()
        );

        if (!optionMatch) {
          return createFailure(
            'ELEMENT_NOT_FOUND',
            `Selected option '${action.value}' not found in options for '${targetEl.id}'. Available: [${availableOptions.join(', ')}]`
          );
        }

        validatedActions.push({
          type: 'SELECT',
          target: action.target,
          value: optionMatch, // Normalized exact casing
          description: action.description || `Select '${optionMatch}' in ${targetEl.label || targetEl.id}`,
        });
        break;
      }

      case 'SCROLL': {
        const validDirections = ['UP', 'DOWN', 'TOP', 'BOTTOM'];
        if (!validDirections.includes(action.direction)) {
          return createFailure(
            'UNSUPPORTED_ACTION',
            `Invalid scroll direction '${action.direction}'. Must be UP, DOWN, TOP, or BOTTOM.`
          );
        }

        if (action.target) {
          const targetEl = elementMap.get(action.target);
          if (!targetEl) {
            return createFailure(
              'ELEMENT_NOT_FOUND',
              `Scroll target container '${action.target}' not found in page context.`
            );
          }
        }

        validatedActions.push({
          type: 'SCROLL',
          direction: action.direction,
          target: action.target,
          description: action.description || `Scroll ${action.direction}`,
        });
        break;
      }

      case 'NAVIGATE': {
        if (!action.url || typeof action.url !== 'string') {
          return createFailure(
            'MISSING_USER_INPUT',
            `NAVIGATE action at index ${i} is missing target URL.`
          );
        }

        try {
          const parsed = new URL(action.url);
          if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return createFailure(
              'UNSUPPORTED_ACTION',
              `NAVIGATE action only supports http: or https: protocols, got '${parsed.protocol}'`
            );
          }
        } catch {
          return createFailure(
            'UNSUPPORTED_ACTION',
            `Invalid URL '${action.url}' in NAVIGATE action.`
          );
        }

        validatedActions.push({
          type: 'NAVIGATE',
          url: action.url,
          description: action.description || `Navigate to ${action.url}`,
        });
        break;
      }

      default:
        return createFailure(
          'UNSUPPORTED_ACTION',
          `Unknown action type '${action.type}' at index ${i}.`
        );
    }
  }

  // 4. Construct validated success response
  const reasoning = rawPlan.reasoning || {
    intent: 'User instruction execution',
    subGoals: validatedActions.map((a) => a.description || a.type),
    contextSummary: `Matched ${validatedActions.length} action(s) with ${elements.length} available DOM element(s).`,
  };

  const successResponse: M1PlanSuccessResponse = {
    status: 'SUCCESS',
    reasoning: {
      intent: String(reasoning.intent || 'Execute requested browser actions'),
      subGoals: Array.isArray(reasoning.subGoals)
        ? reasoning.subGoals.map(String)
        : validatedActions.map((a) => a.description || a.type),
      contextSummary: String(reasoning.contextSummary || `Found ${elements.length} element(s)`),
    },
    actions: validatedActions,
  };

  return successResponse;
}

function createFailure(
  code: M1FailureCode,
  message: string,
  suggestedClarification?: string
): M1PlanFailureResponse {
  return {
    status: 'FAILED',
    code,
    message,
    details: suggestedClarification
      ? { suggestedClarification }
      : undefined,
    actions: [],
  };
}
