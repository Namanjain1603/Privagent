import { AllowedActionType, ActionValidationReport } from '../types/privagent';

export const ALLOWED_ACTIONS: AllowedActionType[] = ['CLICK', 'TYPE', 'SELECT', 'SCROLL', 'NAVIGATE'];

export interface ValidationInput {
  action?: any;
  target?: any;
  value?: any;
  url?: any;
  code?: any;
  direction?: any;
  [key: string]: any;
}

/**
 * Pure on-device schema validator for incoming AI/Cloud Action Plans.
 * Enforces Security Rules #7 & #8:
 * - Only CLICK, TYPE, SELECT, SCROLL, NAVIGATE permitted
 * - Blocks EXECUTE_JS, eval(), inline scripts, and arbitrary JS execution
 * - Does NOT execute browser actions from the dashboard
 */
export function validateActionPayload(payload: any, id: string = `val_${Date.now()}`): ActionValidationReport {
  const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false }) + '.' + Math.floor(Math.random() * 900 + 100);

  // 1. Malformed payload check
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {
      id,
      payload: payload || {},
      status: 'BLOCKED',
      actionType: 'MALFORMED',
      reason: 'Malformed payload: Action plan must be a valid JSON object.',
      timestamp,
      threatLevel: 'HIGH',
    };
  }

  const rawAction = payload.action;

  // 2. Missing action field
  if (!rawAction || typeof rawAction !== 'string') {
    return {
      id,
      payload,
      status: 'BLOCKED',
      actionType: 'UNDEFINED',
      reason: 'Missing required field: "action" must be a non-empty string.',
      timestamp,
      threatLevel: 'HIGH',
    };
  }

  const upperAction = rawAction.trim().toUpperCase();

  // 3. Explicit arbitrary JS / code execution detection
  const dangerousKeys = ['code', 'script', 'eval', 'fn', 'function', 'javascript'];
  const hasDangerousKey = dangerousKeys.some((k) => k in payload);
  const stringified = JSON.stringify(payload).toLowerCase();
  const containsDangerousPattern =
    stringified.includes('eval(') ||
    stringified.includes('javascript:') ||
    stringified.includes('<script') ||
    stringified.includes('document.cookie') ||
    stringified.includes('window.location') ||
    stringified.includes('executescript');

  if (
    upperAction === 'EXECUTE_JS' ||
    upperAction === 'EVAL' ||
    upperAction === 'RUN_SCRIPT' ||
    upperAction === 'EXEC_COMMAND' ||
    hasDangerousKey ||
    containsDangerousPattern
  ) {
    return {
      id,
      payload,
      status: 'BLOCKED',
      actionType: rawAction,
      reason: 'Arbitrary JavaScript execution is not allowed.',
      timestamp,
      threatLevel: 'CRITICAL',
    };
  }

  // 4. Check if action is in strict allowlist
  if (!ALLOWED_ACTIONS.includes(upperAction as AllowedActionType)) {
    return {
      id,
      payload,
      status: 'BLOCKED',
      actionType: rawAction,
      reason: `Unknown action type "${rawAction}". Allowed actions are: ${ALLOWED_ACTIONS.join(', ')}.`,
      timestamp,
      threatLevel: 'HIGH',
    };
  }

  // 5. Action-specific field validation
  switch (upperAction as AllowedActionType) {
    case 'CLICK': {
      if (!payload.target || typeof payload.target !== 'string' || payload.target.trim() === '') {
        return {
          id,
          payload,
          status: 'BLOCKED',
          actionType: upperAction,
          reason: 'Missing or invalid required field: "target" CSS selector string is required for CLICK.',
          timestamp,
          threatLevel: 'MEDIUM',
        };
      }
      break;
    }

    case 'TYPE': {
      if (!payload.target || typeof payload.target !== 'string' || payload.target.trim() === '') {
        return {
          id,
          payload,
          status: 'BLOCKED',
          actionType: upperAction,
          reason: 'Missing or invalid required field: "target" CSS selector string is required for TYPE.',
          timestamp,
          threatLevel: 'MEDIUM',
        };
      }
      if (payload.value === undefined || typeof payload.value !== 'string') {
        return {
          id,
          payload,
          status: 'BLOCKED',
          actionType: upperAction,
          reason: 'Missing required field: "value" string is required for TYPE action.',
          timestamp,
          threatLevel: 'MEDIUM',
        };
      }
      break;
    }

    case 'SELECT': {
      if (!payload.target || typeof payload.target !== 'string' || payload.target.trim() === '') {
        return {
          id,
          payload,
          status: 'BLOCKED',
          actionType: upperAction,
          reason: 'Missing or invalid required field: "target" CSS selector is required for SELECT.',
          timestamp,
          threatLevel: 'MEDIUM',
        };
      }
      if (payload.value === undefined || typeof payload.value !== 'string') {
        return {
          id,
          payload,
          status: 'BLOCKED',
          actionType: upperAction,
          reason: 'Missing required field: "value" option string is required for SELECT action.',
          timestamp,
          threatLevel: 'MEDIUM',
        };
      }
      break;
    }

    case 'SCROLL': {
      // SCROLL requires either direction ("UP" | "DOWN") or target or y coordinate
      const hasDirection = payload.direction && typeof payload.direction === 'string';
      const hasTarget = payload.target && typeof payload.target === 'string';
      const hasY = typeof payload.y === 'number';
      if (!hasDirection && !hasTarget && !hasY) {
        return {
          id,
          payload,
          status: 'BLOCKED',
          actionType: upperAction,
          reason: 'Missing required parameter: SCROLL requires either "direction", "target", or "y" numeric coordinate.',
          timestamp,
          threatLevel: 'MEDIUM',
        };
      }
      break;
    }

    case 'NAVIGATE': {
      if (!payload.url || typeof payload.url !== 'string' || payload.url.trim() === '') {
        return {
          id,
          payload,
          status: 'BLOCKED',
          actionType: upperAction,
          reason: 'Missing required field: "url" string is required for NAVIGATE.',
          timestamp,
          threatLevel: 'MEDIUM',
        };
      }
      // Check for pseudo-protocol injection
      const trimmedUrl = payload.url.trim().toLowerCase();
      if (trimmedUrl.startsWith('javascript:') || trimmedUrl.startsWith('data:') || trimmedUrl.startsWith('vbscript:')) {
        return {
          id,
          payload,
          status: 'BLOCKED',
          actionType: upperAction,
          reason: 'Arbitrary JavaScript execution is not allowed (unsafe URI protocol).',
          timestamp,
          threatLevel: 'CRITICAL',
        };
      }
      break;
    }
  }

  // All checks passed!
  return {
    id,
    payload,
    status: 'ALLOWED',
    actionType: upperAction,
    reason: `Schema Validated: Conforms to SIH Allowlisted Action Specification (#7 & #8).`,
    timestamp,
    threatLevel: 'NONE',
  };
}

