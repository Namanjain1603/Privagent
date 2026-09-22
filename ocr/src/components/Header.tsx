import React from 'react';
import { Eye, ShieldCheck, Cpu, FileCode2, Info } from 'lucide-react';

interface HeaderProps {
  onOpenIntegrationDoc: () => void;
  onOpenPrivacyModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenIntegrationDoc,
  onOpenPrivacyModal
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand & Project Identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-white">PRIVAGENT</span>
              <span className="text-slate-400 font-medium">|</span>
              <span className="text-sm font-semibold text-cyan-400">OCR &amp; Vision</span>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-950 text-indigo-300 border border-indigo-700/60">
                Member 4
              </span>
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <span>SIH 2026 • PS SIH26171</span>
              <span className="text-slate-600">•</span>
              <span className="hidden md:inline">Visual Browser Processing Engine</span>
            </div>
          </div>
        </div>

        {/* Badges & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-700/50 text-emerald-300 text-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>100% Client-Side WASM</span>
          </div>

          <button
            id="privacy-notice-btn"
            onClick={onOpenPrivacyModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            title="View Local Privacy & Security Guarantees"
          >
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Privacy Notice</span>
          </button>

          <button
            id="integration-contract-btn"
            onClick={onOpenIntegrationDoc}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition"
            title="View M1/M2/M3/M5/M6 Module Integration Contract"
          >
            <FileCode2 className="w-3.5 h-3.5" />
            <span>Integration API</span>
          </button>
        </div>
      </div>
    </header>
  );
};
