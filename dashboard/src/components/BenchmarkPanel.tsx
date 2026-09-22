import React from 'react';
import { BenchmarkMetrics } from '../types/privagent';
import { Award, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';

interface BenchmarkPanelProps {
  metrics: BenchmarkMetrics;
}

export const BenchmarkPanel: React.FC<BenchmarkPanelProps> = ({ metrics }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs" id="benchmark-panel">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-600" />
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              PRIVAGENT Perception & Redaction Quality Benchmark
            </h3>
            <p className="text-xs text-slate-500">
              Evaluation across {metrics.samplesTested} synthetic test pages (Aadhaar, PAN, Phone, Email & Clean documents)
            </p>
          </div>
        </div>

        {/* Security Rule #6 Compliance Badge */}
        {metrics.isSimulated && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded bg-amber-50 text-amber-900 border border-amber-200">
            <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
            Simulated Ground-Truth Benchmark
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-center">
        {/* Metric 1: Precision */}
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
          <span className="text-xs font-medium text-slate-500">PII Precision</span>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
            {(metrics.piiPrecision * 100).toFixed(1)}%
          </div>
          <span className="text-[10px] text-slate-500">Low false positives</span>
        </div>

        {/* Metric 2: Recall */}
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
          <span className="text-xs font-medium text-slate-500">PII Recall</span>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
            {(metrics.piiRecall * 100).toFixed(1)}%
          </div>
          <span className="text-[10px] text-slate-500">Catches sensitive entities</span>
        </div>

        {/* Metric 3: F1 Score */}
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
          <span className="text-xs font-medium text-slate-500">F1 Score</span>
          <div className="text-2xl font-bold font-mono text-blue-700 mt-1">
            {(metrics.f1Score * 100).toFixed(1)}%
          </div>
          <span className="text-[10px] text-slate-500">Harmonic mean balance</span>
        </div>

        {/* Metric 4: Redaction Precision (No Leak) */}
        <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-200">
          <span className="text-xs font-bold text-emerald-800 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Redaction Precision
          </span>
          <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">
            {(metrics.redactionPrecision * 100).toFixed(1)}%
          </div>
          <span className="text-[10px] text-emerald-700 font-medium">0 Raw PII Leaks</span>
        </div>
      </div>
    </div>
  );
};
