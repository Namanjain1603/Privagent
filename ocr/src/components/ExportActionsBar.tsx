import React from 'react';
import { Download, FileJson, FileText, Table, RotateCcw } from 'lucide-react';
import { OcrResultBundle } from '../types/privagent';
import {
  exportResultsAsJson,
  exportResultsAsText,
  exportDetectionsAsCsv
} from '../services/exportService';

interface ExportActionsBarProps {
  bundle: OcrResultBundle | null;
  onReset: () => void;
  isProcessing: boolean;
}

export const ExportActionsBar: React.FC<ExportActionsBarProps> = ({
  bundle,
  onReset,
  isProcessing
}) => {
  if (!bundle && !isProcessing) return null;

  const hasResults = Boolean(bundle && bundle.detections.length > 0);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-2">
        <Download className="w-4 h-4 text-indigo-400" />
        <span className="font-semibold text-slate-200">Export Structured Results:</span>
        <span className="text-slate-400 hidden md:inline">
          Save real extracted text and normalized coordinate JSON locally
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
        {/* JSON Export */}
        <button
          id="export-json-btn"
          onClick={() => bundle && exportResultsAsJson(bundle)}
          disabled={!hasResults || isProcessing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition disabled:opacity-40"
          title="Download full structured results bundle as JSON"
        >
          <FileJson className="w-3.5 h-3.5 text-cyan-400" />
          <span>JSON Bundle</span>
        </button>

        {/* Plain Text Export */}
        <button
          id="export-txt-btn"
          onClick={() =>
            bundle && exportResultsAsText(bundle.fullText, bundle.metadata.imageFileName)
          }
          disabled={!hasResults || isProcessing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition disabled:opacity-40"
          title="Download recognized raw text as .txt"
        >
          <FileText className="w-3.5 h-3.5 text-indigo-400" />
          <span>Plain Text (.txt)</span>
        </button>

        {/* CSV Export */}
        <button
          id="export-csv-btn"
          onClick={() =>
            bundle && exportDetectionsAsCsv(bundle.detections, bundle.metadata.imageFileName)
          }
          disabled={!hasResults || isProcessing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition disabled:opacity-40"
          title="Download coordinate tabular detections as .csv"
        >
          <Table className="w-3.5 h-3.5 text-emerald-400" />
          <span>CSV Table</span>
        </button>

        {/* Reset Option */}
        <button
          id="reset-all-btn"
          onClick={onReset}
          disabled={isProcessing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 transition disabled:opacity-40"
          title="Clear current screenshot and OCR results"
        >
          <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
          <span>Reset</span>
        </button>
      </div>
    </div>
  );
};
