import React from 'react';
import { Cpu, ShieldCheck, Globe, Eye, Database, Activity, Layers, ArrowRight } from 'lucide-react';

export interface SystemLayerDef {
  id: string;
  name: string;
  category: string;
  badgeColor: string;
  icon: React.ReactNode;
  summary: string;
  responsibilities: string[];
  interfaces: string;
}

export const SYSTEM_LAYERS: SystemLayerDef[] = [
  {
    id: 'layer_reasoning',
    name: 'Cloud Reasoning Engine',
    category: 'AI Planning & Cognition',
    badgeColor: 'bg-purple-950/60 text-purple-300 border-purple-800',
    icon: <Cpu className="w-5 h-5 text-purple-400" />,
    summary: 'High-level goal decomposition, multi-step agent planning, and intent evaluation based on tokenized DOM and redacted visual inputs.',
    responsibilities: [
      'Processes sanitized DOM skeletons and tokenized elements',
      'Determines sequential steps to accomplish user intent',
      'Proposes safe, structured browser action schemas (CLICK, TYPE, SELECT, SCROLL, NAVIGATE)',
      'Operates in zero-knowledge mode: never receives raw sensitive user data'
    ],
    interfaces: 'Receives Sanitized Outbound Payload; Outputs Action Proposals'
  },
  {
    id: 'layer_privacy',
    name: 'Privacy & PII Guard Engine',
    category: 'Core Security & Zero-Leak Gate',
    badgeColor: 'bg-emerald-950/60 text-emerald-300 border-emerald-800',
    icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
    summary: 'The central on-device guardian ensuring zero confidential data leaves the browser, combining multi-modal detectors with optical redaction.',
    responsibilities: [
      'Multi-modal sensitive entity detection (Luhn cards, Aadhaar, PAN, emails, phones, passwords)',
      'On-device deterministic tokenization (<PII:CATEGORY_INDEX>) stored only in local volatile memory',
      'Solid high-contrast canvas masking over OCR bounding boxes to defeat optical reconstruction',
      'Pre-flight cryptographic serialization verification before cloud transmission',
      'Inbound action gatekeeper neutralizing malicious eval() and unauthorized script execution'
    ],
    interfaces: 'Ingests Raw DOM & OCR Streams; Emits Sanitized Cloud Payloads; Gates Action Execution'
  },
  {
    id: 'layer_browser',
    name: 'Browser Layer (DOM Capture & Execution)',
    category: 'Client Host & Runtime',
    badgeColor: 'bg-indigo-950/60 text-indigo-300 border-indigo-800',
    icon: <Globe className="w-5 h-5 text-indigo-400" />,
    summary: 'Client browser extension and content-script runtime extracting interactive elements and safely executing authorized agent actions.',
    responsibilities: [
      'Captures DOM tree nodes and computes interactable element bounding boxes',
      'Transfers unmasked DOM snapshot to Privacy Guard Engine for filtering',
      'Executes approved browser actions (click, type, select, scroll, navigate) in isolated tab context',
      'Resolves sanitized input tokens to real local values immediately before keystroke dispatch'
    ],
    interfaces: 'Transfers Raw DOM Metadata to Guard; Receives Validated Actions for Execution'
  },
  {
    id: 'layer_vision',
    name: 'Visual Perception Layer (OCR & Vision)',
    category: 'On-Device Computer Vision',
    badgeColor: 'bg-sky-950/60 text-sky-300 border-sky-800',
    icon: <Eye className="w-5 h-5 text-sky-400" />,
    summary: 'On-device screenshot capture, visual segmentation, and optical character recognition delivering bounding boxes for all visible text.',
    responsibilities: [
      'Captures viewport bitmap screenshots locally at native pixel density',
      'Performs optical character recognition (OCR) and detects text bounding boxes',
      'Correlates visual text coordinates with DOM interactive elements',
      'Supplies raw pixel frames and coordinate boxes to Privacy Guard for visual redaction'
    ],
    interfaces: 'Emits Raw Screenshot Bitmaps & OCR Bounding Boxes to Guard'
  },
  {
    id: 'layer_backend',
    name: 'Backend API Layer',
    category: 'Cloud Services & Persistence',
    badgeColor: 'bg-amber-950/60 text-amber-300 border-amber-800',
    icon: <Database className="w-5 h-5 text-amber-400" />,
    summary: 'Secure microservices managing authentication, encrypted state synchronization, and enterprise configuration policies.',
    responsibilities: [
      'Provides authenticated session management and cryptographic key handshakes',
      'Stores encrypted enterprise privacy policy definitions and organization rulesets',
      'Serves external API integrations and cloud compute routing'
    ],
    interfaces: 'Handles Policy Synchronization & User Authentication'
  },
  {
    id: 'layer_audit',
    name: 'Audit & Monitoring Layer',
    category: 'Security Telemetry & Compliance',
    badgeColor: 'bg-rose-950/60 text-rose-300 border-rose-800',
    icon: <Activity className="w-5 h-5 text-rose-400" />,
    summary: 'Real-time security analytics and compliance auditing recording leak prevention metrics without ever touching raw data.',
    responsibilities: [
      'Aggregates anonymized privacy enforcement event counts and execution latencies',
      'Generates compliance audit trails (GDPR, DPDP Act, HIPAA verification proofs)',
      'Provides security monitoring dashboards showing blocked attacks and leak attempts'
    ],
    interfaces: 'Consumes Anonymized Privacy Audit Records from Guard Engine'
  }
];

export const Day1Guide: React.FC = () => {
  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 shadow-sm space-y-5">
      <div className="border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-emerald-400" />
          <h2 className="text-base font-bold text-white">
            PRIVAGENT Integrated Architecture & System Layers
          </h2>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Unified end-to-end product architecture for on-device visual perception, privacy preservation, and safe browser automation.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SYSTEM_LAYERS.map((layer) => (
          <div
            key={layer.id}
            className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-950 transition-colors flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 shadow-xs">
                  {layer.icon}
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${layer.badgeColor}`}>
                  {layer.category}
                </span>
              </div>

              <h3 className="text-xs font-bold text-white mb-1">{layer.name}</h3>
              <p className="text-xs text-slate-300 mb-3">{layer.summary}</p>

              <div className="space-y-1.5 border-t border-slate-800 pt-2.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Core Responsibilities
                </span>
                <ul className="space-y-1 text-[11px] text-slate-300">
                  {layer.responsibilities.map((resp, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-emerald-400 font-bold shrink-0">&bull;</span>
                      <span>{resp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-800 text-[10px] text-slate-400 font-mono flex items-center gap-1">
              <span className="font-semibold text-slate-300">Contract:</span> {layer.interfaces}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
