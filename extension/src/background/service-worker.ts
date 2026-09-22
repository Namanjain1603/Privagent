import { ScreenshotCapture } from '../screenshot/capture';
import { ExtensionMessage } from '../types/messages';
import { TabManager } from './tab-manager';
import { LocalBridge } from './local-bridge';

// M2 Privacy Integrations
import { PrivacyGuardCoordinator, DEFAULT_REDACTION_POLICY } from '../../../privacy/src/modules/privacyGuardCoordinator';
import { normalizeM3DOMResponse, mapInteractableElementsToDetectorInput } from '../../../privacy/src/modules/m3Adapter';

export const capture = new ScreenshotCapture();
export const tabManager = new TabManager();
export const localBridge = new LocalBridge(process.env.WS_URL);

const privacyGuard = new PrivacyGuardCoordinator(DEFAULT_REDACTION_POLICY);

chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  if (message.type === 'TAB_STATE_REQUEST') {
    const fetchState = message.tabId !== undefined 
        ? tabManager.getTabState(message.tabId)
        : tabManager.getActiveTabState();

    fetchState.then(tab => {
        if (tab) {
            sendResponse({ type: 'TAB_STATE_RESPONSE', tab });
        } else {
            sendResponse({ type: 'ERROR', error: 'TAB_NOT_FOUND' });
        }
    }).catch(e => {
        sendResponse({ type: 'ERROR', error: e.message });
    });
    return true;
  }

  if (message.type === 'CREATE_TAB_REQUEST') {
     const url = message.url;
     if (url && !tabManager.isSupportedPage(url)) {
        sendResponse({ type: 'ERROR', error: 'UNSAFE_URL' });
        return false;
     }
     chrome.tabs.create({ url }, (tab) => {
         if (chrome.runtime.lastError || !tab) {
             sendResponse({ type: 'ERROR', error: chrome.runtime.lastError?.message || 'FAILED_TO_CREATE_TAB' });
         } else {
             sendResponse({ type: 'CREATE_TAB_RESPONSE', tabId: tab.id! });
         }
     });
     return true;
  }

  if (message.type === 'DOM_REQUEST' || message.type === 'ACTION_REQUEST' || message.type === 'SCREENSHOT_REQUEST') {
    handleTabRoutedMessage(message, sendResponse);
    return true;
  }

  return false;
});

async function handleTabRoutedMessage(message: any, sendResponse: (res: any) => void) {
    try {
        let tabId = message.tabId;
        if (tabId === undefined) {
            const activeTab = await tabManager.getActiveTabState();
            if (!activeTab) throw new Error('TAB_NOT_FOUND');
            tabId = activeTab.tabId;
        }

        const tabState = await tabManager.getTabState(tabId);
        if (!tabState) {
            sendResponse({ type: 'ERROR', error: 'TAB_NOT_FOUND' });
            return;
        }

        if (message.type === 'ACTION_REQUEST' && message.action.type === 'NAVIGATE') {
            const url = message.action.url;
            if (!tabManager.isSupportedPage(url)) {
                sendResponse({ type: 'ACTION_RESULT', result: { success: false, action: message.action, error: 'UNSAFE_URL' }});
                return;
            }
            chrome.tabs.update(tabId, { url });
            await tabManager.waitForTabLoad(tabId);
            sendResponse({ type: 'ACTION_RESULT', result: { success: true, action: message.action }});
            return;
        }

        if (message.type === 'SCREENSHOT_REQUEST') {
            if (!tabState.supportedPage) {
                sendResponse({ type: 'ERROR', error: 'UNSUPPORTED_PAGE' });
                return;
            }

            chrome.tabs.get(tabId, async (tab) => {
                if (chrome.runtime.lastError || !tab) {
                    sendResponse({ type: 'ERROR', error: 'TAB_NOT_FOUND' });
                    return;
                }
                
                try {
                    if (!tab.active) {
                        await chrome.tabs.update(tabId, { active: true });
                        await new Promise(r => setTimeout(r, 100)); // wait for render
                    }
                    const dataUrl = await capture.captureVisibleTab(tab.windowId);
                    sendResponse({ type: 'SCREENSHOT_RESPONSE', dataUrl });
                } catch (e: any) {
                    sendResponse({ type: 'ERROR', error: 'SCREENSHOT_FAILED' });
                }
            });
            return;
        }

        if (!tabState.supportedPage) {
            sendResponse({ type: 'ERROR', error: 'UNSUPPORTED_PAGE' });
            return;
        }

        await tabManager.waitForTabLoad(tabId);

        chrome.tabs.sendMessage(tabId, message, (response) => {
            if (chrome.runtime.lastError) {
                if (chrome.runtime.lastError.message?.includes('Receiving end does not exist') || chrome.runtime.lastError.message?.includes('Could not establish connection')) {
                    sendResponse({ type: 'ERROR', error: 'UNSUPPORTED_PAGE' });
                } else {
                    sendResponse({ type: 'ERROR', error: chrome.runtime.lastError.message });
                }
            } else {
                sendResponse(response);
            }
        });

    } catch (e: any) {
        if (e.message === 'TAB_NOT_FOUND') {
            sendResponse({ type: 'ERROR', error: 'TAB_NOT_FOUND' });
        } else {
            sendResponse({ type: 'ERROR', error: e.message });
        }
    }
}

