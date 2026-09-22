import React from 'react';
import { Sliders, Play, Sparkles, ShieldAlert, Check } from 'lucide-react';
import { OcrProcessingOptions } from '../types/privagent';

interface ImagePreprocessorControlsProps {
  options: OcrProcessingOptions;
  onOptionsChange: (newOptions: OcrProcessingOptions) => void;
  onRunOcr: () => void;
  isProcessing: boolean;
  hasImage: boolean;
}

export const ImagePreprocessorControls: React.FC<ImagePreprocessorControlsProps> = ({
  options,
  onOptionsChange,
  onRunOcr,
  isProcessing,
  hasImage
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-semibold text-slate-100">OCR &amp; Vision Configuration</h2>
        </div>
      </div>

      <div className="space-y-4 text-xs">
        {/* Detection Granularity */}
        <div>
          <label className="block text-slate-300 font-medium mb-1.5">
            Detection Granularity
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'lines', label: 'Lines', desc: 'Layout & Sentences' },
              { id: 'words', label: 'Words', desc: 'Individual Tokens' },
              { id: 'both', label: 'Both', desc: 'Lines & Words' }
            ].map((item) => {
              const isSelected = options.granularity === item.id;
              return (
                <button
                  key={item.id}
                  id={`granularity-btn-${item.id}`}
                  onClick={() =>
                    onOptionsChange({
                      ...options,
                      granularity: item.id as 'words' | 'lines' | 'both'
                    })
                  }
                  className={`p-2 rounded-lg border text-left transition ${
                    isSelected
                      ? 'bg-indigo-950/80 border-indigo-500 text-white shadow-sm'
                      : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <div className="font-semibold flex items-center justify-between">
                    <span>{item.label}</span>
                    {isSelected && <Check className="w-3 h-3 text-indigo-400" />}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{item.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Canvas Preprocessing Toggles */}
        <div className="pt-2 border-t border-slate-800">
          <label className="block text-slate-300 font-medium mb-2">
            Canvas Preprocessing (Image Enhancement)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-800/40 border border-slate-700/70 hover:border-slate-600 cursor-pointer">
              <input
                type="checkbox"
                id="enhance-contrast-checkbox"
                checked={options.enhanceContrast}
                onChange={(e) =>
                  onOptionsChange({ ...options, enhanceContrast: e.target.checked })
                }
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-700 bg-slate-900"
              />
              <div>
                <div className="text-slate-200 font-medium">Contrast Boost</div>
                <div className="text-[10px] text-slate-400">Aids low-contrast UI text</div>
              </div>
            </label>

            <label className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-800/40 border border-slate-700/70 hover:border-slate-600 cursor-pointer">
              <input
                type="checkbox"
                id="binarize-checkbox"
                checked={options.binarize}
                onChange={(e) => onOptionsChange({ ...options, binarize: e.target.checked })}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-700 bg-slate-900"
              />
              <div>
                <div className="text-slate-200 font-medium">Binarize (Adaptive)</div>
                <div className="text-[10px] text-slate-400">High-contrast monochrome</div>
              </div>
            </label>
          </div>
        </div>

        {/* Sensitive Data Heuristic Demonstration Toggle */}
        <div className="pt-2 border-t border-slate-800">
          <div className="p-3 rounded-lg bg-slate-800/60 border border-amber-900/40">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="font-semibold text-amber-200">
                  Sensitive-Data Region Signals (Demo)
                </span>
              </div>
              <input
                type="checkbox"
                id="sensitive-demo-checkbox"
                checked={options.detectSensitiveDemonstration}
                onChange={(e) =>
                  onOptionsChange({
                    ...options,
                    detectSensitiveDemonstration: e.target.checked
                  })
                }
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-700 bg-slate-900 cursor-pointer"
              />
            </div>
            <p className="text-[11px] text-slate-300 mt-1.5 leading-relaxed">
              Demonstrates local heuristic signals for potential Email, Phone, PAN, &amp; Aadhaar patterns.
              <span className="text-amber-300 font-medium block mt-1">
                Notice: For preview/testing only; does not replace Member 2&apos;s authoritative Privacy Guard &amp; Redaction policy engine.
              </span>
            </p>
          </div>
        </div>

        {/* Primary Action Button */}
        <div className="pt-2">
          <button
            id="run-local-ocr-btn"
            onClick={onRunOcr}
            disabled={!hasImage || isProcessing}
            className={`w-full py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition text-sm shadow-md ${
              !hasImage
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : isProcessing
                ? 'bg-indigo-900 text-indigo-200 cursor-wait'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
            }`}
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-indigo-300 border-t-transparent rounded-full animate-spin" />
                <span>Processing Local OCR (WASM)...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Execute Local OCR on Screenshot</span>
              </>
            )}
          </button>
          {!hasImage && (
            <p className="text-[11px] text-center text-slate-500 mt-2">
              Upload a screenshot or click a synthetic demo preset above to begin.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
