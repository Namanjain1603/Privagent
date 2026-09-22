import React, { useState } from 'react';
import { Copy, Check, Search, AlignLeft, ListFilter, FileText } from 'lucide-react';
import { OcrDetection } from '../types/privagent';

interface ExtractedTextPanelProps {
  fullText: string;
  detections: OcrDetection[];
  onSelectDetection: (id: string) => void;
  selectedDetectionId: string | null;
}

export const ExtractedTextPanel: React.FC<ExtractedTextPanelProps> = ({
  fullText,
  detections,
  onSelectDetection,
  selectedDetectionId
}) => {
  const [viewMode, setViewMode] = useState<'plain' | 'structured'>('plain');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!fullText) return;
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const textArea = document.createElement('textarea');
      textArea.value = fullText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const filteredDetections = detections.filter((d) =>
    d.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const charCount = fullText.length;
  const wordCount = fullText.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-sm flex flex-col h-[520px]">
      {/* Panel Header */}
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-400" />
          <h2 className="font-semibold text-slate-100">Recognized Text Output</h2>
          {fullText && (
            <span className="text-slate-400 font-mono">
              ({wordCount} words • {charCount} chars)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-800 border border-slate-700 rounded p-0.5">
            <button
              id="view-plain-btn"
              onClick={() => setViewMode('plain')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition ${
                viewMode === 'plain'
                  ? 'bg-indigo-950 text-indigo-200 border border-indigo-700/60'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="flex items-center gap-1">
                <AlignLeft className="w-3 h-3" /> Full Text
              </span>
            </button>
            <button
              id="view-structured-btn"
              onClick={() => setViewMode('structured')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition ${
                viewMode === 'structured'
                  ? 'bg-indigo-950 text-indigo-200 border border-indigo-700/60'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="flex items-center gap-1">
                <ListFilter className="w-3 h-3" /> Regions ({detections.length})
              </span>
            </button>
          </div>

          {/* Copy Button */}
          <button
            id="copy-extracted-text-btn"
            onClick={handleCopy}
            disabled={!fullText}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition disabled:opacity-40 ${
              copied
                ? 'bg-emerald-950 border-emerald-600 text-emerald-300'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
            }`}
            title="Copy full text to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Text'}</span>
          </button>
        </div>
      </div>

      {/* Search Input for Structured View */}
      {viewMode === 'structured' && detections.length > 0 && (
        <div className="p-2.5 border-b border-slate-800 bg-slate-950/40">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search extracted text regions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      )}

      {/* Main Text Content Area */}
      <div className="flex-1 overflow-y-auto p-4 font-mono text-xs">
        {!fullText ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center">
            <AlignLeft className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-xs">No text recognized yet.</p>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Execute OCR on a screenshot to populate text results.
            </p>
          </div>
        ) : viewMode === 'plain' ? (
          <div className="whitespace-pre-wrap leading-relaxed text-slate-300 bg-slate-950/50 p-3 rounded-lg border border-slate-800/80 selection:bg-indigo-500 selection:text-white">
            {fullText}
          </div>
        ) : (
          <div className="space-y-1.5">
            {filteredDetections.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                {searchQuery
                  ? `No matching regions found for "${searchQuery}"`
                  : 'No visual bounding box regions detected for this image.'}
              </div>
            ) : (
              filteredDetections.map((detection) => {
                const isSelected = selectedDetectionId === detection.id;
                const hasSignal = Boolean(detection.sensitiveSignal);

                return (
                  <div
                    key={detection.id}
                    id={`region-item-${detection.id}`}
                    onClick={() => onSelectDetection(detection.id)}
                    className={`p-2.5 rounded-lg border cursor-pointer transition flex items-start justify-between gap-3 ${
                      isSelected
                        ? 'bg-pink-950/40 border-pink-500 text-slate-100 shadow-sm'
                        : hasSignal
                        ? 'bg-amber-950/20 border-amber-800/60 hover:bg-amber-950/40 text-slate-200'
                        : 'bg-slate-800/40 border-slate-800 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-slate-400 text-[10px] uppercase">
                          {detection.id}
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 text-[10px]">
                          {detection.type}
                        </span>
                        {hasSignal && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-900/60 border border-amber-700/60 text-amber-300 text-[10px] font-semibold">
                            ⚠ {detection.sensitiveSignal?.patternName}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-100 font-sans text-xs break-words">
                        {detection.text}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-[11px] font-mono text-cyan-400 font-medium">
                        {detection.confidence}%
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {detection.boundingBox.width}×{detection.boundingBox.height}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
