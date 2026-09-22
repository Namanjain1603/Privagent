import React from "react";
import { ShieldCheck, Cpu, Database, Activity, Lock } from "lucide-react";
import { SystemStatus } from "../types";

interface HeaderProps {
  status: SystemStatus | null;
  onRefresh: () => void;
}

export const Header: React.FC<HeaderProps> = ({ status, onRefresh }) => {
  return (
    <header className="border-b border-slate-200 bg-white shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">PRIVAGENT</h1>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  SIH26171
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  M5 Backend Frozen
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Privacy-First Visual Browser Agent — Zero-Trust Action Validator &amp; API Service
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700">
              <Cpu className="h-3.5 w-3.5 text-blue-600" />
              <span>Mode:</span>
              <span className="font-semibold text-slate-900">
                {status?.demo_mode ? "Deterministic DEMO_MODE" : "Live Gemini AI"}
              </span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700">
              <Database className="h-3.5 w-3.5 text-emerald-600" />
              <span>DB:</span>
              <span className="font-semibold text-emerald-700">
                {status?.database || "CONNECTED"}
              </span>
            </div>

            <button
              onClick={onRefresh}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors shadow-xs"
            >
              <Activity className="h-3.5 w-3.5" />
              <span>Refresh Metrics</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
