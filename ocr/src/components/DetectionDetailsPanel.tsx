import React, { useState } from 'react';
import {
  Crosshair,
  Percent,
  Copy,
  Check,
  ShieldAlert,
  Code2,
  X,
  Target
} from 'lucide-react';
import { OcrDetection } from '../types/privagent';
import { calculateM3ActionTarget } from '../services/detectionNormalizer';

interface DetectionDetailsPanelProps {
  detection: OcrDetection | null;
  devicePixelRatio?: number;
  onClose: () => void;
}

export const DetectionDetailsPanel: React.FC<DetectionDetailsPanelProps> = ({
  detection,
  devicePixelRatio = 1,
  onClose
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!detection) return null;

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const { boundingBox, normalizedBox, sensitiveSignal } = detection;
  const m3ActionTarget = calculateM3ActionTarget(detection, devicePixelRatio);

  // Generate M1 format
  const m1Payload = {
    id: detection.id,
    text: detection.text,
    coordinates: boundingBox,
    normalizedCoordinates: normalizedBox,
    viewportClickPoint: m3ActionTarget.viewportClickPoint,
    confidence: detection.confidence,
    isPotentialSensitive: Boolean(sensitiveSignal)
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4 text-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-pink-400" />
          <h3 className="font-semibold text-slate-100">
            Detection Inspector: <span className="font-mono text-pink-400">{detection.id}</span>
          </h3>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800 transition"
          aria-label="Close details"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Raw Text Box */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-slate-400 font-medium">Recognized Text</span>
          <button
            onClick={() => copyToClipboard(detection.text, 'text')}
            className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300"
          >
            {copiedField === 'text' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copiedField === 'text' ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 font-mono text-xs break-all selection:bg-pink-500 selection:text-white">
          {detection.text}
        </div>
      </div>

      {/* Metric Gauges */}
      <div className="grid grid-cols-2 gap-3">
        {/* Confidence Gauge */}
        <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="flex items-center gap-1">
              <Percent className="w-3.5 h-3.5 text-cyan-400" /> Confidence
            </span>
            <span className="font-mono font-bold text-slate-100">{detection.confidence}%</span>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                detection.confidence > 80
                  ? 'bg-emerald-400'
                  : detection.confidence > 50
                  ? 'bg-amber-400'
                  : 'bg-rose-400'
              }`}
              style={{ width: `${detection.confidence}%` }}
            />
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Tesseract statistical confidence</div>
        </div>

        {/* Center Target Point */}
        <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="flex items-center gap-1">
              <Crosshair className="w-3.5 h-3.5 text-indigo-400" /> M3 Viewport Click Target
            </span>
            <span className="text-[10px] text-cyan-300 font-mono">DPR: {m3ActionTarget.devicePixelRatio}x</span>
          </div>
          <div className="font-mono text-slate-100 text-[11px] font-semibold">
            Viewport: ({m3ActionTarget.viewportClickPoint.x}px, {m3ActionTarget.viewportClickPoint.y}px)
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
            Raw: ({m3ActionTarget.clickPoint.x}px, {m3ActionTarget.clickPoint.y}px)
          </div>
          <div className="text-[10px] text-indigo-300/80 mt-0.5 font-mono">
            norm: ({m3ActionTarget.normalizedClickPoint.x}, {m3ActionTarget.normalizedClickPoint.y})
          </div>
        </div>
      </div>

      {/* Coordinate Matrices */}
      <div className="space-y-2">
        <div className="text-slate-400 font-medium flex items-center justify-between">
          <span>Coordinate Specifications</span>
          <span className="text-[10px] text-slate-500">Origin: (0,0) Top-Left</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
          {/* Pixel Coordinates */}
          <div className="p-2 rounded bg-slate-950/70 border border-slate-800">
            <div className="text-slate-400 font-semibold mb-1">Pixel Coordinates</div>
            <div className="space-y-0.5 text-slate-300">
              <div>X: <span className="text-cyan-300">{boundingBox.x}px</span></div>
              <div>Y: <span className="text-cyan-300">{boundingBox.y}px</span></div>
              <div>W: <span className="text-cyan-300">{boundingBox.width}px</span></div>
              <div>H: <span className="text-cyan-300">{boundingBox.height}px</span></div>
            </div>
          </div>

          {/* Normalized Coordinates */}
          <div className="p-2 rounded bg-slate-950/70 border border-slate-800">
            <div className="text-slate-400 font-semibold mb-1">Normalized [0.0 - 1.0]</div>
            <div className="space-y-0.5 text-slate-300">
              <div>normX: <span className="text-indigo-300">{normalizedBox.normalizedX}</span></div>
              <div>normY: <span className="text-indigo-300">{normalizedBox.normalizedY}</span></div>
              <div>normW: <span className="text-indigo-300">{normalizedBox.normalizedWidth}</span></div>
              <div>normH: <span className="text-indigo-300">{normalizedBox.normalizedHeight}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Sensitive Demonstration Signal Warning (If active) */}
      {sensitiveSignal && (
        <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800/80 text-amber-200">
          <div className="flex items-center gap-1.5 font-semibold text-amber-300 mb-1">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>Sensitive Signal: {sensitiveSignal.patternName}</span>
          </div>
          <p className="text-[11px] text-amber-200/90 leading-relaxed mb-1">
            Matched Substring: <code className="bg-amber-900/60 px-1 py-0.5 rounded font-mono">{sensitiveSignal.matchedSnippet}</code>
          </p>
          <p className="text-[10px] text-amber-300/70">
            {sensitiveSignal.note}
          </p>
        </div>
      )}

      {/* M1/M2 Downstream Payload Preview */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-slate-400 font-medium flex items-center gap-1">
            <Code2 className="w-3.5 h-3.5 text-emerald-400" /> M1/M2 Integration Payload
          </span>
          <button
            onClick={() => copyToClipboard(JSON.stringify(m1Payload, null, 2), 'payload')}
            className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
          >
            {copiedField === 'payload' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copiedField === 'payload' ? 'Copied JSON' : 'Copy JSON'}</span>
          </button>
        </div>
        <pre className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 text-[10px] font-mono overflow-x-auto max-h-28">
          {JSON.stringify(m1Payload, null, 2)}
        </pre>
      </div>
    </div>
  );
};
