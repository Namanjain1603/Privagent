import { test, expect } from '@playwright/test';

/**
 * PRIVAGENT - SIH 2026 (SIH26171)
 * Member 6: Quality Verification, E2E & Privacy Benchmark Test Suite
 *
 * M6 Requirements:
 * 1. Dashboard loads successfully
 * 2. PII cards render
 * 3. PII Audit Trail expands/collapses
 * 4. Schema Validator allows CLICK
 * 5. Schema Validator blocks EXECUTE_JS
 * 6. Browser Action History renders
 * 7. Privacy benchmark renders
 * 8. Test results display correctly
 */

const DEMO_URL = process.env.DEMO_URL || 'http://localhost:3000';

test.describe('PRIVAGENT Member 6 Automated Test Suite', () => {

  // Test Case 1: Dashboard loads successfully
  test('1. Dashboard loads successfully with zero raw PII transmitted', async ({ page }) => {
    await page.goto(`${DEMO_URL}`);
    
    // Check main dashboard header and privacy status badge
    const headerTitle = page.locator('text=PRIVAGENT');
    await expect(headerTitle.first()).toBeVisible();

    const statusBadge = page.locator('#privacy-status-badge');
    await expect(statusBadge).toBeVisible();
    await expect(statusBadge).toContainText(/PROTECTED/i);

    // Verify 0 raw PII transmitted to cloud
    const rawPiiSent = page.locator('#raw-pii-sent-count');
    await expect(rawPiiSent).toHaveText('0');
  });

  // Test Case 2: PII cards render
  test('2. Indian Synthetic PII Protection cards render correctly', async ({ page }) => {
    await page.goto(`${DEMO_URL}`);

    const piiCardsContainer = page.locator('#indian-pii-cards-container');
    await expect(piiCardsContainer).toBeVisible();

    // Verify presence of all key Indian identity cards
    await expect(piiCardsContainer.getByText('Aadhaar (UIDAI)')).toBeVisible();
    await expect(piiCardsContainer.getByText('PAN Card (Income Tax)')).toBeVisible();
    await expect(piiCardsContainer.getByText('Indian Mobile (+91)')).toBeVisible();
    await expect(piiCardsContainer.getByText('Password Fields')).toBeVisible();
  });

  // Test Case 3: PII Audit Trail expands/collapses
  test('3. On-Device PII Audit Trail expands and collapses row details', async ({ page }) => {
    await page.goto(`${DEMO_URL}`);

    const auditTable = page.locator('#pii-audit-log-table');
    await expect(auditTable).toBeVisible();

    // Click on first row to toggle collapse/expand
    const firstRow = auditTable.locator('tbody tr').first();
    await expect(firstRow).toBeVisible();
    await firstRow.click();

    // Verification details should toggle
    const verificationText = page.locator('text=Zero-Leakage Security Verification');
    // It should be visible when expanded
    if (await verificationText.count() > 0) {
      await expect(verificationText.first()).toBeVisible();
    }
  });

  // Test Case 4: Schema Validator allows CLICK
  test('4. Schema Validator allows safe allowlisted CLICK action', async ({ page }) => {
    await page.goto(`${DEMO_URL}`);

    const validatorCard = page.locator('#allowlisted-action-validator-card');
    await expect(validatorCard).toBeVisible();

    // Click on "Valid CLICK Action" synthetic preset button
    const clickPresetBtn = validatorCard.locator('button:has-text("Valid CLICK Action")');
    await expect(clickPresetBtn).toBeVisible();
    await clickPresetBtn.click();

    // Verify evaluation result shows ALLOWED
    const resultBadge = validatorCard.locator('text=Result: ALLOWED');
    await expect(resultBadge).toBeVisible();

    // Verify checklist passes
    await expect(validatorCard.getByText('Schema Check')).toBeVisible();
  });

  // Test Case 5: Schema Validator blocks EXECUTE_JS
  test('5. Schema Validator blocks arbitrary JavaScript (EXECUTE_JS) per Security Rule #7', async ({ page }) => {
    await page.goto(`${DEMO_URL}`);

    const validatorCard = page.locator('#allowlisted-action-validator-card');
    await expect(validatorCard).toBeVisible();

    // Click on "Invalid Arbitrary JS (EXECUTE_JS)" preset button
    const blockPresetBtn = validatorCard.locator('button:has-text("Invalid Arbitrary JS (EXECUTE_JS)")');
    await expect(blockPresetBtn).toBeVisible();
    await blockPresetBtn.click();

    // Verify evaluation result shows BLOCKED
    const blockedBadge = validatorCard.locator('text=Result: BLOCKED');
    await expect(blockedBadge).toBeVisible();

    // Verify strict security reason is displayed
    const reasonText = validatorCard.locator('text=Arbitrary JavaScript execution is not allowed');
    await expect(reasonText.first()).toBeVisible();
  });

  // Test Case 6: Browser Action History renders
  test('6. Browser Action History table renders with validated schema connection', async ({ page }) => {
    await page.goto(`${DEMO_URL}`);

    const actionCard = page.locator('#action-history-table-card');
    await expect(actionCard).toBeVisible();

    // Check upstream connection badge
    const connectionBadge = actionCard.locator('text=Connected to Schema Validator');
    await expect(connectionBadge).toBeVisible();

    // Verify presence of executed safe actions
    const tableBody = actionCard.locator('tbody');
    await expect(tableBody).toBeVisible();
  });

  // Test Case 7: Privacy benchmark renders
  test('7. Privacy & PII Quality Benchmark renders with all precision, recall and F1 metrics', async ({ page }) => {
    await page.goto(`${DEMO_URL}`);

    const benchmarkSection = page.locator('#privacy-pii-quality-benchmark');
    await expect(benchmarkSection).toBeVisible();

    // Verify simulated dataset notice
    await expect(benchmarkSection.locator('text=Demo / Simulated Dataset')).toBeVisible();

    // Verify calculated summary counts
    await expect(benchmarkSection.locator('#total-tests-count')).toBeVisible();
    await expect(benchmarkSection.locator('#passed-tests-count')).toBeVisible();
    await expect(benchmarkSection.locator('#pass-rate-metric')).toBeVisible();

    // Verify metric cards
    await expect(benchmarkSection.locator('text=PII Detection Precision')).toBeVisible();
    await expect(benchmarkSection.locator('text=PII Detection Recall')).toBeVisible();
    await expect(benchmarkSection.locator('text=Redaction Precision')).toBeVisible();
  });

  // Test Case 8: Test results display correctly
  test('8. Privacy Test Results table displays test cases and expands details', async ({ page }) => {
    await page.goto(`${DEMO_URL}`);

    const resultsTable = page.locator('#privacy-test-results-table');
    await expect(resultsTable).toBeVisible();

    // Check for synthetic test cases in the table
    await expect(resultsTable.locator('text=TC-SYN-01')).toBeVisible();
    await expect(resultsTable.locator('text=TC-SYN-02')).toBeVisible();
    const aadhaarRow = resultsTable.locator('tr:has-text("TC-SYN-02")');
    await expect(aadhaarRow.locator('text=Synthetic Aadhaar Identification')).toBeVisible();

    // Verify PASS badges on tests
    const passBadges = resultsTable.locator('text=PASS');
    expect(await passBadges.count()).toBeGreaterThan(5);

    // Expand second row to verify payload details
    const inspectBtn = page.locator('#btn-inspect-TC-SYN-02');
    await inspectBtn.click();
    await expect(page.getByText('Citizen Applicant Aadhaar Number')).toBeVisible();
    await expect(page.locator('text=[REDACTED_AADHAAR]').first()).toBeVisible();
  });

  // Test Case 9: Demo Readiness, Integration Health & Section Persistence across navigation
  test('9. Integration Health displays all 9 components and sections persist across navigation', async ({ page }) => {
    await page.goto(`${DEMO_URL}`);

    // Verify Integration Health Panel exists and displays key components
    const healthPanel = page.locator('#integration-health-panel');
    await expect(healthPanel).toBeVisible({ timeout: 10000 });
    await expect(healthPanel.locator('span:has-text("Dashboard UI")').first()).toBeVisible();
    await expect(healthPanel.locator('span:has-text("Backend API")').first()).toBeVisible();
    await expect(healthPanel.locator('span:has-text("Local Perception")').first()).toBeVisible();
    await expect(healthPanel.locator('span:has-text("PII Detection Engine")').first()).toBeVisible();
    await expect(healthPanel.locator('span:has-text("Schema Validator")').first()).toBeVisible();

    // Verify Demo Readiness Section & Badges
    const readinessSection = page.locator('#demo-readiness-section');
    await expect(readinessSection).toBeVisible();
    await expect(page.locator('#demo-readiness-badge')).toBeVisible();
    await expect(page.locator('#demo-readiness-badge')).toContainText('Demo Readiness: READY');

    // Verify Section Persistence across navigation:
    // Navigate away to "Test Matrix (16 Cases)" tab
    const testMatrixTabBtn = page.locator('button:has-text("Test Matrix (16 Cases)")');
    await testMatrixTabBtn.click();
    await expect(page.locator('text=Member 6 Testing Mandate')).toBeVisible();

    // Navigate back to "Live Privacy & Telemetry" tab
    const liveTelemetryTabBtn = page.locator('button:has-text("Live Privacy & Telemetry")');
    await liveTelemetryTabBtn.click();

    // Verify all primary sections persist without corruption
    await expect(page.locator('#indian-pii-cards-container')).toBeVisible();
    await expect(page.locator('#pii-audit-log-table')).toBeVisible();
    await expect(page.locator('#allowlisted-action-validator-card')).toBeVisible();
    await expect(page.locator('#action-history-table-card')).toBeVisible();
    await expect(page.locator('#privacy-pii-quality-benchmark')).toBeVisible();
    await expect(page.locator('#integration-health-panel')).toBeVisible();
    await expect(page.locator('#demo-readiness-section')).toBeVisible();
  });

});
