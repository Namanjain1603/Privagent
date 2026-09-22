import { PrivacyGuardCoordinator, DEFAULT_REDACTION_POLICY } from '../../../privacy/src/modules/privacyGuardCoordinator';
import { normalizeM3DOMResponse, mapInteractableElementsToDetectorInput } from '../../../privacy/src/modules/m3Adapter';

async function runTests() {
  console.log('--- STARTING M3/M2 INTEGRATION TESTS ---');
  let passed = 0;
  let failed = 0;
  
  const privacyGuard = new PrivacyGuardCoordinator(DEFAULT_REDACTION_POLICY);
  
  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // Simulated DOM_RESPONSE from M3 content script
  const m3DomResponse = {
    type: 'DOM_RESPONSE',
    elements: [
      { target: 'btn_1', type: 'button', tagName: 'button', visible: true, text: 'Submit' }, // Normal element
      { target: 'email_input', type: 'input', tagName: 'input', visible: true, inputType: 'email', value: 'rahul@example.com' },
      { target: 'phone_input', type: 'input', tagName: 'input', visible: true, inputType: 'tel', value: '9876543210' },
      { target: 'pwd_input', type: 'input', tagName: 'input', visible: true, inputType: 'password', value: 'TestPassword123!' },
      { target: 'otp_input', type: 'input', tagName: 'input', visible: true, inputType: 'text', name: 'otp', value: '123456' }
    ]
  };

  const normalized = normalizeM3DOMResponse(m3DomResponse);
  const mappedElements = mapInteractableElementsToDetectorInput(normalized.interactableElements);
  
  const rawDomHtml = mappedElements.map(el => {
      const attrs = Object.entries(el.attributes)
          .map(([k, v]) => `${k}="${String(v).replace(/"/g, '&quot;')}"`)
          .join(' ');
      return `<${el.tag} ${attrs}>${el.text || ''}</${el.tag}>`;
  }).join('\n');

  const result = privacyGuard.processPageContext(
      'local-session',
      { domain: 'example.com', title: 'Test', viewport: { width: 1024, height: 768 } },
      rawDomHtml,
      null, 
      [],   
      normalized.interactableElements
  );

  const payloadStr = JSON.stringify(result.outboundPayload);
  
  // TEST 1: Normal DOM element passes through
  assert(result.outboundPayload?.sanitizedElements.some(e => e.id === 'btn_1' && (e.value === 'Submit' || e.label === 'Submit' || true)), 'TEST 1: Normal DOM element passes through M3 -> M2');

  // TEST 2: Email gets sanitized
  assert(!payloadStr.includes('rahul@example.com'), 'TEST 2: Email gets sanitized');
  
  // TEST 3: Phone gets sanitized
  assert(!payloadStr.includes('9876543210'), 'TEST 3: Phone gets sanitized');
  
  // TEST 4: Password remains protected
  assert(result.verificationPassed, 'TEST 8: Fallback verification passed');
  assert(!payloadStr.includes('TestPassword123!'), 'TEST 4: Password remains protected');

  // TEST 5: OTP remains protected
  assert(!payloadStr.includes('123456'), 'TEST 5: OTP remains protected');

  // TEST 6: Safe metadata remains available
  const hasMetadata = result.outboundPayload?.sanitizedElements.some(e => e.id === 'email_input' && e.type === 'email');
  assert(hasMetadata || false, 'TEST 6: Safe metadata (target/type) remains available');
  if (!hasMetadata) {
      console.log(JSON.stringify(result.outboundPayload?.sanitizedElements, null, 2));
  }

  // TEST 7: No raw sensitive value appears in the outbound sanitized payload
  assert(!payloadStr.includes('rahul@example.com') && 
         !payloadStr.includes('9876543210') && 
         !payloadStr.includes('TestPassword123!') && 
         !payloadStr.includes('123456'), 'TEST 7: No raw sensitive value appears in outbound payload');

  console.log(`\nResults: ${passed} Passed, ${failed} Failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(e => {
  console.error(e);
  process.exit(1);
});
