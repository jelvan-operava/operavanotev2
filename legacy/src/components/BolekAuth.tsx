import React, { useState, useEffect } from 'react';
import { TotpAccount } from '../types';
import { generateTOTPCode, generateNextTOTPCode, getSecondsRemaining, generateRandomSecret } from '../lib/totp';

interface BolekAuthProps {
  showAlert: (msg: string) => void;
  showToast?: (msg: string) => void;
  userEmail: string;
  onAddToBolekpad?: (noteData: { title: string; content: string; color?: string; tags?: string[] }) => void;
}

export default function BolekAuth({ showAlert, showToast, userEmail, onAddToBolekpad }: BolekAuthProps) {
  // Privacy & Security Masking State (Applies to board container)
  const [isMasked, setIsMasked] = useState<boolean>(false);

  // Auto-mask on window blur or tab visibility change for security
  useEffect(() => {
    const handleBlur = () => {
      setIsMasked(true);
    };
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsMasked(true);
      }
    };

    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // TOTP Accounts state
  const [accounts, setAccounts] = useState<TotpAccount[]>(() => {
    const saved = localStorage.getItem('bolek_totp_accounts');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return [
      {
        id: 'totp-1',
        issuer: 'Facebook',
        account: 'Mr. Jelvan',
        secret: 'JBSWY3DPEHPK3PXP',
        pinned: true,
        category: 'Personal',
        createdAt: new Date().toISOString()
      },
      {
        id: 'totp-2',
        issuer: 'Instagram',
        account: 'mrjelvan',
        secret: 'HXDMVJECJJWSRB3J',
        pinned: true,
        category: 'Personal',
        createdAt: new Date().toISOString()
      },
      {
        id: 'totp-3',
        issuer: 'Zoho',
        account: userEmail || 'rjelvan@zohomail.com',
        secret: 'KVKFKR3UMVRXEZLU',
        pinned: false,
        category: 'Bolek Workspace',
        createdAt: new Date().toISOString()
      },
      {
        id: 'totp-4',
        issuer: 'Google',
        account: userEmail || 'rjelvanbaloaloa@gmail.com',
        secret: 'GBSWY3DPEHPK3PXP',
        pinned: false,
        category: 'Bolek Workspace',
        createdAt: new Date().toISOString()
      },
      {
        id: 'totp-5',
        issuer: 'GitHub',
        account: 'jelvan',
        secret: 'MZXW6YTBOI======',
        pinned: false,
        category: 'Bolek Workspace',
        createdAt: new Date().toISOString()
      }
    ];
  });

  // Save TOTP accounts to localStorage
  useEffect(() => {
    localStorage.setItem('bolek_totp_accounts', JSON.stringify(accounts));
  }, [accounts]);

  // Selected account for Inspector modal
  const [inspectorAccount, setInspectorAccount] = useState<TotpAccount | null>(null);

  // Live Timer State (30-second cycle)
  const [secondsLeft, setSecondsLeft] = useState(getSecondsRemaining());
  useEffect(() => {
    if (isMasked) return; // Pause timer updates when masked
    const interval = setInterval(() => {
      setSecondsLeft(getSecondsRemaining());
    }, 1000);
    return () => clearInterval(interval);
  }, [isMasked]);

  // Filtering & Search
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Reveal Secret key per card
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({});

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newIssuer, setNewIssuer] = useState('');
  const [newAccount, setNewAccount] = useState('');
  const [newSecret, setNewSecret] = useState('');
  const [newCategory, setNewCategory] = useState<'All' | 'Bolek Workspace' | 'Personal' | 'Work'>('Personal');
  const [newPinned, setNewPinned] = useState(false);

  const [qrModalAccount, setQrModalAccount] = useState<TotpAccount | null>(null);
  const [showVaultModal, setShowVaultModal] = useState(false);
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [showRecoveryKeyModal, setShowRecoveryKeyModal] = useState(false);
  const [importExportText, setImportExportText] = useState('');

  // Helper Toast trigger
  const notify = (msg: string) => {
    if (showToast) showToast(msg);
    else showAlert(msg);
  };

  // Add 2FA Sticky Note directly to Bolekpad Notes Board
  const handleAddToBolekpadCard = (account: TotpAccount, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const liveCode = isMasked ? '••••••' : generateTOTPCode(account.secret);
    const contentText = `2FA Authenticator Note\nIssuer: ${account.issuer}\nAccount: ${account.account}\nSecret Key: ${account.secret}\nLive Code: ${liveCode}\nCategory: ${account.category || 'General'}\nUpdated: ${new Date().toLocaleTimeString()}`;

    if (onAddToBolekpad) {
      onAddToBolekpad({
        title: `🔑 2FA Code: ${account.issuer} (${account.account})`,
        content: contentText,
        color: '#ffedd5',
        tags: ['2fa', 'authenticator', account.issuer.toLowerCase()]
      });
    } else {
      showAlert(`Added 2FA Authenticator note for ${account.issuer} to Bolekpad!`);
    }
  };

  // Copy code to clipboard
  const handleCopyCode = (account: TotpAccount, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isMasked) {
      showAlert('Board is masked. Click to unmask before copying code.');
      return;
    }
    const code = generateTOTPCode(account.secret).replace(/\s+/g, '');
    navigator.clipboard.writeText(code);
    notify(`Copied ${account.issuer} 2FA Code (${code}) to clipboard!`);
  };

  // Handle Add Account Submit
  const handleAddAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIssuer.trim() || !newAccount.trim()) {
      showAlert('Please enter both Issuer Name and Account handle.');
      return;
    }
    const cleanSecret = (newSecret.trim() || generateRandomSecret()).toUpperCase().replace(/[^A-Z2-7]/g, '');
    const newAcc: TotpAccount = {
      id: `totp-${Date.now()}`,
      issuer: newIssuer.trim(),
      account: newAccount.trim(),
      secret: cleanSecret,
      pinned: newPinned,
      category: newCategory,
      createdAt: new Date().toISOString()
    };

    setAccounts(prev => [newAcc, ...prev]);
    setIsAddModalOpen(false);
    setNewIssuer('');
    setNewAccount('');
    setNewSecret('');
    notify(`Added ${newAcc.issuer} 2FA Authenticator card!`);
  };

  // Delete Account
  const handleDeleteAccount = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const target = accounts.find(a => a.id === id);
    if (confirm(`Remove 2FA Authenticator card for "${target?.issuer || 'Account'}"?`)) {
      setAccounts(prev => prev.filter(a => a.id !== id));
      notify('Account removed from BolekAuth vault.');
    }
  };

  // Toggle Pin
  const handleTogglePin = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, pinned: !a.pinned } : a));
  };

  // Filtered Accounts list
  const filteredAccounts = accounts.filter(acc => {
    if (filterCategory === 'Pinned' && !acc.pinned) return false;
    if (filterCategory !== 'All' && filterCategory !== 'Pinned' && acc.category !== filterCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return acc.issuer.toLowerCase().includes(q) || acc.account.toLowerCase().includes(q) || acc.secret.toLowerCase().includes(q);
    }
    return true;
  });

  // Plain, simple monochrome badge icon
  const renderIssuerIcon = (issuerName?: string) => {
    const initial = (issuerName || 'A').charAt(0).toUpperCase();
    return (
      <div className="w-8 h-8 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-700 font-bold text-xs shrink-0 shadow-2xs">
        {initial}
      </div>
    );
  };

  // Render Simple Live QR Code Matrix Canvas/SVG
  const renderQRCodeSVG = (text: string) => {
    return (
      <div className="p-3 bg-white border border-stone-200 rounded-xl flex flex-col items-center justify-center shadow-xs">
        <div className="w-40 h-40 bg-stone-950 p-2.5 rounded-lg flex flex-col justify-between">
          <div className="flex justify-between">
            <div className="w-10 h-10 border-4 border-white bg-stone-950 p-1 flex items-center justify-center">
              <div className="w-4 h-4 bg-white"></div>
            </div>
            <div className="w-10 h-10 border-4 border-white bg-stone-950 p-1 flex items-center justify-center">
              <div className="w-4 h-4 bg-white"></div>
            </div>
          </div>
          <div className="flex justify-around items-center my-1 text-[8px] font-mono text-stone-400">
            <span>■ □ ■ □ ■</span>
            <span>□ ■ □ ■ □</span>
          </div>
          <div className="flex justify-between">
            <div className="w-10 h-10 border-4 border-white bg-stone-950 p-1 flex items-center justify-center">
              <div className="w-4 h-4 bg-white"></div>
            </div>
            <div className="grid grid-cols-2 gap-1 w-10 h-10 bg-white/20 p-1">
              <div className="bg-white"></div>
              <div className="bg-transparent"></div>
              <div className="bg-transparent"></div>
              <div className="bg-white"></div>
            </div>
          </div>
        </div>
        <span className="text-[10px] font-mono text-stone-500 mt-2 truncate max-w-[180px]">{text}</span>
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col bg-stone-100/70 text-stone-900 overflow-hidden font-sans select-none">
      
      {/* Workspace Top Header Bar */}
      <header className="bg-white border-b border-stone-200 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between shrink-0 shadow-2xs gap-2 z-10">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-stone-900 text-white flex items-center justify-center shadow-xs shrink-0">
            <span className="material-symbols-outlined !text-base">verified_user</span>
          </div>
          <h1 className="text-sm font-bold text-stone-900 tracking-tight truncate">BolekAuth</h1>
        </div>

        {/* Unified Search & Category Controls */}
        <div className="flex items-center gap-2 flex-1 max-w-xl mx-2">
          {/* Search Bar */}
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 !text-sm">search</span>
            <input 
              type="text"
              placeholder="Search accounts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1 bg-stone-50 border border-stone-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-orange-500 focus:bg-white transition"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="hidden sm:flex items-center gap-1 overflow-x-auto scrollbar-none">
            {['All', 'Pinned', 'Bolek Workspace', 'Personal', 'Work'].map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-2 py-1 text-[11px] font-bold rounded-md whitespace-nowrap transition cursor-pointer ${
                  filterCategory === cat
                    ? 'bg-stone-900 text-white shadow-2xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200/60'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Global Toolbar Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          
          {/* Live Timer Countdown Badge */}
          <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-stone-100 border border-stone-200 text-xs font-mono text-stone-700">
            <span className="material-symbols-outlined !text-sm text-stone-500 animate-spin">sync</span>
            <span>Refreshes in <strong className="text-stone-900 font-bold">{secondsLeft}s</strong></span>
          </div>

          {/* Mask Board Toggle Button */}
          <button 
            onClick={() => {
              setIsMasked(!isMasked);
              notify(isMasked ? 'Board unmasked.' : 'Board masked for privacy.');
            }}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
              isMasked ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
            }`}
            title="Mask Board for Security"
          >
            <span className="material-symbols-outlined !text-sm">
              {isMasked ? 'lock' : 'security'}
            </span>
            <span>{isMasked ? 'Unmask' : 'Mask Board'}</span>
          </button>

          {/* Vault Settings & Backup Button */}
          <button 
            onClick={() => setShowVaultModal(true)}
            className="p-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 transition cursor-pointer"
            title="Vault Data & Backup"
          >
            <span className="material-symbols-outlined !text-sm">settings</span>
          </button>

          {/* Add 2FA Card Button */}
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-orange-500 text-white text-xs font-bold rounded-lg hover:bg-orange-600 transition shadow-xs cursor-pointer"
          >
            <span className="material-symbols-outlined !text-sm">add</span>
            <span>+ Add 2FA</span>
          </button>

        </div>
      </header>

      {/* Mobile Category Filters bar (small screens) */}
      <div className="sm:hidden flex items-center gap-1 p-2 bg-white border-b border-stone-200 overflow-x-auto">
        {['All', 'Pinned', 'Bolek Workspace', 'Personal', 'Work'].map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-md whitespace-nowrap transition cursor-pointer ${
              filterCategory === cat
                ? 'bg-stone-900 text-white shadow-2xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200/60'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* UNIFIED MAIN BOARD CONTAINER */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5 relative">

        {/* SECURITY MASK OVERLAY FOR BOARD ONLY */}
        {isMasked && (
          <div 
            onClick={() => {
              setIsMasked(false);
              notify('Board unmasked. Live 2FA codes resumed.');
            }}
            className="absolute inset-0 z-20 bg-stone-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center cursor-pointer select-none animate-fade-in"
          >
            <div className="w-12 h-12 rounded-2xl bg-orange-500/20 text-orange-500 border border-orange-500/40 flex items-center justify-center mb-3">
              <span className="material-symbols-outlined !text-2xl">security</span>
            </div>
            <h2 className="text-sm font-bold text-white tracking-tight">Board Masked for Security</h2>
            <p className="text-xs text-stone-400 max-w-xs mt-1 mb-4">
              OTP codes are hidden and paused. Click anywhere on this board to unmask.
            </p>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsMasked(false);
                notify('Board unmasked. Live 2FA codes resumed.');
              }}
              className="px-4 py-2 bg-orange-500 text-white font-bold text-xs rounded-xl shadow-md hover:bg-orange-600 transition cursor-pointer flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined !text-sm">lock_open</span>
              <span>Click to Unmask Board</span>
            </button>
          </div>
        )}

        {/* OTP Cards Grid */}
        {filteredAccounts.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-8 bg-white border border-dashed border-stone-200 rounded-2xl">
            <span className="material-symbols-outlined !text-3xl text-stone-300 mb-2">verified_user</span>
            <h3 className="text-sm font-bold text-stone-700">No 2FA Accounts Found</h3>
            <p className="text-xs text-stone-500 max-w-xs mt-1 mb-4">Click "+ Add 2FA" to add standard 6-digit TOTP accounts.</p>
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 bg-orange-500 text-white text-xs font-bold rounded-xl hover:bg-orange-600 transition shadow-xs cursor-pointer"
            >
              + Add 2FA Account
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAccounts.map(acc => {
              const liveCode = isMasked ? '••••••' : generateTOTPCode(acc.secret);
              const nextCode = isMasked ? '••• •••' : generateNextTOTPCode(acc.secret);
              const isRevealed = revealedSecrets[acc.id];

              return (
                <div 
                  key={acc.id}
                  className="orange-edge-card group"
                >
                  {/* Continuous Running Orange Edge Animation */}
                  <div className="orange-edge-beam" />

                  {/* Inner Card Content */}
                  <div className="orange-edge-card-inner">
                    {/* Top Header: Plain Icon, Issuer, Handle & Actions */}
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-stone-100">
                      <div className="flex items-center gap-2 min-w-0">
                        {renderIssuerIcon(acc.issuer)}
                        <div className="min-w-0">
                          <h3 className="text-xs font-bold text-stone-900 truncate">{acc.issuer}</h3>
                          <p className="text-[10px] text-stone-500 truncate">{acc.account}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {/* Pin Button */}
                        <button 
                          onClick={(e) => handleTogglePin(acc.id, e)}
                          className={`p-1 rounded transition cursor-pointer ${acc.pinned ? 'text-amber-500 font-bold' : 'text-stone-300 hover:text-stone-600'}`}
                          title={acc.pinned ? 'Unpin' : 'Pin account'}
                        >
                          <span className="material-symbols-outlined !text-sm">push_pin</span>
                        </button>

                        {/* Delete Button */}
                        <button 
                          onClick={(e) => handleDeleteAccount(acc.id, e)}
                          className="p-1 text-stone-300 hover:text-rose-600 rounded transition cursor-pointer"
                          title="Delete Card"
                        >
                          <span className="material-symbols-outlined !text-sm">delete</span>
                        </button>
                      </div>
                    </div>

                    {/* Middle: 6-Digit Live OTP Display */}
                    <div className="py-1 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-2xl font-mono font-bold text-stone-900 tracking-wider">
                          {isMasked ? '••••••' : liveCode}
                        </span>
                        
                        <button 
                          onClick={(e) => handleCopyCode(acc, e)}
                          className="p-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 transition cursor-pointer"
                          title="Copy Code"
                        >
                          <span className="material-symbols-outlined !text-sm">content_copy</span>
                        </button>
                      </div>

                      {/* Live Progress Bar */}
                      <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden mt-2 mb-1">
                        <div 
                          className="h-full bg-orange-500 rounded-full transition-all duration-1000"
                          style={{ width: `${isMasked ? 0 : (secondsLeft / 30) * 100}%` }}
                        />
                      </div>

                      {/* Next Code Preview */}
                      <div className="flex items-center justify-between text-[10px] text-stone-500 font-mono px-0.5">
                        <span>Next: <strong className="font-semibold text-stone-700">{hideCodeOrNext(isMasked, nextCode)}</strong></span>
                        <span>{acc.category || 'Personal'}</span>
                      </div>
                    </div>

                    {/* Secret Key Display if revealed */}
                    {isRevealed && (
                      <div className="p-1.5 bg-stone-50 rounded text-[10px] font-mono break-all text-stone-700 border border-stone-200 text-center">
                        Key: <strong>{isMasked ? '••••••••' : acc.secret}</strong>
                      </div>
                    )}

                    {/* Bottom Actions */}
                    <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-1 text-[11px]">
                      <button 
                        onClick={(e) => handleAddToBolekpadCard(acc, e)}
                        className="flex items-center gap-1 px-2 py-1 rounded-md bg-stone-50 hover:bg-stone-100 text-stone-800 font-semibold border border-stone-200 transition cursor-pointer"
                        title="Add to Bolekpad"
                      >
                        <span className="material-symbols-outlined !text-xs text-orange-600">post_add</span>
                        <span>+ Bolekpad</span>
                      </button>

                      <div className="flex items-center gap-1">
                        {/* Show Inspector / QR */}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectorAccount(acc);
                          }}
                          className="p-1 text-stone-500 hover:text-stone-900 rounded transition cursor-pointer"
                          title="Inspect / QR Code"
                        >
                          <span className="material-symbols-outlined !text-sm">qr_code_2</span>
                        </button>

                        {/* Secret reveal toggle */}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setRevealedSecrets(prev => ({ ...prev, [acc.id]: !prev[acc.id] }));
                          }}
                          className="p-1 text-stone-500 hover:text-stone-900 rounded transition cursor-pointer"
                          title="Toggle Secret Key"
                        >
                          <span className="material-symbols-outlined !text-sm">key</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL: ADD 2FA ACCOUNT */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-stone-900/50 backdrop-blur-xs p-4">
          <form onSubmit={handleAddAccountSubmit} className="bg-white rounded-2xl border border-stone-200 shadow-2xl p-5 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2 text-stone-900">
                <span className="material-symbols-outlined !text-lg text-orange-500">add_card</span>
                <h3 className="text-sm font-bold">Add 2FA Account</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setIsAddModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <span className="material-symbols-outlined !text-lg">close</span>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-stone-700 block mb-1">Issuer / Service Name *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Google, GitHub, Stripe, Facebook"
                  value={newIssuer}
                  onChange={(e) => setNewIssuer(e.target.value)}
                  className="w-full px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">Account Handle / Email *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. user@domain.com"
                  value={newAccount}
                  onChange={(e) => setNewAccount(e.target.value)}
                  className="w-full px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-bold text-stone-700">Base32 Secret Key</label>
                  <button 
                    type="button"
                    onClick={() => setNewSecret(generateRandomSecret())}
                    className="text-[10px] text-orange-600 hover:underline font-bold cursor-pointer"
                  >
                    Auto-Generate Key
                  </button>
                </div>
                <input 
                  type="text" 
                  placeholder="e.g. JBSWY3DPEHPK3PXP"
                  value={newSecret}
                  onChange={(e) => setNewSecret(e.target.value.toUpperCase())}
                  className="w-full px-3 py-1.5 font-mono bg-stone-50 border border-stone-200 rounded-lg focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">Category</label>
                <select 
                  value={newCategory}
                  onChange={(e: any) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg focus:border-orange-500 focus:outline-none cursor-pointer"
                >
                  <option value="Personal">Personal</option>
                  <option value="Bolek Workspace">Bolek Workspace</option>
                  <option value="Work">Work</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
              <button 
                type="button" 
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-bold text-stone-600 hover:bg-stone-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="px-4 py-2 rounded-lg text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 transition shadow-xs cursor-pointer"
              >
                Add 2FA Account
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: INSPECTOR / QR CODE */}
      {inspectorAccount && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-stone-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl p-5 max-w-sm w-full space-y-4 text-center">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
              <div className="flex items-center gap-2">
                {renderIssuerIcon(inspectorAccount.issuer)}
                <div className="text-left">
                  <h3 className="text-sm font-bold text-stone-900">{inspectorAccount.issuer}</h3>
                  <p className="text-[10px] text-stone-500">{inspectorAccount.account}</p>
                </div>
              </div>
              <button onClick={() => setInspectorAccount(null)} className="text-stone-400 hover:text-stone-700 cursor-pointer">
                <span className="material-symbols-outlined !text-lg">close</span>
              </button>
            </div>

            <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-stone-500 uppercase">Live TOTP Code</span>
              <div className="text-2xl font-mono font-bold text-stone-900 tracking-widest">
                {isMasked ? '••••••' : generateTOTPCode(inspectorAccount.secret)}
              </div>
              <button 
                onClick={() => handleCopyCode(inspectorAccount)}
                className="px-3 py-1 bg-white border border-stone-200 rounded-md text-xs font-bold text-stone-700 hover:bg-stone-100 transition cursor-pointer inline-flex items-center gap-1 mt-1"
              >
                <span className="material-symbols-outlined !text-xs">content_copy</span>
                <span>Copy Code</span>
              </button>
            </div>

            {renderQRCodeSVG(`otpauth://totp/${inspectorAccount.issuer}:${inspectorAccount.account}?secret=${inspectorAccount.secret}&issuer=${inspectorAccount.issuer}`)}

            <div className="text-left space-y-1 text-xs">
              <label className="font-bold text-stone-600 block">Base32 Secret Key</label>
              <div className="p-2 bg-stone-100 rounded text-xs font-mono text-stone-800 break-all border border-stone-200">
                {isMasked ? '••••••••••••' : inspectorAccount.secret}
              </div>
            </div>

            <button 
              onClick={() => setInspectorAccount(null)}
              className="w-full py-2 bg-stone-900 text-white text-xs font-bold rounded-xl hover:bg-stone-800 transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* MODAL: VAULT DATA & BACKUP */}
      {showVaultModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-stone-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl p-5 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
              <h3 className="text-sm font-bold text-stone-900">Vault Settings & Data Backup</h3>
              <button onClick={() => setShowVaultModal(false)} className="text-stone-400 hover:text-stone-700 cursor-pointer">
                <span className="material-symbols-outlined !text-lg">close</span>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
                <h4 className="font-bold text-stone-900">Backup & Restore</h4>
                <p className="text-stone-500 text-[11px]">Export your 2FA accounts JSON backup or import accounts from an external JSON payload.</p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(accounts, null, 2));
                      const dlAnchor = document.createElement('a');
                      dlAnchor.setAttribute("href", dataStr);
                      dlAnchor.setAttribute("download", `bolekauth_backup_${new Date().toISOString().substring(0,10)}.json`);
                      dlAnchor.click();
                      notify('Exported JSON backup file.');
                    }}
                    className="flex-1 py-1.5 bg-white border border-stone-200 rounded-lg font-bold text-stone-700 hover:bg-stone-100 transition cursor-pointer text-center"
                  >
                    Export JSON
                  </button>
                  <button 
                    onClick={() => setShowVaultModal(false)}
                    className="flex-1 py-1.5 bg-white border border-stone-200 rounded-lg font-bold text-stone-700 hover:bg-stone-100 transition cursor-pointer text-center"
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <button 
                  onClick={() => {
                    setShowVaultModal(false);
                    setShowFaqModal(true);
                  }}
                  className="w-full text-left p-2 rounded-lg border border-stone-200 hover:bg-stone-50 transition cursor-pointer flex items-center justify-between font-semibold text-stone-700"
                >
                  <span>BolekAuth FAQ & Docs</span>
                  <span className="material-symbols-outlined !text-sm">chevron_right</span>
                </button>
                <button 
                  onClick={() => {
                    setShowVaultModal(false);
                    setShowRecoveryKeyModal(true);
                  }}
                  className="w-full text-left p-2 rounded-lg border border-stone-200 hover:bg-stone-50 transition cursor-pointer flex items-center justify-between font-semibold text-stone-700"
                >
                  <span>Emergency Recovery Key</span>
                  <span className="material-symbols-outlined !text-sm">chevron_right</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: FAQ */}
      {showFaqModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-stone-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl p-5 max-w-lg w-full space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
              <h3 className="text-sm font-bold text-stone-900">BolekAuth FAQ</h3>
              <button onClick={() => setShowFaqModal(false)} className="text-stone-400 hover:text-stone-700 cursor-pointer">
                <span className="material-symbols-outlined !text-lg">close</span>
              </button>
            </div>
            <div className="space-y-3 text-xs text-stone-600">
              <div>
                <h4 className="font-bold text-stone-900">Q: How does BolekAuth compute TOTP codes?</h4>
                <p>A: BolekAuth implements RFC 6238 TOTP using HMAC-SHA1 algorithms with Base32 decoding, producing 6-digit codes on a 30-second cycle.</p>
              </div>
              <div>
                <h4 className="font-bold text-stone-900">Q: Is my data sent to any third-party server?</h4>
                <p>A: No. BolekAuth is zero-knowledge and offline-first. All secret keys remain locally in browser storage.</p>
              </div>
            </div>
            <button 
              onClick={() => setShowFaqModal(false)}
              className="w-full py-2 bg-stone-900 text-white text-xs font-bold rounded-xl hover:bg-stone-800 transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* MODAL: RECOVERY KEY */}
      {showRecoveryKeyModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-stone-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl p-5 max-w-sm w-full space-y-4 text-center">
            <div className="w-10 h-10 bg-amber-100 text-amber-700 rounded-xl flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined !text-xl">key</span>
            </div>
            <h3 className="text-sm font-bold text-stone-900">Emergency Recovery Key</h3>
            <div className="p-3 bg-stone-100 rounded-xl font-mono text-xs font-bold text-stone-800 select-all border border-stone-200">
              REC-9018-BOLEK-2FA-VAULT-X82
            </div>
            <button 
              onClick={() => setShowRecoveryKeyModal(false)}
              className="w-full py-2 bg-stone-900 text-white text-xs font-bold rounded-xl hover:bg-stone-800 transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

function hideCodeOrNext(isMasked: boolean, val: string): string {
  return isMasked ? '••• •••' : val;
}
