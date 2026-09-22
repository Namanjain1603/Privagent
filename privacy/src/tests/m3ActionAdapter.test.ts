import { adaptSanitizedActionToM3 } from '../modules/m3ActionAdapter';
import { M2ActionValidationResult } from '../types/privacy';

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

  const baseResult: M2ActionValidationResult = {
    isAllowed: true,
    actionId: 'test_action',
    securityFlagsTriggered: []
  };

  // TEST 1: CLICK selector -> target
  const clickResult = adaptSanitizedActionToM3({
    ...baseResult,
    sanitizedAction: { type: 'CLICK', selector: 'submit_btn' }
  });
  assert(clickResult.success && clickResult.request?.action.type === 'CLICK' && (clickResult.request.action as any).target === 'submit_btn', 'TEST 1: CLICK mapping');

  // TEST 2: TYPE selector -> target, resolvedExecutionValue -> value
  const typeResult = adaptSanitizedActionToM3({
    ...baseResult,
    sanitizedAction: { type: 'TYPE', selector: 'email_input', resolvedExecutionValue: 'user@example.com' }
  });
  assert(typeResult.success && typeResult.request?.action.type === 'TYPE' && (typeResult.request.action as any).target === 'email_input' && (typeResult.request.action as any).value === 'user@example.com', 'TEST 2: TYPE mapping');

  // TEST 3: SELECT selector -> target, resolvedExecutionValue -> value
  const selectResult = adaptSanitizedActionToM3({
    ...baseResult,
    sanitizedAction: { type: 'SELECT', selector: 'state_select', resolvedExecutionValue: 'Rajasthan' }
  });
  assert(selectResult.success && selectResult.request?.action.type === 'SELECT' && (selectResult.request.action as any).target === 'state_select' && (selectResult.request.action as any).value === 'Rajasthan', 'TEST 3: SELECT mapping');

  // TEST 4: SCROLL positive delta -> direction down, positive amount
  const scrollDownResult = adaptSanitizedActionToM3({
    ...baseResult,
    sanitizedAction: { type: 'SCROLL', selector: '', scrollDelta: { dx: 0, dy: 500 } }
  });
  assert(scrollDownResult.success && scrollDownResult.request?.action.type === 'SCROLL' && (scrollDownResult.request.action as any).direction === 'down' && (scrollDownResult.request.action as any).amount === 500, 'TEST 4: SCROLL positive delta');

  // TEST 5: SCROLL negative delta -> direction up, positive amount
  const scrollUpResult = adaptSanitizedActionToM3({
    ...baseResult,
    sanitizedAction: { type: 'SCROLL', selector: '', scrollDelta: { dx: 0, dy: -300 } }
  });
  assert(scrollUpResult.success && scrollUpResult.request?.action.type === 'SCROLL' && (scrollUpResult.request.action as any).direction === 'up' && (scrollUpResult.request.action as any).amount === 300, 'TEST 5: SCROLL negative delta');

  // TEST 6: NAVIGATE targetUrl -> url
  const navigateResult = adaptSanitizedActionToM3({
    ...baseResult,
    sanitizedAction: { type: 'NAVIGATE', selector: '', targetUrl: 'https://example.com' }
  });
  assert(navigateResult.success && navigateResult.request?.action.type === 'NAVIGATE' && (navigateResult.request.action as any).url === 'https://example.com', 'TEST 6: NAVIGATE mapping');

  // TEST 7: WAIT rejected
  const waitResult = adaptSanitizedActionToM3({
    ...baseResult,
    sanitizedAction: { type: 'WAIT', selector: '' }
  });
  assert(!waitResult.success && (waitResult.error?.includes('not supported') ?? false), 'TEST 7: WAIT rejected safely');

  // TEST 8: Unsupported action rejected
  const unsupportedResult = adaptSanitizedActionToM3({
    ...baseResult,
    sanitizedAction: { type: 'INVALID_ACTION' as any, selector: '' }
  });
  assert(!unsupportedResult.success && !!unsupportedResult.error, 'TEST 8: Unsupported action rejected safely');

  // TEST 9: Missing target/selector rejected safely
  const missingTargetResult = adaptSanitizedActionToM3({
    ...baseResult,
    sanitizedAction: { type: 'CLICK', selector: '' }
  });
  assert(!missingTargetResult.success && (missingTargetResult.error?.includes('selector') ?? false), 'TEST 9: Missing selector rejected safely');

  // TEST 10: Invalid navigation URL rejected safely
  const invalidUrlResult = adaptSanitizedActionToM3({
    ...baseResult,
    sanitizedAction: { type: 'NAVIGATE', selector: '', targetUrl: 'javascript:alert(1)' }
  });
  assert(!invalidUrlResult.success && (invalidUrlResult.error?.includes('rejected') ?? false), 'TEST 10: Invalid navigation URL rejected safely');

  // TEST 11: Password/OTP values are not leaked in errors
  // Adapter works on validated result; error messages do not echo the raw values
  const missingValueResult = adaptSanitizedActionToM3({
    ...baseResult,
    sanitizedAction: { type: 'TYPE', selector: 'password_field' } // missing resolvedExecutionValue
  });
  assert(!missingValueResult.success && !(missingValueResult.error?.includes('password_field') ?? false), 'TEST 11: Missing value error does not leak selectors');

  // TEST 12: Malformed action object no crash
  const malformedResult = adaptSanitizedActionToM3({
    ...baseResult,
    sanitizedAction: null as any
  });
  assert(!malformedResult.success, 'TEST 12: Malformed action object handled safely');

  console.log(`\nTests completed: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

runTests();
