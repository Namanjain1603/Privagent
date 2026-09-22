import { BrowserAction, ActionResult, NavigateAction } from '../types/actions';
import { executeClick } from './click';
import { executeType } from './type';
import { executeSelect } from './select';
import { executeScroll } from './scroll';
import { executeNavigate } from './navigate';
import { resolveTarget } from './utils';

export class ActionExecutor {
  public execute(action: any): ActionResult {
    try {
      const validAction = this.validateAction(action);
      
      switch (validAction.type) {
        case 'CLICK':
          return executeClick(validAction);
        case 'TYPE':
          return executeType(validAction);
        case 'SELECT':
          return executeSelect(validAction);
        case 'SCROLL':
          return executeScroll(validAction);
        case 'NAVIGATE':
          // Navigate could be handled by background, but we'll try content script first
          // If we want service worker to do it, we'd send a message.
          // Let's handle it here for simplicity, or return it to be handled by background.
          // For now, executeNavigate will do window.location.
          return executeNavigate(validAction);
        default:
           throw new Error(`Unsupported action type`);
      }
    } catch (error: any) {
      return {
        success: false,
        action: action as BrowserAction,
        error: error.message
      };
    }
  }

  private validateAction(action: any): BrowserAction {
    if (!action || typeof action !== 'object') {
      throw new Error('INVALID_ACTION');
    }

    if (!action.type) {
      throw new Error('INVALID_ACTION');
    }

    // Reject executable code blocks outright
    if ('javascript' in action || 'code' in action) {
        throw new Error('INVALID_ACTION');
    }

    switch (action.type) {
      case 'CLICK':
        if (!action.target) throw new Error('INVALID_ACTION');
        return action;
      case 'TYPE':
        if (!action.target) throw new Error('INVALID_ACTION');
        if (typeof action.value !== 'string') throw new Error('INVALID_ACTION');
        return action;
      case 'SELECT':
        if (!action.target) throw new Error('INVALID_ACTION');
        if (typeof action.value !== 'string') throw new Error('INVALID_ACTION');
        return action;
      case 'SCROLL':
        if (action.direction !== 'up' && action.direction !== 'down') {
           throw new Error('INVALID_ACTION');
        }
        return action;
      case 'NAVIGATE':
        if (!action.url) throw new Error('INVALID_ACTION');
        try {
          const urlObj = new URL(action.url);
          if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
              throw new Error('UNSAFE_URL');
          }
        } catch {
          throw new Error('UNSAFE_URL');
        }
        return action as NavigateAction;
      default:
        throw new Error('INVALID_ACTION');
    }
  }
}
