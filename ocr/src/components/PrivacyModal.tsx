import React from 'react';
import { ShieldCheck, Lock, Cpu, Database, AlertCircle, X, CheckCircle } from 'lucide-react';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-200 text-xs">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                PRIVAGENT Local Processing &amp; Privacy Guarantee
              </h2>
              <p className="text-xs text-slate-400">
                Architectural Transparency &amp; Security Principles (Member 4)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto leading-relaxed">
          {/* Section 1: In-Browser Execution */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
              <Cpu className="w-4 h-4" />
              <span>100% In-Browser WebAssembly / Web Worker Execution</span>
            </div>
            <p className="text-slate-300">
              PRIVAGENT is designed around zero-trust client privacy. Tesseract.js executes via a WebAssembly binary compiled directly inside an isolated browser Web Worker.
              <strong> No screenshot, canvas buffer, or recognized text string is ever uploaded or proxied to a remote API or cloud vision backend.</strong>
            </p>
          </div>

          {/* Section 2: Model Weights vs User Screenshots */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
              <Database className="w-4 h-4" />
              <span>Model Weight Download vs. User Screenshot Upload</span>
            </div>
            <p className="text-slate-300">
              When OCR runs for the first time, your browser downloads a static language dictionary file (<code>eng.traineddata.gz</code>) from a public CDN and caches it in local browser storage (IndexedDB).
            </p>
            <div className="p-2.5 rounded bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400">
              <strong className="text-slate-200">Directionality:</strong> Network activity is strictly <em>inbound</em> (downloading static character weights to your machine). There is zero <em>outbound</em> network payload containing your pixels or recognized strings.
            </div>
          </div>

          {/* Section 3: Ephemeral Data Lifecycle */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
              <Lock className="w-4 h-4" />
              <span>Ephemeral Data Lifecycle</span>
            </div>
            <ul className="list-disc pl-5 space-y-1 text-slate-300">
              <li>Screenshots are kept exclusively in active browser memory (DOM Image / Canvas).</li>
              <li>No localStorage, cookies, or remote databases store your images or recognized text.</li>
              <li>Clicking &ldquo;Reset&rdquo; or reloading the tab purges all canvas buffers and detection arrays immediately.</li>
              <li>Console logging of recognized text is disabled to prevent leakage in DevTools.</li>
            </ul>
          </div>

          {/* Section 4: Accuracy & Limitations */}
          <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/60 text-amber-200/90 space-y-1.5">
            <div className="flex items-center gap-2 text-amber-300 font-semibold">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span>OCR Accuracy &amp; Confidence Scores</span>
            </div>
            <p className="text-[11px]">
              Optical Character Recognition can make errors, especially on low-resolution fonts, heavily stylized typography, or noisy backgrounds.
              Statistical confidence scores represent engine likelihood, not a 100% guarantee of semantic correctness.
              The heuristic pattern demonstrator flags potential sensitive sequences for review by Member 2&apos;s authoritative Privacy Guard module.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-medium">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Audited for Zero Telemetry Leakage</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};
