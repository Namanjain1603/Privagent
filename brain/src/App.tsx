/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Brain, ShieldCheck, CheckCircle2, ArrowRight, Terminal } from 'lucide-react';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 font-sans selection:bg-indigo-500 selection:text-white">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="border-b border-slate-800 pb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">PRIVAGENT — M1 AI Agent Brain</h1>
              <p className="text-sm text-slate-400">Standalone Prototype &bull; SIH 2026</p>
            </div>
          </div>
          <p className="text-slate-300 text-sm mt-3 leading-relaxed">
            M1 is responsible for task understanding, task decomposition, reasoning, next-action planning, and structured browser action generation.
          </p>
        </header>

        {/* Action Allowlist */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4 text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
            <h2 className="text-base font-semibold">Strict Action Allowlist (MVP)</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
            {['CLICK', 'TYPE', 'SELECT', 'SCROLL', 'NAVIGATE'].map((act) => (
              <div key={act} className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                <span className="text-xs font-mono font-bold text-emerald-400">{act}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-3">
            Arbitrary JavaScript execution, unapproved action types, and unsanitized credential exposure are strictly blocked by the deterministic post-generation validator.
          </p>
        </section>

        {/* REST API Contract */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-indigo-400">
            <Terminal className="w-5 h-5" />
            <h2 className="text-base font-semibold">REST API Endpoint</h2>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 font-mono text-xs bg-slate-950 p-2.5 rounded border border-slate-800">
              <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-bold">POST</span>
              <span className="text-slate-200">/api/m1/plan</span>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-400">Sample Request Payload</span>
              <pre className="text-[11px] font-mono bg-slate-950 p-3 rounded-lg border border-slate-800 overflow-x-auto text-slate-300">
{`{
  "taskId": "demo-001",
  "instruction": "Rajasthan select karo aur form submit karo.",
  "pageContext": {
    "url": "http://localhost:3000/form",
    "title": "Demo Form",
    "elements": [
      {
        "id": "state",
        "type": "select",
        "label": "State",
        "options": ["Rajasthan", "Delhi", "Gujarat"]
      },
      {
        "id": "submit",
        "type": "button",
        "label": "Submit"
      }
    ]
  },
  "previousActions": []
}`}
              </pre>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-400">Generated Action Plan</span>
              <pre className="text-[11px] font-mono bg-slate-950 p-3 rounded-lg border border-slate-800 overflow-x-auto text-emerald-400">
{`{
  "status": "SUCCESS",
  "reasoning": {
    "intent": "Rajasthan select karo aur form submit karo.",
    "subGoals": [
      "Select 'Rajasthan' from dropdown 'State'",
      "Click button 'Submit'"
    ],
    "contextSummary": "Generated 2 action(s) for 2 element(s)."
  },
  "actions": [
    {
      "type": "SELECT",
      "target": "state",
      "value": "Rajasthan"
    },
    {
      "type": "CLICK",
      "target": "submit"
    }
  ]
}`}
              </pre>
            </div>
          </div>
        </section>

        {/* Verification & Test Suite Status */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3 text-cyan-400">
            <CheckCircle2 className="w-5 h-5" />
            <h2 className="text-base font-semibold">Automated Test Suite Status</h2>
          </div>
          <div className="bg-slate-950 rounded-lg p-4 border border-slate-800 font-mono text-xs text-slate-300 space-y-1">
            <p className="text-emerald-400 font-bold">&gt; cd m1-brain &amp;&amp; npm test</p>
            <p className="text-slate-400">&bull; Tests executed: 15 test cases</p>
            <p className="text-slate-400">&bull; Covered actions: CLICK, TYPE, SELECT, SCROLL, NAVIGATE</p>
            <p className="text-slate-400">&bull; Safety checks: Missing target, Invalid option, Unsupported action, Sensitive PII/OTP, JS injection, Hinglish, Task Complete</p>
            <p className="text-emerald-400 font-bold mt-2">&check; Test Summary: 15 Passed, 0 Failed out of 15</p>
          </div>
        </section>

        {/* Architectural Boundaries */}
        <footer className="text-xs text-slate-500 pt-4 border-t border-slate-800 flex flex-col sm:flex-row justify-between gap-2">
          <span>Member 1 (M1) Prototype &bull; Autonomous Reasoning &amp; Planning</span>
          <span>Ready for integration with M3 (Browser Agent) &amp; M5 (Orchestrator)</span>
        </footer>

      </div>
    </div>
  );
}
