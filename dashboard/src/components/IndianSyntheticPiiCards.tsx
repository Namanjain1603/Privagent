import React from 'react';
import { CreditCard, Smartphone, Mail, KeyRound, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface IndianSyntheticPiiCardsProps {
  selectedTypeFilter?: string;
  onSelectTypeFilter?: (type: string) => void;
}

export const IndianSyntheticPiiCards: React.FC<IndianSyntheticPiiCardsProps> = ({
  selectedTypeFilter,
  onSelectTypeFilter,
}) => {
  const cards = [
    {
      id: 'AADHAAR',
      name: 'Aadhaar (UIDAI)',
      format: '12-Digit Indian National ID',
      sampleSynthetic: 'XXXX-XXXX-9021',
      compliance: 'Aadhaar Masking Guideline (UIDAI)',
      method: 'On-Device Verhoeff Regex + MASK',
      leakStatus: '0 Bytes to Cloud',
      icon: CreditCard,
      color: 'border-purple-200 bg-purple-50/40 text-purple-900',
      badgeColor: 'bg-purple-100 text-purple-800',
    },
    {
      id: 'PAN',
      name: 'PAN Card (Income Tax)',
      format: '10-Char Alphanumeric Tax ID',
      sampleSynthetic: 'ABCDE****G',
      compliance: 'Indian IT Act / KYC Standard',
      method: 'DOM + Visual OCR Redaction',
      leakStatus: '0 Bytes to Cloud',
      icon: CreditCard,
      color: 'border-blue-200 bg-blue-50/40 text-blue-900',
      badgeColor: 'bg-blue-100 text-blue-800',
    },
    {
      id: 'PHONE',
      name: 'Indian Mobile (+91)',
      format: '10-Digit TRAI Mobile Series',
      sampleSynthetic: '+91 98765 *****',
      compliance: 'TRAI Anti-Profiling Directive',
      method: 'Prefix Match & Suffix Masking',
      leakStatus: '0 Bytes to Cloud',
      icon: Smartphone,
      color: 'border-emerald-200 bg-emerald-50/40 text-emerald-900',
      badgeColor: 'bg-emerald-100 text-emerald-800',
    },
    {
      id: 'EMAIL',
      name: 'Personal Email',
      format: 'RFC 5322 Standard Mailbox',
      sampleSynthetic: 'demo.sih.****@synthetic.test',
      compliance: 'DPDP Act 2023 Principles',
      method: 'Local Synthetic Token Replace',
      leakStatus: '0 Bytes to Cloud',
      icon: Mail,
      color: 'border-indigo-200 bg-indigo-50/40 text-indigo-900',
      badgeColor: 'bg-indigo-100 text-indigo-800',
    },
    {
      id: 'PASSWORD',
      name: 'Password Fields',
      format: 'Authentication Secrets & PINs',
      sampleSynthetic: '•••••••••••• (Suppressed)',
      compliance: 'Security Rule #1 (Strict Omit)',
      method: 'Direct Extension DOM Stripping',
      leakStatus: 'NEVER CAPTURED',
      icon: KeyRound,
      color: 'border-rose-200 bg-rose-50/40 text-rose-900',
      badgeColor: 'bg-rose-100 text-rose-800',
    },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs" id="indian-pii-cards-container">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Synthetic Indian PII Protection Standards</span>
          </h3>
          <p className="text-xs text-slate-500">
            Pre-configured on-device perception & masking rules for Indian identity benchmarks (Zero real data used).
          </p>
        </div>
        <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
          Click any card to filter audit trail below
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-3">
        {cards.map((card) => {
          const Icon = card.icon;
          const isSelected = selectedTypeFilter === card.id;

          return (
            <div
              key={card.id}
              onClick={() => onSelectTypeFilter && onSelectTypeFilter(isSelected ? 'ALL' : card.id)}
              className={`p-3 rounded-lg border transition-all cursor-pointer flex flex-col justify-between ${
                card.color
              } ${
                isSelected
                  ? 'ring-2 ring-slate-900 shadow-sm'
                  : 'hover:shadow-xs hover:border-slate-400'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${card.badgeColor}`}>
                    {card.id}
                  </span>
                  <Icon className="w-4 h-4 opacity-75" />
                </div>
                
                <h4 className="text-xs font-bold text-slate-900">{card.name}</h4>
                <p className="text-[10px] text-slate-500">{card.format}</p>

                <div className="my-2 bg-white/90 p-1.5 rounded border border-slate-200 font-mono text-xs font-semibold text-slate-800 truncate">
                  {card.sampleSynthetic}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/60 text-[10px] space-y-1">
                <div className="text-slate-600 font-medium">
                  <span className="text-slate-400">Method: </span>
                  {card.method}
                </div>
                <div className="flex items-center justify-between font-semibold text-emerald-700">
                  <span className="flex items-center gap-0.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    {card.leakStatus}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
