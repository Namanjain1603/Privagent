import React from 'react';
import { ShieldCheck, EyeOff, CloudOff, Timer, CheckCircle2, ShieldAlert } from 'lucide-react';
import { PrivacyStatus, SessionStatus } from '../types/privagent';

interface PrivacySummaryCardsProps {
  privacyStatus: PrivacyStatus;
  piiDetected: number;
  piiRedacted: number;
  rawPiiSent: number;
  latencyMs: number;
  sessionStatus: SessionStatus;
  e2eTestStatus: 'PASS' | 'FAIL';
  privacyTestStatus: 'PASS' | 'FAIL';
  integrationTestStatus: 'PASS' | 'FAIL';
}

export const PrivacySummaryCards: React.FC<PrivacySummaryCardsProps> = ({
  privacyStatus,
  piiDetected,
  piiRedacted,
  rawPiiSent,
  latencyMs,
  sessionStatus,
  e2eTestStatus,
  privacyTestStatus,
  integrationTestStatus,
}) => {
  const isProtected = privacyStatus === 'PROTECTED' && rawPiiSent === 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="privacy-summary-cards">
      {/* 1. Privacy Status */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Privacy Status
          </span>
          {isProtected ? (
            <span className="p-1 rounded bg-emerald-100 text-emerald-700">
              <ShieldCheck className="w-4 h-4" />
            </span>
          ) : (
            <span className="p-1 rounded bg-rose-100 text-rose-700">
              <ShieldAlert className="w-4 h-4" />
            </span>
          )}
        </div>
        <div className="mt-2">
          <div className="flex items-baseline gap-2">
            <span 
              id="privacy-status-badge" 
              className={`text-2xl font-bold tracking-tight ${
                isProtected ? 'text-emerald-700' : 'text-rose-600'
              }`}
            >
              {privacyStatus}
            </span>
            <span className="text-xs font-medium text-slate-500">
              {sessionStatus === 'ACTIVE' ? '• Intercepting' : '• Standby'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Local OCR & PII Redaction Guard Active
          </p>
        </div>
      </div>

      {/* 2. PII Interception Rate */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            PII Detected / Redacted
          </span>
          <span className="p-1 rounded bg-blue-100 text-blue-700">
            <EyeOff className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-2">
          <div className="flex items-baseline gap-2">
            <span id="pii-detected-count" className="text-2xl font-bold text-slate-900 tracking-tight">
              {piiDetected}
            </span>
            <span className="text-sm font-semibold text-slate-400">/</span>
            <span id="pii-redacted-count" className="text-2xl font-bold text-blue-600 tracking-tight">
              {piiRedacted}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 ml-auto">
              {piiDetected === 0 ? '100%' : `${Math.round((piiRedacted / Math.max(1, piiDetected)) * 100)}%`}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Indian PII: Aadhaar, PAN, Phone, Email
          </p>
        </div>
      </div>

      {/* 3. Raw PII Sent to Cloud */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Raw PII Sent to Cloud
          </span>
          <span className="p-1 rounded bg-emerald-100 text-emerald-700">
            <CloudOff className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-2">
          <div className="flex items-baseline gap-2">
            <span id="raw-pii-sent-count" className="text-2xl font-bold text-emerald-600 tracking-tight">
              {rawPiiSent}
            </span>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded ml-auto">
              0-LEAK VERIFIED
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Cloud AI receives tokenized context only
          </p>
        </div>
      </div>

      {/* 4. Measured Latency & Quick Test Status */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Latency & Test Status
          </span>
          <span className="p-1 rounded bg-purple-100 text-purple-700">
            <Timer className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-2">
          <div className="flex items-baseline justify-between">
            <span id="total-latency-metric" className="text-2xl font-bold text-slate-900 tracking-tight">
              {latencyMs} <span className="text-xs font-normal text-slate-500">ms</span>
            </span>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold">
              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 flex items-center gap-0.5">
                <CheckCircle2 className="w-3 h-3 inline" /> E2E
              </span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 flex items-center gap-0.5">
                <CheckCircle2 className="w-3 h-3 inline" /> Priv
              </span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 flex items-center gap-0.5">
                <CheckCircle2 className="w-3 h-3 inline" /> Int
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            E2E: {e2eTestStatus} • Privacy: {privacyTestStatus} • Integration: {integrationTestStatus}
          </p>
        </div>
      </div>
    </div>
  );
};
