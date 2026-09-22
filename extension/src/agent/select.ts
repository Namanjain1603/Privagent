import { SelectAction, ActionResult } from '../types/actions';
import { resolveTarget } from './utils';

export function executeSelect(action: SelectAction): ActionResult {
  try {
    const el = resolveTarget(action.target);
    if (!el) {
      throw new Error('TARGET_NOT_FOUND');
    }

    if (!(el instanceof HTMLSelectElement)) {
      throw new Error('INVALID_TARGET');
    }

    if (el.disabled) {
      throw new Error('TARGET_DISABLED');
    }

    let optionFound = false;
    for (let i = 0; i < el.options.length; i++) {
      const option = el.options[i];
      if (option.value === action.value || option.text === action.value) {
        el.selectedIndex = i;
        optionFound = true;
        break;
      }
    }

    if (!optionFound) {
      throw new Error('EXECUTION_FAILED');
    }

    el.dispatchEvent(new Event('change', { bubbles: true }));

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
