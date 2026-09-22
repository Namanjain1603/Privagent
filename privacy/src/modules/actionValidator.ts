/**
 * PRIVAGENT - Privacy & PII Guard (M2)
 * Module: Inbound Action Security Validator
 * 
 * Strict Security Gate between Cloud M1 (Brain) and Local M3 (Browser Extension)
 * 
 * Enforces:
 * 1. Strict Whitelist of Safe Actions: CLICK, TYPE, SELECT, SCROLL, NAVIGATE, WAIT
 * 2. Absolute ban on arbitrary JavaScript execution (reject eval, script, javascript: URLs)
 * 3. CSS Selector sanitization & verification
 * 4. Local Token Expansion: Resolves <PII:...> tokens to real values strictly inside local memory
 */

import { AgentActionProposal, M2ActionValidationResult, AllowedActionType } from '../types/privacy';
import { MaskingEngine } from './maskingEngine';

const ALLOWED_ACTIONS: Set<AllowedActionType> = new Set([
  'CLICK',
  'TYPE',
  'SELECT',
  'SCROLL',
  'NAVIGATE',
  'WAIT'
]);

// Patterns that indicate malicious code execution or exfiltration attempts
const DANGEROUS_PATTERNS = [
  /javascript:/i,
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /\beval\s*\(/i,
  /\bFunction\s*\(/i,
  /\bwindow\./i,
  /\bdocument\./i,
  /\blocalStorage\b/i,
  /\bsessionStorage\b/i,
  /\bdocument\.cookie\b/i,
  /\bon\w+\s*=/i, // onload=, onclick= in string
  /data:text\/html/i
];

export class ActionValidator {
  private maskingEngine: MaskingEngine;

  constructor(maskingEngine: MaskingEngine) {
    this.maskingEngine = maskingEngine;
  }

  /**
   * Validates an action proposed by M1 (Cloud) before allowing M3 (Browser) to execute it
   */
  public validateAction(action: AgentActionProposal): M2ActionValidationResult {
    const securityFlags: string[] = [];

    // Rule 1: Action Type Whitelist Check
    if (!ALLOWED_ACTIONS.has(action.type)) {
      return {
        isAllowed: false,
        actionId: action.actionId,
        rejectionReason: `Action type '${action.type}' is forbidden. PRIVAGENT only permits: CLICK, TYPE, SELECT, SCROLL, NAVIGATE, WAIT.`,
        securityFlagsTriggered: ['FORBIDDEN_ACTION_TYPE']
      };
    }

    // Rule 2: Code Injection & Arbitrary Script Check
    const inspectionTargets = [
      action.rawTextValue || '',
      action.targetSelector || '',
      action.targetUrl || '',
      action.justification || ''
    ];

    for (const text of inspectionTargets) {
      for (const pattern of DANGEROUS_PATTERNS) {
        if (pattern.test(text)) {
          securityFlags.push(`CODE_INJECTION_DETECTED: Pattern ${pattern.toString()}`);
          return {
            isAllowed: false,
            actionId: action.actionId,
            rejectionReason: `Security Violation: Attempted arbitrary script execution or sensitive API access in action parameters.`,
            securityFlagsTriggered: securityFlags
          };
        }
      }
    }

    // Rule 3: URL Protocol Check for NAVIGATE
    if (action.type === 'NAVIGATE') {
      if (!action.targetUrl) {
        return {
          isAllowed: false,
          actionId: action.actionId,
          rejectionReason: 'NAVIGATE action must specify a valid targetUrl.',
          securityFlagsTriggered: ['MISSING_URL']
        };
      }
      try {
        const parsed = new URL(action.targetUrl);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          return {
            isAllowed: false,
            actionId: action.actionId,
            rejectionReason: `NAVIGATE protocol '${parsed.protocol}' is disallowed. Only http: and https: are permitted.`,
            securityFlagsTriggered: ['DISALLOWED_PROTOCOL']
          };
        }
      } catch {
        return {
          isAllowed: false,
          actionId: action.actionId,
          rejectionReason: `Malformed URL in NAVIGATE action: ${action.targetUrl}`,
          securityFlagsTriggered: ['MALFORMED_URL']
        };
      }
    }

    // Rule 4: Selector Validation for DOM Actions
    if (['CLICK', 'TYPE', 'SELECT'].includes(action.type)) {
      if (!action.targetSelector || action.targetSelector.trim() === '') {
        return {
          isAllowed: false,
          actionId: action.actionId,
          rejectionReason: `${action.type} requires a valid CSS targetSelector.`,
          securityFlagsTriggered: ['EMPTY_SELECTOR']
        };
      }
    }

    // Rule 5: Token Expansion for TYPE actions
    let resolvedExecutionValue = action.rawTextValue;
    if (action.type === 'TYPE') {
      if (action.targetToken) {
        const realValue = this.maskingEngine.resolveToken(action.targetToken);
        if (realValue) {
          resolvedExecutionValue = realValue;
          securityFlags.push(`LOCAL_TOKEN_EXPANDED: ${action.targetToken} resolved in on-device memory`);
        } else {
          return {
            isAllowed: false,
            actionId: action.actionId,
            rejectionReason: `Token '${action.targetToken}' not found in on-device secure vault.`,
            securityFlagsTriggered: ['UNKNOWN_TOKEN']
          };
        }
      } else if (action.rawTextValue) {
        // Expand any inline token tags
        resolvedExecutionValue = this.maskingEngine.expandTokensInAction(action.rawTextValue);
      }
    }

    return {
      isAllowed: true,
      actionId: action.actionId,
      sanitizedAction: {
        type: action.type,
        selector: action.targetSelector,
        resolvedExecutionValue,
        coordinates: action.coordinates,
        scrollDelta: action.scrollDelta,
        targetUrl: action.targetUrl
      },
      securityFlagsTriggered: securityFlags
    };
  }
}
