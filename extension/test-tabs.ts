// @ts-nocheck
import assert from 'assert';

// --- MOCK CHROME API ---
const listeners = {
  runtime: { onMessage: [] as Function[] },
  tabs: { onCreated: [] as Function[], onUpdated: [] as Function[], onRemoved: [] as Function[], onActivated: [] as Function[] }
};

let currentTabId = 1;
const mockTabs = new Map<number, any>();

// Mock WebSocket for NodeJS environment since local-bridge uses it
(global as any).WebSocket = class MockWebSocket {
  public static OPEN = 1;
  public readyState = 1;
  constructor() {}
  send() {}
};

(global as any).chrome = (globalThis as any).chrome = {
  runtime: {
    onMessage: {
      addListener: (fn: Function) => listeners.runtime.onMessage.push(fn)
    },
    lastError: null
  },
  windows: {
    WINDOW_ID_CURRENT: 1
  },
  tabs: {
    query: (queryInfo: any, cb: Function) => {
      if (queryInfo.active) {
        const activeTab = Array.from(mockTabs.values()).find(t => t.active);
        cb(activeTab ? [activeTab] : []);
      } else {
        cb(Array.from(mockTabs.values()));
      }
    },
    get: (tabId: number, cb: Function) => {
      const tab = mockTabs.get(tabId);
      if (tab) {
        cb({ ...tab, windowId: 1 });
      } else {
        chrome.runtime.lastError = { message: 'No tab' };
        cb(undefined);
        chrome.runtime.lastError = null;
      }
    },
    captureVisibleTab: (windowId: number, options: any, cb: Function) => {
      if (windowId === undefined) {
         chrome.runtime.lastError = { message: 'SCREENSHOT_FAILED' };
         cb(undefined);
         chrome.runtime.lastError = null;
      } else {
         cb('data:image/png;base64,MOCKED_BASE64_STRING');
      }
    },
    create: (createProperties: any, cb: Function) => {
      const id = ++currentTabId;
      const tab = { id, url: createProperties.url, status: 'loading', active: false };
      mockTabs.set(id, tab);
      listeners.tabs.onCreated.forEach(fn => fn(tab));
      if (cb) cb(tab);
      setTimeout(() => {
          tab.status = 'complete';
          listeners.tabs.onUpdated.forEach(fn => fn(id, { status: 'complete' }, tab));
      }, 50);
    },
    update: (tabId: number, updateProperties: any) => {
      const tab = mockTabs.get(tabId);
      if (tab) {
        if (updateProperties.url) tab.url = updateProperties.url;
        tab.status = 'loading';
        listeners.tabs.onUpdated.forEach(fn => fn(tabId, { status: 'loading' }, tab));
        
        // auto complete after 50ms
        setTimeout(() => {
            tab.status = 'complete';
            listeners.tabs.onUpdated.forEach(fn => fn(tabId, { status: 'complete' }, tab));
        }, 50);
      }
    },
    sendMessage: (tabId: number, msg: any, cb: Function) => {
        const tab = mockTabs.get(tabId);
        if (!tab || tab.url.startsWith('chrome://')) {
            chrome.runtime.lastError = { message: 'Receiving end does not exist' };
            cb();
            chrome.runtime.lastError = null;
        } else {
            // Mock content script success
            cb({ success: true, from: 'content_script', receivedMsg: msg });
        }
    },
    onCreated: { addListener: (fn: Function) => listeners.tabs.onCreated.push(fn) },
    onUpdated: { addListener: (fn: Function) => listeners.tabs.onUpdated.push(fn) },
    onRemoved: { addListener: (fn: Function) => listeners.tabs.onRemoved.push(fn) },
    onActivated: { addListener: (fn: Function) => listeners.tabs.onActivated.push(fn) }
  }
} as any;

// Set up initial tab
mockTabs.set(1, { id: 1, url: 'https://example.com', status: 'complete', active: true });

