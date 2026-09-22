import React from 'react';
import { ShieldCheck, Lock, EyeOff, FileText, Activity } from 'lucide-react';
import { RedactionPolicy } from '../types/privacy';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  policy: RedactionPolicy;
  totalDetectionsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  policy,
  totalDetectionsCount
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand & Module Identification */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-sm">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white tracking-tight text-lg">PRIVAGENT</span>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                  Privacy & PII Guard Engine
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 text-xs font-medium rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                  SIH26171
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                On-device Sensitive Data Perception, Canvas Redaction & Zero-Leak Security Gate
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('playground')}
              className={`px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'playground'
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700 shadow-xs font-semibold'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <EyeOff className="w-4 h-4" />
              <span>Pipeline Workbench</span>
            </button>

            <button
              onClick={() => setActiveTab('actions')}
              className={`px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'actions'
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700 shadow-xs font-semibold'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>Action Gate</span>
            </button>

            <button
              onClick={() => setActiveTab('contracts')}
              className={`px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'contracts'
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700 shadow-xs font-semibold'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Integration Contracts</span>
            </button>

            <button
              onClick={() => setActiveTab('tests')}
              className={`px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'tests'
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700 shadow-xs font-semibold'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Test Suite</span>
            </button>
          </nav>

          {/* Status Badge */}
          <div className="hidden md:flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs font-semibold text-slate-200 flex items-center justify-end gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Mode: {policy.mode}
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                {totalDetectionsCount} Entities Protected
              </div>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
};
