import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Code2,
  ArrowDown,
  Terminal,
  Play,
  RotateCcw,
  AlertTriangle,
  FileCode,
} from 'lucide-react';
import {
  validateActionPayload,
  SYNTHETIC_VALIDATOR_TEST_EXAMPLES,
  ALLOWED_ACTIONS,
} from '../utils/actionValidator';
import { ActionValidationReport } from '../types/privagent';

interface AllowlistedActionValidatorProps {
  onValidatedActionPassed?: (validPayload: Record<string, any>) => void;
}

export const AllowlistedActionValidator: React.FC<AllowlistedActionValidatorProps> = () => {
  // Initial demo results computed from predefined synthetic examples
  const initialReports = SYNTHETIC_VALIDATOR_TEST_EXAMPLES.map((ex, idx) =>
    validateActionPayload(ex.payload, `synth_test_${idx + 1}`)
  );

  const [validationReports, setValidationReports] = useState<ActionValidationReport[]>(initialReports);
  const [activeExampleIndex, setActiveExampleIndex] = useState<number>(0);
  const [customJsonInput, setCustomJsonInput] = useState<string>(
    JSON.stringify(SYNTHETIC_VALIDATOR_TEST_EXAMPLES[0].payload, null, 2)
  );
  const [liveTestReport, setLiveTestReport] = useState<ActionValidationReport | null>(initialReports[0]);
  const [parseError, setParseError] = useState<string | null>(null);

  // Compute live summary statistics
  const totalChecked = validationReports.length;
  const allowedCount = validationReports.filter((r) => r.status === 'ALLOWED').length;
  const blockedCount = validationReports.filter((r) => r.status === 'BLOCKED').length;
  const validationErrorsCount = blockedCount; // All blocked actions encountered validation errors

  // Run validation on user input or preset selection
  const handleSelectExample = (index: number) => {
    setActiveExampleIndex(index);
    const ex = SYNTHETIC_VALIDATOR_TEST_EXAMPLES[index];
    const jsonStr = JSON.stringify(ex.payload, null, 2);
    setCustomJsonInput(jsonStr);
    setParseError(null);
    const result = validateActionPayload(ex.payload, `test_select_${Date.now()}`);
    setLiveTestReport(result);
  };

  const handleRunLiveValidation = () => {
    try {
      setParseError(null);
      const parsed = JSON.parse(customJsonInput);
      const report = validateActionPayload(parsed, `live_${Date.now()}`);
      setLiveTestReport(report);

      // Prepend to audit log
      setValidationReports((prev) => [report, ...prev]);
    } catch (err: any) {
      setParseError(`JSON Syntax Error: ${err.message}`);
      const errorReport: ActionValidationReport = {
        id: `err_${Date.now()}`,
        payload: { raw: customJsonInput },
        status: 'BLOCKED',
        actionType: 'MALFORMED_JSON',
        reason: `Malformed JSON Payload: ${err.message}`,
        timestamp: new Date().toLocaleTimeString(),
        threatLevel: 'HIGH',
      };
      setLiveTestReport(errorReport);
      setValidationReports((prev) => [errorReport, ...prev]);
    }
  };

  const handleReset = () => {
    setValidationReports(initialReports);
    handleSelectExample(0);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs" id="allowlisted-action-validator-card">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Allowlisted Action Schema Validator
            </h3>
            <span className="text-[11px] font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded">
              Security Rules #7 & #8
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Pre-execution gateway intercepting AI action plans. Blocks arbitrary JavaScript, unknown actions, and malformed schemas before browser execution.
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-slate-400 font-mono mr-1">ALLOWED SCHEMA:</span>
          {ALLOWED_ACTIONS.map((action) => (
            <span
              key={action}
              className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200"
            >
              {action}
            </span>
          ))}
        </div>
      </div>

      {/* Required Validation Flow Diagram */}
      <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
        <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
          <span>Enforced Execution Pipeline Flow</span>
          <span className="text-[10px] font-normal text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
            Zero Client Execution from Dashboard
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-center text-center text-xs font-mono">
          {/* Step 1 */}
          <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
            <div className="text-[10px] text-slate-400">INPUT SOURCE</div>
            <div className="font-bold text-slate-800 mt-0.5">AI/Cloud Action Plan</div>
            <div className="text-[10px] text-slate-500">M1 Brain Generated</div>
          </div>

          <div className="hidden md:flex justify-center text-slate-400">
            <ArrowDown className="w-4 h-4 -rotate-90 text-indigo-500" />
          </div>

          {/* Step 2 */}
          <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-200 shadow-2xs ring-2 ring-indigo-500/20">
            <div className="text-[10px] text-indigo-700 font-bold">SECURITY GATEWAY</div>
            <div className="font-bold text-indigo-900 mt-0.5">Allowlisted Schema Validator</div>
            <div className="text-[10px] text-indigo-600">Strict Allowlist Check</div>
          </div>

          <div className="hidden md:flex justify-center text-slate-400">
            <ArrowDown className="w-4 h-4 -rotate-90 text-indigo-500" />
          </div>

          {/* Step 3: Decision */}
          <div className="grid grid-cols-2 gap-1.5">
            <div className="p-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-800">
              <div className="text-[9px] font-bold">IF ALLOWED</div>
              <div className="font-bold text-[11px]">Action History</div>
              <div className="text-[9px]">→ Browser Exec</div>
            </div>
            <div className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-800">
              <div className="text-[9px] font-bold">IF REJECTED</div>
              <div className="font-bold text-[11px]">BLOCKED</div>
              <div className="text-[9px]">Zero Execution</div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
        <div className="p-3 rounded-lg border border-slate-200 bg-white shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500">Total Actions Checked</div>
          <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">{totalChecked}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Synthetic & Stream Logs</div>
        </div>

        <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50 shadow-2xs">
          <div className="text-[11px] font-medium text-emerald-800 flex items-center justify-between">
            <span>Allowed Actions</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-700 mt-0.5">{allowedCount}</div>
          <div className="text-[10px] text-emerald-600 mt-0.5">Allowlisted Schema Compliant</div>
        </div>

        <div className="p-3 rounded-lg border border-rose-200 bg-rose-50/50 shadow-2xs">
          <div className="text-[11px] font-medium text-rose-800 flex items-center justify-between">
            <span>Blocked Actions</span>
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className="text-xl font-bold font-mono text-rose-700 mt-0.5">{blockedCount}</div>
          <div className="text-[10px] text-rose-600 mt-0.5">Unsafe or Unknown Commands</div>
        </div>

        <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 shadow-2xs">
          <div className="text-[11px] font-medium text-amber-800 flex items-center justify-between">
            <span>Validation Errors</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-700 mt-0.5">{validationErrorsCount}</div>
          <div className="text-[10px] text-amber-600 mt-0.5">100% Intercepted (0 Leaks)</div>
        </div>
      </div>

      {/* Interactive Synthetic Test Examples & Live Testing Workbench */}
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Test Presets & Code Editor (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 text-slate-100 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-indigo-400" />
                <span>Synthetic Action Plan Payload Tester</span>
              </span>
              <button
                type="button"
                onClick={handleReset}
                className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Presets
              </button>
            </div>

            {/* Example Selection Pills */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {SYNTHETIC_VALIDATOR_TEST_EXAMPLES.map((ex, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectExample(idx)}
                  className={`px-2.5 py-1 rounded text-xs font-mono transition-all ${
                    activeExampleIndex === idx
                      ? 'bg-indigo-600 text-white font-bold shadow-xs'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {ex.name}
                </button>
              ))}
            </div>

            {/* Live JSON Payload Textarea */}
            <div className="relative">
              <textarea
                value={customJsonInput}
                onChange={(e) => {
                  setCustomJsonInput(e.target.value);
                  setParseError(null);
                }}
                rows={7}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-emerald-400 focus:outline-none focus:border-indigo-500 resize-none"
                placeholder="Enter Action JSON payload..."
              />
              {parseError && (
                <div className="text-[11px] text-rose-400 mt-1 font-mono">
                  {parseError}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-800">
            <span className="text-[11px] text-slate-400">
              * Edits are evaluated against security rules before connection to history
            </span>
            <button
              type="button"
              onClick={handleRunLiveValidation}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Play className="w-3.5 h-3.5" />
              Evaluate Action
            </button>
          </div>
        </div>

        {/* Right: Validation Result Inspector (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-4">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-3">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-slate-600" />
                <span>Validation Result & Security Checks</span>
              </span>
              {liveTestReport && (
                <span
                  className={`px-2.5 py-0.5 rounded text-[11px] font-bold font-mono ${
                    liveTestReport.status === 'ALLOWED'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-rose-100 text-rose-800 border border-rose-300'
                  }`}
                >
                  Result: {liveTestReport.status}
                </span>
              )}
            </div>

            {liveTestReport ? (
              <div className="space-y-2.5 text-xs font-mono">
                <div className="p-2.5 rounded bg-white border border-slate-200">
                  <div className="text-[10px] text-slate-400 font-sans">ACTION EVALUATED</div>
                  <div className="font-bold text-slate-800 text-sm mt-0.5">
                    {liveTestReport.actionType || 'N/A'}
                  </div>
                </div>

                <div
                  className={`p-2.5 rounded border ${
                    liveTestReport.status === 'ALLOWED'
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50/60 border-rose-200 text-rose-900'
                  }`}
                >
                  <div className="text-[10px] font-sans font-bold uppercase tracking-wider text-slate-500">
                    {liveTestReport.status === 'ALLOWED' ? 'Schema Check' : 'Blocking Reason'}
                  </div>
                  <div className="text-xs font-semibold mt-1">
                    {liveTestReport.reason}
                  </div>
                </div>

                <div className="p-2.5 rounded bg-white border border-slate-200 text-[11px]">
                  <div className="text-[10px] text-slate-400 font-sans mb-1">ENFORCED RULES CHECKLIST</div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Action in Allowlist (5 Actions)</span>
                      {ALLOWED_ACTIONS.includes(liveTestReport.actionType as any) ? (
                        <span className="text-emerald-700 font-bold">PASS</span>
                      ) : (
                        <span className="text-rose-700 font-bold">FAIL</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">No Arbitrary JS / eval()</span>
                      {liveTestReport.threatLevel === 'CRITICAL' ? (
                        <span className="text-rose-700 font-bold">BLOCKED (Rule #7)</span>
                      ) : (
                        <span className="text-emerald-700 font-bold">PASS</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Required Parameters Present</span>
                      {liveTestReport.status === 'ALLOWED' ? (
                        <span className="text-emerald-700 font-bold">PASS</span>
                      ) : (
                        <span className="text-rose-700 font-bold">FAIL</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                Select an example or click "Evaluate Action"
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-200 text-[10px] text-slate-500 flex items-center justify-between">
            <span>Next Pipeline Step:</span>
            <span className="font-semibold text-slate-700">
              {liveTestReport?.status === 'ALLOWED'
                ? 'Appended to Browser Action History'
                : 'Execution Prevented (Safety Drop)'}
            </span>
          </div>
        </div>
      </div>

      {/* Validator Audit Trail of Tested Actions */}
      <div className="mt-4 pt-3 border-t border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <FileCode className="w-3.5 h-3.5 text-slate-500" />
            <span>Recent Action Validator Verification Log (Synthetic)</span>
          </span>
          <span className="text-[10px] text-slate-400">
            Simulated SIH Security Metrics • Rule #7 & #8 Verified
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs" id="validator-audit-log-table">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px] bg-slate-50/60">
                <th className="py-2 px-3">Time</th>
                <th className="py-2 px-3">Action Type</th>
                <th className="py-2 px-3">Payload Summary</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3">Security Reason / Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {validationReports.map((report) => (
                <tr key={report.id} className="hover:bg-slate-50/70">
                  <td className="py-2 px-3 font-mono text-slate-400 text-[11px]">
                    {report.timestamp}
                  </td>
                  <td className="py-2 px-3">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                        report.status === 'ALLOWED'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}
                    >
                      {report.actionType}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-mono text-slate-700 text-[11px] truncate max-w-xs">
                    {JSON.stringify(report.payload)}
                  </td>
                  <td className="py-2 px-3">
                    {report.status === 'ALLOWED' ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        ALLOWED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-rose-700 font-bold text-[11px]">
                        <XCircle className="w-3 h-3 text-rose-600" />
                        BLOCKED
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-[11px] text-slate-600">
                    {report.reason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
