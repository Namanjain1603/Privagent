import { ClickAction, ActionResult } from '../types/actions';
import { resolveTarget } from './utils';

export function executeClick(action: ClickAction): ActionResult {
  try {
    const el = resolveTarget(action.target);
    if (!el) {
      throw new Error('TARGET_NOT_FOUND');
    }

    if ((el as HTMLButtonElement | HTMLInputElement).disabled) {
      throw new Error('TARGET_DISABLED');
    }
    
    // Check if it's a clickable/interactive element
    const tagName = el.tagName.toLowerCase();
    const isInteractive = ['button', 'a', 'input', 'select', 'textarea'].includes(tagName) || el.getAttribute('role') === 'button';
    if (!isInteractive) {
      throw new Error('INVALID_TARGET');
    }

    el.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' });
    el.click();

    return {
      success: true,
      action
    };
  } catch (error: any) {
    return {
      success: false,
      action,
      error: error.message
    };
  }
}
