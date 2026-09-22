// This is meant to be run in the background script / service worker
export class ScreenshotCapture {
  /**
   * Captures the visible tab
   * This MUST be called from the service worker.
   */
  public async captureVisibleTab(windowId?: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const targetWindow = windowId !== undefined ? windowId : chrome.windows.WINDOW_ID_CURRENT;
      chrome.tabs.captureVisibleTab(targetWindow, { format: 'png' }, (dataUrl) => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }
        if (!dataUrl) {
          return reject(new Error('SCREENSHOT_FAILED'));
        }
        resolve(dataUrl);
      });
    });
  }
}
