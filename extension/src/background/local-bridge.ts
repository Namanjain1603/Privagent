export interface BridgeEnvelope {
  requestId: string;
  message: any; // DOM_REQUEST, ACTION_REQUEST, etc.
}

export type BridgeMessageHandler = (requestId: string, message: any) => void;

export class LocalBridge {
  private url: string;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private isConnecting = false;
  private onMessageCallback: BridgeMessageHandler | null = null;

  constructor(url: string = 'ws://127.0.0.1:3000') {
    this.url = url;
  }

  public setMessageHandler(handler: BridgeMessageHandler) {
    this.onMessageCallback = handler;
  }

  public connect() {
    if (this.ws || this.isConnecting) return;
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[Bridge] Max reconnect attempts reached. Giving up.');
      return;
    }

    this.isConnecting = true;
    console.log(`[Bridge] Connecting to ${this.url}...`);

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('[Bridge] Connected.');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onclose = () => {
        console.log('[Bridge] Disconnected.');
        this.cleanup();
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.error('[Bridge] WebSocket error:', err);
        // onclose will be fired immediately after onerror
      };
    } catch (err) {
      console.error('[Bridge] Failed to construct WebSocket:', err);
      this.cleanup();
      this.scheduleReconnect();
    }
  }

  public send(requestId: string, message: any) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn(`[Bridge] Cannot send message, bridge disconnected. RequestId: ${requestId}`);
      return;
    }

    const envelope: BridgeEnvelope = {
      requestId,
      message
    };

    try {
      this.ws.send(JSON.stringify(envelope));
    } catch (err) {
      console.error('[Bridge] Failed to send message:', err);
    }
  }

  private handleMessage(data: string) {
    let envelope: BridgeEnvelope;
    try {
      envelope = JSON.parse(data);
    } catch (err) {
      console.error('[Bridge] Received malformed JSON:', data);
      return;
    }

    if (!envelope || typeof envelope !== 'object' || !envelope.requestId || !envelope.message) {
      console.error('[Bridge] Invalid envelope format:', envelope);
      // Safe rejection via structured error to the remote side
      if (envelope && envelope.requestId) {
        this.send(envelope.requestId, { type: 'ERROR', error: 'INVALID_BRIDGE_ENVELOPE' });
      }
      return;
    }

    if (this.onMessageCallback) {
      // Pass the inner message to the service worker handler, without crashing on exceptions
      try {
        this.onMessageCallback(envelope.requestId, envelope.message);
      } catch (err: any) {
        console.error('[Bridge] Message handler threw an error:', err);
        this.send(envelope.requestId, { type: 'ERROR', error: err.message || 'INTERNAL_HANDLER_ERROR' });
      }
    }
  }

  private cleanup() {
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      this.ws.onopen = null;
      this.ws = null;
    }
    this.isConnecting = false;
  }

  private scheduleReconnect() {
    this.reconnectAttempts++;
    if (this.reconnectAttempts > this.maxReconnectAttempts) return;

    // Exponential backoff: 2s, 4s, 8s, 16s, 32s
    const delay = Math.pow(2, this.reconnectAttempts) * 1000;
    console.log(`[Bridge] Scheduling reconnect in ${delay}ms (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }
}
