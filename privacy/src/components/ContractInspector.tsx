import React, { useState } from 'react';
import { FileCode, Copy, Check, ArrowRight, ShieldCheck, Database, Layout, Eye, Cpu, Globe, BookOpen } from 'lucide-react';
import { Day1Guide } from './Day1Guide';

interface ContractDef {
  id: string;
  title: string;
  source: string;
  destination: string;
  sourceIcon: React.ReactNode;
  destIcon: React.ReactNode;
  ownership: string;
  description: string;
  schemaTypeScript: string;
  sampleJson: object;
}

export const ContractInspector: React.FC = () => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showArchitectureGuide, setShowArchitectureGuide] = useState<boolean>(true);

  const contracts: ContractDef[] = [
    {
      id: 'm4_to_m2',
      title: 'Contract 1: Visual Perception & OCR Stream',
      source: 'Visual Perception Layer (OCR & Vision)',
      destination: 'Privacy & PII Guard Engine',
      sourceIcon: <Eye className="w-4 h-4 text-sky-500" />,
      destIcon: <ShieldCheck className="w-4 h-4 text-emerald-500" />,
      ownership: 'Producer: Visual Perception Layer (Screenshots + OCR). Consumer: Privacy & PII Guard Engine (Masking & Redaction).',
      description: 'Visual Perception Layer captures on-device page screenshot and detects bounding boxes of text/visual elements, feeding raw coordinates and OCR strings to Privacy & PII Guard Engine.',
      schemaTypeScript: `interface M4VisualInputContract {
  sessionId: string;
  timestamp: number;
  pageUrl: string;
  viewport: { width: number; height: number };
  screenshotBase64: string; // Captured on-device by Visual Perception Layer
  ocrDetections: Array<{
    text: string;
    bbox: { x: number; y: number; width: number; height: number };
    confidence: number;
  }>;
}`,
      sampleJson: {
        sessionId: "sess_privagent_8192",
        timestamp: 1774092400000,
        pageUrl: "https://shop-easy.india-cart.synthetic/checkout",
        viewport: { width: 1280, height: 800 },
        screenshotBase64: "data:image/png;base64,iVBORw0KGgoAAA...",
        ocrDetections: [
          {
            text: "4532 0152 8391 8274",
            bbox: { x: 44, y: 232, width: 220, height: 26 },
            confidence: 0.97
          },
          {
            text: "+91 98765 43210",
            bbox: { x: 44, y: 372, width: 180, height: 26 },
            confidence: 0.95
          }
        ]
      }
    },
    {
      id: 'm3_to_m2',
      title: 'Contract 2: Browser DOM & Interactable Elements',
      source: 'Browser Layer (DOM Capture)',
      destination: 'Privacy & PII Guard Engine',
      sourceIcon: <Globe className="w-4 h-4 text-indigo-500" />,
      destIcon: <ShieldCheck className="w-4 h-4 text-emerald-500" />,
      ownership: 'Producer: Browser Layer (Extension Content Script). Consumer: Privacy & PII Guard Engine (DOM Filter & Tokenizer).',
      description: 'Browser Layer extracts DOM tree and interactable element metadata (inputs, buttons) and passes them to Privacy Guard Engine to strip sensitive attributes and passwords.',
      schemaTypeScript: `interface M3DOMInputContract {
  sessionId: string;
  url: string;
  title: string;
  interactableElements: Array<{
    id: string;
    selector: string;
    type: 'button' | 'input' | 'select' | 'a';
    label?: string;
    value?: string;
    bbox?: { x: number; y: number; width: number; height: number };
  }>;
}`,
      sampleJson: {
        sessionId: "sess_privagent_8192",
        url: "https://portal.identity-verify.gov-synthetic.in",
        title: "Citizen Verification",
        interactableElements: [
          {
            id: "uid-input",
            selector: "#uid-input",
            type: "input",
            label: "Aadhaar Number",
            value: "3849 2018 4729"
          }
        ]
      }
    },
    {
      id: 'm2_to_m1',
      title: 'Contract 3: Sanitized Outbound Cloud Payload',
      source: 'Privacy & PII Guard Engine',
      destination: 'Cloud Reasoning Engine (AI Planning)',
      sourceIcon: <ShieldCheck className="w-4 h-4 text-emerald-500" />,
      destIcon: <Cpu className="w-4 h-4 text-purple-500" />,
      ownership: 'Producer & Gatekeeper: Privacy Guard Engine. Consumer: Cloud Reasoning Engine (Planner).',
      description: 'CRITICAL SECURITY CONTRACT: The ONLY data transmitted to cloud AI. Must contain zero raw PII; all sensitive data is replaced with <PII:CATEGORY_INDEX> tokens and solid visual redactions.',
      schemaTypeScript: `interface M2OutboundSanitizedPayload {
  sessionId: string;
  timestamp: number;
  pageMetadata: {
    domain: string;
    sanitizedTitle: string;
    viewport: { width: number; height: number };
  };
  sanitizedDomSkeleton: string; // Compressed PII-tokenized DOM skeleton
  redactedScreenshotBase64: string; // Visual canvas with solid black/dark boxes
  detectedTokenList: Array<{
    token: string;
    category: string;
    purposeHint: string;
  }>;
  policyVersion: string;
  verificationSignature: string; // Genuine 64-char FIPS 180-4 SHA-256 hash of canonical sanitized payload
}`,
      sampleJson: {
        sessionId: "sess_privagent_8192",
        timestamp: 1774092405000,
        pageMetadata: {
          domain: "shop-easy.india-cart.synthetic",
          sanitizedTitle: "Checkout - ShopEasy India Cart",
          viewport: { width: 1280, height: 800 }
        },
        sanitizedDomSkeleton: '<div class="checkout"><input id="ccnum" value="<PII:CREDIT_CARD_1>" /></div>',
        redactedScreenshotBase64: "data:image/png;base64,iVBORw0KGgoAAA...",
        detectedTokenList: [
          {
            token: "<PII:CREDIT_CARD_1>",
            category: "CREDIT_CARD",
            purposeHint: "Cardholder payment entry"
          }
        ],
        policyVersion: "v1.0-CONSERVATIVE",
        verificationSignature: "SHA256:cf8050f7a08b98b9e67d2642a8bdf3b9df7be7f1b72e50cf605d898ba151952e"
      }
    },
    {
      id: 'm1_to_m2_to_m3',
      title: 'Contract 4: Inbound Action Validation & Token Expansion',
      source: 'Cloud Reasoning Engine -> Privacy Guard Engine',
      destination: 'Privacy Guard Engine -> Browser Layer',
      sourceIcon: <Cpu className="w-4 h-4 text-purple-500" />,
      destIcon: <Globe className="w-4 h-4 text-indigo-500" />,
      ownership: 'Validator: Privacy Guard Engine. Executor: Browser Layer (Actions).',
      description: 'Cloud Reasoning Engine proposes structured action. Privacy Guard verifies it belongs to safe set (CLICK, TYPE, SELECT, SCROLL, NAVIGATE), ensures zero script execution, expands tokens locally, and forwards to Browser Layer.',
      schemaTypeScript: `interface M2ActionValidationResult {
  isAllowed: boolean;
  actionId: string;
  sanitizedAction?: {
    type: 'CLICK' | 'TYPE' | 'SELECT' | 'SCROLL' | 'NAVIGATE' | 'WAIT';
    selector: string;
    resolvedExecutionValue?: string; // Token expanded locally in browser memory
    coordinates?: { x: number; y: number };
    scrollDelta?: { dx: number; dy: number };
    targetUrl?: string;
  };
  rejectionReason?: string;
  securityFlagsTriggered: string[];
}`,
      sampleJson: {
        isAllowed: true,
        actionId: "act_plan_step_03",
        sanitizedAction: {
          type: "TYPE",
          selector: "#ccnum",
          resolvedExecutionValue: "4532 0152 8391 8274"
        },
        securityFlagsTriggered: [
          "LOCAL_TOKEN_EXPANDED: <PII:CREDIT_CARD_1> resolved in on-device memory"
        ]
      }
    },
    {
      id: 'm2_to_m5_m6',
      title: 'Contract 5: Privacy Audit & Monitoring Event',
      source: 'Privacy & PII Guard Engine',
      destination: 'Backend API Layer & Audit Monitoring',
      sourceIcon: <ShieldCheck className="w-4 h-4 text-emerald-500" />,
      destIcon: <Database className="w-4 h-4 text-amber-500" />,
      ownership: 'Reporter: Privacy Guard Engine. Aggregator: Backend API Layer.',
      description: 'Sends anonymized audit metrics (leak prevention counts, categories, execution latencies) without ever logging the raw sensitive data.',
      schemaTypeScript: `interface PrivacyAuditRecord {
  id: string;
  timestamp: number;
  sessionId: string;
  detectedCount: number;
  redactedCount: number;
  categoriesFound: string[];
  preFlightVerificationStatus: 'PASSED' | 'FAILED_BLOCKED';
  potentialLeakPrevented: boolean;
  executionDurationMs: number;
}`,
      sampleJson: {
        id: "audit_1774092410_a9f1",
        timestamp: 1774092410000,
        sessionId: "sess_privagent_8192",
        detectedCount: 4,
        redactedCount: 4,
        categoriesFound: ["CREDIT_CARD", "EMAIL_ADDRESS", "PHONE_NUMBER", "PASSWORD_SECRET"],
        preFlightVerificationStatus: "PASSED",
        potentialLeakPrevented: true,
        executionDurationMs: 14.8
      }
    }
  ];

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Intro Banner */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white">
              PRIVAGENT Unified System Integration Contracts & API Specifications
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Strict JSON/API contracts connecting Privacy & PII Guard Engine with Cloud Reasoning Engine, Browser Layer, Visual Perception Layer, and Backend API Layer.
            </p>
          </div>

          <button
            onClick={() => setShowArchitectureGuide(!showArchitectureGuide)}
            className="px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg flex items-center gap-1.5 shrink-0 transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-400" />
            <span>{showArchitectureGuide ? 'Hide Layer Architecture' : 'View Layer Architecture'}</span>
          </button>
        </div>

        {/* Responsibility matrix pill row */}
        <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
          <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
            <span className="font-bold text-purple-400 block">Cloud Reasoning Engine</span>
            <span className="text-[11px] text-slate-400">AI Planning & Actions</span>
          </div>
          <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-800">
            <span className="font-bold text-emerald-300 block">Privacy Guard Engine</span>
            <span className="text-[11px] text-emerald-400 font-semibold">Zero-Leak Security Gate</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
            <span className="font-bold text-indigo-400 block">Browser Layer</span>
            <span className="text-[11px] text-slate-400">DOM & Input Capture</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
            <span className="font-bold text-sky-400 block">Visual Perception Layer</span>
            <span className="text-[11px] text-slate-400">OCR & Bounding Boxes</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
            <span className="font-bold text-amber-400 block">Backend API Layer</span>
            <span className="text-[11px] text-slate-400">Services & Auth</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
            <span className="font-bold text-rose-400 block">Audit & Monitoring</span>
            <span className="text-[11px] text-slate-400">Telemetry & Compliance</span>
          </div>
        </div>
      </div>

      {/* Layer Architecture Guide Component */}
      {showArchitectureGuide && (
        <Day1Guide />
      )}

      {/* Contract Accordions / Cards */}
      <div className="space-y-6">
        {contracts.map((contract) => (
          <div key={contract.id} className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-sm">
            
            {/* Header */}
            <div className="px-5 py-4 bg-slate-800/80 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">{contract.title}</h3>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-300">
                  <span className="inline-flex items-center gap-1 font-semibold text-slate-200">
                    {contract.sourceIcon} {contract.source}
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                  <span className="inline-flex items-center gap-1 font-semibold text-slate-200">
                    {contract.destIcon} {contract.destination}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono bg-slate-950 px-2 py-1 rounded text-slate-300 border border-slate-800">
                  {contract.ownership}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="px-5 py-3 text-xs text-slate-400 border-b border-slate-800 bg-slate-900">
              <p>{contract.description}</p>
            </div>

            {/* Code and Sample Payload Split */}
            <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
              
              {/* TypeScript Interface */}
              <div className="p-4 bg-slate-950 text-slate-200 font-mono text-xs">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                  <span className="text-slate-400 font-bold text-[11px] uppercase tracking-wider">
                    TypeScript Contract Definition
                  </span>
                  <button
                    onClick={() => handleCopy(contract.id + '_ts', contract.schemaTypeScript)}
                    className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px]"
                  >
                    {copiedId === contract.id + '_ts' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedId === contract.id + '_ts' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="overflow-x-auto whitespace-pre-wrap text-emerald-400">
                  {contract.schemaTypeScript}
                </pre>
              </div>

              {/* Sample JSON Payload */}
              <div className="p-4 bg-slate-950 text-slate-200 font-mono text-xs">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                  <span className="text-slate-400 font-bold text-[11px] uppercase tracking-wider">
                    Sample JSON Transmission
                  </span>
                  <button
                    onClick={() => handleCopy(contract.id + '_json', JSON.stringify(contract.sampleJson, null, 2))}
                    className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px]"
                  >
                    {copiedId === contract.id + '_json' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedId === contract.id + '_json' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="overflow-x-auto whitespace-pre-wrap text-sky-300">
                  {JSON.stringify(contract.sampleJson, null, 2)}
                </pre>
              </div>

            </div>

          </div>
        ))}
      </div>

    </div>
  );
};
