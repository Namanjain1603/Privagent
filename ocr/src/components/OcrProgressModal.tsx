import React from 'react';
import { Cpu, Database, ScanText, Layers, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { OcrProgressStatus } from '../types/privagent';

interface OcrProgressModalProps {
  status: OcrProgressStatus | null;
  onCancel?: () => void;
}

export const OcrProgressModal: React.FC<OcrProgressModalProps> = ({ status, onCancel }) => {
  if (!status || status.phase === 'completed') return null;

  const isError = status.phase === 'error';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl text-slate-200 text-xs flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                isError
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40'
              }`}
            >
              {isError ? (
                <AlertTriangle className="w-5 h-5" />
              ) : status.phase === 'loading_model' ? (
                <Database className="w-5 h-5 animate-pulse" />
              ) : status.phase === 'recognizing' ? (
                <ScanText className="w-5 h-5 animate-pulse" />
              ) : (
                <Cpu className="w-5 h-5 animate-spin" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {isError ? 'OCR Processing Error' : 'Local OCR Engine Active'}
              </h3>
              <p className="text-[11px] text-slate-400">
                100% In-Browser Execution via WebAssembly
              </p>
            </div>
          </div>

          {onCancel && (
            <button
              onClick={onCancel}
              className="text-slate-400 hover:text-white p-1 rounded transition"
              title="Cancel processing"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Phase Indicators */}
        <div className="grid grid-cols-3 gap-2 py-2">
          {[
            {
              id: 'initializing',
              label: '1. WASM Core',
              active: status.phase === 'initializing',
              done: ['loading_model', 'recognizing', 'normalizing', 'completed'].includes(
                status.phase
              )
            },
            {
              id: 'loading_model',
              label: '2. Language Model',
              active: status.phase === 'loading_model',
              done: ['recognizing', 'normalizing', 'completed'].includes(status.phase)
            },
            {
              id: 'recognizing',
              label: '3. Recognition',
              active: status.phase === 'recognizing' || status.phase === 'normalizing',
              done: status.progress >= 95
            }
          ].map((step) => (
            <div
              key={step.id}
              className={`p-2 rounded-lg border text-center transition ${
                step.done
                  ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300'
                  : step.active
                  ? 'bg-indigo-950/80 border-indigo-500 text-indigo-200'
                  : 'bg-slate-800/40 border-slate-800 text-slate-500'
              }`}
            >
              <div className="font-semibold text-[10px] truncate">{step.label}</div>
              <div className="text-[9px] mt-0.5">
                {step.done ? 'Ready' : step.active ? 'Active' : 'Pending'}
              </div>
            </div>
          ))}
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-300 font-medium truncate max-w-[280px]">
              {status.message}
            </span>
            <span className="font-mono font-bold text-indigo-400">{status.progress}%</span>
          </div>

          <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                isError
                  ? 'bg-rose-500'
                  : 'bg-gradient-to-r from-indigo-500 via-cyan-400 to-indigo-400'
              }`}
              style={{ width: `${Math.max(5, status.progress)}%` }}
            />
          </div>
        </div>

        {/* Privacy Note */}
        <p className="text-[10px] text-slate-500 text-center leading-relaxed">
          Initial run may take a few seconds to load language model weights into browser cache.
          Subsequent runs will be significantly faster.
        </p>
      </div>
    </div>
  );
};
