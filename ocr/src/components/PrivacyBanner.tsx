import React, { useState } from 'react';
import { ShieldCheck, AlertCircle, X, CheckCircle2, Lock } from 'lucide-react';

export const PrivacyBanner: React.FC = () => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-slate-900/90 border-b border-indigo-900/50 px-4 py-2.5 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start sm:items-center gap-2.5 text-slate-300">
          <div className="p-1 rounded bg-indigo-500/20 text-indigo-400 mt-0.5 sm:mt-0 shrink-0">
            <Lock className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-semibold text-white">Local In-Browser Privacy Guarantee: </span>
            <span className="text-slate-300">
              Screenshots and extracted text remain 100% inside your browser session. No images or text are sent to external servers or cloud vision APIs.
            </span>
            <span className="text-slate-400 block sm:inline sm:ml-1">
              Language model weights (traineddata) are cached locally in your browser storage.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
          <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
            <CheckCircle2 className="w-3 h-3" /> Zero Server Telemetry
          </span>
          <button
            id="dismiss-privacy-banner-btn"
            onClick={() => setDismissed(true)}
            className="text-slate-400 hover:text-slate-200 p-1 rounded transition"
            aria-label="Dismiss banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
