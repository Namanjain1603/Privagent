import { ScrollAction, ActionResult } from '../types/actions';

export function executeScroll(action: ScrollAction): ActionResult {
  try {
    const amount = action.amount || window.innerHeight * 0.8; // Default scroll almost a full screen

    if (action.direction === 'down') {
      window.scrollBy({ top: amount, left: 0, behavior: 'smooth' });
    } else if (action.direction === 'up') {
      window.scrollBy({ top: -amount, left: 0, behavior: 'smooth' });
    } else {
      throw new Error('INVALID_ACTION');
    }

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
