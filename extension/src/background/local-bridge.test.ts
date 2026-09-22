import { LocalBridge, BridgeEnvelope } from './local-bridge';

// Mock WebSocket
class MockWebSocket {
  public static OPEN = 1;
  public readyState = 1; // OPEN
  public url: string;
  public onopen: any = null;
  public onmessage: any = null;
  public onclose: any = null;
  public onerror: any = null;
  
  public sentMessages: string[] = [];
  
  constructor(url: string) {
    this.url = url;
  }
  
  public send(data: string) {
    this.sentMessages.push(data);
  }
}

// Intercept global WebSocket for tests
(global as any).WebSocket = MockWebSocket;

function runTests() {
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  const bridge = new LocalBridge('ws://localhost:test');
  let receivedMessages: any[] = [];
  
  bridge.setMessageHandler((requestId, msg) => {
    receivedMessages.push({ requestId, msg });
  });

  // TEST: Connection opens
  bridge.connect();
  const ws = (bridge as any).ws as MockWebSocket;
  assert(ws !== null && ws.url === 'ws://localhost:test', 'TEST: Bridge initiates WebSocket connection');
  
  if (ws.onopen) ws.onopen();
  assert((bridge as any).isConnecting === false, 'TEST: Bridge transitions to connected state');

  // TEST: Receive valid message envelope
  receivedMessages = [];
  ws.onmessage({ data: JSON.stringify({ requestId: 'req-1', message: { type: 'DOM_REQUEST' } }) });
  assert(receivedMessages.length === 1 && receivedMessages[0].requestId === 'req-1', 'TEST: Bridge parses and forwards valid envelope');

  // TEST: Receive malformed JSON
  receivedMessages = [];
  ws.onmessage({ data: '{ bad json' });
  assert(receivedMessages.length === 0, 'TEST: Bridge safely ignores malformed JSON without crashing');

  // TEST: Receive invalid envelope (missing requestId)
  ws.sentMessages = [];
  ws.onmessage({ data: JSON.stringify({ message: { type: 'DOM_REQUEST' } }) });
  assert(receivedMessages.length === 0, 'TEST: Bridge rejects envelope missing requestId');
  
  // TEST: Receive invalid envelope (missing message but has requestId)
  ws.sentMessages = [];
  ws.onmessage({ data: JSON.stringify({ requestId: 'req-2' }) });
  assert(ws.sentMessages.length === 1 && ws.sentMessages[0].includes('INVALID_BRIDGE_ENVELOPE'), 'TEST: Bridge sends structured error for invalid envelope');

  // TEST: Sending message
  ws.sentMessages = [];
  bridge.send('req-3', { type: 'DOM_RESPONSE', elements: [] });
  assert(ws.sentMessages.length === 1, 'TEST: Bridge sends message via WebSocket');
  const sentEnvelope: BridgeEnvelope = JSON.parse(ws.sentMessages[0]);
  assert(sentEnvelope.requestId === 'req-3' && sentEnvelope.message.type === 'DOM_RESPONSE', 'TEST: Bridge correctly wraps message in envelope');

  // TEST: Internal handler error does not crash bridge
  bridge.setMessageHandler(() => {
    throw new Error('Handler crashed');
  });
  ws.sentMessages = [];
  ws.onmessage({ data: JSON.stringify({ requestId: 'req-4', message: { type: 'ACTION_REQUEST' } }) });
  assert(ws.sentMessages.length === 1 && ws.sentMessages[0].includes('Handler crashed'), 'TEST: Bridge catches handler errors and returns structured error');

  console.log(`\nTests completed: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

runTests();
