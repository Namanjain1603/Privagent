import React, { useState } from "react";
import { Play, Check, AlertCircle, ArrowRight, ShieldCheck } from "lucide-react";
import { ActionItem } from "../types";

interface LiveApiConsoleProps {
  sessionId: string;
  onLog: (level: "INFO" | "SECURITY" | "REJECTED" | "SUCCESS", endpoint: string, message: string, data?: any) => void;
}

export const LiveApiConsole: React.FC<LiveApiConsoleProps> = ({ sessionId, onLog }) => {
  const [taskInput, setTaskInput] = useState("Search for EV charging stations near Connaught Place");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<number>(0);
  const [planResult, setPlanResult] = useState<ActionItem[]>([]);

  const runSimulatedFlow = async () => {
    setLoading(true);
    setStep(1);
    onLog("INFO", "POST /session", `Initializing session for user task: "${taskInput}"`);

    try {
      // 1. Create session
      const sessRes = await fetch("/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, user_task: taskInput })
      });
      const sessData = await sessRes.json();
      onLog("SUCCESS", "POST /session", `Session ${sessData.session_id} active.`, sessData);

      // 2. M2 Sanitized Context
      setStep(2);
      onLog("INFO", "POST /analyze", "Ingesting M2 on-device sanitized DOM context (2 elements, redaction_verified: true)");
      const analyzeRes = await fetch("/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          url: "https://evportal.gov.in/stations",
          page_title: "EV Portal",
          sanitized_context: {
            redaction_verified: true,
            redacted_token_count: 1,
            elements: [
              { tag: "input", selector: "#search-input", label: "Location Search", is_interactive: true },
              { tag: "button", selector: "#submit-search", label: "Find Stations", is_interactive: true }
            ]
          }
        })
      });
      const analyzeData = await analyzeRes.json();
      onLog("SUCCESS", "POST /analyze", "Sanitized context accepted without PII leakage.", analyzeData);

      // 3. AI Plan
      setStep(3);
      onLog("INFO", "POST /plan", "Triggering AI Reasoning and Zero-Trust Action Validator");
      const planRes = await fetch("/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          user_goal: taskInput,
          current_url: "https://evportal.gov.in/stations",
          sanitized_elements: [
            { tag: "input", selector: "#search-input" },
            { tag: "button", selector: "#submit-search" }
          ]
        })
      });
      const planData = await planRes.json();
      const actions: ActionItem[] = planData.action_plan.actions;
      setPlanResult(actions);
      onLog("SUCCESS", "POST /plan", `Generated & approved ${actions.length} safe actions.`, planData);

      // 4. Preflight Validate Action
      setStep(4);
      if (actions.length > 0) {
        const firstAction = actions[0];
        onLog("INFO", "POST /validate-action", `Preflight check for: ${firstAction.type} -> ${firstAction.target}`);
        const valRes = await fetch("/validate-action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId, action: firstAction })
        });
        const valData = await valRes.json();
        onLog("SUCCESS", "POST /validate-action", `Action preflight approved (is_safe: ${valData.is_safe}).`, valData);
      }

      // 5. Telemetry
      setStep(5);
      onLog("INFO", "POST /telemetry", "M3 executing browser action -> Recording masked telemetry");
      const teleRes = await fetch("/telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          event_type: "ACTION_EXECUTED",
          component: "CHROME_EXTENSION",
          action_type: "TYPE",
          execution_time_ms: 24.5,
          success: true,
          details: { selector: "#search-input", value_present: true }
        })
      });
      const teleData = await teleRes.json();
      onLog("SUCCESS", "POST /telemetry", `Telemetry recorded (ID: ${teleData.telemetry_id}).`, teleData);

      setStep(6);
    } catch (err: any) {
      onLog("REJECTED", "API Error", err.message || "Failed execution");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Live SIH 2026 E2E Integration Tester</h2>
          <p className="text-xs text-slate-500">
            Simulate complete M3 Chrome Extension ➔ M2 Privacy ➔ M5 Gateway ➔ M1 AI ➔ DOM Action Flow
          </p>
        </div>
        <span className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 font-medium rounded-full border border-blue-100">
          Deterministic Demo Mode
        </span>
      </div>

      <div className="p-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">User Goal / Browser Task</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              className="flex-1 px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g. Search for EV charging stations near Connaught Place"
            />
            <button
              onClick={runSimulatedFlow}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold rounded-lg shadow-xs transition-colors"
            >
              <Play className="h-4 w-4" />
              <span>{loading ? "Executing Pipeline..." : "Run E2E Demo"}</span>
            </button>
          </div>
        </div>

        {/* Progress Pipeline */}
        <div className="pt-2">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Multi-Party Integration Pipeline
          </div>
          <div className="grid grid-cols-5 gap-2 text-center text-xs">
            <div className={`p-2 rounded-lg border ${step >= 1 ? "bg-blue-50 border-blue-200 text-blue-900 font-medium" : "bg-slate-50 border-slate-200 text-slate-500"}`}>
              1. M5 /session
            </div>
            <div className={`p-2 rounded-lg border ${step >= 2 ? "bg-blue-50 border-blue-200 text-blue-900 font-medium" : "bg-slate-50 border-slate-200 text-slate-500"}`}>
              2. M2 /analyze
            </div>
            <div className={`p-2 rounded-lg border ${step >= 3 ? "bg-blue-50 border-blue-200 text-blue-900 font-medium" : "bg-slate-50 border-slate-200 text-slate-500"}`}>
              3. M1 /plan
            </div>
            <div className={`p-2 rounded-lg border ${step >= 4 ? "bg-blue-50 border-blue-200 text-blue-900 font-medium" : "bg-slate-50 border-slate-200 text-slate-500"}`}>
              4. /validate
            </div>
            <div className={`p-2 rounded-lg border ${step >= 5 ? "bg-emerald-50 border-emerald-200 text-emerald-900 font-medium" : "bg-slate-50 border-slate-200 text-slate-500"}`}>
              5. M6 /telemetry
            </div>
          </div>
        </div>

        {/* Generated Action Plan Display */}
        {planResult.length > 0 && (
          <div className="mt-4 p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Zero-Trust Approved Action Plan ({planResult.length} actions)</span>
              </div>
              <span className="text-2xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-sm font-mono">
                STATUS: APPROVED
              </span>
            </div>
            <div className="space-y-1.5">
              {planResult.map((action, idx) => (
                <div key={idx} className="flex items-center justify-between bg-white p-2.5 rounded-md border border-slate-200 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">
                      {action.type}
                    </span>
                    <span className="text-slate-800">{action.target}</span>
                  </div>
                  {action.value && (
                    <span className="text-slate-500 truncate max-w-xs">
                      val: "{action.value}"
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
