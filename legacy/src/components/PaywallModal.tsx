import React from 'react';

interface PaywallModalProps {
  isOpen: boolean;
  featureName: string;
  onClose: () => void;
  onOpenPayment: () => void;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({
  isOpen,
  featureName,
  onClose,
  onOpenPayment,
}) => {
  if (!isOpen) return null;

  const featureTitles: Record<string, string> = {
    bolekauth: 'BolekAuth Manager (2FA & Biometrics)',
    send: 'Boleksend Email Suite & Automation',
    notes: 'BolekDash Premium Publishing',
    future: 'Advanced Enterprise Module',
  };

  const title = featureTitles[featureName] || featureName || 'Premium Module';

  return (
    <div className="fixed inset-0 z-[10010] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md animate-fade-in">
      <div 
        className="bg-white border border-stone-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col transition-all transform animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/20 hover:bg-black/30 flex items-center justify-center text-white transition cursor-pointer"
            aria-label="Close modal"
          >
            <span className="material-symbols-outlined !text-lg">close</span>
          </button>
          
          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-3 border border-white/30 shadow-inner">
            <span className="material-symbols-outlined !text-2xl text-white">lock_reset</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest bg-white/20 px-2.5 py-1 rounded-full border border-white/30 inline-block mb-1">
            Pro Feature Locked
          </span>
          <h3 className="text-xl font-bold leading-tight">Subscription Required</h3>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 text-stone-700 text-sm">
          {/* Main User Requested Alert */}
          <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-xl text-amber-900 flex items-start gap-3">
            <span className="material-symbols-outlined text-amber-600 !text-xl shrink-0 mt-0.5">warning</span>
            <div>
              <p className="font-bold text-xs uppercase tracking-wider text-amber-800 mb-0.5">Access Restricted</p>
              <p className="text-xs leading-relaxed font-medium">
                Sorry, your subscription is not authorized to access this feature.
              </p>
            </div>
          </div>

          <p className="text-xs text-stone-600 leading-relaxed">
            You are attempting to access <strong className="text-stone-900">{title}</strong>. Regular user accounts are limited to Dashboard, BolekDash, Calendar, and Profile. Upgrade via PayPal to unlock Boleksend, BolekAuth, and future premium tools with a 10-day trial.
          </p>

          {/* Premium Highlights */}
          <div className="bg-stone-50 border border-stone-200/70 rounded-xl p-3.5 space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">What Pro unlocks:</div>
            <ul className="space-y-1.5 text-xs text-stone-700">
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600 !text-base">check_circle</span>
                <span><strong>BolekAuth Manager</strong> — 2FA, TOTP & Passkeys Vault</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600 !text-base">check_circle</span>
                <span><strong>Boleksend</strong> — Bulk Emailing, AWS SMTP Relay & Workflows</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600 !text-base">check_circle</span>
                <span><strong>Future Enterprise Modules</strong> & Priority Support</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-100 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>
          
          <button
            onClick={() => {
              onClose();
              onOpenPayment();
            }}
            className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 rounded-xl shadow-md hover:shadow-lg transition cursor-pointer flex items-center gap-2 active:scale-95"
          >
            <span className="material-symbols-outlined !text-base">payments</span>
            <span>Configure Payment & Upgrade</span>
          </button>
        </div>
      </div>
    </div>
  );
};
