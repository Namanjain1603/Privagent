import { NavigateAction, ActionResult } from '../types/actions';

export function executeNavigate(action: NavigateAction): ActionResult {
  try {
    // Basic validation to prevent immediate javascript: injection
    // More robust validation is done in validator
    const urlObj = new URL(action.url);
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
       throw new Error('UNSAFE_URL');
    }

    // Since we are in the content script here, window.location is possible,
    // but the service worker will handle this to ensure it's safe and robust
    // So this function might just return success and let the background handle it,
    // or we can actually set location.href.
    // The prompt says "Navigate URL before navigation. Only allow http/https."
    // and "Use Chrome tab APIs where appropriate." So we should send a message to background.
    // Wait, the executor will route it.
    
    // For MVP, window.location.href inside content script is reliable for same-tab.
    window.location.href = action.url;

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
