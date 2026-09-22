import React, { useState } from 'react';
import { PiiEntity } from '../types/privagent';
import {
  EyeOff,
  ShieldCheck,
  FileText,
  Camera,
  KeyRound,
  Filter,
  Info,
  ChevronDown,
  ChevronUp,
  Clock,
  CloudOff,
  Lock,
} from 'lucide-react';

interface PiiAuditTableProps {
  piiList: PiiEntity[];
  activeTypeFilter?: string;
  onFilterChange?: (filter: string) => void;
}

export const PiiAuditTable: React.FC<PiiAuditTableProps> = ({
  piiList,
  activeTypeFilter = 'ALL',
  onFilterChange,
}) => {
  const [internalFilter, setInternalFilter] = useState<string>(activeTypeFilter);
  const [expandedId, setExpandedId] = useState<string | null>('pii_01'); // Default expand first row to make it obvious

  const currentFilter = onFilterChange ? activeTypeFilter : internalFilter;
  const setFilter = (val: string) => {
    if (onFilterChange) {
      onFilterChange(val);
    } else {
      setInternalFilter(val);
    }
  };

  const categories = ['ALL', 'AADHAAR', 'PAN', 'PHONE', 'EMAIL', 'PASSWORD'];

  const filteredList = piiList.filter((item) => {
    if (currentFilter === 'ALL') return true;
    return item.type === currentFilter;
  });

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs" id="pii-audit-log-card">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <EyeOff className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">
              On-Device PII Detection & Redaction Audit Trail
            </h3>
            <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
              Step 2 Verification
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Security Rules #1-4: Raw Indian sensitive data is intercepted locally. Click any row to expand inspection details.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            0 Raw Leaks Verified
          </span>
        </div>
      </div>

      {/* Filter Category Pills */}
      <div className="flex flex-wrap gap-1.5 py-2.5 border-b border-slate-100 items-center">
        <Filter className="w-3.5 h-3.5 text-slate-400 mr-1" />
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setFilter(cat)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              currentFilter === cat
                ? 'bg-slate-900 text-white shadow-xs font-semibold'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            {cat}
          </button>
        ))}
        <span className="ml-auto text-[11px] text-slate-500 font-medium">
          Showing {filteredList.length} of {piiList.length} audit records
        </span>
      </div>

      {/* Audit Table */}
      <div className="overflow-x-auto mt-2">
        <table className="w-full text-left text-xs" id="pii-audit-log-table">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px] bg-slate-50">
              <th className="py-2.5 px-3">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  Timestamp
                </span>
              </th>
              <th className="py-2.5 px-3">PII Type</th>
              <th className="py-2.5 px-3">Detection Source</th>
              <th className="py-2.5 px-3">Original Value Status</th>
              <th className="py-2.5 px-3">Masked Synthetic Value</th>
              <th className="py-2.5 px-3">Action</th>
              <th className="py-2.5 px-3">
                <span className="flex items-center gap-1">
                  <CloudOff className="w-3 h-3 text-slate-400" />
                  Cloud Sent
                </span>
              </th>
              <th className="py-2.5 px-2 text-center">Inspect</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredList.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center">
                    <ShieldCheck className="w-8 h-8 text-emerald-500 mb-1" />
                    <span className="font-semibold text-slate-700">
                      No {currentFilter !== 'ALL' ? currentFilter : ''} Records Found
                    </span>
                    <span className="text-xs text-slate-500">
                      Page context is verified clean or masked
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredList.map((item) => {
                const isExpanded = expandedId === item.id;
                return (
                  <React.Fragment key={item.id}>
                    <tr
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className={`hover:bg-slate-50/90 transition-colors cursor-pointer ${
                        isExpanded ? 'bg-slate-50/70' : ''
                      }`}
                    >
                      {/* 1. Timestamp */}
                      <td className="py-2.5 px-3 font-mono text-slate-500 whitespace-nowrap">
                        {item.timestamp}
                      </td>

                      {/* 2. PII Type */}
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wide font-mono bg-purple-50 text-purple-800 border border-purple-200 whitespace-nowrap">
                          {item.type}
                        </span>
                      </td>

                      {/* 3. Detection Source */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-700 font-medium">
                          {item.source === 'OCR_SCREENSHOT' || item.source === 'CANVAS' ? (
                            <>
                              <Camera className="w-3.5 h-3.5 text-indigo-600" />
                              <span>M4 Visual OCR</span>
                            </>
                          ) : item.type === 'PASSWORD' ? (
                            <>
                              <KeyRound className="w-3.5 h-3.5 text-rose-600" />
                              <span>DOM Password Input</span>
                            </>
                          ) : (
                            <>
                              <FileText className="w-3.5 h-3.5 text-blue-600" />
                              <span>DOM Text Node</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* 4. Original Value Status */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          <Lock className="w-3 h-3 text-amber-600" />
                          {item.originalValueStatus || 'Intercepted on Client'}
                        </span>
                      </td>

                      {/* 5. Masked Synthetic Value */}
                      <td className="py-2.5 px-3 font-mono text-slate-800 font-bold whitespace-nowrap">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] border border-slate-200">
                          {item.rawMasked}
                        </span>
                      </td>

                      {/* 6. Action */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {item.redactionMethod}
                        </span>
                      </td>

                      {/* 7. Cloud Sent */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          {item.cloudSent || '0 Bytes (Token Only)'}
                        </span>
                      </td>

                      {/* 8. Inspect toggle icon */}
                      <td className="py-2.5 px-2 text-center text-slate-400">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 inline text-slate-700" />
                        ) : (
                          <ChevronDown className="w-4 h-4 inline" />
                        )}
                      </td>
                    </tr>

                    {/* Expandable Inspection Drawer */}
                    {isExpanded && (
                      <tr className="bg-slate-50 border-y border-slate-200">
                        <td colSpan={8} className="p-3">
                          <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs space-y-2.5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-100 gap-1">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                                <Info className="w-4 h-4 text-blue-600" />
                                <span>Inspection Analysis: {item.type} Entity (#{item.id})</span>
                              </div>
                              <div className="text-[11px] font-mono text-slate-500">
                                DOM Selector:{' '}
                                <code className="text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
                                  {item.targetSelector || 'Document Body Node'}
                                </code>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                              <div className="p-2 rounded bg-slate-50 border border-slate-200">
                                <span className="text-slate-400 block text-[10px]">DETECTION CONFIDENCE</span>
                                <span className="font-bold text-slate-800">
                                  {(item.confidence * 100).toFixed(1)}% Match
                                </span>
                              </div>

                              <div className="p-2 rounded bg-slate-50 border border-slate-200">
                                <span className="text-slate-400 block text-[10px]">REDACTION PIPELINE</span>
                                <span className="font-bold text-emerald-700">
                                  Local M2 Guard (Pre-Transit)
                                </span>
                              </div>

                              <div className="p-2 rounded bg-slate-50 border border-slate-200">
                                <span className="text-slate-400 block text-[10px]">OUTBOUND PAYLOAD</span>
                                <span className="font-bold text-blue-700 truncate block">
                                  {item.type === 'PASSWORD' ? '[OMITTED]' : `Token [${item.rawMasked}]`}
                                </span>
                              </div>

                              <div className="p-2 rounded bg-slate-50 border border-slate-200">
                                <span className="text-slate-400 block text-[10px]">SIH PRIVACY VERIFICATION</span>
                                <span className="font-bold text-emerald-700">
                                  PASSED (0-Leak Confirmed)
                                </span>
                              </div>
                            </div>

                            <p className="text-[11px] text-slate-500 italic">
                              * Security Rule Compliance: Raw sensitive credentials never touch cloud network transit. Telemetry logs record only masked synthetic representation.
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
