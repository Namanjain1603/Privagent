import React from "react";
import { Shield, Smartphone, Brain, Eye, BarChart3, Terminal } from "lucide-react";

export const ContractHandoffs: React.FC = () => {
  const contracts = [
    {
      role: "M1 — AI Agent Brain",
      icon: Brain,
      input: "Minimized DOM selectors (top 25 elements, stripped IDs, user task)",
      output: "Structured ActionPlan JSON",
      rule: "Untrusted output; validated against fail-closed allowlist (CLICK, TYPE, SELECT, SCROLL, NAVIGATE)"
    },
    {
      role: "M2 — Privacy & PII Guard",
      icon: Shield,
      input: "Raw on-device perception & visual DOM tokens",
      output: "SanitizedContext with redaction_verified: true",
      rule: "0 raw passwords, OTPs, Aadhaar, PAN or cards allowed across boundary"
    },
    {
      role: "M3 — Browser Extension",
      icon: Smartphone,
      input: "Approved ActionPlan from M5 gateway",
      output: "DOM events (click, input, scroll) & execution telemetry",
      rule: "Never receives arbitrary JS, eval, or unvalidated URLs"
    },
    {
      role: "M5 — Backend Gateway (Our Role)",
      icon: Terminal,
      input: "Untrusted JSON requests from extension and AI brain",
      output: "Zero-Trust validated actions & session state machine",
      rule: "Enforces 1MB payload limits, WAL SQLite concurrency, and fail-closed allowlists"
    },
    {
      role: "M6 — Dashboard & Telemetry",
      icon: BarChart3,
      input: "Masked execution events via POST /telemetry",
      output: "Aggregated metrics at GET /observability/metrics",
      rule: "Zero raw passwords or personal secrets in audit trails"
    }
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Frozen Team Responsibility Contracts (SIH 2026)</h2>
          <p className="text-xs text-slate-500">M1 ↔ M2 ↔ M3 ↔ M4 ↔ M5 ↔ M6 Synchronization Specification</p>
        </div>
        <span className="text-xs font-mono font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
          CONTRACTS FROZEN
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {contracts.map((c, idx) => {
          const Icon = c.icon;
          return (
            <div key={idx} className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-6 w-6 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <h3 className="text-xs font-bold text-slate-900">{c.role}</h3>
              </div>
              <div className="space-y-1.5 text-2xs text-slate-600 font-sans">
                <div>
                  <span className="font-semibold text-slate-800">In:</span> {c.input}
                </div>
                <div>
                  <span className="font-semibold text-slate-800">Out:</span> {c.output}
                </div>
                <div className="text-emerald-700 font-medium">
                  <span className="font-semibold">Security:</span> {c.rule}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
