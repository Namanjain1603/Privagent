import { M2ActionValidationResult } from '../types/privacy';

/**
 * Minimal M3-compatible action types for outward integration.
 * DO NOT modify these to fit M2 internals; they must match M3 exactly.
 */
export type M3ActionType = 'CLICK' | 'TYPE' | 'SELECT' | 'SCROLL' | 'NAVIGATE';

export interface M3BaseAction {
  type: M3ActionType;
}

export interface M3ClickAction extends M3BaseAction {
  type: 'CLICK';
  target: string;
}

export interface M3TypeAction extends M3BaseAction {
  type: 'TYPE';
  target: string;
  value: string;
}

export interface M3SelectAction extends M3BaseAction {
  type: 'SELECT';
  target: string;
  value: string;
}

export interface M3ScrollAction extends M3BaseAction {
  type: 'SCROLL';
  direction: 'up' | 'down';
  amount?: number;
}

export interface M3NavigateAction extends M3BaseAction {
  type: 'NAVIGATE';
  url: string;
}

export type M3BrowserAction = M3ClickAction | M3TypeAction | M3SelectAction | M3ScrollAction | M3NavigateAction;

export interface M3ActionRequest {
  type: 'ACTION_REQUEST';
  action: M3BrowserAction;
}

export interface AdapterResult {
  success: boolean;
  request?: M3ActionRequest;
  error?: string;
}

/**
 * Adapts an M2 sanitized action into a frozen M3-compatible ACTION_REQUEST.
 * Rejects WAIT actions, missing fields, or unsafe navigation safely.
 */
export function adaptSanitizedActionToM3(
  validationResult: M2ActionValidationResult
): AdapterResult {
  if (!validationResult.isAllowed || !validationResult.sanitizedAction) {
    return { success: false, error: 'Cannot adapt a blocked or missing action.' };
  }

  const m2Action = validationResult.sanitizedAction;

  switch (m2Action.type) {
    case 'WAIT':
      return { success: false, error: 'WAIT action is not supported by M3.' };

    case 'CLICK':
      if (!m2Action.selector) return { success: false, error: 'CLICK requires a selector.' };
      return {
        success: true,
        request: {
          type: 'ACTION_REQUEST',
          action: {
            type: 'CLICK',
            target: m2Action.selector
          }
        }
      };

    case 'TYPE':
      if (!m2Action.selector) return { success: false, error: 'TYPE requires a selector.' };
      if (m2Action.resolvedExecutionValue === undefined) return { success: false, error: 'TYPE requires a resolvedExecutionValue.' };
      return {
        success: true,
        request: {
          type: 'ACTION_REQUEST',
          action: {
            type: 'TYPE',
            target: m2Action.selector,
            value: m2Action.resolvedExecutionValue
          }
        }
      };

    case 'SELECT':
      if (!m2Action.selector) return { success: false, error: 'SELECT requires a selector.' };
      if (m2Action.resolvedExecutionValue === undefined) return { success: false, error: 'SELECT requires a resolvedExecutionValue.' };
      return {
        success: true,
        request: {
          type: 'ACTION_REQUEST',
          action: {
            type: 'SELECT',
            target: m2Action.selector,
            value: m2Action.resolvedExecutionValue
          }
        }
      };

    case 'SCROLL': {
      // Prioritize dy for vertical scrolling. If dy is 0 or missing, we fail safely.
      const dy = m2Action.scrollDelta?.dy || 0;
      if (dy === 0) return { success: false, error: 'SCROLL requires a non-zero vertical scrollDelta (dy).' };
      
      const direction = dy > 0 ? 'down' : 'up';
      const amount = Math.abs(dy);

      return {
        success: true,
        request: {
          type: 'ACTION_REQUEST',
          action: {
            type: 'SCROLL',
            direction,
            amount
          }
        }
      };
    }

    case 'NAVIGATE': {
      if (!m2Action.targetUrl) return { success: false, error: 'NAVIGATE requires a targetUrl.' };
      
      // Basic scheme validation for M2 adapter defense in depth
      const lowerUrl = m2Action.targetUrl.toLowerCase().trim();
      if (lowerUrl.startsWith('javascript:') || lowerUrl.startsWith('data:') || lowerUrl.startsWith('vbscript:')) {
        return { success: false, error: 'NAVIGATE rejected unsafe URL scheme.' };
      }

      return {
        success: true,
        request: {
          type: 'ACTION_REQUEST',
          action: {
            type: 'NAVIGATE',
            url: m2Action.targetUrl
          }
        }
      };
    }

    default:
      return { success: false, error: `Unsupported action type: ${(m2Action as any).type}` };
  }
}
