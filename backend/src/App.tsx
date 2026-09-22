import React, { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { MetricsOverview } from "./components/MetricsOverview";
import { LiveApiConsole } from "./components/LiveApiConsole";
import { AttackSimulator } from "./components/AttackSimulator";
import { ContractHandoffs } from "./components/ContractHandoffs";
import { ObservabilityMetrics, SessionStats, SecurityStats, SystemStatus, LogEntry } from "./types";
import { Terminal, Trash2, CheckCircle2, ShieldAlert } from "lucide-react";

export default function App() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [metrics, setMetrics] = useState<ObservabilityMetrics | null>(null);
  const [sessions, setSessions] = useState<SessionStats | null>(null);
  const [security, setSecurity] = useState<SecurityStats | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("sess_sih_demo_01");

  const addLog = (level: "INFO" | "SECURITY" | "REJECTED" | "SUCCESS", endpoint: string, message: string, data?: any) => {
    const newEntry: LogEntry = {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toLocaleTimeString(),
      level,
      endpoint,
      message,
      data
    };
    setLogs((prev) => [newEntry, ...prev.slice(0, 49)]);
  };

  const fetchStatusAndMetrics = async () => {
    try {
      // 1. Health check
      const healthRes = await fetch("/health");
      const healthData = await healthRes.json();

      // 2. Ready check
      const readyRes = await fetch("/health/ready");
      const readyData = await readyRes.json();

      setSystemStatus({
        status: healthData.status,
        service: healthData.service,
        demo_mode: healthData.demo_mode,
        database: readyData.database,
        environment: readyData.environment
      });

      // 3. Metrics
      const metricsRes = await fetch("/observability/metrics");
      const metricsData = await metricsRes.json();
      setMetrics(metricsData.metrics);
      setSessions(metricsData.sessions);
      setSecurity(metricsData.security);
    } catch (err: any) {
      addLog("REJECTED", "Fetch Status", `Could not connect to backend: ${err.message}`);
    }
  };

  useEffect(() => {
    fetchStatusAndMetrics();
    const interval = setInterval(fetchStatusAndMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased">
      <Header status={systemStatus} onRefresh={fetchStatusAndMetrics} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top Notification Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-4 text-white shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="font-semibold text-sm">
              SIH 2026 Problem Statement SIH26171 — Member 5 Backend &amp; Integration Hub
            </div>
            <p className="text-xs text-blue-100 mt-0.5">
              Zero-Trust Browser Action Validation, On-Device Privacy Enforcement &amp; SQLite WAL Telemetry Engine.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xs bg-white/20 text-white font-mono px-2 py-1 rounded-md">
              Target Port: 3000
            </span>
            <span className="text-2xs bg-emerald-400 text-slate-900 font-bold px-2 py-1 rounded-md">
              ALL 15 DAYS FROZEN
            </span>
          </div>
        </div>

        {/* Real-Time Metrics Row */}
        <MetricsOverview metrics={metrics} sessions={sessions} security={security} />

        {/* Live E2E Pipeline Tester & Adversarial Attack Tester */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LiveApiConsole sessionId={activeSessionId} onLog={addLog} />
          <AttackSimulator sessionId={activeSessionId} onLog={addLog} />
        </div>

        {/* Team Contract Responsibilities Matrix */}
        <ContractHandoffs />

        {/* Live Streaming Gateway Audit & Telemetry Console */}
        <div className="bg-slate-950 rounded-xl border border-slate-800 shadow-md overflow-hidden">
          <div className="p-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-blue-400" />
              <span className="text-xs font-semibold text-slate-200">
                Live Gateway Audit Stream &amp; Correlation Log (M5)
              </span>
            </div>
            <button
              onClick={() => setLogs([])}
              className="flex items-center gap-1 text-2xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded-sm bg-slate-800 transition-colors"
            >
              <Trash2 className="h-3 w-3" />
              <span>Clear Log</span>
            </button>
          </div>

          <div className="p-4 font-mono text-2xs space-y-1.5 max-h-60 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-slate-500 py-3 text-center">
                System ready. Run "Run E2E Demo" or "Launch Attack Test" above to see real-time zero-trust evaluation.
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex items-start gap-2 text-slate-300">
                  <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                  <span
                    className={`font-semibold shrink-0 ${
                      log.level === "SECURITY"
                        ? "text-rose-400"
                        : log.level === "REJECTED"
                        ? "text-amber-400"
                        : log.level === "SUCCESS"
                        ? "text-emerald-400"
                        : "text-blue-400"
                    }`}
                  >
                    [{log.level}]
                  </span>
                  <span className="text-slate-400 shrink-0 font-semibold">{log.endpoint}:</span>
                  <span className="text-slate-200 break-all">{log.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-3 text-center text-xs text-slate-500">
        PRIVAGENT • Smart India Hackathon (SIH 2026) • Problem Statement SIH26171 • Member 5 Backend &amp; Integration Hub
      </footer>
    </div>
  );
}
