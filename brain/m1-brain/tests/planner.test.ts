import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { planActions } from '../src/core/planner.js';
import { validatePlan } from '../src/core/validator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING PRIVAGENT M1 AI AGENT BRAIN TEST SUITE');
  console.log('======================================================\n');

  const testCasesFile = path.join(__dirname, 'test-cases.json');
  const fileContent = fs.readFileSync(testCasesFile, 'utf-8');
  const { testCases } = JSON.parse(fileContent);

  let passed = 0;
  let failed = 0;

  for (const tc of testCases) {
    process.stdout.write(`Test [${tc.id}] ${tc.name}: `);
    try {
      if (tc.syntheticPlan) {
        // Direct deterministic validator test
        const result = validatePlan(tc.syntheticPlan, tc.elements);
        assert.equal(
          result.status,
          tc.expectedStatus,
          `Expected status ${tc.expectedStatus}, got ${result.status}`
        );
        if (tc.expectedCode) {
          assert.equal(
            result.code,
            tc.expectedCode,
            `Expected code ${tc.expectedCode}, got ${result.code}`
          );
        }
      } else {
        // Full planner test with deterministic test fallback
        const result = await planActions(tc.request, { forceMock: true });
        assert.equal(
          result.status,
          tc.expectedStatus,
          `Expected status ${tc.expectedStatus}, got ${result.status}`
        );

        if (result.status === 'SUCCESS') {
          if (tc.expectedActionType) {
            assert.ok(result.actions.length > 0, 'Expected at least 1 action');
            assert.equal(
              result.actions[0].type,
              tc.expectedActionType,
              `Expected action type ${tc.expectedActionType}, got ${result.actions[0].type}`
            );
          }
          if (tc.expectedTarget) {
            assert.equal(
              (result.actions[0] as any).target,
              tc.expectedTarget,
              `Expected target ${tc.expectedTarget}`
            );
          }
          if (tc.expectedValue) {
            assert.equal(
              (result.actions[0] as any).value,
              tc.expectedValue,
              `Expected value ${tc.expectedValue}`
            );
          }
          if (tc.expectedDirection) {
            assert.equal(
              (result.actions[0] as any).direction,
              tc.expectedDirection,
              `Expected direction ${tc.expectedDirection}`
            );
          }
          if (tc.expectedUrl) {
            assert.equal(
              (result.actions[0] as any).url,
              tc.expectedUrl,
              `Expected URL ${tc.expectedUrl}`
            );
          }
          if (tc.expectedActionCount) {
            assert.equal(
              result.actions.length,
              tc.expectedActionCount,
              `Expected ${tc.expectedActionCount} actions, got ${result.actions.length}`
            );
          }
          if (tc.expectedFirstAction) {
            assert.equal(result.actions[0].type, tc.expectedFirstAction.type);
            assert.equal((result.actions[0] as any).target, tc.expectedFirstAction.target);
            assert.equal((result.actions[0] as any).value, tc.expectedFirstAction.value);
          }
          if (tc.expectedSecondAction) {
            assert.equal(result.actions[1].type, tc.expectedSecondAction.type);
            assert.equal((result.actions[1] as any).target, tc.expectedSecondAction.target);
          }
        } else if (result.status === 'FAILED') {
          if (tc.expectedCode) {
            assert.equal(
              result.code,
              tc.expectedCode,
              `Expected code ${tc.expectedCode}, got ${result.code}`
            );
          }
        }
      }

      console.log('✅ PASS');
      passed++;
    } catch (err: any) {
      console.log(`❌ FAIL: ${err.message}`);
      failed++;
    }
  }

  console.log('\n------------------------------------------------------');
  console.log(`Test Summary: ${passed} Passed, ${failed} Failed out of ${testCases.length}`);
  console.log('------------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
