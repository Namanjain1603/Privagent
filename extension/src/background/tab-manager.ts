import { TabState } from '../types/messages';

export class TabManager {
  private tabs: Map<number, TabState> = new Map();
  private listeners: Map<number, ((status: string) => void)[]> = new Map();

  constructor() {
    // Initial sync
    chrome.tabs.query({}, (tabs) => {
      if (chrome.runtime.lastError || !tabs) return;
      tabs.forEach(tab => this.updateTab(tab));
    });

    // Listeners
    chrome.tabs.onCreated.addListener((tab) => this.updateTab(tab));
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      this.updateTab(tab);
      if (changeInfo.status) {
        this.notifyListeners(tabId, changeInfo.status);
      }
    });
    chrome.tabs.onRemoved.addListener((tabId) => {
      this.tabs.delete(tabId);
    });
    chrome.tabs.onActivated.addListener((activeInfo) => {
      this.tabs.forEach((state, id) => {
        state.active = id === activeInfo.tabId;
      });
    });
  }

  private updateTab(tab: chrome.tabs.Tab) {
    if (tab.id === undefined) return;
    
    const url = tab.url || tab.pendingUrl || '';
    const isSupported = this.isSupportedPage(url);
    
    this.tabs.set(tab.id, {
      tabId: tab.id,
      url: url,
      title: tab.title || '',
      status: tab.status || 'loading',
      active: tab.active,
      supportedPage: isSupported
    });
  }

  public isSupportedPage(url: string): boolean {
    if (!url) return false;
    return url.startsWith('http://') || url.startsWith('https://');
  }

  public async getTabState(tabId: number): Promise<TabState | undefined> {
    if (this.tabs.has(tabId)) {
        return this.tabs.get(tabId);
    }
    
    return new Promise((resolve) => {
        chrome.tabs.get(tabId, (tab) => {
            if (chrome.runtime.lastError || !tab) {
                resolve(undefined);
            } else {
                this.updateTab(tab);
                resolve(this.tabs.get(tabId));
            }
        });
    });
  }

  public async getActiveTabState(): Promise<TabState | undefined> {
    const tabs = await new Promise<chrome.tabs.Tab[] | undefined>((resolve) => {
      chrome.tabs.query({ active: true, lastFocusedWindow: true }, (result) => {
        if (chrome.runtime.lastError) {
          resolve(undefined);
        } else {
          resolve(result);
        }
      });
    });
    if (tabs && tabs.length > 0 && tabs[0].id) {
        // Sync just in case
        this.updateTab(tabs[0]);
        return this.tabs.get(tabs[0].id);
    }
    return undefined;
  }

  public async waitForTabLoad(tabId: number, timeoutMs = 15000): Promise<void> {
    const state = await this.getTabState(tabId);
    if (!state) throw new Error('TAB_NOT_FOUND');
    if (state.status === 'complete') return;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.removeListener(tabId, listener);
        reject(new Error('TIMEOUT'));
      }, timeoutMs);

      const listener = (status: string) => {
        if (status === 'complete') {
          clearTimeout(timeout);
          this.removeListener(tabId, listener);
          resolve();
        }
      };

      this.addListener(tabId, listener);
    });
  }

  private addListener(tabId: number, callback: (status: string) => void) {
    const list = this.listeners.get(tabId) || [];
    list.push(callback);
    this.listeners.set(tabId, list);
  }

  private removeListener(tabId: number, callback: (status: string) => void) {
    const list = this.listeners.get(tabId) || [];
    this.listeners.set(tabId, list.filter(cb => cb !== callback));
  }

  private notifyListeners(tabId: number, status: string) {
    const list = this.listeners.get(tabId);
    if (list) {
      list.forEach(cb => cb(status));
    }
  }
}
