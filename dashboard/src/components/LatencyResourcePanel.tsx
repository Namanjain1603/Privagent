import React from 'react';
import { LatencyBreakdown, ClientResourceUsage } from '../types/privagent';
import { Timer, Cpu, HardDrive, Zap } from 'lucide-react';

interface LatencyResourcePanelProps {
  latency: LatencyBreakdown;
  resources: ClientResourceUsage;
}

export const LatencyResourcePanel: React.FC<LatencyResourcePanelProps> = ({ latency, resources }) => {
  const localProcessingTotal =
    latency.domCaptureMs + latency.ocrVisionMs + latency.piiDetectionMs + latency.localRedactionMs;
  const cloudTotal = latency.backendNetworkMs + latency.cloudReasoningMs;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" id="latency-resources-section">
      {/* 1. Stage-wise Latency Breakdown */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Timer className="w-4 h-4 text-purple-600" />
              Stage-wise Latency Breakdown
            </h3>
            <span className="text-xs font-bold font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
              Total: {latency.totalEndToEndMs}ms
            </span>
          </div>

          <div className="mt-3 space-y-2.5 text-xs">
            {/* Local Overhead (M3, M4, M2) */}
            <div>
              <div className="flex justify-between font-medium text-slate-700 mb-1">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Local Perception & Redaction (On-Device)
                </span>
                <span className="font-mono font-semibold text-emerald-800">{localProcessingTotal}ms</span>
              </div>
              <div className="grid grid-cols-4 gap-1 text-[11px] font-mono text-slate-500 bg-slate-50 p-1.5 rounded">
                <div>DOM: {latency.domCaptureMs}ms</div>
                <div>OCR: {latency.ocrVisionMs}ms</div>
                <div>PII Guard: {latency.piiDetectionMs}ms</div>
                <div>Redact: {latency.localRedactionMs}ms</div>
              </div>
            </div>

            {/* Cloud Roundtrip (M5, M1) */}
            <div>
              <div className="flex justify-between font-medium text-slate-700 mb-1">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  Sanitized Cloud Reasoning & Network
                </span>
                <span className="font-mono font-semibold text-blue-800">{cloudTotal}ms</span>
              </div>
              <div className="grid grid-cols-2 gap-1 text-[11px] font-mono text-slate-500 bg-slate-50 p-1.5 rounded">
                <div>REST Network: {latency.backendNetworkMs}ms</div>
                <div>Cloud AI Brain: {latency.cloudReasoningMs}ms</div>
              </div>
            </div>

            {/* Action Validation & Execution */}
            <div>
              <div className="flex justify-between font-medium text-slate-700 mb-1">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  Validation & Browser Action Exec
                </span>
                <span className="font-mono font-semibold text-amber-800">
                  {latency.actionValidationMs + latency.browserExecutionMs}ms
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1 text-[11px] font-mono text-slate-500 bg-slate-50 p-1.5 rounded">
                <div>Schema Check: {latency.actionValidationMs}ms</div>
                <div>Browser Exec: {latency.browserExecutionMs}ms</div>
              </div>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 mt-2">
          Simulated demo metrics representing the extension intercept and action feedback loop.
        </p>
      </div>

      {/* 2. Client Resource Usage */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-blue-600" />
              Client Resource Footprint
            </h3>
            <span className="text-xs font-semibold text-slate-500">
              SIH Light-weight Agent SLA (Simulated)
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-3 text-center">
            {/* CPU */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-center gap-1 text-slate-500 text-xs font-medium mb-1">
                <Cpu className="w-3.5 h-3.5 text-blue-600" /> CPU Load
              </div>
              <div className="text-xl font-bold font-mono text-slate-900">
                {resources.cpuUsagePct}%
              </div>
              <div className="text-[10px] text-emerald-700 font-medium mt-1">Lightweight (&lt;25%)</div>
            </div>

            {/* RAM */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-center gap-1 text-slate-500 text-xs font-medium mb-1">
                <HardDrive className="w-3.5 h-3.5 text-indigo-600" /> RAM Usage
              </div>
              <div className="text-xl font-bold font-mono text-slate-900">
                {resources.memoryUsageMb} <span className="text-xs font-normal">MB</span>
              </div>
              <div className="text-[10px] text-emerald-700 font-medium mt-1">Within limits</div>
            </div>

            {/* Acceleration */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-center gap-1 text-slate-500 text-xs font-medium mb-1">
                <Zap className="w-3.5 h-3.5 text-amber-600" /> WebGPU / Model
              </div>
              <div className="text-xl font-bold font-mono text-slate-900">
                {resources.gpuActive ? 'Active' : 'Off'}
              </div>
              <div className="text-[10px] text-slate-500 font-medium mt-1">
                {resources.modelVramMb ? `${resources.modelVramMb}MB VRAM` : 'CPU Fallback'}
              </div>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 mt-2">
          Demonstrates compliance with SIH26171 &quot;On-device Visual Perception for Light-weight Browser Agents&quot;.
        </p>
      </div>
    </div>
  );
};
