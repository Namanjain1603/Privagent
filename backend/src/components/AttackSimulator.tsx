import React, { useState } from "react";
import { ShieldAlert, Bug, Terminal, AlertTriangle, CheckCircle } from "lucide-react";

interface AttackSimulatorProps {
  sessionId: string;
  onLog: (level: "INFO" | "SECURITY" | "REJECTED" | "SUCCESS", endpoint: string, message: string, data?: any) => void;
}

export const AttackSimulator: React.FC<AttackSimulatorProps> = ({ sessionId, onLog }) => {
  const [selectedAttack, setSelectedAttack] = useState<string>("xss_url");
  const [attackStatus, setAttackStatus] = useState<{ status: "IDLE" | "BLOCKED" | "FAILED"; message?: string }>({ status: "IDLE" });

  const attacks = [
    {
      id: "xss_url",
      name: "URL Protocol Injection",
      payload: "javascript:alert(document.cookie)",
      type: "NAVIGATE",
      endpoint: "/validate-action"
    },
    {
      id: "dangerous_target",
      name: "DOM Script Tag Target",
      payload: "<script>window.location='http://attacker.com'</script>",
      type: "CLICK",
      endpoint: "/validate-action"
    },
    {
      id: "eval_injection",
      name: "Eval() Code Injection in Value",
      payload: "eval('rm -rf /')",
      type: "TYPE",
      endpoint: "/validate-action"
    },
    {
      id: "unredacted_card",
      name: "PII Leakage (Raw Credit Card)",
      payload: "Card: 4111 2222 3333 4444",
      type: "ANALYZE_PII",
      endpoint: "/analyze"
    },
    {
      id: "unverified_privacy",
      name: "M2 Privacy Bypass (redaction_verified: false)",
      payload: "Unredacted Context Bypass",
      type: "ANALYZE_BYPASS",
      endpoint: "/analyze"
    }
  ];

  const currentAttackObj = attacks.find(a => a.id === selectedAttack);

  const executeAttack = async () => {
    if (!currentAttackObj) return;

    onLog("SECURITY", currentAttackObj.endpoint, `Simulating attack: ${currentAttackObj.name}`);

    try {
      if (currentAttackObj.type === "ANALYZE_PII") {
        const res = await fetch("/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionId,
            url: "https://shop.example.com",
            sanitized_context: {
              redaction_verified: true,
              elements: [{ tag: "div", text_content: currentAttackObj.payload }]
            }
          })
        });
        const data = await res.json();
        if (res.status === 422 && data.error?.code === "PII_LEAK_DETECTED") {
          setAttackStatus({ status: "BLOCKED", message: data.error.message });
          onLog("REJECTED", "/analyze", `[BLOCKED BY DEFENSE-IN-DEPTH] ${data.error.message}`);
        } else {
          setAttackStatus({ status: "FAILED", message: "Attack was not blocked properly!" });
        }
      } else if (currentAttackObj.type === "ANALYZE_BYPASS") {
        const res = await fetch("/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionId,
            url: "https://shop.example.com",
            sanitized_context: {
              redaction_verified: false,
              elements: []
            }
          })
        });
        const data = await res.json();
        if (!res.ok) {
          setAttackStatus({ status: "BLOCKED", message: data.error?.message || "Privacy verification missing" });
          onLog("REJECTED", "/analyze", `[BLOCKED BY M5 PRIVACY GATE] ${data.error?.message}`);
        }
      } else {
        const res = await fetch("/validate-action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionId,
            action: {
              type: currentAttackObj.type,
              target: currentAttackObj.type === "NAVIGATE" ? currentAttackObj.payload : (currentAttackObj.type === "CLICK" ? currentAttackObj.payload : "#input-box"),
              value: currentAttackObj.type === "TYPE" ? currentAttackObj.payload : null
            }
          })
        });
        const data = await res.json();
        if (data.is_safe === false) {
          setAttackStatus({ status: "BLOCKED", message: data.rejection_reason });
          onLog("REJECTED", "/validate-action", `[BLOCKED BY ZERO-TRUST GATE] ${data.rejection_reason}`, data);
        } else {
          setAttackStatus({ status: "FAILED", message: "Action was unexpectedly approved!" });
        }
      }
    } catch (e: any) {
      onLog("REJECTED", "Attack Error", e.message);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-rose-600" />
          <h2 className="text-base font-semibold text-slate-900">Zero-Trust Attack Testing Suite</h2>
        </div>
        <span className="text-xs px-2.5 py-1 bg-rose-50 text-rose-700 font-medium rounded-full border border-rose-200">
          Fail-Closed Validator
        </span>
      </div>

      <div className="p-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Select Attack Vector</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {attacks.map((atk) => (
              <button
                key={atk.id}
                onClick={() => { setSelectedAttack(atk.id); setAttackStatus({ status: "IDLE" }); }}
                className={`p-3 rounded-lg border text-left text-xs transition-all ${
                  selectedAttack === atk.id
                    ? "bg-rose-50/70 border-rose-300 ring-1 ring-rose-400 font-medium text-slate-900"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <div className="font-semibold text-slate-900">{atk.name}</div>
                <div className="text-2xs font-mono text-rose-600 truncate mt-0.5">{atk.payload}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="p-3 bg-slate-900 rounded-lg text-xs font-mono text-slate-300">
          <div className="text-2xs text-slate-400 mb-1">PAYLOAD PREVIEW:</div>
          <div className="text-rose-400 break-all">{currentAttackObj?.payload}</div>
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={executeAttack}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            <Bug className="h-3.5 w-3.5" />
            <span>Launch Attack Test</span>
          </button>

          {attackStatus.status === "BLOCKED" && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 font-medium">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              <span>SUCCESSFULLY BLOCKED: {attackStatus.message}</span>
            </div>
          )}

          {attackStatus.status === "FAILED" && (
            <div className="flex items-center gap-1.5 text-xs text-rose-700 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 font-medium">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
              <span>{attackStatus.message}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
