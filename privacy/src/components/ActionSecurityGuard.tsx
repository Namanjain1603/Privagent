import React, { useState } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  Check, 
  Terminal, 
  Lock,
  ArrowRight,
  Play
} from 'lucide-react';
import { PrivacyGuardCoordinator } from '../modules/privacyGuardCoordinator';
import { SYNTHETIC_ACTION_ATTACK_VECTORS } from '../data/syntheticScenarios';
import { AgentActionProposal, M2ActionValidationResult } from '../types/privacy';

interface ActionSecurityGuardProps {
  coordinator: PrivacyGuardCoordinator;
}

export const ActionSecurityGuard: React.FC<ActionSecurityGuardProps> = ({ coordinator }) => {
  const [selectedVectorId, setSelectedVectorId] = useState<string>(SYNTHETIC_ACTION_ATTACK_VECTORS[0].id);
  const [customActionJson, setCustomActionJson] = useState<string>('');
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<M2ActionValidationResult | null>(null);

  const currentVector = SYNTHETIC_ACTION_ATTACK_VECTORS.find(v => v.id === selectedVectorId) || SYNTHETIC_ACTION_ATTACK_VECTORS[0];

  const handleTestVector = (vectorPayload: AgentActionProposal) => {
    const result = coordinator.validateInboundAction(vectorPayload);
    setValidationResult(result);
  };

  const handleRunCustom = () => {
    try {
      const parsed = JSON.parse(customActionJson) as AgentActionProposal;
      const result = coordinator.validateInboundAction(parsed);
      setValidationResult(result);
    } catch (err: any) {
      setValidationResult({
        isAllowed: false,
        actionId: 'err',
        rejectionReason: `JSON Parsing Failed: ${err.message}`,
        securityFlagsTriggered: ['MALFORMED_JSON_PROPOSAL']
      });
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Intro Header */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-emerald-500" />
              <h2 className="text-base font-bold text-white">
                Inbound Action Security Gate (Cloud Reasoning Engine &rarr; Privacy Guard Engine &rarr; Browser Layer)
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Strict enforcement of PRIVAGENT engineering rules: Arbitrary JavaScript execution is unconditionally blocked.
              Permitted actions are strictly restricted to: <code className="bg-slate-800 px-1 py-0.5 rounded text-slate-200 font-bold border border-slate-700">CLICK</code>, <code className="bg-slate-800 px-1 py-0.5 rounded text-slate-200 font-bold border border-slate-700">TYPE</code>, <code className="bg-slate-800 px-1 py-0.5 rounded text-slate-200 font-bold border border-slate-700">SELECT</code>, <code className="bg-slate-800 px-1 py-0.5 rounded text-slate-200 font-bold border border-slate-700">SCROLL</code>, and <code className="bg-slate-800 px-1 py-0.5 rounded text-slate-200 font-bold border border-slate-700">NAVIGATE</code>.
            </p>
          </div>
          <span className="px-3 py-1 bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-semibold rounded-lg">
            Zero Script Execution Guarantee
          </span>
        </div>
      </div>

      {/* Preset Attacks / Safe Actions Selection */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Action Vector List */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Test Attack & Verification Vectors
          </h3>

          <div className="space-y-2">
            {SYNTHETIC_ACTION_ATTACK_VECTORS.map((v) => (
              <button
                key={v.id}
                onClick={() => {
                  setIsCustomMode(false);
                  setSelectedVectorId(v.id);
                  handleTestVector(v.payload as AgentActionProposal);
                }}
                className={`w-full text-left p-3 rounded-lg border transition-all text-xs ${
                  !isCustomMode && selectedVectorId === v.id
                    ? 'border-emerald-500/80 bg-slate-800 text-white shadow-xs'
                    : 'border-slate-800 hover:border-slate-700 bg-slate-950/60 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{v.name}</span>
                  {v.expectedBlocked ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-rose-950/80 text-rose-300 border border-rose-800">
                      BLOCK EXPECTED
                    </span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                      SAFE ALLOW
                    </span>
                  )}
                </div>
                <div className={`text-[11px] mt-1 line-clamp-1 font-mono ${
                  !isCustomMode && selectedVectorId === v.id ? 'text-slate-300' : 'text-slate-400'
                }`}>
                  Action: {v.payload.type} &bull; {v.reasonCategory}
                </div>
              </button>
            ))}

            <button
              onClick={() => {
                setIsCustomMode(true);
                if (!customActionJson) {
                  setCustomActionJson(JSON.stringify(currentVector.payload, null, 2));
                }
              }}
              className={`w-full text-left p-3 rounded-lg border transition-all text-xs ${
                isCustomMode
                  ? 'border-emerald-500/80 bg-slate-800 text-white shadow-xs'
                  : 'border-slate-800 hover:border-slate-700 bg-slate-950/60 text-slate-300'
              }`}
            >
              <span className="font-semibold">+ Custom Action JSON Payload</span>
              <p className={`text-[11px] mt-0.5 ${isCustomMode ? 'text-slate-300' : 'text-slate-400'}`}>
                Craft and test custom Cloud Reasoning agent responses
              </p>
            </button>
          </div>
        </div>

        {/* Middle Column: Proposed Action Inspector */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 shadow-sm flex flex-col space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5" />
              Incoming Cloud Reasoning Action Proposal
            </h3>
            {isCustomMode && (
              <button
                onClick={handleRunCustom}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded flex items-center gap-1"
              >
                <Play className="w-3 h-3" />
                Validate
              </button>
            )}
          </div>

          <div className="flex-1 bg-slate-950 text-slate-200 rounded-lg p-3 font-mono text-xs overflow-auto border border-slate-800">
            {isCustomMode ? (
              <textarea
                value={customActionJson}
                onChange={(e) => setCustomActionJson(e.target.value)}
                className="w-full h-72 bg-transparent text-emerald-400 font-mono text-xs focus:outline-hidden"
              />
            ) : (
              <pre className="text-emerald-400 whitespace-pre-wrap">
                {JSON.stringify(currentVector.payload, null, 2)}
              </pre>
            )}
          </div>

          {!isCustomMode && (
            <button
              onClick={() => handleTestVector(currentVector.payload as AgentActionProposal)}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              Evaluate with Action Security Gate
            </button>
          )}
        </div>

        {/* Right Column: Validation Verdict & Sanitized Output */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 shadow-sm flex flex-col space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Action Gate Verdict & Execution Payload
          </h3>

          {validationResult ? (
            <div className="space-y-4">
              
              {/* Verdict Status Card */}
              <div className={`p-4 rounded-lg border ${
                validationResult.isAllowed
                  ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-800 text-rose-300'
              }`}>
                <div className="flex items-center gap-2">
                  {validationResult.isAllowed ? (
                    <>
                      <ShieldCheck className="w-5 h-5 text-emerald-400" />
                      <span className="font-bold text-sm">ACTION APPROVED FOR BROWSER EXECUTION</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-5 h-5 text-rose-400" />
                      <span className="font-bold text-sm">ACTION INTERCEPTED & BLOCKED</span>
                    </>
                  )}
                </div>

                {validationResult.rejectionReason && (
                  <p className="text-xs font-mono mt-2 bg-slate-950/80 p-2 rounded border border-rose-900 text-rose-300">
                    {validationResult.rejectionReason}
                  </p>
                )}
              </div>

              {/* Security Flags */}
              <div>
                <span className="block text-[11px] font-semibold text-slate-400 uppercase mb-1.5">
                  Security Flags Triggered:
                </span>
                {validationResult.securityFlagsTriggered.length === 0 ? (
                  <span className="text-xs text-slate-500 italic">None (Clean action proposal)</span>
                ) : (
                  <div className="space-y-1">
                    {validationResult.securityFlagsTriggered.map((flag, idx) => (
                      <div key={idx} className="text-xs font-mono px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-200 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>{flag}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Payload Sent to Browser Content Script */}
              {validationResult.isAllowed && validationResult.sanitizedAction && (
                <div>
                  <span className="block text-[11px] font-semibold text-slate-400 uppercase mb-1.5">
                    Sanitized Action Sent to Browser Layer:
                  </span>
                  <div className="bg-slate-950 text-emerald-300 p-3 rounded-lg font-mono text-xs overflow-auto max-h-48 border border-slate-800">
                    <pre>{JSON.stringify(validationResult.sanitizedAction, null, 2)}</pre>
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs text-center p-6 border border-dashed border-slate-800 rounded-lg">
              <Lock className="w-8 h-8 text-slate-600 mb-2" />
              Click "Evaluate with Action Security Gate" to run security inspection.
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
