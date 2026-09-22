import React, { useState, useRef, useEffect } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Eye,
  EyeOff,
  ShieldAlert,
  Tag,
  Crosshair
} from 'lucide-react';
import { OcrDetection } from '../types/privagent';

interface VisualCanvasOverlayProps {
  imageUrl: string | null;
  imageWidth: number;
  imageHeight: number;
  detections: OcrDetection[];
  selectedDetectionId: string | null;
  onSelectDetection: (id: string | null) => void;
  showSensitiveSignals: boolean;
}

export const VisualCanvasOverlay: React.FC<VisualCanvasOverlayProps> = ({
  imageUrl,
  imageWidth,
  imageHeight,
  detections,
  selectedDetectionId,
  onSelectDetection,
  showSensitiveSignals
}) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showBoxes, setShowBoxes] = useState(true);
  const [showLabels, setShowLabels] = useState(false);
  const [hoveredDetectionId, setHoveredDetectionId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset zoom when image changes
  useEffect(() => {
    setZoomLevel(1);
  }, [imageUrl]);

  if (!imageUrl) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 flex flex-col items-center justify-center min-h-[420px] text-center">
        <div className="w-16 h-16 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-500 mb-3">
          <Crosshair className="w-8 h-8" />
        </div>
        <h3 className="text-sm font-semibold text-slate-300">Visual Screenshot Canvas</h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          Upload a browser screenshot or choose a synthetic preset to view visual regions and OCR bounding box overlays.
        </p>
      </div>
    );
  }

  const zoomIn = () => setZoomLevel((z) => Math.min(3.0, Number((z + 0.25).toFixed(2))));
  const zoomOut = () => setZoomLevel((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))));
  const resetZoom = () => setZoomLevel(1);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-sm overflow-hidden flex flex-col">
      {/* Control Bar */}
      <div className="px-4 py-2.5 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-200">Screenshot Visualizer</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400 font-mono">
            {imageWidth} × {imageHeight} px
          </span>
          {detections.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-indigo-950 border border-indigo-700/60 text-indigo-300 text-[11px] font-medium">
              {detections.length} regions
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle Bounding Boxes */}
          <button
            id="toggle-bounding-boxes-btn"
            onClick={() => setShowBoxes(!showBoxes)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded border transition ${
              showBoxes
                ? 'bg-indigo-950 border-indigo-600 text-indigo-200'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle OCR Bounding Boxes"
          >
            {showBoxes ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>Boxes {showBoxes ? 'On' : 'Off'}</span>
          </button>

          {/* Toggle Box Text Labels */}
          <button
            id="toggle-box-labels-btn"
            onClick={() => setShowLabels(!showLabels)}
            disabled={!showBoxes || detections.length === 0}
            className={`flex items-center gap-1 px-2.5 py-1 rounded border transition disabled:opacity-40 ${
              showLabels
                ? 'bg-cyan-950 border-cyan-600 text-cyan-200'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Text Labels on Bounding Boxes"
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Labels</span>
          </button>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded p-0.5">
            <button
              onClick={zoomOut}
              disabled={zoomLevel <= 0.5}
              className="p-1 hover:bg-slate-700 rounded text-slate-300 disabled:opacity-30"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[11px] px-1 text-slate-300 min-w-[3rem] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={zoomIn}
              disabled={zoomLevel >= 3.0}
              className="p-1 hover:bg-slate-700 rounded text-slate-300 disabled:opacity-30"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={resetZoom}
              className="p-1 hover:bg-slate-700 rounded text-slate-300"
              title="Reset Zoom"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Interactive Stage */}
      <div
        ref={containerRef}
        className="relative overflow-auto p-4 flex items-center justify-center min-h-[460px] max-h-[640px] bg-slate-950/80 select-none"
      >
        <div
          className="relative inline-block transition-transform duration-100 ease-out origin-top-left"
          style={{
            transform: `scale(${zoomLevel})`
          }}
        >
          {/* Base Screenshot Image */}
          <img
            src={imageUrl}
            alt="Uploaded Screenshot"
            className="block max-w-none rounded shadow-lg"
            style={{
              width: `${imageWidth}px`,
              height: `${imageHeight}px`
            }}
          />

          {/* SVG Overlay for Pixel-Perfect Scaled Bounding Boxes */}
          {showBoxes && detections.length > 0 && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox={`0 0 ${imageWidth} ${imageHeight}`}
              preserveAspectRatio="none"
            >
              {detections.map((detection) => {
                const isSelected = selectedDetectionId === detection.id;
                const isHovered = hoveredDetectionId === detection.id;
                const hasSensitiveSignal =
                  showSensitiveSignals && Boolean(detection.sensitiveSignal);

                const { x, y, width, height } = detection.boundingBox;

                // Color schemes
                let strokeColor = 'rgba(56, 189, 248, 0.75)'; // cyan default
                let fillColor = 'rgba(56, 189, 248, 0.08)';

                if (hasSensitiveSignal) {
                  strokeColor = 'rgba(245, 158, 11, 0.9)'; // amber warning
                  fillColor = 'rgba(245, 158, 11, 0.16)';
                }

                if (isHovered) {
                  strokeColor = hasSensitiveSignal
                    ? 'rgba(245, 158, 11, 1)'
                    : 'rgba(99, 102, 241, 1)';
                  fillColor = hasSensitiveSignal
                    ? 'rgba(245, 158, 11, 0.28)'
                    : 'rgba(99, 102, 241, 0.22)';
                }

                if (isSelected) {
                  strokeColor = '#ec4899'; // magenta highlight for explicit selection
                  fillColor = 'rgba(236, 72, 153, 0.28)';
                }

                return (
                  <g
                    key={detection.id}
                    id={`svg-box-${detection.id}`}
                    className="pointer-events-auto cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectDetection(isSelected ? null : detection.id);
                    }}
                    onMouseEnter={() => setHoveredDetectionId(detection.id)}
                    onMouseLeave={() => setHoveredDetectionId(null)}
                  >
                    {/* Bounding Rectangle */}
                    <rect
                      x={x}
                      y={y}
                      width={width}
                      height={height}
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth={isSelected ? 3 : isHovered ? 2 : 1.5}
                      rx={2}
                      className="transition-all duration-150"
                    />

                    {/* Sensitive Tag Flag Indicator */}
                    {hasSensitiveSignal && (
                      <g transform={`translate(${x}, ${Math.max(0, y - 18)})`}>
                        <rect
                          x={0}
                          y={0}
                          width={65}
                          height={16}
                          rx={3}
                          fill="#78350f"
                          stroke="#d97706"
                          strokeWidth={1}
                        />
                        <text
                          x={5}
                          y={11}
                          fill="#fef3c7"
                          fontSize="9"
                          fontFamily="sans-serif"
                          fontWeight="bold"
                        >
                          ⚠ {detection.sensitiveSignal?.type.slice(0, 7)}
                        </text>
                      </g>
                    )}

                    {/* Optional Inline Text or Confidence Label */}
                    {showLabels && !hasSensitiveSignal && (
                      <g transform={`translate(${x}, ${Math.max(0, y - 14)})`}>
                        <rect
                          x={0}
                          y={0}
                          width={Math.min(100, Math.max(34, width))}
                          height={14}
                          rx={2}
                          fill="rgba(15, 23, 42, 0.85)"
                          stroke={strokeColor}
                          strokeWidth={0.7}
                        />
                        <text
                          x={3}
                          y={10}
                          fill="#f1f5f9"
                          fontSize="9"
                          fontFamily="sans-serif"
                        >
                          {detection.confidence}%
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
          )}
        </div>
      </div>

      {/* Footer Info & Legend */}
      <div className="px-4 py-2 bg-slate-950/40 border-t border-slate-800 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-sky-400/20 border border-sky-400" />
            <span>Standard Text Region</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-400/20 border border-amber-400" />
            <span>Heuristic Sensitive Match</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-pink-500/20 border border-pink-500" />
            <span>Selected Region</span>
          </div>
        </div>

        <span className="text-slate-500">
          Click any region to inspect normalized coordinates and metadata
        </span>
      </div>
    </div>
  );
};
