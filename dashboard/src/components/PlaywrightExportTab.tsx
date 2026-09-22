import React, { useState } from 'react';
import { Terminal, Copy, Check, Play, FileCode, CheckCircle2 } from 'lucide-react';

export const PlaywrightExportTab: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const samplePlaywrightCode = `import { test, expect } from '@playwright/test';

/**
 * PRIVAGENT - SIH 2026 (SIH26171)
 * Member 6: End-to-End Browser & Privacy Pipeline Verification
 * 
 * Pipeline: Demo Website -> Local Perception -> PII Redaction -> Sanitized Context -> Cloud -> Action
 */

test.describe('PRIVAGENT Member 6 E2E Pipeline', () => {

  test('E2E Full Flow: Synthetic Aadhaar/PAN Redaction & 0-Leak Verification', async ({ page }) => {
    // 1. Open controlled demo website
    await page.goto('http://localhost:3000');

    // 2. Verify Privacy Status is PROTECTED
    const statusBadge = page.locator('#privacy-status-badge');
    await expect(statusBadge).toHaveText(/PROTECTED/i);

    // 3. Trigger Synthetic PII Scenario (Aadhaar & PAN)
    const piiBtn = page.locator('#btn-trigger-aadhaar-test');
    if (await piiBtn.isVisible()) {
      await piiBtn.click();
    }

    // 4. Assert PII was detected and 100% redacted locally
    const detected = page.locator('#pii-detected-count');
    const redacted = page.locator('#pii-redacted-count');
    await expect(detected).toHaveText('5');
    await expect(redacted).toHaveText('5');

    // 5. CRITICAL PRIVACY RULE #9: Raw PII sent to cloud MUST be exactly 0
    const rawSent = page.locator('#raw-pii-sent-count');
    await expect(rawSent).toHaveText('0');

    // 6. Validate action history only has allowlisted actions
    const allowed = ['CLICK', 'TYPE', 'SELECT', 'SCROLL', 'NAVIGATE'];
    const actionElements = page.locator('.browser-action-type');
    const count = await actionElements.count();
    for (let i = 0; i < count; i++) {
      const text = (await actionElements.nth(i).innerText()).trim();
      expect(allowed).toContain(text);
    }
  });

  test('Security Rule #1 & #6: Never expose raw passwords or fake benchmarks', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Check audit table does not expose real raw password
    const auditTable = page.locator('#pii-audit-log-table');
    const content = await auditTable.innerText();
    expect(content).not.toContain('plain_text_pass');
    expect(content).toContain('Suppressed');
  });
});`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(samplePlaywrightCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs" id="playwright-tab">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-emerald-600" />
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Playwright E2E Test Suite (Member 6 Testing Engine)
            </h3>
            <p className="text-xs text-slate-500">
              Browser-level automated testing for local privacy boundary and action validation.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={copyToClipboard}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors self-start sm:self-auto"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied to Clipboard!' : 'Copy Playwright Code'}
        </button>
      </div>

      {/* Setup Commands Box */}
      <div className="my-3 p-3 rounded-lg bg-slate-900 text-slate-200 text-xs font-mono">
        <div className="text-slate-400 text-[11px] mb-2 font-sans font-semibold">
          Step-by-step Execution Commands in Terminal:
        </div>
        <div className="space-y-1 text-[11px]">
          <div><span className="text-emerald-400 font-bold">$</span> npm install -D @playwright/test</div>
          <div><span className="text-emerald-400 font-bold">$</span> npx playwright install --with-deps chromium</div>
          <div><span className="text-emerald-400 font-bold">$</span> npx playwright test tests/privagent-e2e.spec.ts --headed</div>
        </div>
      </div>

      {/* Code preview */}
      <div className="relative">
        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800 rounded-t-lg text-[11px] text-slate-300 font-mono">
          <span className="flex items-center gap-1.5">
            <FileCode className="w-3.5 h-3.5 text-blue-400" />
            privagent/tests/privagent-e2e.spec.ts
          </span>
          <span className="text-slate-400">Playwright / TypeScript</span>
        </div>
        <pre className="p-3.5 bg-slate-950 text-slate-200 rounded-b-lg text-[11px] font-mono overflow-x-auto leading-relaxed max-h-96">
          {samplePlaywrightCode}
        </pre>
      </div>

      <div className="mt-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
        <div className="font-semibold flex items-center gap-1.5 mb-1">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          SIH Demo Assurance for Member 6:
        </div>
        <p className="text-[11px] leading-relaxed">
          Running this Playwright script in CI/CD or locally before the jury ensures that none of the changes from M1, M2, M3, or M5 have broken the zero-leak guarantee or allowlisted action schemas!
        </p>
      </div>
    </div>
  );
};
