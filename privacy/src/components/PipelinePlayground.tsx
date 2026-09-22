import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  Settings2, 
  Sliders, 
  Layers,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { SYNTHETIC_SCENARIOS, SyntheticScenario } from '../data/syntheticScenarios';
import { PrivacyGuardCoordinator } from '../modules/privacyGuardCoordinator';
import { DetectedEntity, RedactionPolicy, PIICategory } from '../types/privacy';

interface PipelinePlaygroundProps {
  coordinator: PrivacyGuardCoordinator;
  policy: RedactionPolicy;
  onUpdatePolicy: (newPolicy: Partial<RedactionPolicy>) => void;
  onDetectionsChange: (count: number) => void;
}

export const PipelinePlayground: React.FC<PipelinePlaygroundProps> = ({
  coordinator,
  policy,
  onUpdatePolicy,
  onDetectionsChange
}) => {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(SYNTHETIC_SCENARIOS[0].id);
  const [customDomInput, setCustomDomInput] = useState<string>('');
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  
  // Inspection states
  const [detections, setDetections] = useState<DetectedEntity[]>([]);
  const [sanitizedDom, setSanitizedDom] = useState<string>('');
  const [verificationPassed, setVerificationPassed] = useState<boolean>(true);
  const [verificationLeaks, setVerificationLeaks] = useState<string[]>([]);
  const [executionDurationMs, setExecutionDurationMs] = useState<number>(0);
  const [showPolicyModal, setShowPolicyModal] = useState<boolean>(false);
  const [activeViewMode, setActiveViewMode] = useState<'visual' | 'dom' | 'tokens'>('visual');

  // Canvas references
  const rawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const redactedCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const currentScenario: SyntheticScenario = 
    SYNTHETIC_SCENARIOS.find(s => s.id === selectedScenarioId) || SYNTHETIC_SCENARIOS[0];

  // Pipeline execution runner
  const runPipeline = () => {
    const rawCanvas = rawCanvasRef.current;
    const redactedCanvas = redactedCanvasRef.current;
    if (!rawCanvas || !redactedCanvas) return;

    // Reset coordinator token store for fresh deterministic run
    coordinator.maskingEngine.reset();

    const domHtml = isCustomMode ? customDomInput : currentScenario.rawDomHtml;
    const visualElements = isCustomMode 
      ? [{ text: customDomInput, x: 40, y: 120, font: '14px monospace', color: '#f8fafc' }]
      : currentScenario.visualElements;
    const ocrDetections = isCustomMode ? [] : currentScenario.ocrDetections;

    // Step 1: Render raw canvas mockup with RAW unredacted elements (On-Device Local Memory)
    coordinator.visualRedactor.renderMockupPage(rawCanvas, visualElements);

    // Step 2: Execute M2 Privacy Guard Processing
    const start = performance.now();
    const result = coordinator.processPageContext(
      `sess_${Date.now()}`,
      {
        domain: isCustomMode ? 'custom-sandbox.local' : currentScenario.domain,
        title: isCustomMode ? 'Custom DOM Page' : currentScenario.pageTitle,
        viewport: { width: 560, height: 480 }
      },
      domHtml,
      redactedCanvas,
      ocrDetections
    );
    const end = performance.now();

    // Step 3: Render SANITIZED visual elements on redactedCanvas
    // Replaces each detected sensitive entity in text or input fields with its substitution token
    const sanitizedVisualElements = visualElements.map(el => ({
      ...el,
      text: el.text ? coordinator.maskingEngine.maskString(el.text, result.detections).maskedText : '',
      inputValue: el.inputValue ? coordinator.maskingEngine.maskString(el.inputValue, result.detections).maskedText : undefined
    }));

    coordinator.visualRedactor.renderMockupPage(redactedCanvas, sanitizedVisualElements);

    // Step 4: Apply visual redaction overlays over any bounding boxes
    coordinator.visualRedactor.redactCanvas(redactedCanvas, result.detections);

    // Set results
    setExecutionDurationMs(Number((end - start).toFixed(2)));
    setDetections(result.detections);
    setSanitizedDom(
      result.outboundPayload
        ? result.outboundPayload.sanitizedDomSkeleton
        : '<!-- [HARD SECURITY GATE ENGAGED]: Outbound payload blocked due to pre-flight verification failure. Zero data transmitted. -->'
    );
    setVerificationPassed(result.verificationPassed);
    setVerificationLeaks(result.verificationLeaks);
    onDetectionsChange(result.detections.length);
  };

  // Re-run whenever scenario, custom input, or policy changes
  useEffect(() => {
    runPipeline();
  }, [selectedScenarioId, isCustomMode, customDomInput, policy]);

  return (
    <div className="space-y-6">
      
      {/* Control Banner: Scenario Selector & Quick Stats */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Scenario Selector */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1">
              Synthetic Scenario:
            </span>
            {SYNTHETIC_SCENARIOS.map((scenario) => (
              <button
                key={scenario.id}
                onClick={() => {
                  setIsCustomMode(false);
                  setSelectedScenarioId(scenario.id);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  !isCustomMode && selectedScenarioId === scenario.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60'
                }`}
              >
                {scenario.name}
              </button>
            ))}

            <button
              onClick={() => {
                setIsCustomMode(true);
                if (!customDomInput) {
                  setCustomDomInput('<input name="card" value="4532015283918274" />\n<p>Contact: test@user.in</p>');
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isCustomMode
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60'
              }`}
            >
              + Custom Text / DOM
            </button>
          </div>

          {/* Quick Actions & Metrics */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPolicyModal(!showPolicyModal)}
              className="px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Sliders className="w-3.5 h-3.5 text-slate-400" />
              Policy Config
            </button>

            <button
              onClick={runPipeline}
              className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Re-Scan Context
            </button>
          </div>

        </div>

        {/* Scenario Description Subtitle */}
        {!isCustomMode && (
          <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <p>
              <span className="font-semibold text-slate-200">{currentScenario.pageTitle}</span> &bull; {currentScenario.description}
            </p>
            <span className="font-mono text-[11px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 border border-slate-700">
              Domain: {currentScenario.domain}
            </span>
          </div>
        )}

        {/* Custom DOM Editor when Custom Mode is Active */}
        {isCustomMode && (
          <div className="mt-3 pt-3 border-t border-slate-800">
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Custom DOM Snippet / Raw Text to inspect:
            </label>
            <textarea
              value={customDomInput}
              onChange={(e) => setCustomDomInput(e.target.value)}
              className="w-full h-24 p-2 text-xs font-mono bg-slate-950 text-slate-100 placeholder-slate-500 border border-slate-700 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
              placeholder="Enter HTML snippet or text with synthetic PII..."
            />
          </div>
        )}
      </div>

      {/* Policy Tuning Drawer / Card (Collapsible) */}
      {showPolicyModal && (
        <div className="bg-slate-900 text-white rounded-xl p-5 shadow-lg border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white">Privacy Policy & Guard Engine Configuration</h3>
            </div>
            <button
              onClick={() => setShowPolicyModal(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            {/* Strictness Mode */}
            <div>
              <label className="block text-slate-400 mb-1">Guard Strictness Mode</label>
              <select
                value={policy.mode}
                onChange={(e) => onUpdatePolicy({ mode: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-700 rounded-md p-2 text-slate-200"
              >
                <option value="CONSERVATIVE">Conservative (Fail-safe, Zero-leak bias)</option>
                <option value="BALANCED">Balanced (Standard Web Forms)</option>
                <option value="MINIMAL">Minimal (High-confidence Only)</option>
              </select>
              <p className="text-[10px] text-slate-500 mt-1">
                Conservative mode favors false positives over accidental cloud leakage.
              </p>
            </div>

            {/* Confidence Threshold */}
            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Confidence Threshold</span>
                <span className="font-mono text-emerald-400">{(policy.confidenceThreshold * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.50"
                max="0.99"
                step="0.05"
                value={policy.confidenceThreshold}
                onChange={(e) => onUpdatePolicy({ confidenceThreshold: parseFloat(e.target.value) })}
                className="w-full accent-emerald-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Lower values catch subtle matches; higher requires strict pattern confirmation.
              </p>
            </div>

            {/* Visual Redaction Style */}
            <div>
              <label className="block text-slate-400 mb-1">Canvas Redaction Overlay</label>
              <select
                value={policy.redactionStyle}
                onChange={(e) => onUpdatePolicy({ redactionStyle: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-700 rounded-md p-2 text-slate-200"
              >
                <option value="SOLID_DARK_LABEL">Solid Dark + Monospace Category Tag</option>
                <option value="SOLID_BLACK">High-Contrast Solid Black Box</option>
                <option value="PIXELATED">Pixelated Solid Box</option>
              </select>
              <p className="text-[10px] text-slate-500 mt-1">
                Replaces pixel matrix to ensure optical models cannot reconstruct text.
              </p>
            </div>

            {/* Bounding Box Expansion Margin */}
            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Box Expansion Padding</span>
                <span className="font-mono text-emerald-400">{policy.paddingPixels}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="16"
                step="1"
                value={policy.paddingPixels}
                onChange={(e) => onUpdatePolicy({ paddingPixels: parseInt(e.target.value, 10) })}
                className="w-full accent-emerald-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Over-masks text bounding boxes by N pixels to prevent font ascender leaks.
              </p>
            </div>
          </div>

          {/* Category Filter Toggles */}
          <div className="border-t border-slate-800 pt-3">
            <span className="block text-slate-400 text-xs mb-2 font-medium">Active Protected PII Categories:</span>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(policy.enabledCategories) as PIICategory[]).map((cat) => {
                const isEnabled = policy.enabledCategories[cat];
                return (
                  <button
                    key={cat}
                    onClick={() => {
                      onUpdatePolicy({
                        enabledCategories: {
                          ...policy.enabledCategories,
                          [cat]: !isEnabled
                        }
                      });
                    }}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                      isEnabled
                        ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-700'
                        : 'bg-slate-950 text-slate-500 border border-slate-800 line-through'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Primary Comparison Workspace: Raw Browser Input vs Sanitized Outbound */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* LEFT PANEL: Raw Perception Input (Captured On-Device by Browser & Visual Layers) */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-sm flex flex-col">
          <div className="px-4 py-3 bg-slate-800/80 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Raw Input (On-Device Local Memory)
              </h3>
            </div>
            <span className="text-[11px] font-mono text-amber-300 bg-amber-950/60 border border-amber-800 px-2 py-0.5 rounded">
              Browser DOM + Visual Perception Layer
            </span>
          </div>

          <div className="p-4 flex-1 flex flex-col items-center justify-center bg-slate-950">
            {/* Simulated Screenshot Canvas */}
            <div className="relative border border-slate-800 rounded-lg shadow-inner overflow-hidden bg-slate-950 max-w-full">
              <canvas
                ref={rawCanvasRef}
                width={560}
                height={480}
                className="w-full h-auto block"
              />
            </div>
          </div>

          <div className="px-4 py-2.5 bg-slate-800/80 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span>Contains raw sensitive data</span>
            <span className="text-rose-400 font-semibold flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              Forbidden from Cloud
            </span>
          </div>
        </div>

        {/* RIGHT PANEL: Sanitized Context (Transmitted to Cloud Reasoning Engine) */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-sm flex flex-col">
          <div className="px-4 py-3 bg-slate-800/80 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Sanitized Outbound Context (Permitted for Cloud Reasoning Engine)
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {verificationPassed ? (
                <span className="text-[11px] font-mono text-emerald-300 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Pre-Flight: Passed
                </span>
              ) : (
                <span className="text-[11px] font-mono text-rose-300 bg-rose-950/60 border border-rose-800 px-2 py-0.5 rounded flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" />
                  Pre-Flight: Blocked
                </span>
              )}
            </div>
          </div>

          {/* Sub-view switcher for right panel: Visual Canvas vs Sanitized DOM Skeleton */}
          <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg border border-slate-700/60">
              <button
                onClick={() => setActiveViewMode('visual')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  activeViewMode === 'visual'
                    ? 'bg-slate-900 text-white shadow-xs font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Redacted Screenshot
              </button>
              <button
                onClick={() => setActiveViewMode('dom')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  activeViewMode === 'dom'
                    ? 'bg-slate-900 text-white shadow-xs font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Tokenized DOM Skeleton
              </button>
            </div>

            <div className="text-[11px] font-mono text-slate-400">
              Latency: <span className="text-slate-200 font-semibold">{executionDurationMs} ms</span>
            </div>
          </div>

          <div className="p-4 flex-1 flex flex-col items-center justify-center bg-slate-950">
            {activeViewMode === 'visual' ? (
              <div className="relative border border-slate-800 rounded-lg shadow-inner overflow-hidden bg-slate-950 max-w-full">
                <canvas
                  ref={redactedCanvasRef}
                  width={560}
                  height={480}
                  className="w-full h-auto block"
                />
              </div>
            ) : (
              <div className="w-full h-[480px] bg-slate-950 text-slate-200 p-4 rounded-lg font-mono text-xs overflow-auto border border-slate-800">
                <div className="text-emerald-400 mb-2 font-bold">// Sanitized DOM Skeleton (Cloud-Safe Representation):</div>
                <pre className="whitespace-pre-wrap">{sanitizedDom}</pre>
              </div>
            )}
          </div>

          <div className="px-4 py-2.5 bg-slate-800/80 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1 text-emerald-400 font-semibold">
              <EyeOff className="w-3.5 h-3.5" />
              Zero Raw PII Outbound
            </span>
            <span className="font-mono text-[11px] text-slate-400">
              {detections.length} sensitive tokens generated
            </span>
          </div>
        </div>

      </div>

      {/* Sensitive Entities Detection & Token Audit Table */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">
              On-Device Detected Sensitive Entities ({detections.length})
            </h3>
            <p className="text-xs text-slate-400">
              Entities intercepted by Privacy Guard Engine before outbound transmission to Cloud Reasoning Engine. Raw values are strictly quarantined in local memory.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-xs font-mono font-semibold rounded-md bg-emerald-950/60 text-emerald-300 border border-emerald-800">
              Deterministic Token Map Active
            </span>
          </div>
        </div>

        {detections.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No sensitive PII detected under current threshold.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/60 text-slate-400 border-b border-slate-800 font-medium">
                <tr>
                  <th className="px-4 py-2.5">Category</th>
                  <th className="px-4 py-2.5">Raw Value (Quarantined)</th>
                  <th className="px-4 py-2.5">Substituted Token (Outbound)</th>
                  <th className="px-4 py-2.5">Confidence</th>
                  <th className="px-4 py-2.5">Detection Method</th>
                  <th className="px-4 py-2.5">Bounding Box (Visual / DOM)</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {detections.map((entity) => (
                  <tr key={entity.id} className="hover:bg-slate-800/40 transition-colors font-mono">
                    
                    {/* Category */}
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-200 border border-slate-700">
                        {entity.category}
                      </span>
                    </td>

                    {/* Raw Value */}
                    <td className="px-4 py-3 text-rose-300 font-bold">
                      <span className="bg-rose-950/60 text-rose-300 px-1.5 py-0.5 rounded border border-rose-800">
                        {entity.rawText}
                      </span>
                    </td>

                    {/* Substituted Token */}
                    <td className="px-4 py-3 text-emerald-400 font-semibold">
                      <span className="bg-emerald-950/60 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-800">
                        {entity.token}
                      </span>
                    </td>

                    {/* Confidence */}
                    <td className="px-4 py-3 text-slate-300">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        entity.confidence >= 0.95 
                          ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800' 
                          : 'bg-amber-950/60 text-amber-300 border border-amber-800'
                      }`}>
                        {(entity.confidence * 100).toFixed(0)}%
                      </span>
                    </td>

                    {/* Detection Method */}
                    <td className="px-4 py-3 text-slate-300 font-sans">
                      <span className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                        {entity.source}: {entity.ruleMatched || 'Keyword'}
                      </span>
                    </td>

                    {/* Bounding Box */}
                    <td className="px-4 py-3 text-slate-400 text-[11px]">
                      {entity.bbox ? (
                        <span>
                          [{entity.bbox.x}, {entity.bbox.y}, {entity.bbox.width}x{entity.bbox.height}]
                        </span>
                      ) : (
                        <span className="text-slate-500 font-sans italic">DOM Text Stream</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px] font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Redacted
                      </span>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div>
  );
};
