import React from 'react';
import {
  Layers,
  Clock,
  Percent,
  FileSpreadsheet,
  ShieldAlert,
  CheckCircle2,
  Cpu
} from 'lucide-react';
import { OcrResultBundle } from '../types/privagent';

interface SummaryStatsBarProps {
  bundle: OcrResultBundle | null;
  isProcessing: boolean;
}

export const SummaryStatsBar: React.FC<SummaryStatsBarProps> = ({ bundle, isProcessing }) => {
  if (!bundle && !isProcessing) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {/* Metric 1: Total Detections */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span>Detections</span>
          <Layers className="w-3.5 h-3.5 text-indigo-400" />
        </div>
        <div className="text-xl font-bold text-slate-100 font-mono">
          {isProcessing ? '...' : bundle?.summary.totalDetections ?? 0}
        </div>
        <div className="text-[10px] text-slate-500 mt-0.5">
          {bundle?.metadata.fileType || 'Visual elements'}
        </div>
      </div>

      {/* Metric 2: Words & Lines */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span>Words / Lines</span>
          <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-400" />
        </div>
        <div className="text-xl font-bold text-slate-100 font-mono">
          {isProcessing
            ? '...'
            : `${bundle?.summary.wordCount ?? 0} / ${bundle?.summary.lineCount ?? 0}`}
        </div>
        <div className="text-[10px] text-slate-500 mt-0.5">Text structure tokens</div>
      </div>

      {/* Metric 3: Avg Confidence */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span>Avg Confidence</span>
          <Percent className="w-3.5 h-3.5 text-emerald-400" />
        </div>
        <div className="text-xl font-bold text-emerald-400 font-mono">
          {isProcessing ? '...' : `${bundle?.summary.averageConfidence ?? 0}%`}
        </div>
        <div className="text-[10px] text-slate-500 mt-0.5">Tesseract statistical score</div>
      </div>

      {/* Metric 4: Elapsed Time */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span>Processing Time</span>
          <Clock className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <div className="text-xl font-bold text-slate-100 font-mono">
          {isProcessing ? '...' : `${bundle?.metadata.processingTimeMs ?? 0}ms`}
        </div>
        <div className="text-[10px] text-slate-500 mt-0.5">Local WASM execution</div>
      </div>

      {/* Metric 5: Heuristic Flagged Signals */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span>Heuristic Signals</span>
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <div className="text-xl font-bold text-amber-400 font-mono">
          {isProcessing ? '...' : bundle?.summary.heuristicFlaggedCount ?? 0}
        </div>
        <div className="text-[10px] text-slate-500 mt-0.5">Pre-M2 privacy preview</div>
      </div>

      {/* Metric 6: Privacy Verification */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span>Privacy Audit</span>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        </div>
        <div className="text-sm font-bold text-emerald-400 flex items-center gap-1 mt-1">
          <Cpu className="w-4 h-4" /> 100% In-Browser
        </div>
        <div className="text-[10px] text-slate-500 mt-1">Zero cloud telemetry</div>
      </div>
    </div>
  );
};
