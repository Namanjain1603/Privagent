import React, { useState } from 'react';
import { FileJson, Copy, Check, Users, ArrowRightLeft } from 'lucide-react';

export const ApiContractView: React.FC = () => {
  const [selectedModule, setSelectedModule] = useState<'M5_TELEMETRY' | 'M2_PII_GUARD' | 'M1_ACTION_SCHEMA'>('M5_TELEMETRY');
  const [copied, setCopied] = useState(false);

  const contracts = {
    M5_TELEMETRY: {
      owner: 'M5 (Backend) ➔ M6 (Dashboard)',
      endpoint: 'GET /api/v1/sessions/:id/telemetry',
      description: 'Periodic or SSE telemetry sent by backend for dashboard visualization.',
      json: `{
  "status": "success",
  "data": {
    "sessionId": "sess_sih_2026_demo_091",
    "timestamp": "2026-09-15T10:14:15Z",
    "url": "https://demo-portal.internal.privagent/ekyc-verification",
    "pageTitle": "Gov Portal KYC Self-Verification Demo",
    "privacyStatus": "PROTECTED",
    "piiDetectedCount": 5,
    "piiRedactedCount": 5,
    "rawPiiSentToCloud": 0,
    "currentSessionStatus": "ACTIVE",
    "isSimulatedDemoData": false,
    "latency": {
      "domCaptureMs": 18,
      "ocrVisionMs": 82,
      "piiDetectionMs": 34,
      "localRedactionMs": 9,
      "backendNetworkMs": 110,
      "cloudReasoningMs": 460,
      "actionValidationMs": 12,
      "browserExecutionMs": 45,
      "totalEndToEndMs": 770
    },
    "clientResources": {
      "cpuUsagePct": 14.2,
      "memoryUsageMb": 186.4,
      "gpuActive": true
    },
    "recentActions": [
      {
        "id": "act_003",
        "stepNumber": 3,
        "action": "TYPE",
        "selector": "input#synthetic-aadhaar-field",
        "sanitizedValue": "[MASKED_AADHAAR_TOKEN_#1]",
        "timestamp": "10:14:09",
        "validated": true,
        "durationMs": 72
      }
    ],
    "detectedPiiList": [
      {
        "id": "pii_01",
        "type": "AADHAAR",
        "rawMasked": "XXXX-XXXX-9021 (Synthetic)",
        "source": "INPUT_FIELD",
        "confidence": 0.98,
        "redacted": true,
        "redactionMethod": "MASK"
      }
    ]
  }
}`,
    },
    M2_PII_GUARD: {
      owner: 'M3 (Extension) ➔ M2 (PII Guard / Redaction)',
      endpoint: 'Local Message / Native Messaging: "PROCESS_PAGE_CONTEXT"',
      description: 'Extension sends raw DOM & screenshot to local PII Guard; receives sanitized output.',
      json: `// REQUEST: Local Native Messaging / WASM Call
{
  "command": "REDACT_SENSITIVE_CONTEXT",
  "sessionId": "sess_091",
  "rawDomText": "<form><input name='aadhaar' value='4589 1234 9021' /></form>",
  "hasScreenshot": true
}

// RESPONSE (From M2 back to M3 & forwarded to M5):
{
  "sanitizedDom": "<form><input name='aadhaar' value='[MASKED_AADHAAR_TOKEN_#1]' /></form>",
  "detectedPiiCount": 1,
  "redactedPiiCount": 1,
  "rawPiiLeakDetected": false,
  "entities": [
    {
      "type": "AADHAAR",
      "syntheticToken": "[MASKED_AADHAAR_TOKEN_#1]",
      "confidence": 0.98
    }
  ]
}`,
    },
    M1_ACTION_SCHEMA: {
      owner: 'M1 (AI Brain) ➔ M3 (Extension Execution)',
      endpoint: 'POST /api/v1/agent/plan-step (Validated by Action Guard)',
      description: 'Cloud AI must strictly return structured JSON matching allowlist. Arbitrary JS strictly rejected.',
      json: `{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["stepNumber", "action", "selector"],
  "properties": {
    "stepNumber": { "type": "integer" },
    "thought": { "type": "string", "description": "Short explanation of reasoning" },
    "action": {
      "type": "string",
      "enum": ["CLICK", "TYPE", "SELECT", "SCROLL", "NAVIGATE"]
    },
    "selector": { "type": "string" },
    "value": { "type": "string", "description": "Optional value for TYPE/SELECT/SCROLL" }
  },
  "additionalProperties": false
}`,
    },
  };

  const currentContract = contracts[selectedModule];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentContract.json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs" id="api-contracts-panel">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="w-5 h-5 text-blue-600" />
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Inter-Module API & Schema Contracts (M1 to M6)
            </h3>
            <p className="text-xs text-slate-500">
              Contract proposal reference for sharing clean JSON formats across teammates without silent breakage.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors self-start sm:self-auto"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied JSON!' : 'Copy JSON Contract'}
        </button>
      </div>

      {/* Contract Selector Tabs */}
      <div className="flex flex-wrap gap-2 my-3">
        <button
          type="button"
          onClick={() => setSelectedModule('M5_TELEMETRY')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            selectedModule === 'M5_TELEMETRY'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          M5 ➔ M6: Telemetry Feed
        </button>

        <button
          type="button"
          onClick={() => setSelectedModule('M2_PII_GUARD')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            selectedModule === 'M2_PII_GUARD'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          M3 ➔ M2: Local Redaction Call
        </button>

        <button
          type="button"
          onClick={() => setSelectedModule('M1_ACTION_SCHEMA')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            selectedModule === 'M1_ACTION_SCHEMA'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          M1: Structured Action Allowlist
        </button>
      </div>

      {/* Module Overview Card */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1 mb-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-500" />
          <span className="font-semibold text-slate-700">Contract Interface:</span>
          <span className="font-mono text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
            {currentContract.owner}
          </span>
        </div>
        <div className="text-slate-600 font-medium">
          <span className="font-semibold text-slate-700">Endpoint / Protocol:</span> {currentContract.endpoint}
        </div>
        <div className="text-slate-500 text-[11px]">{currentContract.description}</div>
      </div>

      {/* JSON Code View */}
      <div className="relative">
        <pre className="p-3 bg-slate-950 text-emerald-400 rounded-lg text-[11px] font-mono overflow-x-auto leading-relaxed max-h-80">
          {currentContract.json}
        </pre>
      </div>
    </div>
  );
};
