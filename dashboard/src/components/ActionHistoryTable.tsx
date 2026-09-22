import React from 'react';
import { BrowserActionLog, AllowedActionType } from '../types/privagent';
import { CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

interface ActionHistoryTableProps {
  actions: BrowserActionLog[];
}

const ALLOWED_ACTIONS: AllowedActionType[] = ['CLICK', 'TYPE', 'SELECT', 'SCROLL', 'NAVIGATE'];

export const ActionHistoryTable: React.FC<ActionHistoryTableProps> = ({ actions }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs" id="action-history-table-card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span>Browser Action History</span>
            <span className="text-xs font-normal text-slate-500">
              (Allowlisted Action Schema Enforcement)
            </span>
            <span className="text-[10px] font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-indigo-600" />
              Connected to Schema Validator
            </span>
          </h3>
          <p className="text-xs text-slate-500">
            Enforcing Security Rules #7 & #8: Only structured actions are permitted. Arbitrary JavaScript is blocked.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {ALLOWED_ACTIONS.map((action) => (
            <span
              key={action}
              className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200"
            >
              {action}
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto mt-3">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px] bg-slate-50/50">
              <th className="py-2.5 px-3">#</th>
              <th className="py-2.5 px-3">Action Type</th>
              <th className="py-2.5 px-3">Target Selector / Param</th>
              <th className="py-2.5 px-3">Sanitized Input / Value</th>
              <th className="py-2.5 px-3">Schema Validated</th>
              <th className="py-2.5 px-3">Exec Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {actions.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-slate-400">
                  No browser actions executed in current session yet.
                </td>
              </tr>
            ) : (
              actions.map((act) => {
                const isAllowed = ALLOWED_ACTIONS.includes(act.action);
                return (
                  <tr key={act.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-slate-400">
                      0{act.stepNumber}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`browser-action-type px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                          isAllowed
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {act.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-800 font-medium truncate max-w-xs">
                      {act.selector}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">
                      {act.sanitizedValue ? (
                        <span className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded text-[10px]">
                          {act.sanitizedValue}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      {act.validated ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-medium text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Allowlisted</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-700 font-medium text-[11px]">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Blocked</span>
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">
                      {act.durationMs}ms
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