console.log('Privagent M3 Service Worker loaded.');

localBridge.setMessageHandler(async (requestId, message) => {
    // Only allow expected bridged messages.
    if (message && (message.type === 'DOM_REQUEST' || message.type === 'ACTION_REQUEST' || message.type === 'SCREENSHOT_REQUEST')) {
        await handleTabRoutedMessage(message, async (res) => {
            if (res && res.type === 'DOM_RESPONSE') {
                try {
                    let tabId = message.tabId;
                    if (tabId === undefined) {
                        const activeTab = await tabManager.getActiveTabState();
                        tabId = activeTab?.tabId;
                    }

                    let dataUrl = '';
                    let viewport = { width: 1024, height: 768, dpr: 1 };
                    let ocrDetections = [];
                    let screenshotBase64 = '';

                    if (tabId !== undefined) {
                        await new Promise(resolve => {
                            chrome.tabs.get(tabId, async (tab) => {
                                if (tab && tab.active && tab.windowId !== undefined) {
                                   try {
                                       dataUrl = await capture.captureVisibleTab(tab.windowId);
                                       screenshotBase64 = dataUrl.split(',')[1] || '';
                                       viewport = { width: tab.width || 1024, height: tab.height || 768, dpr: 1 };
                                   } catch(e) {
                                       console.error('Screenshot failed', e);
                                   }
                                }
                                resolve(null);
                            });
                        });
                    }

                    if (dataUrl) {
                        try {
                            const offscreenUrl = chrome.runtime.getURL('offscreen.html');
                            // Use any to bypass TS complaints on new MV3 APIs
                            const ext = chrome as any;
                            if (ext.offscreen && ext.offscreen.createDocument) {
                                const hasDocument = await ext.offscreen.hasDocument();
                                if (!hasDocument) {
                                    await ext.offscreen.createDocument({
                                        url: 'offscreen.html',
                                        reasons: ['DOM_PARSER'],
                                        justification: 'M4 OCR needs DOM for canvas preprocessing'
                                    });
                                }
                            }
                            
                            const ocrResponse: any = await new Promise((resolve) => {
                                chrome.runtime.sendMessage({
                                    type: 'OCR_REQUEST',
                                    dataUrl,
                                    viewport
                                }, resolve);
                            });

                            if (ocrResponse && ocrResponse.detections) {
                                ocrDetections = ocrResponse.detections;
                            }
                        } catch (e: any) {
                            console.error('OCR orchestration failed:', e);
                        }
                    }

                    const normalized = normalizeM3DOMResponse(res);
                    const mappedElements = mapInteractableElementsToDetectorInput(normalized.interactableElements);
                    
                    const rawDomHtml = mappedElements.map(el => {
                        const attrs = Object.entries(el.attributes)
                            .map(([k, v]) => `${k}="${String(v).replace(/"/g, '&quot;')}"`)
                            .join(' ');
                        return `<${el.tag} ${attrs}>${el.text || ''}</${el.tag}>`;
                    }).join('\n');

                    const result = privacyGuard.processPageContext(
                        'local-session',
                        { domain: 'unknown', title: 'unknown', viewport },
                        rawDomHtml,
                        screenshotBase64, 
                        ocrDetections,   
                        normalized.interactableElements
                    );

                    if (result.verificationPassed && result.outboundPayload) {
                        res = {
                            type: 'DOM_RESPONSE',
                            sanitizedElements: result.outboundPayload.sanitizedElements,
                            sanitizedDomSkeleton: result.outboundPayload.sanitizedDomSkeleton,
                            redactedScreenshotBase64: result.outboundPayload.redactedScreenshotBase64
                        };
                    } else {
                        res = { type: 'ERROR', error: 'Privacy Validation failed: ' + result.verificationLeaks.join(', ') };
                    }
                } catch (e: any) {
                    res = { type: 'ERROR', error: 'Privacy Guard Error: ' + e.message };
                }
            }
            localBridge.send(requestId, res);
        });
    } else {
        localBridge.send(requestId, { type: 'ERROR', error: 'UNSUPPORTED_MESSAGE_TYPE' });
    }
});

// Start the WebSocket connection
localBridge.connect();
