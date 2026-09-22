import { normalizeM3DOMResponse, mapInteractableElementsToDetectorInput } from '../modules/m3Adapter';
import { PIIDetector } from '../modules/piiDetector';
import { DEFAULT_REDACTION_POLICY } from '../modules/privacyGuardCoordinator';

const detector = new PIIDetector(DEFAULT_REDACTION_POLICY);

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

  // TEST 1: M3 email element -> normalized selector/target mapping
  const m3EmailResponse = {
    type: 'DOM_RESPONSE',
    elements: [
      {
        target: 'input#email_field',
        type: 'email',
        tagName: 'INPUT',
        value: 'test@example.com'
      }
    ]
  };
  const normalizedEmail = normalizeM3DOMResponse(m3EmailResponse);
  assert(normalizedEmail.interactableElements.length === 1, 'TEST 1: Parses elements array');
  assert(normalizedEmail.interactableElements[0].selector === 'input#email_field', 'TEST 1: Maps target to selector');

  // TEST 2: M3 element with bounds -> bbox mapping works
  const m3BoundsResponse = {
    type: 'DOM_RESPONSE',
    elements: [
      {
        target: 'btn',
        bounds: { x: 10, y: 20, width: 100, height: 30 }
      }
    ]
  };
  const normalizedBounds = normalizeM3DOMResponse(m3BoundsResponse);
  assert(normalizedBounds.interactableElements[0].bbox?.x === 10, 'TEST 2: Maps bounds.x to bbox.x');
  assert(normalizedBounds.interactableElements[0].bbox?.height === 30, 'TEST 2: Maps bounds.height to bbox.height');

  // TEST 3: M3 password element -> privacy pipeline does not expose password
  const m3PasswordResponse = {
    type: 'DOM_RESPONSE',
    elements: [
      {
        target: 'input#pwd',
        inputType: 'password',
        tagName: 'INPUT',
        value: 'SuperSecretPass123!'
      }
    ]
  };
  const normalizedPassword = normalizeM3DOMResponse(m3PasswordResponse);
  const mappedPassword = mapInteractableElementsToDetectorInput(normalizedPassword.interactableElements);
  const pwdDetections = detector.detectInDOMElement(mappedPassword[0]);
  assert(pwdDetections.length > 0, 'TEST 3: Password field detected');
  assert(pwdDetections[0].category === 'PASSWORD_SECRET', 'TEST 3: Detected as PASSWORD_SECRET');
  assert(pwdDetections[0].token === '<PII:PASSWORD_SECRET_1>', 'TEST 3: Uses strict tokenization');

  // TEST 4: M3 OTP element -> privacy pipeline does not expose OTP
  const m3OTPResponse = {
    type: 'DOM_RESPONSE',
    elements: [
      {
        target: 'input#otp',
        tagName: 'INPUT',
        name: 'one-time-code',
        value: '458921'
      }
    ]
  };
  const normalizedOTP = normalizeM3DOMResponse(m3OTPResponse);
  const mappedOTP = mapInteractableElementsToDetectorInput(normalizedOTP.interactableElements);
  const otpDetections = detector.detectInDOMElement(mappedOTP[0]);
  assert(otpDetections.length > 0 && otpDetections[0].category === 'OTP', 'TEST 4: OTP correctly detected and protected');

  // TEST 5: M3 Aadhaar/Phone/Name detection continues working
  const m3PiiResponse = {
    type: 'DOM_RESPONSE',
    elements: [
      {
        target: 'div.phone',
        text: '+91 9876543210'
      },
      {
        target: 'div.aadhaar',
        text: '1234-5678-9012'
      }
    ]
  };
  const normalizedPii = normalizeM3DOMResponse(m3PiiResponse);
  const mappedPii = mapInteractableElementsToDetectorInput(normalizedPii.interactableElements);
  const phoneDetections = detector.detectInDOMElement(mappedPii[0]);
  const aadhaarDetections = detector.detectInDOMElement(mappedPii[1]);
  assert(phoneDetections.some(d => d.category === 'PHONE_NUMBER'), 'TEST 5: Phone number detected');
  assert(aadhaarDetections.some(d => d.category === 'AADHAAR_NUMBER'), 'TEST 5: Aadhaar detected');

  // TEST 6: Missing bounds -> no crash
  const noBoundsResponse = {
    type: 'DOM_RESPONSE',
    elements: [{ target: 'x' }]
  };
  const normNoBounds = normalizeM3DOMResponse(noBoundsResponse);
  assert(normNoBounds.interactableElements[0].bbox === undefined, 'TEST 6: Missing bounds handled safely');

  // TEST 7: Empty elements -> no crash
  const emptyResponse = {
    type: 'DOM_RESPONSE',
    elements: []
  };
  const normEmpty = normalizeM3DOMResponse(emptyResponse);
  assert(normEmpty.interactableElements.length === 0, 'TEST 7: Empty elements handled safely');

  // TEST 8: Malformed/partial element -> safe handling
  const malformedResponse = {
    type: 'DOM_RESPONSE',
    elements: [{ visible: false }]
  };
  const normMalformed = normalizeM3DOMResponse(malformedResponse);
  assert(normMalformed.interactableElements[0].selector === '', 'TEST 8: Malformed element handled safely (empty selector)');

  // TEST 9: Unknown fields -> ignored safely
  const unknownResponse = {
    type: 'DOM_RESPONSE',
    elements: [{ target: 'x', randomGhostField: true }]
  };
  const normUnknown = normalizeM3DOMResponse(unknownResponse);
  // Type checker enforces it doesn't leak into the normalized output
  assert((normUnknown.interactableElements[0] as any).randomGhostField === undefined, 'TEST 9: Unknown fields safely ignored');

  // TEST 10: No fabricated rawDomTree
  assert(normUnknown.rawDomTree === undefined, 'TEST 10: rawDomTree is undefined (not fabricated)');

  console.log(`\nTests completed: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

runTests();
