import { TypeAction, ActionResult } from '../types/actions';
import { resolveTarget } from './utils';

export function executeType(action: TypeAction): ActionResult {
  try {
    const el = resolveTarget(action.target);
    if (!el) {
      throw new Error('TARGET_NOT_FOUND');
    }

    if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) {
      throw new Error('INVALID_TARGET');
    }

    if (el.disabled) {
      throw new Error('TARGET_DISABLED');
    }

    el.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' });
    el.focus();
    
    // Actually set the value
    el.value = action.value;

    // Dispatch events so React/Vue/Angular can pick up the change
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));

    // IMPORTANT SECURITY RULE 8: Never log the typed value, especially for passwords
    const isPassword = el.type && el.type.toLowerCase() === 'password';

    return {
      success: true,
      action: {
        ...action,
        value: isPassword ? '***REDACTED***' : action.value 
      }
    };
  } catch (error: any) {
    return {
      success: false,
      action: {
          ...action,
          value: '***REDACTED***'
      },
      error: error.message
    };
  }
}