// Import service worker which will initialize TabManager and listeners
// Use require to avoid hoisting so the mock is set up first
const { tabManager } = require('./src/background/service-worker');

async function sendSWMessage(msg: any): Promise<any> {
    return new Promise(resolve => {
        const handler = listeners.runtime.onMessage[0];
        handler(msg, {}, resolve);
    });
}

async function runTests() {
    console.log('--- STARTING TAB TESTS ---');
    
    // TEST 1: Normal DOM Extraction
    const t1 = await sendSWMessage({ type: 'DOM_REQUEST' });
    assert(t1.success === true && t1.from === 'content_script');
    console.log('[PASS] TEST 1: Normal DOM Extraction via Service Worker');

    // TEST 2: Start on chrome://newtab
    mockTabs.get(1)!.url = 'chrome://newtab/';
    mockTabs.get(1)!.status = 'complete';
    listeners.tabs.onUpdated.forEach(fn => fn(1, { status: 'complete' }, mockTabs.get(1)));
    
    const t2 = await sendSWMessage({ type: 'TAB_STATE_REQUEST' });
    assert(t2.type === 'TAB_STATE_RESPONSE' && t2.tab.supportedPage === false);
    console.log('[PASS] TEST 2: chrome://newtab correctly identified as unsupported');

    // TEST 3: Navigate New Tab to Google and Extract DOM
    const navMsg = { type: 'ACTION_REQUEST', action: { type: 'NAVIGATE', url: 'https://www.google.com' }};
    const t3nav = await sendSWMessage(navMsg);
    assert(t3nav.type === 'ACTION_RESULT' && t3nav.result.success === true);
    
    const t3dom = await sendSWMessage({ type: 'DOM_REQUEST' });
    assert(t3dom.success === true && t3dom.from === 'content_script');
    console.log('[PASS] TEST 3: Navigated New Tab to Google and waited for load');

    // TEST 4: Create new tab and execute action
    const t4create = await sendSWMessage({ type: 'CREATE_TAB_REQUEST', url: 'https://example.com' });
    assert(t4create.type === 'CREATE_TAB_RESPONSE' && t4create.tabId === 2);
    
    // Test execution on new tab (need to wait for load first, which our SW handles)
    const t4act = await sendSWMessage({ type: 'ACTION_REQUEST', tabId: 2, action: { type: 'CLICK', target: 'btn' }});
    assert(t4act.success === true);
    console.log('[PASS] TEST 4: Created new tab and executed action safely');

    // TEST 5: Multi-tab isolation
    const t5act = await sendSWMessage({ type: 'ACTION_REQUEST', tabId: 1, action: { type: 'CLICK', target: 'btn2' }});
    assert(t5act.success === true && t5act.receivedMsg.tabId === 1);
    console.log('[PASS] TEST 5: Multi-tab isolation ensured via tabId routing');

    // TEST 6: Close target tab before action
    listeners.tabs.onRemoved.forEach(fn => fn(2));
    mockTabs.delete(2);
    const t6act = await sendSWMessage({ type: 'ACTION_REQUEST', tabId: 2, action: { type: 'CLICK', target: 'btn' }});
    assert(t6act.type === 'ERROR' && t6act.error === 'TAB_NOT_FOUND');
    console.log('[PASS] TEST 6: Tab closed handling returns TAB_NOT_FOUND');

    // TEST 7: Unsupported page handling (chrome://settings)
    mockTabs.get(1)!.url = 'chrome://settings';
    listeners.tabs.onUpdated.forEach(fn => fn(1, { status: 'complete' }, mockTabs.get(1)));
    const t7act = await sendSWMessage({ type: 'DOM_REQUEST' });
    assert(t7act.type === 'ERROR' && t7act.error === 'UNSUPPORTED_PAGE');
    console.log('[PASS] TEST 7: Unsupported page (chrome://settings) rejected safely');

    // TEST 8: Try unsafe navigation
    const t8act = await sendSWMessage({ type: 'ACTION_REQUEST', action: { type: 'NAVIGATE', url: 'javascript:alert(1)' }});
    assert(t8act.type === 'ACTION_RESULT' && t8act.result.error === 'UNSAFE_URL');
    console.log('[PASS] TEST 8: Unsafe navigation rejected via Service Worker');

    // TEST 9: Normal webpage screenshot
    mockTabs.get(1)!.url = 'https://example.com';
    listeners.tabs.onUpdated.forEach(fn => fn(1, { status: 'complete' }, mockTabs.get(1)));
    const t9shot = await sendSWMessage({ type: 'SCREENSHOT_REQUEST', tabId: 1 });
    if (t9shot.type !== 'SCREENSHOT_RESPONSE') console.log('t9shot error:', t9shot);
    assert(t9shot.type === 'SCREENSHOT_RESPONSE' && t9shot.dataUrl.startsWith('data:image/png;base64,'));
    console.log('[PASS] TEST 9: Normal webpage screenshot captured correctly');

    // TEST 10: chrome://newtab screenshot rejection
    mockTabs.get(1)!.url = 'chrome://newtab/';
    listeners.tabs.onUpdated.forEach(fn => fn(1, { status: 'complete' }, mockTabs.get(1)));
    const t10shot = await sendSWMessage({ type: 'SCREENSHOT_REQUEST', tabId: 1 });
    assert(t10shot.type === 'ERROR' && t10shot.error === 'UNSUPPORTED_PAGE');
    console.log('[PASS] TEST 10: chrome://newtab correctly blocked from screenshot');

    // TEST 11: Closed tab handling for screenshot
    const t11shot = await sendSWMessage({ type: 'SCREENSHOT_REQUEST', tabId: 999 });
    assert(t11shot.type === 'ERROR' && t11shot.error === 'TAB_NOT_FOUND');
    console.log('[PASS] TEST 11: Closed tab safely returns TAB_NOT_FOUND for screenshot');

    // TEST 12: Ensure Active State is set for multi-tab
    mockTabs.get(1)!.url = 'https://example.com';
    mockTabs.get(1)!.active = false; // set inactive
    listeners.tabs.onUpdated.forEach(fn => fn(1, { status: 'complete' }, mockTabs.get(1)));
    
    let updateCalled = false;
    const originalUpdate = chrome.tabs.update;
    chrome.tabs.update = (id: number, props: any) => {
        if (props.active) updateCalled = true;
        originalUpdate(id, props);
    };

    const t12shot = await sendSWMessage({ type: 'SCREENSHOT_REQUEST', tabId: 1 });
    assert(t12shot.type === 'SCREENSHOT_RESPONSE' && updateCalled === true);
    console.log('[PASS] TEST 12: Inactive tab correctly activated before capture');

    // TEST 13: Empty cache recovery
    (tabManager as any).tabs.clear(); // Simulate service worker restart
    
    mockTabs.get(1)!.url = 'https://example.com';
    mockTabs.get(1)!.active = true;
    
    const t13state = await sendSWMessage({ type: 'TAB_STATE_REQUEST' });
    assert(t13state.type === 'TAB_STATE_RESPONSE' && t13state.tab.url === 'https://example.com');
    console.log('[PASS] TEST 13: Service worker recovers active tab from empty cache');
    
    // TEST 14: chrome://newtab empty cache recovery
    (tabManager as any).tabs.clear();
    mockTabs.get(1)!.url = 'chrome://newtab/';
    
    const t14state = await sendSWMessage({ type: 'TAB_STATE_REQUEST' });
    assert(t14state.type === 'TAB_STATE_RESPONSE' && t14state.tab.url === 'chrome://newtab/');
    console.log('[PASS] TEST 14: Service worker recovers chrome://newtab from empty cache');

    console.log('\nALL TAB TESTS PASSED');
}

runTests().catch(e => {
    console.error('TEST FAILED', e);
    process.exit(1);
});
