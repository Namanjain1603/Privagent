import React, { useState } from 'react';
import { TestCase } from '../types/privagent';
import { CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp, Filter, Play } from 'lucide-react';

interface TestMatrixTabProps {
  testCases: TestCase[];
  onRunTestSimulation: (testId: string) => void;
}

export const TestMatrixTab: React.FC<TestMatrixTabProps> = ({
  testCases,
  onRunTestSimulation,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>('TC-02'); // Default expand TC-02 (Aadhaar)

  const categories = [
    { id: 'ALL', label: 'All Tests (16)' },
    { id: 'CORE_PII', label: 'Core PII & Visual (7)' },
    { id: 'SECURITY', label: 'Security & Action Guard (3)' },
    { id: 'INFRA_FAILURE', label: 'Failure & Resilience (4)' },
    { id: 'EDGE_CASE', label: 'Edge Cases (2)' },
  ];

  const filteredTests = testCases.filter((tc) =>
    selectedCategory === 'ALL' ? true : tc.category === selectedCategory
  );

  const passedCount = testCases.filter((t) => t.status === 'PASS').length;
  const failedCount = testCases.filter((t) => t.status === 'FAIL').length;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs" id="test-matrix-viewer">
      {/* Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span>SIH 2026 Test Suite & Quality Verification Matrix</span>
            <span className="text-xs font-mono font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
              16/16 Test Scenarios
            </span>
          </h3>
          <p className="text-xs text-slate-500">
            Preconditions, step-by-step execution, expected vs. actual outcomes for Member 6 validation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            {passedCount} Passed
          </span>
          {failedCount > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded bg-rose-50 text-rose-800 border border-rose-200">
              <XCircle className="w-3.5 h-3.5 text-rose-600" />
              {failedCount} Failed
            </span>
          )}
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap gap-1.5 py-3 border-b border-slate-100 items-center">
        <Filter className="w-3.5 h-3.5 text-slate-400 mr-1" />
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              selectedCategory === cat.id
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Test List Accordion */}
      <div className="divide-y divide-slate-100 mt-2">
        {filteredTests.map((tc) => {
          const isExpanded = expandedId === tc.id;
          return (
            <div key={tc.id} className="py-3">
              <div
                className="flex items-center justify-between cursor-pointer hover:bg-slate-50/70 p-2 rounded-lg transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : tc.id)}
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {tc.id}
                  </span>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900">{tc.title}</h4>
                    <p className="text-[11px] text-slate-500 line-clamp-1">{tc.objective}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                      tc.status === 'PASS'
                        ? 'bg-emerald-100 text-emerald-800'
                        : tc.status === 'RUNNING'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {tc.status === 'PASS' && <CheckCircle2 className="w-3 h-3" />}
                    {tc.status === 'RUNNING' && <Clock className="w-3 h-3 animate-spin" />}
                    {tc.status === 'FAIL' && <XCircle className="w-3 h-3" />}
                    {tc.status}
                  </span>

                  <button
                    type="button"
                    title="Simulate re-running this test"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRunTestSimulation(tc.id);
                    }}
                    className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800"
                  >
                    <Play className="w-3.5 h-3.5" />
                  </button>

                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>

              {/* Expanded Test Details */}
              {isExpanded && (
                <div className="mt-2.5 p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-2.5 ml-2 mr-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <span className="font-semibold text-slate-700 block mb-1">Preconditions:</span>
                      <p className="text-slate-600 bg-white p-2 rounded border border-slate-200 font-mono text-[11px]">
                        {tc.preconditions}
                      </p>
                    </div>

                    <div>
                      <span className="font-semibold text-slate-700 block mb-1">Notes & Module Owner:</span>
                      <p className="text-slate-600 bg-white p-2 rounded border border-slate-200 text-[11px]">
                        {tc.notes}
                      </p>
                    </div>
                  </div>

                  <div>
                    <span className="font-semibold text-slate-700 block mb-1">Execution Steps:</span>
                    <ol className="list-decimal list-inside space-y-1 text-slate-600 bg-white p-2.5 rounded border border-slate-200">
                      {tc.steps.map((step, idx) => (
                        <li key={idx} className="text-[11px] leading-relaxed">
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div className="p-2.5 rounded bg-emerald-50/70 border border-emerald-200">
                      <span className="font-bold text-emerald-900 block mb-0.5 text-[11px]">
                        Expected Result:
                      </span>
                      <p className="text-emerald-800 text-[11px]">{tc.expectedResult}</p>
                    </div>

                    <div className="p-2.5 rounded bg-blue-50/70 border border-blue-200">
                      <span className="font-bold text-blue-900 block mb-0.5 text-[11px]">
                        Actual Result (Verified):
                      </span>
                      <p className="text-blue-800 text-[11px]">{tc.actualResult}</p>
                    </div>
                  </div>

                  {tc.syntheticPayloadPreview && (
                    <div className="mt-1">
                      <span className="font-semibold text-slate-700 text-[11px] block mb-0.5">
                        Synthetic Sanitized Payload Preview:
                      </span>
                      <pre className="bg-slate-900 text-emerald-400 p-2 rounded text-[10px] font-mono overflow-x-auto">
                        {tc.syntheticPayloadPreview}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
