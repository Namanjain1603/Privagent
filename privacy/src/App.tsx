/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Header } from './components/Header';
import { PipelinePlayground } from './components/PipelinePlayground';
import { ActionSecurityGuard } from './components/ActionSecurityGuard';
import { ContractInspector } from './components/ContractInspector';
import { VerificationSuite } from './components/VerificationSuite';
import { PrivacyGuardCoordinator, DEFAULT_REDACTION_POLICY } from './modules/privacyGuardCoordinator';
import { RedactionPolicy } from './types/privacy';
import { ShieldCheck, Lock, EyeOff, Layers } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('playground');
  const [policy, setPolicy] = useState<RedactionPolicy>(DEFAULT_REDACTION_POLICY);
  const [totalDetectionsCount, setTotalDetectionsCount] = useState<number>(4);

  // Maintain singleton coordinator instance
  const coordinatorRef = useRef<PrivacyGuardCoordinator>(new PrivacyGuardCoordinator(DEFAULT_REDACTION_POLICY));

  const handleUpdatePolicy = (newPolicyPartial: Partial<RedactionPolicy>) => {
    const updated = { ...policy, ...newPolicyPartial };
    setPolicy(updated);
    coordinatorRef.current.updatePolicy(updated);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Navigation & Status Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        policy={policy}
        totalDetectionsCount={totalDetectionsCount}
      />

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'playground' && (
          <PipelinePlayground
            coordinator={coordinatorRef.current}
            policy={policy}
            onUpdatePolicy={handleUpdatePolicy}
            onDetectionsChange={(count) => setTotalDetectionsCount(count)}
          />
        )}

        {activeTab === 'actions' && (
          <ActionSecurityGuard coordinator={coordinatorRef.current} />
        )}

        {activeTab === 'contracts' && (
          <ContractInspector />
        )}

        {activeTab === 'tests' && (
          <VerificationSuite coordinator={coordinatorRef.current} />
        )}
      </main>

      {/* Engineering Footer */}
      <footer className="border-t border-slate-800 bg-slate-950/90 backdrop-blur py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-200">PRIVAGENT (Privacy & PII Guard Engine)</span>
            <span className="text-slate-600">&bull;</span>
            <span className="text-slate-400">SIH26171: On-device Visual Perception for Light-weight Browser Agents</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Pre-Flight Zero-Leak Verified
            </span>
            <span className="text-slate-700">|</span>
            <span className="text-slate-400">Safe Actions: CLICK &bull; TYPE &bull; SELECT &bull; SCROLL &bull; NAVIGATE</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
