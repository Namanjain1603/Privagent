import { ExtensionMessage, DOMRequestMessage, ScreenshotRequestMessage, ActionRequestMessage } from '../src/types/messages';
import { BrowserAction } from '../src/types/actions';

const output = document.getElementById('output') as HTMLPreElement;
const extractDomBtn = document.getElementById('extract-dom') as HTMLButtonElement;
const captureScreenshotBtn = document.getElementById('capture-screenshot') as HTMLButtonElement;
const executeActionBtn = document.getElementById('execute-action') as HTMLButtonElement;

function log(data: any) {
  output.textContent = JSON.stringify(data, null, 2);
}

let currentTabId: number | undefined;

async function updateTabState() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0) {
      document.getElementById('tab-title')!.textContent = 'Not found';
      document.getElementById('tab-status')!.textContent = 'Not found';
      return;
    }

    const tab = tabs[0];
    currentTabId = tab.id;
    
    const response: any = await chrome.runtime.sendMessage({ type: 'TAB_STATE_REQUEST', tabId: currentTabId });
    if (response && response.type === 'TAB_STATE_RESPONSE') {
      const state = response.tab;
      document.getElementById('tab-title')!.textContent = state.url || tab.url || tab.pendingUrl || 'Unknown';
      document.getElementById('tab-status')!.textContent = state.supportedPage ? 'Ready' : 'Unsupported';
    } else if (response && response.type === 'ERROR' && response.error === 'TAB_NOT_FOUND') {
      document.getElementById('tab-title')!.textContent = 'Not found';
      document.getElementById('tab-status')!.textContent = 'Not found';
    } else {
      document.getElementById('tab-title')!.textContent = 'Unknown';
      document.getElementById('tab-status')!.textContent = 'Unsupported';
    }
  } catch (err: any) {
    document.getElementById('tab-title')!.textContent = 'Error';
    document.getElementById('tab-status')!.textContent = err.message || 'Unknown';
  }
}

// Call initially
updateTabState();

extractDomBtn.addEventListener('click', async () => {
  try {
    const msg: DOMRequestMessage = { type: 'DOM_REQUEST', tabId: currentTabId };
    const response = await chrome.runtime.sendMessage(msg);
    log(response);
  } catch (err: any) {
    log({ success: false, error: err.message });
  }
});

captureScreenshotBtn.addEventListener('click', async () => {
  try {
    const msg: ScreenshotRequestMessage = { type: 'SCREENSHOT_REQUEST', tabId: currentTabId };
    const response: any = await chrome.runtime.sendMessage(msg);
    if (response && response.dataUrl) {
      response.dataUrl = response.dataUrl.substring(0, 50) + '...';
    }
    log(response);
  } catch (err: any) {
    log({ success: false, error: err.message });
  }
});

executeActionBtn.addEventListener('click', async () => {
  const type = (document.getElementById('action-type') as HTMLSelectElement).value;
  const target = (document.getElementById('action-target') as HTMLInputElement).value;
  const value = (document.getElementById('action-value') as HTMLInputElement).value;

  let action: any = { type };
  if (type !== 'SCROLL') {
     action.target = target;
  }

  if (type === 'TYPE' || type === 'SELECT') {
    action.value = value;
  } else if (type === 'NAVIGATE') {
    action.url = value;
    delete action.target;
  } else if (type === 'SCROLL') {
    action.direction = value || 'down';
  }

  try {
    const msg: ActionRequestMessage = { type: 'ACTION_REQUEST', action: action as BrowserAction, tabId: currentTabId };
    const response = await chrome.runtime.sendMessage(msg);
    log(response);
  } catch (err: any) {
    log({ success: false, error: err.message });
  }
});
