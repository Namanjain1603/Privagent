import React from 'react';
import { ShieldCheck, Activity, Terminal, RefreshCw } from 'lucide-react';
import { SessionStatus } from '../types/privagent';

interface HeaderProps {
  sessionStatus: SessionStatus;
  isSimulated: boolean;
  onToggleDemoScenario: (mode: 'active' | 'clean') => void;
  activeScenario: 'active' | 'clean';
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  sessionStatus,
  isSimulated,
  onToggleDemoScenario,
  activeScenario,
  onRefresh,
  isRefreshing,
}) => {
  return (
    <header className="border-b border-slate-200 bg-white shadow-xs" id="privagent-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          
          {/* Brand & SIH Info */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-sm font-bold tracking-tight">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  PRIVAGENT
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  SIH26171
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  M6: Dashboard & Testing
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Privacy-First Visual Browser Agent • On-Device Perception & Redaction Monitor
              </p>
            </div>
          </div>

          {/* Quick Controls & Status Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Simulation Notice Tag */}
            {isSimulated && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200" title="Security Rule #6: Clear labeling of simulated/demo telemetry">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                Simulated Demo Telemetry
              </span>
            )}

            {/* Session Indicator */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
              <span>Session:</span>
              <span className={`px-1.5 py-0.2 rounded text-[11px] ${
                sessionStatus === 'ACTIVE' 
                  ? 'bg-emerald-100 text-emerald-800' 
                  : 'bg-slate-200 text-slate-700'
              }`}>
                {sessionStatus}
              </span>
            </div>

            {/* Scenario Switcher for SIH Demos */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-md border border-slate-200 text-xs">
              <button
                type="button"
                id="btn-trigger-aadhaar-test"
                onClick={() => onToggleDemoScenario('active')}
                className={`px-2.5 py-1 rounded font-medium transition-all ${
                  activeScenario === 'active'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Synthetic PII Page
              </button>
              <button
                type="button"
                id="btn-trigger-clean-test"
                onClick={() => onToggleDemoScenario('clean')}
                className={`px-2.5 py-1 rounded font-medium transition-all ${
                  activeScenario === 'clean'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Clean Page
              </button>
            </div>

            {/* Refresh */}
            <button
              type="button"
              onClick={onRefresh}
              className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              title="Refresh telemetry"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
