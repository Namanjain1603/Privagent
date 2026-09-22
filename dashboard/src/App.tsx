import React, { useState } from 'react';
import {
  INITIAL_ACTIVE_TELEMETRY,
  CLEAN_PAGE_TELEMETRY,
  BENCHMARK_REPORT_DATA,
  INITIAL_TEST_CASES,
} from './data/mockTelemetry';
import { TelemetryPayload, TestCase } from './types/privagent';
import { Header } from './components/Header';
import { PrivacySummaryCards } from './components/PrivacySummaryCards';
import { PipelineFlow } from './components/PipelineFlow';
import { PiiAuditTable } from './components/PiiAuditTable';
import { ActionHistoryTable } from './components/ActionHistoryTable';
import { LatencyResourcePanel } from './components/LatencyResourcePanel';
import { IndianSyntheticPiiCards } from './components/IndianSyntheticPiiCards';
import { AllowlistedActionValidator } from './components/AllowlistedActionValidator';
import { PrivacyBenchmarkSection } from './components/PrivacyBenchmarkSection';
import { IntegrationHealthPanel } from './components/IntegrationHealthPanel';
import { DemoReadinessSection } from './components/DemoReadinessSection';
import { TestMatrixTab } from './components/TestMatrixTab';
import { PlaywrightExportTab } from './components/PlaywrightExportTab';
import { ApiContractView } from './components/ApiContractView';
import {
  LayoutDashboard,
  CheckCircle2,
  Terminal,
  ArrowRightLeft,
  ExternalLink,
  ShieldCheck,
  Info,
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'TELEMETRY' | 'TEST_MATRIX' | 'PLAYWRIGHT' | 'CONTRACTS'>('TELEMETRY');
  const [activeScenario, setActiveScenario] = useState<'active' | 'clean'>('active');
  const [telemetry, setTelemetry] = useState<TelemetryPayload>(INITIAL_ACTIVE_TELEMETRY);
  const [testCases, setTestCases] = useState<TestCase[]>(INITIAL_TEST_CASES);
  const [selectedPiiFilter, setSelectedPiiFilter] = useState<string>('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Scenario toggle (Synthetic PII vs Clean Page)
  const handleToggleScenario = (scenario: 'active' | 'clean') => {
    setActiveScenario(scenario);
    if (scenario === 'active') {
      setTelemetry({
        ...INITIAL_ACTIVE_TELEMETRY,
        timestamp: new Date().toISOString(),
      });
    } else {
      setTelemetry({
        ...CLEAN_PAGE_TELEMETRY,
        timestamp: new Date().toISOString(),
      });
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setTelemetry((prev) => ({
        ...prev,
        timestamp: new Date().toISOString(),
        latency: {
          ...prev.latency,
          totalEndToEndMs: Math.floor(650 + Math.random() * 150),
        },
      }));
      setIsRefreshing(false);
    }, 400);
  };

  // Simulate re-running a test in the UI matrix
  const handleRunTestSimulation = (testId: string) => {
    setTestCases((prev) =>
      prev.map((tc) => (tc.id === testId ? { ...tc, status: 'RUNNING' } : tc))
    );

    setTimeout(() => {
      setTestCases((prev) =>
        prev.map((tc) =>
          tc.id === testId
            ? {
                ...tc,
                status: 'PASS',
                actualResult: `Simulated re-run at ${new Date().toLocaleTimeString()} passed with 0 raw PII sent.`,
              }
            : tc
        )
      );
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-100/60 text-slate-900 flex flex-col font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* Top Header */}
      <Header
        sessionStatus={telemetry.currentSessionStatus}
        isSimulated={telemetry.isSimulatedDemoData}
        activeScenario={activeScenario}
        onToggleDemoScenario={handleToggleScenario}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 flex-1 space-y-5">
        
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-3 gap-3">
          <div className="flex items-center space-x-1 sm:space-x-2 bg-slate-200/70 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('TELEMETRY')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'TELEMETRY'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-emerald-600" />
              <span>Live Privacy & Telemetry</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('TEST_MATRIX')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'TEST_MATRIX'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              <span>Test Matrix (16 Cases)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('PLAYWRIGHT')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'PLAYWRIGHT'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Terminal className="w-4 h-4 text-indigo-600" />
              <span>Playwright E2E Suite</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('CONTRACTS')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'CONTRACTS'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowRightLeft className="w-4 h-4 text-purple-600" />
              <span>API Contracts (M1-M5)</span>
            </button>
          </div>

          {/* Current Monitored URL Banner */}
          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
            <span className="font-semibold text-slate-500">Target Page:</span>
            <span className="font-mono text-slate-800 truncate max-w-xs">{telemetry.url}</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </div>
        </div>

        {/* TAB 1: Live Telemetry & Audit */}
        {activeTab === 'TELEMETRY' && (
          <div className="space-y-5">
            {/* Top Privacy Cards */}
            <PrivacySummaryCards
              privacyStatus={telemetry.privacyStatus}
              piiDetected={telemetry.piiDetectedCount}
              piiRedacted={telemetry.piiRedactedCount}
              rawPiiSent={telemetry.rawPiiSentToCloud}
              latencyMs={telemetry.latency.totalEndToEndMs}
              sessionStatus={telemetry.currentSessionStatus}
              e2eTestStatus="PASS"
              privacyTestStatus="PASS"
              integrationTestStatus="PASS"
            />

            {/* Pipeline Flow Architecture */}
            <PipelineFlow />

            {/* Step 2: Indian Synthetic PII Data Cards */}
            <IndianSyntheticPiiCards
              selectedTypeFilter={selectedPiiFilter}
              onSelectTypeFilter={setSelectedPiiFilter}
            />

            {/* Step 2: On-Device PII Detection & Redaction Audit Trail Table (Full Width) */}
            <PiiAuditTable
              piiList={telemetry.detectedPiiList}
              activeTypeFilter={selectedPiiFilter}
              onFilterChange={setSelectedPiiFilter}
            />

            {/* Step 3: Allowlisted Action Schema Validator (Pre-Execution Security Gateway) */}
            <AllowlistedActionValidator />

            {/* Browser Action Stream (Validated Schema Execution History) */}
            <ActionHistoryTable actions={telemetry.recentActions} />

            {/* Latency Breakdown & Resource Footprint */}
            <LatencyResourcePanel
              latency={telemetry.latency}
              resources={telemetry.clientResources}
            />

            {/* Step 4: Privacy & PII Quality Benchmark, Dynamic Test Summary & Test Results Table */}
            <PrivacyBenchmarkSection />

            {/* Step 4: System Integration Health & Resilience Failure Scenarios */}
            <IntegrationHealthPanel />

            {/* Step 5: Demo Readiness & Subsystem Verification Gate */}
            <DemoReadinessSection telemetry={telemetry} />
          </div>
        )}

        {/* TAB 2: SIH Test Matrix (16 Cases) */}
        {activeTab === 'TEST_MATRIX' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-900 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <span className="font-bold">Member 6 Testing Mandate:</span> All 16 required test scenarios
                (including Aadhaar, PAN, Password strict suppression, edge cases, viewport matrices, and backend failure resilience)
                are pre-mapped with explicit Preconditions, Steps, Expected Result, and Status.
              </div>
            </div>
            <TestMatrixTab
              testCases={testCases}
              onRunTestSimulation={handleRunTestSimulation}
            />
          </div>
        )}

        {/* TAB 3: Playwright E2E Runner */}
        {activeTab === 'PLAYWRIGHT' && (
          <div className="space-y-4">
            <PlaywrightExportTab />
          </div>
        )}

        {/* TAB 4: API Contracts */}
        {activeTab === 'CONTRACTS' && (
          <div className="space-y-4">
            <ApiContractView />
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="font-medium text-slate-700">PRIVAGENT SIH26171</span>
            <span>• On-device Visual Perception for Light-weight Browser Agents</span>
          </div>
          <div>
            Module 6 (Dashboard + Testing) • Zero-Leak Privacy Architecture
          </div>
        </div>
      </footer>
    </div>
  );
}
