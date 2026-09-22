import React from 'react';
import { ArrowRight, Monitor, ScanEye, ShieldAlert, Cpu, CheckSquare, BarChart3 } from 'lucide-react';

export const PipelineFlow: React.FC = () => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs" id="privagent-pipeline-flow">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <ScanEye className="w-4 h-4 text-emerald-600" />
          PRIVAGENT End-to-End Pipeline Architecture & Boundaries
        </h2>
        <span className="text-[11px] text-slate-500 font-medium">
          M6 Responsibilities: Dashboard, Telemetry & Integration Testing
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-7 gap-2 items-center text-center">
        {/* Step 1: User & Extension (M3) */}
        <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/70">
          <Monitor className="w-5 h-5 mx-auto text-blue-600 mb-1" />
          <div className="text-xs font-bold text-slate-900">M3: Extension</div>
          <div className="text-[10px] text-slate-500">DOM + Screenshots</div>
          <span className="inline-block mt-1 text-[9px] font-semibold text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded">
            Client Local
          </span>
        </div>

        {/* Step 2: OCR & Vision (M4) */}
        <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/70">
          <ScanEye className="w-5 h-5 mx-auto text-indigo-600 mb-1" />
          <div className="text-xs font-bold text-slate-900">M4: Local Vision</div>
          <div className="text-[10px] text-slate-500">On-Device OCR</div>
          <span className="inline-block mt-1 text-[9px] font-semibold text-indigo-700 bg-indigo-100 px-1.5 py-0.2 rounded">
            Client Local
          </span>
        </div>

        {/* Step 3: Privacy & PII Guard (M2) */}
        <div className="p-2.5 rounded-lg border-2 border-emerald-500 bg-emerald-50/40">
          <ShieldAlert className="w-5 h-5 mx-auto text-emerald-700 mb-1" />
          <div className="text-xs font-bold text-emerald-900">M2: PII Guard</div>
          <div className="text-[10px] text-emerald-800 font-medium">Local Redaction</div>
          <span className="inline-block mt-1 text-[9px] font-semibold text-emerald-800 bg-emerald-200/80 px-1.5 py-0.2 rounded">
            Privacy Boundary
          </span>
        </div>

        {/* Step 4: Backend & APIs (M5) */}
        <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/70">
          <Cpu className="w-5 h-5 mx-auto text-amber-600 mb-1" />
          <div className="text-xs font-bold text-slate-900">M5: Backend</div>
          <div className="text-[10px] text-slate-500">Sanitized Context</div>
          <span className="inline-block mt-1 text-[9px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded">
            REST API
          </span>
        </div>

        {/* Step 5: Cloud AI Brain (M1) */}
        <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/70">
          <Cpu className="w-5 h-5 mx-auto text-purple-600 mb-1" />
          <div className="text-xs font-bold text-slate-900">M1: AI Brain</div>
          <div className="text-[10px] text-slate-500">Planning & Actions</div>
          <span className="inline-block mt-1 text-[9px] font-semibold text-purple-700 bg-purple-100 px-1.5 py-0.2 rounded">
            Cloud Reasoning
          </span>
        </div>

        {/* Step 6: Schema Validation (M3/M6) */}
        <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/70">
          <CheckSquare className="w-5 h-5 mx-auto text-emerald-600 mb-1" />
          <div className="text-xs font-bold text-slate-900">Action Guard</div>
          <div className="text-[10px] text-slate-500">Allowlist Schema</div>
          <span className="inline-block mt-1 text-[9px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
            Security Rule #8
          </span>
        </div>

        {/* Step 7: Dashboard & Telemetry (M6 - YOU) */}
        <div className="p-2.5 rounded-lg border-2 border-blue-600 bg-blue-50/60 shadow-xs">
          <BarChart3 className="w-5 h-5 mx-auto text-blue-700 mb-1" />
          <div className="text-xs font-bold text-blue-900">M6: Dashboard</div>
          <div className="text-[10px] text-blue-800 font-semibold">Audit & Playwright</div>
          <span className="inline-block mt-1 text-[9px] font-bold text-blue-800 bg-blue-200 px-1.5 py-0.2 rounded">
            YOUR MODULE
          </span>
        </div>
      </div>
    </div>
  );
};