export const SYNTHETIC_VALIDATOR_TEST_EXAMPLES: Array<{
  name: string;
  payload: Record<string, any>;
  expectedStatus: 'ALLOWED' | 'BLOCKED';
  description: string;
}> = [
  {
    name: 'Valid CLICK Action',
    payload: {
      action: 'CLICK',
      target: '#login-button',
    },
    expectedStatus: 'ALLOWED',
    description: 'Standard allowlisted DOM button interaction',
  },
  {
    name: 'Invalid Arbitrary JS (EXECUTE_JS)',
    payload: {
      action: 'EXECUTE_JS',
      code: "alert('test')",
    },
    expectedStatus: 'BLOCKED',
    description: 'Blocked by Security Rule #7: No arbitrary JS execution',
  },
  {
    name: 'Valid TYPE Action',
    payload: {
      action: 'TYPE',
      target: '#aadhaar-search-input',
      value: 'UIDAI Synthetic Query',
    },
    expectedStatus: 'ALLOWED',
    description: 'Allowlisted input interaction with sanitized parameter',
  },
  {
    name: 'Invalid Missing Required Field',
    payload: {
      action: 'TYPE',
      target: '#user-field',
      // missing "value"
    },
    expectedStatus: 'BLOCKED',
    description: 'Missing required "value" parameter for TYPE action',
  },
  {
    name: 'Invalid Script Protocol Injection',
    payload: {
      action: 'NAVIGATE',
      url: "javascript:eval('malicious')",
    },
    expectedStatus: 'BLOCKED',
    description: 'Blocked due to dangerous script pseudo-protocol in URI',
  },
  {
    name: 'Invalid Unallowlisted Action (SCREEN_CAPTURE)',
    payload: {
      action: 'DEVTOOLS_NETWORK_DUMP',
      target: 'all_requests',
    },
    expectedStatus: 'BLOCKED',
    description: 'Blocked: Action not in allowed set (CLICK, TYPE, SELECT, SCROLL, NAVIGATE)',
  },
];
