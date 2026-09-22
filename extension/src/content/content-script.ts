import { DOMExtractor } from '../dom/extractor';
import { ActionExecutor } from '../agent/executor';
import { ExtensionMessage } from '../types/messages';

const extractor = new DOMExtractor();
const executor = new ActionExecutor();

chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  if (message.type === 'DOM_REQUEST') {
    try {
      const elements = extractor.extract();
      sendResponse({ type: 'DOM_RESPONSE', elements });
    } catch (error: any) {
      sendResponse({ type: 'ERROR', error: error.message });
    }
  } else if (message.type === 'ACTION_REQUEST') {
    try {
      const result = executor.execute(message.action);
      sendResponse({ type: 'ACTION_RESULT', result });
    } catch (error: any) {
      sendResponse({ type: 'ERROR', error: error.message });
    }
  }

  // Return true to indicate we will send a response asynchronously, 
  // although right now it's synchronous. Good practice for potential future async work.
  return false; 
});

// Let background know we are ready, or just log
console.log('Privagent M3 Content Script loaded.');
