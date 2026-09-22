import React, { useState } from 'react';
import {
  X,
  FileCode,
  Layers,
  Shield,
  Bot,
  Globe,
  Server,
  TestTube2,
  Copy,
  Check
} from 'lucide-react';

interface IntegrationContractModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IntegrationContractModal: React.FC<IntegrationContractModalProps> = ({
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'contracts' | 'coordinates' | 'serviceApi'>('overview');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  if (!isOpen) return null;

  const copySnippet = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const tsContractsCode = `// PRIVAGENT Standardized Data Contract (SIH 2026 - PS SIH26171)
// Produced by Member 4 (OCR & Vision Module)

export interface BoundingBox {
  x: number;       // Top-left X in original image pixels
  y: number;       // Top-left Y in original image pixels
  width: number;   // Box width in pixels
  height: number;  // Box height in pixels
}

export interface NormalizedBoundingBox {
  normalizedX: number;       // Range [0.0 - 1.0] from image left
  normalizedY: number;       // Range [0.0 - 1.0] from image top
  normalizedWidth: number;   // Relative width [0.0 - 1.0]
  normalizedHeight: number;  // Relative height [0.0 - 1.0]
}

export interface OcrDetection {
  id: string;               // e.g. "m4-line-0001" or "m4-word-0042"
  text: string;             // Raw extracted text string
  type: 'word' | 'line' | 'block';
  boundingBox: BoundingBox;
  normalizedBox: NormalizedBoundingBox;
  viewportClickPoint?: {    // CSS viewport space: clickPoint / devicePixelRatio
    x: number;
    y: number;
  };
  confidence: number;       // 0 to 100 statistical confidence
  lineIndex?: number;
  wordIndex?: number;
  sensitiveSignal?: {       // Optional demonstration heuristic
    type: 'email' | 'phone' | 'pan_card' | 'aadhaar_card' | 'credit_card';
    patternName: string;
    matchedSnippet: string;
    confidence: number;
    note: string;
  };
}

export interface OcrResultBundle {
  metadata: {
    imageFileName: string;
    imageWidth: number;
    imageHeight: number;
    fileSize: number;
    fileType: string;
    devicePixelRatio: number; // Browser scale factor at capture (e.g. 1.0 or 2.0)
    viewportWidth: number;    // CSS viewport width: imageWidth / devicePixelRatio
    viewportHeight: number;   // CSS viewport height: imageHeight / devicePixelRatio
    processingTimeMs: number;
    timestamp: string;
    engine: string;
  };
  fullText: string;
  detections: OcrDetection[];
  summary: {
    totalDetections: number;
    wordCount: number;
    lineCount: number;
    averageConfidence: number;
    heuristicFlaggedCount: number;
  };
  privacyGuarantee: {
    localInBrowser: true;
    remoteVisionApiCalled: false;
    screenshotSentToBackend: false;
    telemetrySent: false;
  };
}`;

  const serviceLayerCode = `// Member 4 Service Layer Functions:
// In src/services/ocrService.ts and src/services/detectionNormalizer.ts

import { processScreenshot } from './services/ocrService';
import { normalizeOcrResults } from './services/detectionNormalizer';
import { detectPossibleSensitivePatterns } from './services/sensitiveSignals';
import { exportResultsAsJson } from './services/exportService';

// 1. Core OCR execution on canvas or image:
const bundle = await processScreenshot(
  imageSource,     // HTMLImageElement | HTMLCanvasElement
  metadata,        // { fileName, fileSize, fileType }
  options,         // { granularity: 'lines' | 'words', enhanceContrast, binarize }
  (progress) => {  // Real-time progress callback
    console.log(progress.phase, progress.progress, progress.message);
  }
);

// 2. Direct normalization helper:
const detections = normalizeOcrResults(
  rawTesseractData,
  imageWidth,
  imageHeight,
  { granularity: 'lines' }
);

// 3. Pre-M2 demonstration signal detector:
const flagged = detectPossibleSensitivePatterns(detections);

// 4. Client-side export:
exportResultsAsJson(bundle);`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-200 text-xs">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-400">
              <FileCode className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                PRIVAGENT Member 4 Integration Specification
              </h2>
              <p className="text-xs text-slate-400">
                Module API Contract, Coordinate Conventions &amp; Team Hand-Off Architecture
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/30 px-6 gap-2">
          {[
            { id: 'overview', label: 'Team Architecture (M1-M6)' },
            { id: 'serviceApi', label: 'Service Layer API' },
            { id: 'contracts', label: 'TypeScript Contracts' },
            { id: 'coordinates', label: 'Coordinate System' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 px-3 text-xs font-semibold border-b-2 transition ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/80 leading-relaxed text-slate-300">
                <span className="font-semibold text-white">Project Scope &amp; Responsibilities: </span>
                PRIVAGENT is a Privacy-First Visual Browser Agent for SIH 2026. This module represents
                <strong className="text-cyan-400"> Member 4 (OCR &amp; Vision)</strong>. It is built as an independent,
                locally testable module that ingests screenshots from Member 3, executes local OCR, and outputs
                structured visual regions to Members 1 &amp; 2 without sending any data over external networks.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* M3 Card */}
                <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60">
                  <div className="flex items-center gap-2 text-indigo-400 font-bold mb-1">
                    <Globe className="w-4 h-4" />
                    <span>Member 3 • Browser Integration &amp; Execution</span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    <strong>Inputs to M4:</strong> Captures browser tab screenshots via Chrome Extension / CDP, passing the raw image blob or canvas to M4.
                    <br />
                    <strong>Outputs from M4:</strong> Receives clickable center points (X, Y) and bounding boxes for element targeting.
                  </p>
                </div>

                {/* M2 Card */}
                <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60">
                  <div className="flex items-center gap-2 text-amber-400 font-bold mb-1">
                    <Shield className="w-4 h-4" />
                    <span>Member 2 • Privacy Guard, Policy &amp; Redaction</span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    <strong>Consumes M4:</strong> Receives normalized detection tokens and provisional heuristic signals.
                    <br />
                    <strong>Owns:</strong> Definitive PII classification, redaction masks, user consent prompts, and regulatory policy enforcement.
                  </p>
                </div>

                {/* M1 Card */}
                <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60">
                  <div className="flex items-center gap-2 text-purple-400 font-bold mb-1">
                    <Bot className="w-4 h-4" />
                    <span>Member 1 • Agent Reasoning &amp; Planning</span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    <strong>Consumes M4:</strong> Reads visual elements, layout semantics, and normalized coordinate trees to plan browser actions (e.g. &ldquo;Click checkout button at (450, 520)&rdquo;).
                  </p>
                </div>

                {/* M5 & M6 Card */}
                <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold mb-1">
                    <Server className="w-4 h-4" />
                    <span>Members 5 &amp; 6 • Backend &amp; Integration Testing</span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    <strong>Integrates:</strong> Audits end-to-end telemetry (guaranteeing zero image leakage) and runs automated synthetic benchmarks against M4 exports.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'serviceApi' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-300">Clean Service Layer Implementation</span>
                <button
                  onClick={() => copySnippet(serviceLayerCode, 'service')}
                  className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300"
                >
                  {copiedCode === 'service' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCode === 'service' ? 'Copied' : 'Copy Service Code'}</span>
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto leading-relaxed">
                {serviceLayerCode}
              </pre>
            </div>
          )}

          {activeTab === 'contracts' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-300">Standardized TypeScript Interface Specifications</span>
                <button
                  onClick={() => copySnippet(tsContractsCode, 'ts')}
                  className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300"
                >
                  {copiedCode === 'ts' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCode === 'ts' ? 'Copied' : 'Copy Types'}</span>
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto leading-relaxed">
                {tsContractsCode}
              </pre>
            </div>
          )}

          {activeTab === 'coordinates' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 leading-relaxed text-slate-300 space-y-3">
                <h4 className="text-sm font-bold text-white">Coordinate System Conventions</h4>
                <p>
                  To ensure deterministic visual alignment across varied screen densities (DPR) and viewport resizes:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
                  <li>
                    <strong>Origin (0,0):</strong> Strictly defined as the <em>Top-Left corner</em> of the original screenshot.
                  </li>
                  <li>
                    <strong>Pixel Bounding Box:</strong> Measured in native unscaled image pixels:
                    <br />
                    <code className="bg-slate-950 px-1.5 py-0.5 rounded text-cyan-300">
                      boundingBox = &#123; x: Math.round(x0), y: Math.round(y0), width: x1 - x0, height: y1 - y0 &#125;
                    </code>
                  </li>
                  <li>
                    <strong>Normalized Bounding Box:</strong> Resolution-independent unit scale [0.0 to 1.0]:
                    <br />
                    <code className="bg-slate-950 px-1.5 py-0.5 rounded text-indigo-300">
                      normalizedX = x / imageWidth, normalizedY = y / imageHeight
                    </code>
                  </li>
                  <li>
                    <strong>Action Click Target for Member 3:</strong> Computed as bounding box geometric center:
                    <br />
                    <code className="bg-slate-950 px-1.5 py-0.5 rounded text-emerald-300">
                      clickPoint = &#123; x: x + width/2, y: y + height/2 &#125; (native screenshot pixels)
                    </code>
                  </li>
                  <li>
                    <strong>Viewport Space Click Target (DPR Adjusted):</strong> Scaled for browser DOM execution:
                    <br />
                    <code className="bg-slate-950 px-1.5 py-0.5 rounded text-pink-300">
                      viewportClickPoint = &#123; x: clickPoint.x / DPR, y: clickPoint.y / DPR &#125;
                    </code>
                    <br />
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Note: Normalized coordinates [0.0 - 1.0] are resolution-independent and strictly NOT divided by DPR.
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            PRIVAGENT Member 4 • Ready for seamless monorepo / package integration
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition"
          >
            Close Specification
          </button>
        </div>
      </div>
    </div>
  );
};
