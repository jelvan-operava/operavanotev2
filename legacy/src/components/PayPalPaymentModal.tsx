import React, { useState } from 'react';
import { SubscriptionPlan } from '../types';

interface PayPalPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: (plan: SubscriptionPlan) => void;
  userEmail?: string;
}

export const PayPalPaymentModal: React.FC<PayPalPaymentModalProps> = ({
  isOpen,
  onClose,
  onPaymentSuccess,
  userEmail = 'secured.jelvan@gmail.com',
}) => {
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('pro');
  const [paymentMethod, setPaymentMethod] = useState<'paypal' | 'card'>('paypal');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState<string>('');
  const [showDocsInfo, setShowDocsInfo] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Card form state
  const [cardNumber, setCardNumber] = useState('4111 2222 3333 4444');
  const [cardExp, setCardExp] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('123');
  const [cardName, setCardName] = useState('Jelvan Ricolcol');

  // PayPal Sandbox Account state
  const [paypalEmail, setPaypalEmail] = useState(userEmail);

  if (!isOpen) return null;

  const planPrices = {
    regular: '$0 / mo',
    pro: '$9.99 / mo',
    enterprise: '$29.99 / mo',
  };

  const planTitles = {
    regular: 'Regular (Free)',
    pro: 'Pro Subscriber',
    enterprise: 'Enterprise Unlimited',
  };

  const handlePay = async () => {
    setErrorMessage('');
    setIsProcessing(true);
    setProcessStep('Connecting to Cloudflare PayPal checkout...');

    try {
      const response = await fetch('/api/paypal/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: selectedPlan,
          email: paypalEmail,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'PayPal checkout is not available.');
      }

      setProcessStep('Redirecting to PayPal to approve the 10-day trial...');
      localStorage.setItem('bolek_pending_paypal_plan', selectedPlan);
      localStorage.setItem('bolek_pending_paypal_subscription', payload.subscriptionId);
      window.location.assign(payload.approvalUrl);
    } catch (error: any) {
      setIsProcessing(false);
      setErrorMessage(error?.message || 'Unable to start PayPal checkout.');
    }
  };

  return (
    <div className="fixed inset-0 z-[10015] flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-md animate-fade-in">
      <div 
        className="bg-white border border-stone-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-all transform animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="bg-stone-900 p-5 text-white flex items-center justify-between border-b border-stone-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <span className="material-symbols-outlined !text-xl">payments</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">PayPal Payment Gateway</h3>
                <span className="text-[9px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full font-semibold">
                  Live Billing
                </span>
              </div>
              <p className="text-[11px] text-stone-400">Configure subscription checkout with a 10-day trial</p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-stone-400 hover:text-white transition p-1.5 rounded-lg hover:bg-stone-800 cursor-pointer disabled:opacity-50"
            aria-label="Close modal"
          >
            <span className="material-symbols-outlined !text-xl">close</span>
          </button>
        </div>

        {/* Developer Info Standard Banner */}
        <div className="bg-stone-100 px-5 py-2.5 border-b border-stone-200 text-stone-600 text-xs flex items-center justify-between shrink-0">
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-stone-700">
            <span className="material-symbols-outlined !text-sm text-blue-600">code</span>
            <span>Standard: <strong className="text-stone-900">PayPal Subscriptions API</strong></span>
          </span>
          <button 
            type="button"
            onClick={() => setShowDocsInfo(!showDocsInfo)}
            className="text-[11px] text-blue-600 font-semibold hover:underline cursor-pointer flex items-center gap-0.5"
          >
            {showDocsInfo ? 'Hide Spec' : 'View Spec'}
            <span className="material-symbols-outlined !text-xs">info</span>
          </button>
        </div>

        {errorMessage && (
          <div className="mx-5 mt-4 p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs">
            {errorMessage}
          </div>
        )}

        {showDocsInfo && (
          <div className="bg-blue-50/80 p-3.5 border-b border-blue-200 text-[11px] text-blue-900 space-y-1 font-mono shrink-0">
            <p className="font-bold text-blue-950">PayPal Developer Integration Spec:</p>
            <p>• API flows: live PayPal Subscriptions API with a 10-day trial</p>
            <p>• Plan tiers: Pro ($9.99/mo) and Enterprise ($29.99/mo)</p>
            <p>• Charge flow: approval redirect → subscription verification → trial activation</p>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-stone-700 flex-1">
          
          {/* Plan Selector */}
          <div>
            <label className="block font-bold text-stone-900 text-xs mb-2 uppercase tracking-wider text-[11px]">
              1. Select Subscription Tier
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div 
                onClick={() => setSelectedPlan('pro')}
                className={`p-3.5 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                  selectedPlan === 'pro'
                    ? 'border-orange-500 bg-orange-50/60 ring-2 ring-orange-500/20'
                    : 'border-stone-200 bg-white hover:border-stone-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-stone-900 text-sm">Pro Plan</span>
                    <span className="text-[10px] bg-orange-100 text-orange-800 font-bold px-2 py-0.5 rounded-full">Most Popular</span>
                  </div>
                  <p className="text-[11px] text-stone-500 mb-2">Unlocks Boleksend, BolekAuth & Calendar Sync</p>
                </div>
                <div className="font-extrabold text-base text-stone-900">{planPrices.pro}</div>
              </div>

              <div 
                onClick={() => setSelectedPlan('enterprise')}
                className={`p-3.5 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                  selectedPlan === 'enterprise'
                    ? 'border-amber-600 bg-amber-50/60 ring-2 ring-amber-600/20'
                    : 'border-stone-200 bg-white hover:border-stone-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-stone-900 text-sm">Enterprise</span>
                    <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-2 py-0.5 rounded-full">Unlimited</span>
                  </div>
                  <p className="text-[11px] text-stone-500 mb-2">All tools + Future features + Admin control</p>
                </div>
                <div className="font-extrabold text-base text-stone-900">{planPrices.enterprise}</div>
              </div>
            </div>
          </div>

          {/* Payment Method Switcher */}
          <div>
            <label className="block font-bold text-stone-900 text-xs mb-2 uppercase tracking-wider text-[11px]">
              2. Choose PayPal Checkout Option
            </label>
            <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200 mb-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('paypal')}
                className={`flex-1 py-2 rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  paymentMethod === 'paypal' ? 'bg-white text-blue-700 shadow-xs' : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <span className="material-symbols-outlined !text-base">account_balance_wallet</span>
                PayPal Express
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`flex-1 py-2 rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  paymentMethod === 'card' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <span className="material-symbols-outlined !text-base">credit_card</span>
                Debit / Credit Card
              </button>
            </div>

            {/* Method Details */}
            {paymentMethod === 'paypal' ? (
              <div className="p-4 bg-blue-50/60 border border-blue-200/80 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-blue-900">PayPal Express Checkout</span>
                  <span className="text-[10px] font-bold bg-blue-200 text-blue-900 px-2 py-0.5 rounded">10-Day Trial</span>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-stone-600 mb-1">PayPal Account Email</label>
                  <input
                    type="email"
                    value={paypalEmail}
                    onChange={(e) => setPaypalEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg font-medium text-stone-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="sandbox-user@paypal.com"
                  />
                </div>
                <p className="text-[11px] text-blue-800">
                  Clicking "Pay with PayPal" below creates a real PayPal subscription with a 10-day trial.
                </p>
              </div>
            ) : (
              <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-stone-800">Card Payment (PayPal Gateway)</span>
                  <div className="flex items-center gap-1 text-[10px] font-mono text-stone-500">
                    <span>VISA</span> • <span>MC</span> • <span>AMEX</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-stone-600 mb-0.5">Cardholder Name</label>
                  <input
                    type="text"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-stone-600 mb-0.5">Card Number</label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-medium text-stone-600 mb-0.5">Expires (MM/YY)</label>
                    <input
                      type="text"
                      value={cardExp}
                      onChange={(e) => setCardExp(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-stone-600 mb-0.5">CVC / CVV</label>
                    <input
                      type="text"
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Processing Status Banner */}
          {isProcessing && (
            <div className="p-3.5 bg-blue-900 text-white rounded-xl flex items-center gap-3 animate-pulse">
              <span className="material-symbols-outlined animate-spin text-blue-300">sync</span>
              <div className="text-xs">
                <p className="font-bold text-blue-200">Processing PayPal Authorization...</p>
                <p className="text-[11px] text-stone-300 font-mono">{processStep}</p>
              </div>
            </div>
          )}

        </div>

        {/* Action Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between shrink-0">
          <div className="text-stone-500 text-[11px]">
            Total: <strong className="text-stone-900 text-sm">{planPrices[selectedPlan]}</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              onClick={handlePay}
              disabled={isProcessing}
              className="px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl shadow-md transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              <span className="material-symbols-outlined !text-base">lock</span>
              <span>{isProcessing ? 'Authorizing...' : `Start ${selectedPlan.toUpperCase()} trial via PayPal`}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
