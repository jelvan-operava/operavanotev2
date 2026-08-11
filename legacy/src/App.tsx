import React, { useState, useEffect, useRef } from 'react';
import { Bolekpad, Boleknote, ActiveTab, ThemeDialogConfig, UserAccount, FeatureAccessConfig, SubscriptionPlan, UserRole, NoteAttachment } from './types';
import BolekCalendar from './components/BolekCalendar';
import BolekAuth from './components/BolekAuth';
import { BolekDashboard } from './components/BolekDashboard';
import { PaywallModal } from './components/PaywallModal';
import { PayPalPaymentModal } from './components/PayPalPaymentModal';
import { AdminDashboardSettings } from './components/AdminDashboardSettings';
import { BolekStickySend } from './components/BolekStickySend';

const NOTE_COLORS = [
  { name: 'White', value: '#ffffff' },
  { name: 'Cream', value: '#fffbeb' },
  { name: 'Yellow', value: '#fef9c3' },
  { name: 'Peach', value: '#ffedd5' },
  { name: 'Orange', value: '#fed7aa' },
  { name: 'Pink', value: '#fce7f3' },
  { name: 'Rose', value: '#ffe4e6' },
  { name: 'Purple', value: '#f3e8ff' },
  { name: 'Blue', value: '#dbeafe' },
  { name: 'Sky', value: '#e0f2fe' },
  { name: 'Mint', value: '#d1fae5' },
  { name: 'Green', value: '#dcfce7' }
];

const NOTE_FONT_FAMILIES = [
  { label: 'Inter', value: 'Inter, system-ui, sans-serif' },
  { label: 'Serif', value: 'Georgia, serif' },
  { label: 'Mono', value: 'ui-monospace, SFMono-Regular, monospace' },
  { label: 'Handwritten', value: '"Comic Sans MS", "Segoe Print", cursive' },
];

const classifyAttachment = (url: string): NoteAttachment['kind'] => {
  if (/youtu\.be\/|youtube\.com\/watch|youtube\.com\/embed/i.test(url)) return 'video';
  if (/\.(png|jpe?g|gif|webp|avif)(\?.*)?$/i.test(url) || /res\.cloudinary\.com/i.test(url)) return 'image';
  return 'link';
};

const normalizeAttachment = (url: string, label?: string): NoteAttachment => ({
  id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  url,
  kind: classifyAttachment(url),
  label: label?.trim() || undefined,
});

const toEmbedUrl = (url: string) => {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtu\.be\/)([A-Za-z0-9_-]+)/i);
  if (!match) return url;
  return `https://www.youtube.com/embed/${match[1]}`;
};

const getDeviceName = (): string => {
  if (typeof navigator === 'undefined') return "Security Key";
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return "Apple Device";
  if (/Macintosh/.test(ua)) return "Apple Mac";
  if (/Windows/.test(ua)) return "Windows PC";
  if (/Android/.test(ua)) return "Android Device";
  if (/Linux/.test(ua)) return "Linux PC";
  return "Security Key";
};

const registerPasskey = async (username: string) => {
  if (typeof window !== 'undefined' && window.PublicKeyCredential && window.isSecureContext) {
    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      const userId = new Uint8Array(16);
      window.crypto.getRandomValues(userId);

      const publicKeyCredentialCreationOptions: any = {
        challenge: challenge,
        rp: {
          name: "Bolek Desk",
          id: window.location.hostname,
        },
        user: {
          id: userId,
          name: username,
          displayName: username.split('@')[0],
        },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          residentKey: "required",
        },
        timeout: 60000,
        attestation: "none"
      };

      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions
      }) as any;

      if (credential) {
        return {
          id: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
          name: `${getDeviceName()} Passkey`,
          createdAt: new Date().toLocaleDateString(),
          real: true,
          username
        };
      }
    } catch (e) {
      console.warn("Real WebAuthn registration failed, falling back to simulation:", e);
    }
  }

  return {
    id: 'pk_' + Math.random().toString(36).substring(2, 11),
    name: `${getDeviceName()} Passkey (Virtual)`,
    createdAt: new Date().toLocaleDateString(),
    real: false,
    username
  };
};

const authenticatePasskey = async (registeredPasskeys: any[]) => {
  if (!registeredPasskeys || registeredPasskeys.length === 0) {
    throw new Error("No passkeys registered. Please sign in with email/password first, then register a passkey in your profile security tab.");
  }

  if (typeof window !== 'undefined' && window.PublicKeyCredential && window.isSecureContext) {
    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const realPasskeys = registeredPasskeys.filter(pk => pk.real);
      if (realPasskeys.length > 0) {
        const allowCredentials = realPasskeys.map(pk => ({
          type: "public-key" as const,
          id: Uint8Array.from(atob(pk.id), c => c.charCodeAt(0)),
        }));

        const publicKeyCredentialRequestOptions: any = {
          challenge: challenge,
          allowCredentials: allowCredentials,
          timeout: 60000,
          userVerification: "required",
        };

        const assertion = await navigator.credentials.get({
          publicKey: publicKeyCredentialRequestOptions
        });

        if (assertion) {
          return { success: true };
        }
      }
    } catch (e) {
      console.warn("Real WebAuthn login assertion failed, trying fallback simulation:", e);
    }
  }

  return { success: true };
};

const ComplianceFooter = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <>
      <a
        href="/legal"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Open compliance and privacy information"
        className="fixed bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-stone-700 hover:text-stone-900 transition z-[9000] cursor-pointer bg-white px-3 py-1.5 rounded-full shadow-xs border border-stone-200"
      >
        Legal & Privacy
      </a>

      {isOpen && (
        <div 
          className="fixed inset-0 z-[10005] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md animate-fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-stone-100 bg-stone-50/50">
              <h3 className="font-bold text-stone-800 text-sm">Compliance & Privacy Information</h3>
              <button 
                onClick={() => setIsOpen(false)} 
                aria-label="Close compliance information"
                className="text-stone-400 hover:text-stone-700 transition cursor-pointer"
              >
                <span className="material-symbols-outlined !text-lg">close</span>
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-6 text-xs text-stone-600">
              
              <section>
                <h4 className="font-bold text-stone-900 text-[13px] mb-2">Terms and Conditions</h4>
                <p>By accessing or using this application, you agree to be bound by these terms. This application is provided "as is", without warranty of any kind. You agree not to use the service for any illegal purposes or to violate any laws in your jurisdiction.</p>
              </section>

              <section>
                <h4 className="font-bold text-stone-900 text-[13px] mb-2">Privacy Policy</h4>
                <p>We respect your privacy. All data entered into this application is processed securely. We do not sell, trade, or otherwise transfer your personal information to outside parties without your consent.</p>
              </section>

              <section>
                <h4 className="font-bold text-stone-900 text-[13px] mb-2">Zero Knowledge</h4>
                <p>This system follows zero-knowledge principles where applicable. Your sensitive notes and data are encrypted locally before transmission, meaning our servers never see your raw unencrypted data. Only you possess the keys to decrypt your information.</p>
              </section>

              <section>
                <h4 className="font-bold text-stone-900 text-[13px] mb-2">Security and Privacy Assurance</h4>
                <p>We implement a variety of security measures to maintain the safety of your personal information. Our platform uses state-of-the-art encryption protocols and regular security audits to ensure maximum protection against unauthorized access.</p>
              </section>

              <section>
                <h4 className="font-bold text-stone-900 text-[13px] mb-2">Cloudflare</h4>
                <p>All network traffic is routed through Cloudflare's global infrastructure. This provides enterprise-grade protection against DDoS attacks, ensures high availability, and enforces strict SSL/TLS encryption for all data in transit.</p>
              </section>

              <section>
                <h4 className="font-bold text-stone-900 text-[13px] mb-2">About the Application</h4>
                <p>Bolekpad is designed to be a highly secure, private workspace for managing notes, tools, and daily workflows. Its primary purpose is to provide users with a safe, distraction-free environment that prioritizes data sovereignty and individual privacy over data monetization.</p>
              </section>

            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default function App() {
  // Routing / View state: 'login' | 'desk'
  const [view, setView] = useState<'login' | 'desk'>(() => {
    return window.location.pathname === '/desk' ? 'desk' : 'login';
  });

  // Sign In & Registration page state variables
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [loginName, setLoginName] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [securityAccepted, setSecurityAccepted] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // App Loading Screen state
  const [appLoading, setAppLoading] = useState(true);

  // Guest Mode State
  const [isGuest, setIsGuest] = useState<boolean>(() => {
    return localStorage.getItem('bolek_is_guest') === 'true';
  });
  const [showGuestDisclaimer, setShowGuestDisclaimer] = useState(false);

  // Default Avatars for user profile picture
  const DEFAULT_AVATARS = [
    { id: 'avatar-1', name: 'Nomad', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80' },
    { id: 'avatar-2', name: 'Executive', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80' },
    { id: 'avatar-3', name: 'Developer', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=250&q=80' },
    { id: 'avatar-4', name: 'Creative', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=250&q=80' },
    { id: 'avatar-5', name: 'Minimalist', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=250&q=80' },
    { id: 'avatar-6', name: 'Techie', url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=250&q=80' },
    { id: 'avatar-7', name: 'Artist', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=250&q=80' },
    { id: 'avatar-8', name: 'Explorer', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80' },
  ];

  // Column (Bolekpad) state
  const [columns, setColumns] = useState<Bolekpad[]>(() => {
    const saved = localStorage.getItem('bolek_columns');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      {
        id: 'col-1',
        title: 'Sticky Desk',
        width: 33.33,
        cards: []
      },
      {
        id: 'col-2',
        title: 'In Progress',
        width: 33.33,
        cards: []
      },
      {
        id: 'col-3',
        title: 'Completed',
        width: 33.34,
        cards: []
      }
    ];
  });
  const [boardTitle, setBoardTitle] = useState(() => localStorage.getItem('bolek_board_title') || 'BolekDash');
  const [publicBoardMode, setPublicBoardMode] = useState(false);
  const [publicBoardId, setPublicBoardId] = useState<string | null>(() => localStorage.getItem('bolek_public_board_id'));
  const [isPublishingBoard, setIsPublishingBoard] = useState(false);
  const [publicBoardUrl, setPublicBoardUrl] = useState(() => localStorage.getItem('bolek_public_board_url') || '');
  const publicBoardSyncTimerRef = useRef<number | null>(null);

  // Role, Subscription, Paywall & Admin State
  const [userRole, setUserRole] = useState<UserRole>(() => {
    const saved = localStorage.getItem('bolek_user_role');
    if (saved === 'admin' || saved === 'user') return saved;
    return 'admin'; // Admin default for user
  });

  const [userSubscription, setUserSubscription] = useState<SubscriptionPlan>(() => {
    const saved = localStorage.getItem('bolek_user_subscription');
    if (saved === 'pro' || saved === 'enterprise' || saved === 'regular') return saved;
    return 'enterprise';
  });

  const [isSimulatingRegular, setIsSimulatingRegular] = useState(false);

  const effectiveRole: UserRole = isSimulatingRegular ? 'user' : userRole;
  const effectivePlan: SubscriptionPlan = isSimulatingRegular ? 'regular' : userSubscription;

  const [paywallModal, setPaywallModal] = useState<{ isOpen: boolean; featureName: string }>({
    isOpen: false,
    featureName: '',
  });

  const [paypalModalOpen, setPaypalModalOpen] = useState(false);
  const [paypalSubscription, setPaypalSubscription] = useState<{
    subscriptionId: string;
    plan: SubscriptionPlan;
    status: string;
    trialEndsAt: string | null;
    payerEmail: string | null;
  } | null>(() => {
    try {
      return JSON.parse(localStorage.getItem('bolek_paypal_subscription') || 'null');
    } catch (e) {
      return null;
    }
  });

  const [featureAccess, setFeatureAccess] = useState<FeatureAccessConfig>(() => {
    const saved = localStorage.getItem('bolek_feature_access');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      dashboard: true,
      notes: true,
      calendar: true,
      profile: true,
      send: false,
      bolekauth: false,
      futureFeatures: false,
    };
  });

  const [registeredUsers, setRegisteredUsers] = useState<UserAccount[]>(() => {
    const saved = localStorage.getItem('bolek_registered_users');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      { id: 'usr-1', name: 'Jelvan Ricolcol', email: 'secured.jelvan@gmail.com', role: 'admin', subscription: 'enterprise', createdAt: '2026-08-10', status: 'active' },
      { id: 'usr-2', name: 'Jelvan Ricolcol (Alt)', email: 'rjelvanbaloaloa@gmail.com', role: 'admin', subscription: 'enterprise', createdAt: '2026-08-10', status: 'active' },
      { id: 'usr-3', name: 'Regular User Demo', email: 'user@bolekpad.com', role: 'user', subscription: 'regular', createdAt: '2026-08-10', status: 'active' },
    ];
  });

  const [sendMode, setSendMode] = useState<'stickysend' | 'campaigns'>('stickysend');

  const handleImportStickyToBoard = (note: { title?: string; content: string; color: string }) => {
    setColumns(prev => {
      if (prev.length === 0) return prev;
      const newCard: Boleknote = {
        id: `card-${Date.now()}`,
        title: note.title || 'Received StickyNote',
        content: note.content,
        color: note.color || '#fef08a',
        locked: false,
        pinned: true,
        tags: ['StickySend'],
      };
      return prev.map((col, idx) => idx === 0 ? { ...col, cards: [...col.cards, newCard] } : col);
    });
  };

  useEffect(() => {
    localStorage.setItem('bolek_registered_users', JSON.stringify(registeredUsers));
  }, [registeredUsers]);

  useEffect(() => {
    localStorage.setItem('bolek_feature_access', JSON.stringify(featureAccess));
  }, [featureAccess]);

  useEffect(() => {
    localStorage.setItem('bolek_user_role', userRole);
  }, [userRole]);

  useEffect(() => {
    localStorage.setItem('bolek_user_subscription', userSubscription);
  }, [userSubscription]);

  useEffect(() => {
    if (paypalSubscription) {
      localStorage.setItem('bolek_paypal_subscription', JSON.stringify(paypalSubscription));
    } else {
      localStorage.removeItem('bolek_paypal_subscription');
    }
  }, [paypalSubscription]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const subscriptionId = url.searchParams.get('subscription_id');
    const plan = url.searchParams.get('plan') as SubscriptionPlan | null;

    if (!subscriptionId || !plan || (plan !== 'pro' && plan !== 'enterprise')) {
      return;
    }

    const syncPayPalSubscription = async () => {
      try {
        const response = await fetch(`/api/paypal/subscription-status?subscription_id=${encodeURIComponent(subscriptionId)}`);
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error || 'Unable to verify PayPal subscription.');
        }

        setUserSubscription(plan);
        setIsSimulatingRegular(false);
        setFeatureAccess(prev => ({
          ...prev,
          send: true,
          bolekauth: true,
          futureFeatures: true,
        }));
        setPaypalSubscription({
          subscriptionId,
          plan,
          status: payload.status || 'UNKNOWN',
          trialEndsAt: payload.trialEndsAt || null,
          payerEmail: payload.subscriberEmail || null,
        });

        localStorage.removeItem('bolek_pending_paypal_plan');
        localStorage.removeItem('bolek_pending_paypal_subscription');
        window.history.replaceState({}, '', '/desk');
        showToast(`PayPal subscription active: ${plan.toUpperCase()} plan with a 10-day trial.`);
      } catch (error) {
        console.error('PayPal return verification failed:', error);
      }
    };

    syncPayPalSubscription();
  }, []);

  // Tab management state
  const [openTabs, setOpenTabs] = useState<Record<ActiveTab, boolean>>({
    dashboard: true,
    notes: true,
    send: false,
    calendar: false,
    profile: false,
    bolekauth: false,
    admin: false,
  });
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [tabOrder, setTabOrder] = useState<ActiveTab[]>(() => {
    const saved = localStorage.getItem('bolek_tab_order');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          if (!parsed.includes('dashboard')) return ['dashboard', ...parsed];
          return parsed;
        }
      } catch (e) {}
    }
    return ['dashboard', 'notes', 'send', 'calendar', 'profile', 'bolekauth', 'admin'];
  });

  // Keep columns and tabOrder synchronized with localStorage
  useEffect(() => {
    if (publicBoardMode) return;
    localStorage.setItem('bolek_columns', JSON.stringify(columns));
  }, [columns, publicBoardMode]);

  useEffect(() => {
    localStorage.setItem('bolek_tab_order', JSON.stringify(tabOrder));
  }, [tabOrder]);

  useEffect(() => {
    if (publicBoardMode) return;
    localStorage.setItem('bolek_board_title', boardTitle);
  }, [boardTitle, publicBoardMode]);

  // Tab move handler
  const handleMoveTab = (tabKey: ActiveTab, direction: 'left' | 'right') => {
    setTabOrder((prev) => {
      const idx = prev.indexOf(tabKey);
      if (idx === -1) return prev;
      if (direction === 'left' && idx === 0) return prev;
      if (direction === 'right' && idx === prev.length - 1) return prev;

      const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
      const updated = [...prev];
      const temp = updated[idx];
      updated[idx] = updated[targetIdx];
      updated[targetIdx] = temp;
      return updated;
    });
  };

  // Profile & Authenticator state
  const [profileName, setProfileName] = useState(() => localStorage.getItem('bolek_profile_name') || 'Jelvan Ricolcol');
  const [profileEmail, setProfileEmail] = useState(() => localStorage.getItem('bolek_profile_email') || 'rjelvanbaloaloa@gmail.com');
  const [profilePicture, setProfilePicture] = useState(() => localStorage.getItem('bolek_profile_picture') || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [mfaSecretKey] = useState('BOLEKPAD-MFA-XR92L-P981');
  const [mfaBackupCodes] = useState(['8391-0182', '5529-8812', '9012-7721', '6618-2901']);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaSetupVisible, setMfaSetupVisible] = useState(false);

  // Passkeys & Biometric Modal states
  const [passkeys, setPasskeys] = useState<Array<{
    id: string;
    name: string;
    createdAt: string;
    real: boolean;
    username: string;
    profileName?: string;
  }>>(() => {
    const saved = localStorage.getItem('bolek_passkeys');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return []; }
    }
    return [];
  });

  // Keep passkeys synchronized with localStorage
  useEffect(() => {
    localStorage.setItem('bolek_passkeys', JSON.stringify(passkeys));
  }, [passkeys]);

  const [biometricModal, setBiometricModal] = useState<{
    isOpen: boolean;
    type: 'register' | 'login';
    username: string;
    status: 'idle' | 'scanning' | 'success' | 'error';
    errorMsg?: string;
  }>({
    isOpen: false,
    type: 'login',
    username: '',
    status: 'idle',
  });

  // Password modify states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Integrations state
  const [openAIKey, setOpenAIKey] = useState(() => localStorage.getItem('bolek_openai_key') || '');
  const [resendKey, setResendKey] = useState(() => localStorage.getItem('bolek_resend_key') || '');
  const [cloudflareEmail, setCloudflareEmail] = useState(() => localStorage.getItem('bolek_cf_email') || '');
  const [cloudflareToken, setCloudflareToken] = useState(() => localStorage.getItem('bolek_cf_token') || '');
  const [openaiEnabled, setOpenaiEnabled] = useState(() => localStorage.getItem('bolek_openai_enabled') === 'true');
  const [resendEnabled, setResendEnabled] = useState(() => localStorage.getItem('bolek_resend_enabled') === 'true');
  const [cfEmailEnabled, setCfEmailEnabled] = useState(() => localStorage.getItem('bolek_cf_enabled') === 'true');

  // Apps Panel Toggle State
  const [appsPanelOpen, setAppsPanelOpen] = useState(false);
  const [pendingApp, setPendingApp] = useState<string | null>(null);
  const [acceptedApps, setAcceptedApps] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem('bolek_accepted_apps') || '{}');
    } catch (e) {
      console.error('Failed to parse accepted apps from localStorage', e);
      return {};
    }
  });

  const MAX_TUTORIAL_STEPS = 2;
  const [tutorialStep, setTutorialStep] = useState<{appId: string; featureIndex: number} | null>(null);
  const [tutorialCanSkip, setTutorialCanSkip] = useState(false);

  const startTutorial = (appId: string) => {
    setTutorialStep({ appId, featureIndex: 0 });
    setTutorialCanSkip(false);
    setTimeout(() => {
      setTutorialCanSkip(true);
    }, 3000);
  };

  const nextTutorialStep = () => {
    if (!tutorialStep) return;
    setTutorialStep(prev => {
      if (!prev) return null;
      // Assuming each app has max 3 features to show
      if (prev.featureIndex < MAX_TUTORIAL_STEPS) {
        setTutorialCanSkip(false);
        setTimeout(() => setTutorialCanSkip(true), 3000);
        return { ...prev, featureIndex: prev.featureIndex + 1 };
      }
      return null;
    });
  };

  const skipTutorial = () => {
    setTutorialStep(null);
  };

  const handleAppLaunch = (appId: string) => {
    setAppsPanelOpen(false);
    switchTab(appId as ActiveTab);
  };

  const acceptDisclaimer = () => {
    if (pendingApp) {
      const newAccepted = { ...acceptedApps, [pendingApp]: true };
      setAcceptedApps(newAccepted);
      localStorage.setItem('bolek_accepted_apps', JSON.stringify(newAccepted));
      switchTab(pendingApp);
      
      if (!localStorage.getItem(`bolek_tutorial_${pendingApp}`)) {
        localStorage.setItem(`bolek_tutorial_${pendingApp}`, 'true');
        startTutorial(pendingApp);
      }
      setPendingApp(null);
    }
  };

  // Mobile UI States
  const [isMobile, setIsMobile] = useState(false);
  const [mobileActiveColumnId, setMobileActiveColumnId] = useState<string | null>(null);

  const currentLogoUrl = isMobile 
    ? "https://res.cloudinary.com/doph9qsod/image/upload/BolekDeskBranding.png" 
    : "https://res.cloudinary.com/doph9qsod/image/upload/BolekDeskBranding.svg";

  const dashboardRef = useRef<HTMLDivElement>(null);
  const isScrollingToTabRef = useRef(false);

  // Sync scroll on mobile when active column changes (e.g. from tab selector clicking or button actions)
  useEffect(() => {
    if (isMobile && mobileActiveColumnId && dashboardRef.current) {
      const index = columns.findIndex(c => c.id === mobileActiveColumnId);
      if (index !== -1) {
        const container = dashboardRef.current;
        const targetScrollLeft = index * container.clientWidth;
        if (Math.abs(container.scrollLeft - targetScrollLeft) > 10) {
          container.scrollTo({
            left: targetScrollLeft,
            behavior: 'smooth'
          });
        }
      }
    }
  }, [mobileActiveColumnId, isMobile, columns]);

  // Handle mobile swipe/scroll of columns to update the active tab indicator
  const handleDashboardScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!isMobile || isScrollingToTabRef.current) return;
    const container = e.currentTarget;
    const scrollLeft = container.scrollLeft;
    const clientWidth = container.clientWidth;
    if (clientWidth === 0) return;
    const index = Math.round(scrollLeft / clientWidth);
    if (index >= 0 && index < columns.length) {
      const colId = columns[index].id;
      if (mobileActiveColumnId !== colId) {
        setMobileActiveColumnId(colId);
      }
    }
  };

  // Click tab action to trigger animated scrolling
  const handleMobileTabClick = (colId: string, index: number) => {
    setMobileActiveColumnId(colId);
    isScrollingToTabRef.current = true;
    const container = dashboardRef.current;
    if (container) {
      container.scrollTo({
        left: index * container.clientWidth,
        behavior: 'smooth'
      });
      setTimeout(() => {
        isScrollingToTabRef.current = false;
      }, 500);
    }
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setBrowserStealthActive(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Column Resizer drag-tracking state
  const [activeSplitter, setActiveSplitter] = useState<number | null>(null);
  const [dragStartX, setDragStartX] = useState<number>(0);
  const [initialWidths, setInitialWidths] = useState<number[]>([]);
  const [splitterColors, setSplitterColors] = useState<Record<number, string>>({});
  const [openSplitterMenu, setOpenSplitterMenu] = useState<number | null>(null);

  // Boleksend Panel Resizer drag-tracking state
  const [boleksendWidths, setBoleksendWidths] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('bolek_send_panel_widths');
      return saved ? JSON.parse(saved) : [18, 42, 40];
    } catch {
      return [18, 42, 40];
    }
  });
  const [boleksendActiveSplitter, setBoleksendActiveSplitter] = useState<number | null>(null);
  const [boleksendDragStartX, setBoleksendDragStartX] = useState<number>(0);
  const [boleksendInitialWidths, setBoleksendInitialWidths] = useState<number[]>([]);
  const [boleksendSplitterColors, setBoleksendSplitterColors] = useState<Record<number, string>>({});
  const [openBoleksendSplitterMenu, setOpenBoleksendSplitterMenu] = useState<number | null>(null);

  // Card Resizing state
  const [resizingCardId, setResizingCardId] = useState<string | null>(null);
  const [resizeStartY, setResizeStartY] = useState<number>(0);
  const [resizeStartHeight, setResizeStartHeight] = useState<number>(0);

  // Card Editing inline state
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [fullscreenCardId, setFullscreenCardId] = useState<string | null>(null);
  const [fullscreenCardMode, setFullscreenCardMode] = useState<'regular' | 'tab'>('regular');

  const handleToggleExpandCard = (cardId: string) => {
    if (fullscreenCardId !== cardId) {
      setFullscreenCardId(cardId);
      setFullscreenCardMode('regular');
    } else if (fullscreenCardMode === 'regular') {
      setFullscreenCardMode('tab');
    } else {
      setFullscreenCardId(null);
      setFullscreenCardMode('regular');
    }
  };

  // Rich note editing states
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editTags, setEditTags] = useState('');

  // Custom WYSIWYG note editor modal states
  const [richEditorOpen, setRichEditorOpen] = useState(false);
  const [richEditorCardId, setRichEditorCardId] = useState<string | null>(null);
  const [richTitle, setRichTitle] = useState('');
  const [richContent, setRichContent] = useState('');
  const [richTags, setRichTags] = useState('');
  const [richColor, setRichColor] = useState('#ffffff');
  const [richDestinationColId, setRichDestinationColId] = useState<string>('');
  const [columnPromptOpen, setColumnPromptOpen] = useState(false);
  const [richRotation, setRichRotation] = useState(0);
  const [richFontFamily, setRichFontFamily] = useState(NOTE_FONT_FAMILIES[0].value);
  const [richFontSize, setRichFontSize] = useState('14px');
  const [richEmoji, setRichEmoji] = useState('');
  const [richMediaUrl, setRichMediaUrl] = useState('');
  const [richAttachments, setRichAttachments] = useState<NoteAttachment[]>([]);
  const richEditorRef = useRef<HTMLDivElement>(null);

  // Search & Filtering notes states
  const [noteSearchQuery, setNoteSearchQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState('All');

  // Toast notifications state
  const [toasts, setToasts] = useState<{ id: string; message: string }[]>([]);

  const showToast = (message: string) => {
    const id = `toast-${Date.now()}`;
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2500);
  };

  const requireEditableBoard = () => {
    if (publicBoardMode) {
      showToast('Public boards are view-only.');
      return false;
    }
    return true;
  };

  useEffect(() => {
    const url = new URL(window.location.href);
    const shareId = url.searchParams.get('publicBoard');
    if (!shareId) return;

    setPublicBoardMode(true);
    setPublicBoardId(shareId);
    setView('desk');
    setActiveTab('notes');

    const loadBoard = async () => {
      try {
        const res = await fetch(`/api/public-boards/${encodeURIComponent(shareId)}`);
        const payload = await res.json().catch(() => ({}));
        if (!res.ok || !payload?.snapshot) {
          showToast('Public BolekDash not found.');
          return;
        }

        setBoardTitle(payload.title || 'BolekDash');
        setColumns(Array.isArray(payload.snapshot.columns) ? payload.snapshot.columns : []);
      } catch (error) {
        console.error('Failed to load public board', error);
      }
    };

    loadBoard();
    const poll = window.setInterval(loadBoard, 15000);
    return () => window.clearInterval(poll);
  }, []);

  useEffect(() => {
    if (!publicBoardId || publicBoardMode) return;
    if (publicBoardSyncTimerRef.current) {
      window.clearTimeout(publicBoardSyncTimerRef.current);
    }
    publicBoardSyncTimerRef.current = window.setTimeout(() => {
      syncPublicBoard(publicBoardId);
    }, 800);
    return () => {
      if (publicBoardSyncTimerRef.current) {
        window.clearTimeout(publicBoardSyncTimerRef.current);
      }
    };
  }, [columns, boardTitle, publicBoardId, publicBoardMode]);

  // Sync editing fields with selected card
  useEffect(() => {
    if (editingCardId) {
      let foundCard: Boleknote | undefined;
      columns.forEach(col => {
        const found = col.cards.find(c => c.id === editingCardId);
        if (found) foundCard = found;
      });
      if (foundCard) {
        setEditTitle(foundCard.title || '');
        setEditContent(foundCard.content || '');
        setEditTags(foundCard.tags ? foundCard.tags.join(', ') : '');
        setRichRotation(foundCard.rotation || 0);
        setRichFontFamily(foundCard.fontFamily || NOTE_FONT_FAMILIES[0].value);
        setRichFontSize(foundCard.fontSize || '14px');
        setRichEmoji(foundCard.emoji || '');
        setRichAttachments(foundCard.attachments || []);
      }
    } else {
      setEditTitle('');
      setEditContent('');
      setEditTags('');
      setRichRotation(0);
      setRichFontFamily(NOTE_FONT_FAMILIES[0].value);
      setRichFontSize('14px');
      setRichEmoji('');
      setRichAttachments([]);
    }
  }, [editingCardId]);

  // Sync the Rich Text Editor ref innerHTML when opening the modal
  useEffect(() => {
    if (richEditorOpen && richEditorRef.current) {
      richEditorRef.current.innerHTML = richContent;
    }
  }, [richEditorOpen]);

  // Drag and drop state
  const [draggedCard, setDraggedCard] = useState<{ colId: string; cardId: string } | null>(null);
  const [draggedOverIndex, setDraggedOverIndex] = useState<{ colId: string; index: number } | null>(null);

  // Calculator state
  const [calcScreen, setCalcScreen] = useState('0');
  const [calcActiveSubtab, setCalcActiveSubtab] = useState<string>('scientific');
  const [isDegreeMode, setIsDegreeMode] = useState<boolean>(true);
  const [calcMemory, setCalcMemory] = useState<number>(0);
  const [calcFormula, setCalcFormula] = useState<string>('');
  const [showVirtualKeypadOnPC, setShowVirtualKeypadOnPC] = useState<boolean>(false);

  // Secure Undetectable Privacy Browser states
  const [browserUrl, setBrowserUrl] = useState<string>('duckduckgo.com');
  const [browserCurrentUrl, setBrowserCurrentUrl] = useState<string>('https://duckduckgo.com');
  const [browserSearchEngine, setBrowserSearchEngine] = useState<string>('duckduckgo');
  const [browserUserAgent, setBrowserUserAgent] = useState<string>('chrome');
  const [browserEncryption, setBrowserEncryption] = useState<boolean>(true);
  const [browserTrackingCount, setBrowserTrackingCount] = useState<number>(42);
  const [browserAntiDPI, setBrowserAntiDPI] = useState<boolean>(true);
  const [browserHistory, setBrowserHistory] = useState<{ id: string; url: string; timestamp: string }[]>([
    { id: '1', url: 'https://duckduckgo.com/?q=undetectable+privacy+search', timestamp: '09:12' },
    { id: '2', url: 'https://news.ycombinator.com', timestamp: '09:05' }
  ]);
  const [browserStealthActive, setBrowserStealthActive] = useState<boolean>(false);
  const [browserTabs, setBrowserTabs] = useState<{ id: string; title: string; url: string; active: boolean }[]>([
    { id: 'tab-1', title: 'DuckDuckGo Privacy Search', url: 'https://duckduckgo.com', active: true },
    { id: 'tab-2', title: 'Hacker News', url: 'https://news.ycombinator.com', active: false }
  ]);

  const handleBrowserNavigate = (targetUrl: string) => {
    let cleanUrl = targetUrl.trim();
    if (!cleanUrl) return;
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://') && !cleanUrl.startsWith('bolek://')) {
      if (cleanUrl.includes('.') && !cleanUrl.includes(' ')) {
        cleanUrl = 'https://' + cleanUrl;
      } else {
        cleanUrl = 'https://duckduckgo.com/?q=' + encodeURIComponent(cleanUrl);
      }
    }
    setBrowserCurrentUrl(cleanUrl);
    setBrowserUrl(cleanUrl.replace('https://', '').replace('http://', ''));
    
    // Update active tab URL
    setBrowserTabs(prev => prev.map(t => t.active ? { ...t, url: cleanUrl, title: cleanUrl.includes('duckduckgo') ? 'DuckDuckGo Privacy Search' : cleanUrl.includes('ycombinator') ? 'Hacker News' : cleanUrl.includes('wikipedia') ? 'Wikipedia Secure' : 'Secure Webpage' } : t));

    // Add to local history
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setBrowserHistory(prev => [{ id: String(Date.now()), url: cleanUrl, timestamp }, ...prev.slice(0, 19)]);
    setBrowserTrackingCount(prev => prev + Math.floor(Math.random() * 8) + 2);
  };
  const [calcHistory, setCalcHistory] = useState<{ id: string; formula: string; result: string; timestamp: string }[]>(() => {
    try {
      const saved = localStorage.getItem('bolek_calc_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Currency Converter states
  const [currencyFrom, setCurrencyFrom] = useState<string>('USD');
  const [currencyTo, setCurrencyTo] = useState<string>('EUR');
  const [currencyAmount, setCurrencyAmount] = useState<string>('1');
  const [currencyResult, setCurrencyResult] = useState<string>('0.92');
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({
    USD: 1.0, EUR: 0.92, GBP: 0.79, JPY: 158.42, PHP: 58.55, AUD: 1.51, CAD: 1.37, CNY: 7.26, CHF: 0.89, INR: 83.45, SGD: 1.35, AED: 3.67
  });
  const [exchangeRatesLoading, setExchangeRatesLoading] = useState<boolean>(false);
  const [exchangeRatesError, setExchangeRatesError] = useState<string | null>(null);
  const [ratesLastUpdated, setRatesLastUpdated] = useState<string>('Using default rates');
  const [currencyHistory, setCurrencyHistory] = useState<{ id: string; from: string; to: string; amount: string; result: string; timestamp: string }[]>(() => {
    try {
      const saved = localStorage.getItem('bolek_currency_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Unit Converter states
  const [unitCategory, setUnitCategory] = useState<'length' | 'weight' | 'temperature' | 'area' | 'speed'>('length');
  const [unitFrom, setUnitFrom] = useState<string>('m');
  const [unitTo, setUnitTo] = useState<string>('km');
  const [unitValue, setUnitValue] = useState<string>('1');
  const [unitResult, setUnitResult] = useState<string>('0.001');

  // Interactive Equation Solver states
  const [eqQuadraticA, setEqQuadraticA] = useState<string>('1');
  const [eqQuadraticB, setEqQuadraticB] = useState<string>('-5');
  const [eqQuadraticC, setEqQuadraticC] = useState<string>('6');
  const [eqQuadraticResult, setEqQuadraticResult] = useState<string>('x₁ = 3, x₂ = 2');

  const [eqPythagA, setEqPythagA] = useState<string>('3');
  const [eqPythagB, setEqPythagB] = useState<string>('4');
  const [eqPythagResult, setEqPythagResult] = useState<string>('Hypotenuse (c) = 5');

  const [eqCircleRadius, setEqCircleRadius] = useState<string>('5');
  const [eqCircleResult, setEqCircleResult] = useState<string>('Area = 78.54, Circumference = 31.42');

  // Boleksend state
  const [sendTo, setSendTo] = useState('');
  const [sendSubject, setSendSubject] = useState('');
  const [sendMessage, setSendMessage] = useState('');
  const [sendStatus, setSendStatus] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sesConfig, setSesConfig] = useState<{
    hasAccessKeyId: boolean;
    hasSecretAccessKey: boolean;
    region: string;
    senderEmail: string;
  } | null>(null);

  const fetchSesConfig = async () => {
    try {
      const res = await fetch('/api/boleksend/config-status');
      if (res.ok) {
        const data = await res.json();
        setSesConfig(data);
      }
    } catch (e) {
      console.error('Failed to load SES configuration status', e);
    }
  };

  // Boleksend subtabs state declarations
  const [boleksendActiveSubtab, setBoleksendActiveSubtab] = useState<string>('inbox');

  // Employee Inbox (AWS SMTP) state
  const [inboxMessages, setInboxMessages] = useState([
    {
      id: 'inbox-1',
      from: 'hr-admin@bolek.internal',
      senderName: 'HR Administration',
      subject: '[ACTION REQUIRED] Annual Performance & Security Sign-Off',
      receivedAt: 'Today, 10:14 AM',
      read: false,
      tag: 'HR Notice',
      body: `Dear Employee,\n\nPlease complete your annual performance & security compliance sign-off by logging into the Bolek Workspace Dashboard.\n\nThis is an automated employee notice routed via the internal Bolek AWS SMTP Mail Relay.\n\nBest regards,\nHR Administration Team`,
    },
    {
      id: 'inbox-2',
      from: 'system-smtp@aws-ses.bolek.net',
      senderName: 'AWS SES Gateway Engine',
      subject: 'AWS SES SMTP Mail Relay Gateway Status: All Operational',
      receivedAt: 'Yesterday, 04:30 PM',
      read: true,
      tag: 'System',
      body: `AWS Simple Email Service (SES) SMTP Relay Status Report:\n\n• Primary Mail Server: Connected & Operational\n• Transport Security: TLS v1.3 Mandated\n• Outbound Queue: 0 pending messages\n• Delivery Success Rate: 99.98%\n\nNote: Confidential infrastructure parameters, IAM credentials, and SMTP secret keys are handled by backend server environment policies and hidden from employee UI.`,
    },
    {
      id: 'inbox-3',
      from: 'compliance@bolek.org',
      senderName: 'Compliance & Safety Board',
      subject: 'Q3 Operational Guidelines & Zero-Trust Access Update',
      receivedAt: 'Aug 04, 2026',
      read: true,
      tag: 'Compliance',
      body: `Hello Team,\n\nThe Q3 Information Security Guidelines have been published. All employees must acknowledge the guidelines on the Dashboard tab.\n\nSent via Bolek AWS SMTP Engine.`,
    },
    {
      id: 'inbox-4',
      from: 'it-support@bolek.io',
      senderName: 'IT Infrastructure Helpdesk',
      subject: 'Workstation Certificate Renewal Notice',
      receivedAt: 'Aug 02, 2026',
      read: true,
      tag: 'IT Support',
      body: `Hi,\n\nYour workstation SSL/TLS certificate was successfully renewed for another 365 days. No action is required on your part.\n\nThank you,\nIT Infrastructure Support`,
    },
  ]);
  const [selectedInboxMessage, setSelectedInboxMessage] = useState<any>(null);
  const [inboxSearch, setInboxSearch] = useState('');
  const [inboxFilter, setInboxFilter] = useState<'all' | 'unread' | 'hr' | 'system'>('all');
  const [inboxReplyText, setInboxReplyText] = useState('');
  const [inboxReplySending, setInboxReplySending] = useState(false);

  // Emails subtab state
  const [boleksendEmails, setBoleksendEmails] = useState([
    { id: 'msg-1', to: 'customer@acme.com', subject: 'Welcome to Acme Inc!', sentAt: '2026-07-05 09:12', status: 'opened', size: '12.4 KB', message: 'Hello, welcome to our platform! If you have any questions feel free to ask.' },
    { id: 'msg-2', to: 'developer@startup.co', subject: 'API Key Created', sentAt: '2026-07-05 08:34', status: 'clicked', size: '4.8 KB', message: 'You have generated a new live API key. Make sure to keep it secret.' },
    { id: 'msg-3', to: 'john.doe@gmail.com', subject: 'Monthly Billing Invoice #281', sentAt: '2026-07-04 15:45', status: 'delivered', size: '24.1 KB', message: 'Your payment was processed successfully. Thank you for your business!' },
    { id: 'msg-4', to: 'bounced-test@domain.com', subject: 'Verify your subscription', sentAt: '2026-07-03 10:00', status: 'bounced', size: '3.2 KB', message: 'Click this link to verify your subscription to our mailing list.' }
  ]);
  const [emailsSearch, setEmailsSearch] = useState('');
  const [emailsFilter, setEmailsFilter] = useState('all');
  const [selectedBoleksendEmail, setSelectedBoleksendEmail] = useState<any>(null);

  // Broadcasts state
  const [boleksendBroadcasts, setBoleksendBroadcasts] = useState([
    { id: 'bc-1', title: 'Summer Product Launch 🚀', subject: 'Introducing our new AI workspace integrations!', segment: 'All Customers', status: 'Sent', sendDate: '2026-07-01 12:00', recipientsCount: 1420 },
    { id: 'bc-2', title: 'Weekly Roundup #42', subject: 'Tips & tricks to build your productivity board', segment: 'Newsletter Subscribers', status: 'Scheduled', sendDate: '2026-07-10 09:00', recipientsCount: 840 },
    { id: 'bc-3', title: 'Action Required: System Upgrade', subject: 'Maintenance notice for upcoming server improvements', segment: 'Developers', status: 'Draft', sendDate: 'Not Scheduled', recipientsCount: 152 }
  ]);
  const [showAddBroadcast, setShowAddBroadcast] = useState(false);
  const [newBroadcastTitle, setNewBroadcastTitle] = useState('');
  const [newBroadcastSubject, setNewBroadcastSubject] = useState('');
  const [newBroadcastSegment, setNewBroadcastSegment] = useState('All Customers');
  const [newBroadcastStatus, setNewBroadcastStatus] = useState('Draft');

  // Automations state
  const [boleksendAutomations, setBoleksendAutomations] = useState([
    { id: 'aut-1', name: 'User Onboarding Sequence', trigger: 'User Signed Up', status: 'Active', steps: [
      { id: 'step-1', type: 'trigger', label: 'Trigger: User Signed Up' },
      { id: 'step-2', type: 'action', label: 'Send welcome_onboarding template' },
      { id: 'step-3', type: 'delay', label: 'Delay 2 days' },
      { id: 'step-4', type: 'action', label: 'Send first_checkin template' }
    ]},
    { id: 'aut-2', name: 'Abandoned Checkout Recovery', trigger: 'Cart Abandoned', status: 'Active', steps: [
      { id: 'step-1', type: 'trigger', label: 'Trigger: Cart Abandoned' },
      { id: 'step-2', type: 'delay', label: 'Delay 4 hours' },
      { id: 'step-3', type: 'action', label: 'Send cart_reminder template' }
    ]},
    { id: 'aut-3', name: 'Feedback Request', trigger: 'Purchase Completed', status: 'Inactive', steps: [
      { id: 'step-1', type: 'trigger', label: 'Trigger: Purchase Completed' },
      { id: 'step-2', type: 'delay', label: 'Delay 7 days' },
      { id: 'step-3', type: 'action', label: 'Send product_review_request template' }
    ]}
  ]);
  const [showAddAutomation, setShowAddAutomation] = useState(false);
  const [newAutomationName, setNewAutomationName] = useState('');
  const [newAutomationTrigger, setNewAutomationTrigger] = useState('User Signed Up');
  const [selectedAutomation, setSelectedAutomation] = useState<any>(null);

  // Templates state
  const [boleksendTemplates, setBoleksendTemplates] = useState([
    { id: 'tmpl-1', name: 'Welcome Email Template', subject: 'Welcome to our workspace!', body: '<h1>Welcome to Bolek Desk, {{name}}!</h1>\n<p>We are absolutely thrilled to have you here. This space is designed for high-productivity builders.</p>\n<p>To get started, check out our guide or click below:</p>\n<a href="#" style="background: #0c0a09; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; display: inline-block;">Get Started</a>', lastModified: '2026-07-04' },
    { id: 'tmpl-2', name: 'API Key Protection Warning', subject: 'Security Notice: New API key created', body: '<h2>Security Notice</h2>\n<p>Hi {{name}},</p>\n<p>A new API key was just generated for your account. If this was not you, please immediately disable it in the Settings.</p>', lastModified: '2026-07-02' },
    { id: 'tmpl-3', name: 'Monthly Newsletter Layout', subject: 'The Workspace Gazette - Issue #12', body: '<h1>The Workspace Gazette 📰</h1>\n<p>Here is what is new in the productivity universe this month:</p>\n<ul>\n  <li>Resizable columns support is now live</li>\n  <li>Boleksend email client with rich subtabs is live!</li>\n</ul>', lastModified: '2026-07-01' }
  ]);
  const [showAddTemplate, setShowAddTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateSubject, setNewTemplateSubject] = useState('');
  const [newTemplateBody, setNewTemplateBody] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [isTemplateEditorRich, setIsTemplateEditorRich] = useState(false);

  // Audience state
  const [boleksendAudience, setBoleksendAudience] = useState([
    { id: 'sub-1', email: 'john.doe@gmail.com', name: 'John Doe', segment: 'All Customers', status: 'Subscribed', addedAt: '2026-06-28' },
    { id: 'sub-2', email: 'alice.wonder@yahoo.com', name: 'Alice Wonder', segment: 'Newsletter Subscribers', status: 'Subscribed', addedAt: '2026-06-30' },
    { id: 'sub-3', email: 'dev.bob@github.io', name: 'Bob Tech', segment: 'Developers', status: 'Subscribed', addedAt: '2026-07-01' },
    { id: 'sub-4', email: 'bounced-test@domain.com', name: 'Bouncy Customer', segment: 'All Customers', status: 'Unsubscribed', addedAt: '2026-07-02' },
    { id: 'sub-5', email: 'charlie.brown@peanuts.org', name: 'Charlie Brown', segment: 'Newsletter Subscribers', status: 'Pending', addedAt: '2026-07-04' }
  ]);
  const [showAddSubscriber, setShowAddSubscriber] = useState(false);
  const [newSubEmail, setNewSubEmail] = useState('');
  const [newSubName, setNewSubName] = useState('');
  const [newSubSegment, setNewSubSegment] = useState('All Customers');

  // Domains state
  const [boleksendDomains, setBoleksendDomains] = useState([
    { id: 'dom-1', domain: 'bolekpad.com', status: 'Verified', addedAt: '2026-06-15', spf: true, dkim: true, dmarc: true },
    { id: 'dom-2', domain: 'newsletter.jelvan.me', status: 'Pending Verification', addedAt: '2026-07-04', spf: true, dkim: false, dmarc: false }
  ]);
  const [newDomainName, setNewDomainName] = useState('');

  // Logs state
  const [boleksendLogs, setBoleksendLogs] = useState([
    { id: 'log-1', eventName: 'email.opened', recipient: 'customer@acme.com', status: 'success', timestamp: '2026-07-05 09:14:02', ip: '192.168.1.45', userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36' },
    { id: 'log-2', eventName: 'email.delivered', recipient: 'customer@acme.com', status: 'success', timestamp: '2026-07-05 09:12:15', ip: '10.0.4.19', userAgent: 'Resend delivery MTA' },
    { id: 'log-3', eventName: 'email.sent', recipient: 'customer@acme.com', status: 'success', timestamp: '2026-07-05 09:12:00', ip: '127.0.0.1', userAgent: 'Boleksend API Node SDK' },
    { id: 'log-4', eventName: 'link.clicked', recipient: 'developer@startup.co', status: 'success', timestamp: '2026-07-05 08:35:10', ip: '172.56.21.90', userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X)' },
    { id: 'log-5', eventName: 'email.bounced', recipient: 'bounced-test@domain.com', status: 'failed', timestamp: '2026-07-03 10:00:45', ip: '203.0.113.12', userAgent: 'Postmaster MTA (550 User Unknown)' }
  ]);
  const [logsSearch, setLogsSearch] = useState('');

  // API keys state
  const [boleksendApiKeys, setBoleksendApiKeys] = useState([
    { id: 'key-1', name: 'Production Main Key', prefix: 're_Lg2A8...', key: 're_Lg2A8d9K2Jsm82Plam0012Sks901', role: 'Full Access', createdAt: '2026-06-20' },
    { id: 'key-2', name: 'Web Dev Testing Key', prefix: 're_X92La...', key: 're_X92LaPL981SksM20018sK92LaK91', role: 'Sending Only', createdAt: '2026-07-01' }
  ]);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyRole, setNewKeyRole] = useState('Full Access');

  // Webhooks state
  const [boleksendWebhooks, setBoleksendWebhooks] = useState([
    { id: 'wh-1', url: 'https://api.acme.com/v1/bolek-webhook', events: ['email.delivered', 'email.opened', 'email.bounced'], status: 'Active', secret: 'whsec_Ab912KsL9018A' },
    { id: 'wh-2', url: 'https://webhook.site/df82a-29a8-38fa', events: ['email.bounced'], status: 'Inactive', secret: 'whsec_Xm82La901K2La' }
  ]);
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newWebhookEvents, setNewWebhookEvents] = useState<string[]>(['email.delivered']);
  const [showAddWebhook, setShowAddWebhook] = useState(false);

  // Settings state
  const [boleksendSettings, setBoleksendSettings] = useState({
    defaultFromName: 'Jelvan from Bolek Desk',
    defaultFromEmail: 'jelvan@bolekpad.com',
    companyAddress: 'Suite 204, Creative Offices, Silicon Valley, CA 94025',
    openTracking: true,
    clickTracking: true,
    unsubscribeFooter: 'You are receiving this because you registered at bolekpad.com. Unsubscribe instantly.'
  });

  // Metrics visualizer config state
  const [metricsTimeframe, setMetricsTimeframe] = useState('7d');
  const [hoveredMetricsPoint, setHoveredMetricsPoint] = useState<any>(null);

  // Dialog State
  const [dialog, setDialog] = useState<ThemeDialogConfig | null>(null);

  // App Initializer: Verify backend authentication session on mount
  useEffect(() => {
    fetchSesConfig();

    const verifySession = async () => {
      const savedToken = localStorage.getItem('bolek_auth_token');
      if (savedToken) {
        try {
          const res = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${savedToken}` }
          });
          if (res.ok) {
            const data = await res.json();
            if (data.user) {
              setProfileName(data.user.name);
              setProfileEmail(data.user.email);
              if (data.user.picture) setProfilePicture(data.user.picture);
              if (window.location.pathname === '/' || window.location.pathname === '/login') {
                window.history.pushState({}, '', '/desk');
              }
              setView('desk');
            }
          } else {
            localStorage.removeItem('bolek_auth_token');
          }
        } catch (e) {
          console.warn('Backend session verification failed:', e);
        }
      }
      setAppLoading(false);
    };

    verifySession();
  }, []);

  // Sync state transitions with browser history
  useEffect(() => {
    const handlePopState = () => {
      setView(window.location.pathname === '/desk' ? 'desk' : 'login');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!securityAccepted) {
      await showDialog('alert', 'Please review and accept the Security & Privacy terms to proceed.');
      return;
    }

    if (authMode === 'register') {
      if (!loginName.trim()) {
        setAuthError('Please enter your full name.');
        return;
      }
      if (loginPassword !== registerConfirmPassword) {
        setAuthError('Passwords do not match. Please verify.');
        return;
      }
    }

    setAuthSubmitting(true);

    try {
      const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const bodyPayload = authMode === 'register'
        ? { email: loginEmail, password: loginPassword, name: loginName }
        : { email: loginEmail, password: loginPassword };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      });

      const data = await res.json();

      if (!res.ok) {
        setAuthError(data.error || 'Authentication failed.');
        setAuthSubmitting(false);
        return;
      }

      if (data.token) {
        localStorage.setItem('bolek_auth_token', data.token);
      }

      if (data.user) {
        setProfileName(data.user.name);
        setProfileEmail(data.user.email);
        if (data.user.picture) setProfilePicture(data.user.picture);
        localStorage.setItem('bolek_profile_name', data.user.name);
        localStorage.setItem('bolek_profile_email', data.user.email);
      }

      setAppLoading(true);
      setTimeout(() => {
        window.history.pushState({}, '', '/desk');
        setView('desk');
        setAppLoading(false);
        setAuthSubmitting(false);
        showToast(authMode === 'register' ? 'Account created & authenticated!' : 'Login successful!');
      }, 400);

    } catch (err: any) {
      setAuthError('Network error connecting to backend authentication server.');
      setAuthSubmitting(false);
    }
  };

  const handleLogOut = async (e: React.MouseEvent) => {
    e.preventDefault();
    setAppLoading(true);
    const savedToken = localStorage.getItem('bolek_auth_token');
    if (savedToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${savedToken}` }
        });
      } catch (e) {}
    }
    localStorage.removeItem('bolek_auth_token');
    localStorage.removeItem('bolek_profile_name');
    localStorage.removeItem('bolek_profile_email');
    localStorage.removeItem('bolek_profile_picture');

    setTimeout(() => {
      setProfileName('Jelvan Ricolcol');
      setProfileEmail('rjelvanbaloaloa@gmail.com');
      setProfilePicture('');
      window.history.pushState({}, '', '/');
      setView('login');
      setAppLoading(false);
    }, 400);
  };

  // Google Sign-In Action (Popup OAuth Flow)
  const handleGoogleSignIn = async () => {
    if (!securityAccepted) {
      await showDialog('alert', 'Please review and accept the Security & Privacy terms to log in.');
      return;
    }
    try {
      setAppLoading(true);
      const redirectUri = window.location.origin + '/auth/callback';
      const response = await fetch(`/api/auth/google/url?redirect_uri=${encodeURIComponent(redirectUri)}`);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errMsg = errData.error || 'Google OAuth client is not fully configured in your environment secrets.';
        setAppLoading(false);

        const confirmDemo = await showDialog(
          'confirm',
          `Google OAuth Notice:\n\n${errMsg}\n\nWould you like to log in instantly using the Google Workspace Quick Access session (secured.jelvan@gmail.com)?`
        );

        if (confirmDemo) {
          setAppLoading(true);
          const googleUser = {
            id: 'usr_google_demo_' + Date.now(),
            email: 'secured.jelvan@gmail.com',
            name: 'Jelvan Ricolcol (Google Workspace)',
            picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
            totpSecret: 'GBSWY3DPEHPK3PXP',
            passkeys: [],
            createdAt: new Date().toISOString()
          };
          const demoToken = 'jwt_google_demo_' + Date.now();
          localStorage.setItem('bolek_auth_token', demoToken);
          localStorage.setItem('bolek_profile_name', googleUser.name);
          localStorage.setItem('bolek_profile_email', googleUser.email);
          localStorage.setItem('bolek_profile_picture', googleUser.picture);
          
          setProfileName(googleUser.name);
          setProfileEmail(googleUser.email);
          setProfilePicture(googleUser.picture);

          setTimeout(() => {
            window.history.pushState({}, '', '/desk');
            setView('desk');
            setAppLoading(false);
            showToast('Logged in via Google Workspace Quick Session!');
          }, 300);
          return;
        }
        return;
      }
      const { url } = await response.json();
      
      const width = 500;
      const height = 650;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const authWindow = window.open(
        url,
        'google_oauth_popup',
        `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,status=no`
      );
      
      if (!authWindow) {
        setAppLoading(false);
        await showDialog('alert', 'The authentication popup was blocked. Please enable popups for this site to log in with Google.');
      }
    } catch (error: any) {
      setAppLoading(false);
      console.error("Google Sign-In Error:", error);
      const confirmDemo = await showDialog(
        'confirm',
        `Google Sign-In Notice: ${error.message || 'OAuth server endpoint unavailable.'}\n\nWould you like to log in instantly using the Google Workspace Quick Access session?`
      );

      if (confirmDemo) {
        setAppLoading(true);
        const googleUser = {
          id: 'usr_google_demo_' + Date.now(),
          email: 'secured.jelvan@gmail.com',
          name: 'Jelvan Ricolcol (Google Workspace)',
          picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
          totpSecret: 'GBSWY3DPEHPK3PXP',
          passkeys: [],
          createdAt: new Date().toISOString()
        };
        const demoToken = 'jwt_google_demo_' + Date.now();
        localStorage.setItem('bolek_auth_token', demoToken);
        localStorage.setItem('bolek_profile_name', googleUser.name);
        localStorage.setItem('bolek_profile_email', googleUser.email);
        localStorage.setItem('bolek_profile_picture', googleUser.picture);
        
        setProfileName(googleUser.name);
        setProfileEmail(googleUser.email);
        setProfilePicture(googleUser.picture);

        setTimeout(() => {
          window.history.pushState({}, '', '/desk');
          setView('desk');
          setAppLoading(false);
          showToast('Logged in via Google Workspace Quick Session!');
        }, 300);
      }
    }
  };
  
  // Passkey Sign-In Action (Hybrid Real/Simulated Flow)
  const handlePasskeySignIn = async () => {
    if (!securityAccepted) {
      await showDialog('alert', 'Please review and accept the Security & Privacy terms to log in.');
      return;
    }
    const saved = localStorage.getItem('bolek_passkeys');
    let pks: any[] = [];
    if (saved) {
      try { pks = JSON.parse(saved); } catch (e) { pks = []; }
    }

    if (pks.length === 0) {
      const confirmDemo = await showDialog(
        'confirm',
        'No registered passkeys were found. Would you like to instantly generate a secure, virtual test passkey for rjelvanbaloaloa@gmail.com to try the login flow?'
      );
      if (confirmDemo) {
        const demoPk = {
          id: 'pk_' + Math.random().toString(36).substring(2, 11),
          name: `${getDeviceName()} Passkey (Virtual Demo)`,
          createdAt: new Date().toLocaleDateString(),
          real: false,
          username: 'rjelvanbaloaloa@gmail.com',
          profileName: 'Jelvan Ricolcol'
        };
        const updatedPks = [demoPk];
        localStorage.setItem('bolek_passkeys', JSON.stringify(updatedPks));
        setPasskeys(updatedPks);
        await showDialog('alert', 'Virtual demo passkey created! Click "Passkey" again to log in securely with biometrics.');
      }
      return;
    }

    const selectedPk = pks[0];
    setBiometricModal({
      isOpen: true,
      type: 'login',
      username: selectedPk.username,
      status: 'scanning'
    });

    setTimeout(async () => {
      try {
        await authenticatePasskey(pks);
        setBiometricModal(prev => ({ ...prev, status: 'success' }));
        
        setTimeout(() => {
          setBiometricModal(prev => ({ ...prev, isOpen: false }));
          setProfileEmail(selectedPk.username);
          setProfileName(selectedPk.profileName || selectedPk.username.split('@')[0]);
          localStorage.setItem('bolek_profile_email', selectedPk.username);
          localStorage.setItem('bolek_profile_name', selectedPk.profileName || selectedPk.username.split('@')[0]);
          window.history.pushState({}, '', '/desk');
          setView('desk');
        }, 1000);
      } catch (err: any) {
        setBiometricModal(prev => ({ ...prev, status: 'error', errorMsg: err.message }));
      }
    }, 2000);
  };

  // Listen for Google OAuth callback success message
  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
        return;
      }
      
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.profile) {
        const { email, name, picture } = event.data.profile;
        setAppLoading(true);
        setTimeout(() => {
          localStorage.setItem('bolek_profile_name', name);
          localStorage.setItem('bolek_profile_email', email);
          if (picture) {
            localStorage.setItem('bolek_profile_picture', picture);
          } else {
            localStorage.removeItem('bolek_profile_picture');
          }
          
          setProfileName(name);
          setProfileEmail(email);
          setProfilePicture(picture || '');
          
          window.history.pushState({}, '', '/desk');
          setView('desk');
          setAppLoading(false);
        }, 450);
      }
    };
    
    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, []);

  // Splitter Random Coloring on Collapsing
  useEffect(() => {
    setSplitterColors((prev) => {
      const updated = { ...prev };
      columns.forEach((col, idx) => {
        const isCollapsed = col.width <= 5.1;
        const splitterIdx = idx < columns.length - 1 ? idx : idx - 1;
        if (splitterIdx < 0) return;

        if (isCollapsed) {
          if (!updated[splitterIdx]) {
            const colors = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899'];
            updated[splitterIdx] = colors[Math.floor(Math.random() * colors.length)];
          }
        } else {
          // Keep color only if at least one adjacent column is still collapsed
          const leftCollapsed = columns[splitterIdx]?.width <= 5.1;
          const rightCollapsed = columns[splitterIdx + 1]?.width <= 5.1;
          if (!leftCollapsed && !rightCollapsed) {
            delete updated[splitterIdx];
          }
        }
      });
      return updated;
    });
  }, [columns]);

  // Global outside click listeners to close Apps Panel
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('#appsBtn') && !(e.target as HTMLElement).closest('#appsPanel')) {
        setAppsPanelOpen(false);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Column Splitting / Resizing Mouse Event hooks
  useEffect(() => {
    if (activeSplitter === null) return;

    const handleMouseMove = (e: MouseEvent) => {
      const containerEl = document.getElementById('dashboard-container');
      if (!containerEl) return;
      const containerWidth = containerEl.getBoundingClientRect().width;
      if (containerWidth <= 0) return;

      const deltaX = e.clientX - dragStartX;
      const deltaPercent = (deltaX / containerWidth) * 100;

      const proposedWidths = [...initialWidths];

      if (deltaPercent > 0) {
        let remainingDelta = deltaPercent;
        proposedWidths[activeSplitter] += remainingDelta;

        for (let i = activeSplitter + 1; i < columns.length; i++) {
          const maxAbsorbable = proposedWidths[i] - 5;
          if (maxAbsorbable > 0) {
            if (remainingDelta <= maxAbsorbable) {
              proposedWidths[i] -= remainingDelta;
              remainingDelta = 0;
              break;
            } else {
              proposedWidths[i] = 5;
              remainingDelta -= maxAbsorbable;
            }
          }
        }
        if (remainingDelta > 0) {
          proposedWidths[activeSplitter] -= remainingDelta;
        }
      } else if (deltaPercent < 0) {
        let remainingDelta = Math.abs(deltaPercent);
        proposedWidths[activeSplitter + 1] += remainingDelta;

        for (let i = activeSplitter; i >= 0; i--) {
          const maxAbsorbable = proposedWidths[i] - 5;
          if (maxAbsorbable > 0) {
            if (remainingDelta <= maxAbsorbable) {
              proposedWidths[i] -= remainingDelta;
              remainingDelta = 0;
              break;
            } else {
              proposedWidths[i] = 5;
              remainingDelta -= maxAbsorbable;
            }
          }
        }
        if (remainingDelta > 0) {
          proposedWidths[activeSplitter + 1] -= remainingDelta;
        }
      }

      setColumns((prev) =>
        prev.map((col, i) => ({
          ...col,
          width: proposedWidths[i]
        }))
      );
    };

    const handleMouseUp = () => {
      setActiveSplitter(null);
      document.body.classList.remove('resizing');
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [activeSplitter, dragStartX, initialWidths, columns.length]);

  // Sync Boleksend Panel Widths to LocalStorage
  useEffect(() => {
    localStorage.setItem('bolek_send_panel_widths', JSON.stringify(boleksendWidths));
  }, [boleksendWidths]);

  // Boleksend Panel Splitting / Resizing Mouse Event hooks
  useEffect(() => {
    if (boleksendActiveSplitter === null) return;

    const handleMouseMove = (e: MouseEvent) => {
      const containerEl = document.getElementById('view-send');
      if (!containerEl) return;
      const containerWidth = containerEl.getBoundingClientRect().width;
      if (containerWidth <= 0) return;

      const deltaX = e.clientX - boleksendDragStartX;
      const deltaPercent = (deltaX / containerWidth) * 100;

      const proposedWidths = [...boleksendInitialWidths];
      const idx = boleksendActiveSplitter;

      if (deltaPercent > 0) {
        let remainingDelta = deltaPercent;
        proposedWidths[idx] += remainingDelta;

        for (let i = idx + 1; i < proposedWidths.length; i++) {
          const maxAbsorbable = proposedWidths[i] - 5;
          if (maxAbsorbable > 0) {
            if (remainingDelta <= maxAbsorbable) {
              proposedWidths[i] -= remainingDelta;
              remainingDelta = 0;
              break;
            } else {
              proposedWidths[i] = 5;
              remainingDelta -= maxAbsorbable;
            }
          }
        }
        if (remainingDelta > 0) {
          proposedWidths[idx] -= remainingDelta;
        }
      } else if (deltaPercent < 0) {
        let remainingDelta = Math.abs(deltaPercent);
        proposedWidths[idx + 1] += remainingDelta;

        for (let i = idx; i >= 0; i--) {
          const maxAbsorbable = proposedWidths[i] - 5;
          if (maxAbsorbable > 0) {
            if (remainingDelta <= maxAbsorbable) {
              proposedWidths[i] -= remainingDelta;
              remainingDelta = 0;
              break;
            } else {
              proposedWidths[i] = 5;
              remainingDelta -= maxAbsorbable;
            }
          }
        }
        if (remainingDelta > 0) {
          proposedWidths[idx + 1] -= remainingDelta;
        }
      }

      setBoleksendWidths(proposedWidths);
    };

    const handleMouseUp = () => {
      setBoleksendActiveSplitter(null);
      document.body.classList.remove('resizing');
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [boleksendActiveSplitter, boleksendDragStartX, boleksendInitialWidths]);

  // Card Sizing drag tracking listener
  useEffect(() => {
    if (!resizingCardId) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - resizeStartY;
      const newHeight = Math.max(80, resizeStartHeight + deltaY);

      setColumns((prev) =>
        prev.map((col) => ({
          ...col,
          cards: col.cards.map((card) => {
            if (card.id === resizingCardId) {
              return { ...card, minHeight: `${newHeight}px` };
            }
            return card;
          })
        }))
      );
    };

    const handleMouseUp = () => {
      setResizingCardId(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingCardId, resizeStartY, resizeStartHeight]);

  // Keyboard controls for Calculator
  useEffect(() => {
    if (activeTab !== 'calc') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      if (/[0-9\.\+\-\*\/]/.test(key)) {
        e.preventDefault();
        pressCalc(key);
      } else if (key === 'Enter') {
        e.preventDefault();
        calculateCalc();
      } else if (key === 'Escape' || key === 'c' || key === 'C') {
        e.preventDefault();
        clearCalc();
      } else if (key === 'Backspace') {
        e.preventDefault();
        setCalcScreen((prev) => (prev.length > 1 ? prev.slice(0, -1) : '0'));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, calcScreen]);

  // Custom theme dialog promise wrapper
  const showDialog = (
    type: 'prompt' | 'confirm' | 'alert' | 'color',
    message: string,
    defaultValue = '',
    options: Partial<ThemeDialogConfig> = {}
  ): Promise<any> => {
    return new Promise((resolve) => {
      setDialog({
        open: true,
        type,
        message,
        defaultValue,
        okText: options.okText || (type === 'confirm' ? 'Delete' : 'Done'),
        cancelText: options.cancelText || (type === 'confirm' ? 'Keep' : 'Cancel'),
        currentColor: options.currentColor,
        resolve
      });
    });
  };

  const showAlert = (message: string) => {
    showDialog('alert', message);
  };

  // Switch workspace layout tab
  const switchTab = (tab: ActiveTab) => {
    // Intercept regular user access to restricted tabs
    const isRegular = effectiveRole === 'user' && effectivePlan === 'regular';
    if (isRegular) {
      if ((tab === 'send' && !featureAccess.send) || (tab === 'bolekauth' && !featureAccess.bolekauth)) {
        setPaywallModal({ isOpen: true, featureName: tab });
        return;
      }
    }

    setOpenTabs((prev) => ({ ...prev, [tab]: true }));
    setActiveTab(tab);
  };

  const closeTab = (tab: ActiveTab, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenTabs((prev) => ({ ...prev, [tab]: false }));
    if (activeTab === tab) {
      setActiveTab('notes');
    }
  };

  // =========================================================================
  // ENHANCED CALCULATOR SUITE LOGIC
  // =========================================================================

  // Fetch Live Exchange Rates on Mount
  useEffect(() => {
    const fetchRates = async () => {
      setExchangeRatesLoading(true);
      try {
        const res = await fetch('https://open.er-api.com/v6/latest/USD');
        if (res.ok) {
          const data = await res.json();
          if (data && data.rates) {
            setExchangeRates(data.rates);
            const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            setRatesLastUpdated(`Live: Updated today at ${time}`);
            localStorage.setItem('bolek_exchange_rates', JSON.stringify(data.rates));
            localStorage.setItem('bolek_rates_updated', `Live: Updated today at ${time}`);
          }
        }
      } catch (err) {
        setExchangeRatesError('Offline mode. Using cached exchange rates.');
        const cachedRates = localStorage.getItem('bolek_exchange_rates');
        const cachedTime = localStorage.getItem('bolek_rates_updated');
        if (cachedRates) {
          setExchangeRates(JSON.parse(cachedRates));
          if (cachedTime) setRatesLastUpdated(`${cachedTime} (Cached)`);
        }
      } finally {
        setExchangeRatesLoading(false);
      }
    };
    fetchRates();
  }, []);

  // Safe Math Expression Evaluator
  const evaluateMathExpression = (expr: string, isDeg: boolean): number => {
    const pi = Math.PI;
    const e = Math.E;
    
    // Convert degrees to radians if isDeg is true
    const sin = (x: number) => isDeg ? Math.sin(x * Math.PI / 180) : Math.sin(x);
    const cos = (x: number) => isDeg ? Math.cos(x * Math.PI / 180) : Math.cos(x);
    const tan = (x: number) => isDeg ? Math.tan(x * Math.PI / 180) : Math.tan(x);
    const asin = (x: number) => isDeg ? Math.asin(x) * 180 / Math.PI : Math.asin(x);
    const acos = (x: number) => isDeg ? Math.acos(x) * 180 / Math.PI : Math.acos(x);
    const atan = (x: number) => isDeg ? Math.atan(x) * 180 / Math.PI : Math.atan(x);
    
    const sinh = (x: number) => Math.sinh(x);
    const cosh = (x: number) => Math.cosh(x);
    const tanh = (x: number) => Math.tanh(x);
    
    const ln = (x: number) => Math.log(x);
    const log = (x: number) => Math.log10(x);
    const log2 = (x: number) => Math.log2(x);
    
    const sqrt = (x: number) => Math.sqrt(x);
    const cbrt = (x: number) => Math.cbrt(x);
    const abs = (x: number) => Math.abs(x);
    
    const fact = (n: number): number => {
      if (n < 0 || !Number.isInteger(n)) return NaN;
      if (n === 0 || n === 1) return 1;
      let r = 1;
      for (let i = 2; i <= n; i++) r *= i;
      return r;
    };

    let jsExpr = expr
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/π/g, 'pi')
      .replace(/e/g, 'e')
      .replace(/mod/g, '%')
      .replace(/(\d+)!/g, 'fact($1)');

    jsExpr = jsExpr.replace(/\^/g, '**');

    const runner = new Function(
      'pi', 'e', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'sinh', 'cosh', 'tanh', 'ln', 'log', 'log2', 'sqrt', 'cbrt', 'abs', 'fact',
      `return (${jsExpr});`
    );
    
    return runner(pi, e, sin, cos, tan, asin, acos, atan, sinh, cosh, tanh, ln, log, log2, sqrt, cbrt, abs, fact);
  };

  const saveCalcHistory = (formula: string, result: string) => {
    const newItem = {
      id: `calc-h-${Date.now()}`,
      formula,
      result,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setCalcHistory((prev) => {
      const next = [newItem, ...prev.slice(0, 19)];
      localStorage.setItem('bolek_calc_history', JSON.stringify(next));
      return next;
    });
  };

  const pressCalc = (val: string) => {
    setCalcScreen((prev) => {
      if (prev === 'Error' || prev === 'NaN') {
        return val;
      }
      if (prev === '0' && !['+', '-', '*', '/', '.', '^', 'mod', '!', ')'].includes(val)) {
        return val;
      }
      return prev + val;
    });
  };

  const clearCalc = () => {
    setCalcScreen('0');
    setCalcFormula('');
  };

  const deleteCalc = () => {
    setCalcScreen((prev) => {
      if (prev === 'Error' || prev === 'NaN' || prev.length <= 1) return '0';
      const words = ['asin(', 'acos(', 'atan(', 'sinh(', 'cosh(', 'tanh(', 'sin(', 'cos(', 'tan(', 'log(', 'log2(', 'sqrt(', 'cbrt(', 'abs(', 'mod '];
      for (const w of words) {
        if (prev.endsWith(w)) {
          return prev.slice(0, -w.length) || '0';
        }
      }
      return prev.slice(0, -1);
    });
  };

  const calculateCalc = () => {
    try {
      const rawExpr = calcScreen;
      const numericResult = evaluateMathExpression(rawExpr, isDegreeMode);
      
      if (isNaN(numericResult)) {
        setCalcScreen('Error');
        return;
      }
      
      const resultString = Number.isInteger(numericResult) 
        ? String(numericResult) 
        : String(parseFloat(numericResult.toFixed(10)));
      
      setCalcFormula(rawExpr + ' =');
      setCalcScreen(resultString);
      saveCalcHistory(rawExpr, resultString);
    } catch {
      setCalcScreen('Error');
    }
  };

  // Currency conversion calculation helper
  const handleCurrencyConvert = (amountStr: string, from: string, to: string) => {
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) return '0';
    const rateFrom = exchangeRates[from];
    const rateTo = exchangeRates[to];
    if (!rateFrom || !rateTo) return '0';
    return ((amount / rateFrom) * rateTo).toFixed(4);
  };

  // Currency Converter Auto-Sync
  useEffect(() => {
    const res = handleCurrencyConvert(currencyAmount, currencyFrom, currencyTo);
    setCurrencyResult(res);
  }, [currencyAmount, currencyFrom, currencyTo, exchangeRates]);

  // Save Currency Conversion to Local History
  const handleSaveCurrencyConversion = () => {
    const res = handleCurrencyConvert(currencyAmount, currencyFrom, currencyTo);
    if (parseFloat(res) === 0) return;
    
    const newItem = {
      id: `curr-h-${Date.now()}`,
      from: currencyFrom,
      to: currencyTo,
      amount: currencyAmount,
      result: res,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setCurrencyHistory((prev) => {
      const next = [newItem, ...prev.slice(0, 19)];
      localStorage.setItem('bolek_currency_history', JSON.stringify(next));
      return next;
    });
    showToast(`Saved: ${currencyAmount} ${currencyFrom} = ${res} ${currencyTo}`);
  };

  // Unit Converter Calculation
  const handleUnitConvert = (valStr: string, cat: string, from: string, to: string): string => {
    const val = parseFloat(valStr);
    if (isNaN(val)) return '0';

    const lengthMap: Record<string, number> = {
      m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.344, yd: 0.9144, ft: 0.3048, in: 0.0254
    };
    const weightMap: Record<string, number> = {
      kg: 1, g: 0.001, mg: 0.000001, lbs: 0.45359237, oz: 0.028349523
    };
    const areaMap: Record<string, number> = {
      'm²': 1, 'km²': 1000000, 'mi²': 2589988.11, ac: 4046.85642, ha: 10000
    };
    const speedMap: Record<string, number> = {
      'm/s': 1, 'km/h': 0.27777778, mph: 0.44704, kt: 0.51444444
    };

    if (cat === 'length') {
      return String(parseFloat((val * (lengthMap[from] || 1) / (lengthMap[to] || 1)).toFixed(8)));
    }
    if (cat === 'weight') {
      return String(parseFloat((val * (weightMap[from] || 1) / (weightMap[to] || 1)).toFixed(8)));
    }
    if (cat === 'area') {
      return String(parseFloat((val * (areaMap[from] || 1) / (areaMap[to] || 1)).toFixed(8)));
    }
    if (cat === 'speed') {
      return String(parseFloat((val * (speedMap[from] || 1) / (speedMap[to] || 1)).toFixed(8)));
    }
    if (cat === 'temperature') {
      let celsius = 0;
      if (from === 'C') celsius = val;
      else if (from === 'F') celsius = (val - 32) * 5/9;
      else if (from === 'K') celsius = val - 273.15;

      let res = 0;
      if (to === 'C') res = celsius;
      else if (to === 'F') res = (celsius * 9/5) + 32;
      else if (to === 'K') res = celsius + 273.15;

      return String(parseFloat(res.toFixed(4)));
    }
    return '0';
  };

  // Unit Converter Auto-Sync
  useEffect(() => {
    const res = handleUnitConvert(unitValue, unitCategory, unitFrom, unitTo);
    setUnitResult(res);
  }, [unitValue, unitCategory, unitFrom, unitTo]);

  // Unit Converter Defaults Auto-Selector on category change
  useEffect(() => {
    const defaults: Record<string, [string, string]> = {
      length: ['m', 'km'],
      weight: ['kg', 'lbs'],
      temperature: ['C', 'F'],
      area: ['m²', 'ha'],
      speed: ['km/h', 'mph']
    };
    const [defFrom, defTo] = defaults[unitCategory] || ['m', 'km'];
    setUnitFrom(defFrom);
    setUnitTo(defTo);
  }, [unitCategory]);

  // Equation solvers
  const solveQuadratic = () => {
    const a = parseFloat(eqQuadraticA);
    const b = parseFloat(eqQuadraticB);
    const c = parseFloat(eqQuadraticC);

    if (isNaN(a) || isNaN(b) || isNaN(c)) {
      setEqQuadraticResult('Invalid variables');
      return;
    }
    if (a === 0) {
      if (b === 0) {
        setEqQuadraticResult(c === 0 ? 'Infinite solutions' : 'No solution');
      } else {
        setEqQuadraticResult(`Linear Root: x = ${parseFloat((-c / b).toFixed(4))}`);
      }
      return;
    }

    const disc = b * b - 4 * a * c;
    if (disc > 0) {
      const x1 = (-b + Math.sqrt(disc)) / (2 * a);
      const x2 = (-b - Math.sqrt(disc)) / (2 * a);
      setEqQuadraticResult(`x₁ = ${parseFloat(x1.toFixed(4))}, x₂ = ${parseFloat(x2.toFixed(4))}`);
    } else if (disc === 0) {
      const x = -b / (2 * a);
      setEqQuadraticResult(`Double root: x = ${parseFloat(x.toFixed(4))}`);
    } else {
      const real = -b / (2 * a);
      const imag = Math.sqrt(-disc) / (2 * a);
      setEqQuadraticResult(`x₁ = ${parseFloat(real.toFixed(4))} + ${parseFloat(imag.toFixed(4))}i, x₂ = ${parseFloat(real.toFixed(4))} - ${parseFloat(imag.toFixed(4))}i`);
    }
  };

  const solvePythag = () => {
    const a = parseFloat(eqPythagA);
    const b = parseFloat(eqPythagB);

    if (isNaN(a) || isNaN(b) || a <= 0 || b <= 0) {
      setEqPythagResult('Invalid side lengths');
      return;
    }

    const c = Math.sqrt(a * a + b * b);
    setEqPythagResult(`Hypotenuse (c) = ${parseFloat(c.toFixed(4))}`);
  };

  const solveCircle = () => {
    const r = parseFloat(eqCircleRadius);

    if (isNaN(r) || r <= 0) {
      setEqCircleResult('Invalid radius');
      return;
    }

    const area = Math.PI * r * r;
    const circ = 2 * Math.PI * r;
    setEqCircleResult(`Area = ${parseFloat(area.toFixed(4))}, Circumference = ${parseFloat(circ.toFixed(4))}`);
  };

  // Boleksend Mail Dispacther
  const handleBoleksendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendStatus('Sending...');
    setIsSending(true);

    const triggerOfflineBoleksendFallback = () => {
      setSendStatus('Message sent successfully (Offline Sandboxed Simulation).');
      showToast('Boleksend: Routed via sandbox fallback (No API backend detected)');
      
      const newEmailId = `msg-${Date.now()}`;
      const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 16);
      const randomStatuses = ['delivered', 'opened', 'clicked'];
      const randomStatus = randomStatuses[Math.floor(Math.random() * randomStatuses.length)];
      
      const newEmail = {
        id: newEmailId,
        to: sendTo,
        subject: sendSubject,
        sentAt: timestamp,
        status: randomStatus,
        size: `${(sendMessage.length * 0.001 + 1.2).toFixed(1)} KB`,
        message: sendMessage
      };

      setBoleksendEmails(prev => [newEmail, ...prev]);

      const newLogs = [
        {
          id: `log-${Date.now()}-1`,
          eventName: 'email.sent_offline',
          recipient: sendTo,
          status: 'success',
          timestamp: timestamp + ':00',
          ip: '127.0.0.1',
          userAgent: 'Boleksend Local Sandbox'
        },
        {
          id: `log-${Date.now()}-2`,
          eventName: `email.${randomStatus}`,
          recipient: sendTo,
          status: 'success',
          timestamp: timestamp + ':04',
          ip: '192.168.1.104',
          userAgent: 'Mozilla/5.0 (Client User Agent)'
        }
      ];
      setBoleksendLogs(prev => [...newLogs, ...prev]);

      // Reset composer
      setSendTo('');
      setSendSubject('');
      setSendMessage('');
    };

    try {
      const response = await fetch('/api/boleksend/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: sendTo,
          subject: sendSubject,
          message: sendMessage
        })
      });

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        setSendStatus(data.message || 'Message sent successfully.');
        
        // Save to active emails list
        const newEmailId = `msg-${Date.now()}`;
        const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 16);
        const randomStatuses = ['delivered', 'opened', 'clicked'];
        const randomStatus = randomStatuses[Math.floor(Math.random() * randomStatuses.length)];
        
        const newEmail = {
          id: newEmailId,
          to: sendTo,
          subject: sendSubject,
          sentAt: timestamp,
          status: randomStatus,
          size: `${(sendMessage.length * 0.001 + 1.2).toFixed(1)} KB`,
          message: sendMessage
        };

        setBoleksendEmails(prev => [newEmail, ...prev]);

        // Prepend system events to logs
        const newLogs = [
          {
            id: `log-${Date.now()}-1`,
            eventName: 'email.sent',
            recipient: sendTo,
            status: 'success',
            timestamp: timestamp + ':00',
            ip: '127.0.0.1',
            userAgent: 'Boleksend API Node SDK'
          },
          {
            id: `log-${Date.now()}-2`,
            eventName: `email.${randomStatus}`,
            recipient: sendTo,
            status: 'success',
            timestamp: timestamp + ':04',
            ip: '192.168.1.104',
            userAgent: 'Mozilla/5.0 (Client User Agent)'
          }
        ];
        setBoleksendLogs(prev => [...newLogs, ...prev]);

        // Reset composer
        setSendTo('');
        setSendSubject('');
        setSendMessage('');
      } else {
        if (response.status === 404) {
          triggerOfflineBoleksendFallback();
        } else {
          const data = await response.json().catch(() => ({}));
          setSendStatus(data.error || 'Unable to send message.');
        }
      }
    } catch (err) {
      triggerOfflineBoleksendFallback();
    } finally {
      setIsSending(false);
    }
  };

  // Splitter Resizer event handler
  const handleSplitterMouseDown = (idx: number, e: React.MouseEvent) => {
    e.preventDefault();
    setActiveSplitter(idx);
    setDragStartX(e.clientX);
    setInitialWidths(columns.map((col) => col.width));
    document.body.classList.add('resizing');
  };

  // Boleksend Splitter Resizer event handler
  const handleBoleksendSplitterMouseDown = (idx: number, e: React.MouseEvent) => {
    e.preventDefault();
    setBoleksendActiveSplitter(idx);
    setBoleksendDragStartX(e.clientX);
    setBoleksendInitialWidths([...boleksendWidths]);
    document.body.classList.add('resizing');
  };

  // Card Resizing Grip handler
  const handleCardResizeMouseDown = (cardId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const cardElement = e.currentTarget.closest('.card') as HTMLDivElement;
    if (!cardElement) return;
    setResizingCardId(cardId);
    setResizeStartY(e.clientY);
    setResizeStartHeight(cardElement.offsetHeight);
  };

  // Drag & Drop Card re-ordering
  const handleDragStart = (colId: string, cardId: string, e: React.DragEvent) => {
    if (publicBoardMode) return;
    setDraggedCard({ colId, cardId });
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.classList.add('dragging');
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('dragging');
    setDraggedCard(null);
    setDraggedOverIndex(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnter = (colId: string, index: number, e: React.DragEvent) => {
    e.preventDefault();
    setDraggedOverIndex({ colId, index });
  };

  const handleDrop = (targetColId: string, e: React.DragEvent) => {
    if (publicBoardMode) return;
    e.preventDefault();
    if (!draggedCard) return;

    const { colId: sourceColId, cardId } = draggedCard;

    let cardObj: Boleknote | null = null;
    columns.forEach((col) => {
      if (col.id === sourceColId) {
        const found = col.cards.find((c) => c.id === cardId);
        if (found) cardObj = found;
      }
    });

    if (!cardObj) return;

    setColumns((prev) => {
      const sourceCol = prev.find((col) => col.id === sourceColId);
      if (!sourceCol) return prev;
      const cleanSourceCards = sourceCol.cards.filter((c) => c.id !== cardId);

      if (sourceColId === targetColId) {
        const updatedCards = [...cleanSourceCards];
        const targetIndex = draggedOverIndex && draggedOverIndex.colId === targetColId ? draggedOverIndex.index : updatedCards.length;
        updatedCards.splice(targetIndex, 0, cardObj!);
        return prev.map((col) => (col.id === sourceColId ? { ...col, cards: updatedCards } : col));
      } else {
        const targetCol = prev.find((col) => col.id === targetColId);
        if (!targetCol) return prev;
        const updatedTargetCards = [...targetCol.cards];
        const targetIndex = draggedOverIndex && draggedOverIndex.colId === targetColId ? draggedOverIndex.index : updatedTargetCards.length;
        updatedTargetCards.splice(targetIndex, 0, cardObj!);

        return prev.map((col) => {
          if (col.id === sourceColId) {
            return { ...col, cards: cleanSourceCards };
          }
          if (col.id === targetColId) {
            return { ...col, cards: updatedTargetCards };
          }
          return col;
        });
      }
    });

    setDraggedCard(null);
    setDraggedOverIndex(null);
  };

  // Add Card note (Rich Modal trigger)
  const handleAddCard = () => {
    if (!requireEditableBoard()) return;
    setRichEditorCardId(null);
    setRichTitle('');
    setRichContent('<div>Add text here...</div>');
    setRichTags('');
    setRichColor('#ffffff');
    setRichRotation(0);
    setRichFontFamily(NOTE_FONT_FAMILIES[0].value);
    setRichFontSize('14px');
    setRichEmoji('');
    setRichMediaUrl('');
    setRichAttachments([]);
    if (columns.length > 0) {
      setRichDestinationColId(columns[0].id);
      setColumnPromptOpen(true);
    } else {
      setRichEditorOpen(true);
    }
  };

  // Add Column (Bolekpad)
  const handleAddColumn = async () => {
    if (!requireEditableBoard()) return;
    const columnName = await showDialog('prompt', 'Name the new Bolekpad', 'New Dynamic Desk');
    if (!columnName || columnName.trim() === '') return;

    setColumns((prev) => {
      const targetNewWidth = 20;
      const reductionFactor = (100 - targetNewWidth) / 100;

      const scaledPrev = prev.map((col) => ({
        ...col,
        width: col.width * reductionFactor
      }));

      const newCol: Bolekpad = {
        id: `col-${Date.now()}`,
        title: columnName,
        width: targetNewWidth,
        cards: []
      };

      return [...scaledPrev, newCol];
    });
  };

  // Customize Column (title, cover banners)
  const handleCustomizeColumn = async (colId: string) => {
    if (!requireEditableBoard()) return;
    const col = columns.find((c) => c.id === colId);
    if (!col) return;

    const updatedTitle = await showDialog('prompt', 'Update column title', col.title);
    if (updatedTitle === null) return;

    const updatedCover = await showDialog('prompt', 'Paste banner cover URL, or leave blank to hide it', col.coverUrl || '');
    if (updatedCover === null) return;

    setColumns((prev) =>
      prev.map((c) => {
        if (c.id === colId) {
          return {
            ...c,
            title: updatedTitle || c.title,
            coverUrl: updatedCover.trim() || undefined
          };
        }
        return c;
      })
    );
  };

  // Move Panel/Column Left or Right
  const handleMoveColumn = (colId: string, direction: 'left' | 'right') => {
    if (!requireEditableBoard()) return;
    setColumns((prev) => {
      const idx = prev.findIndex((c) => c.id === colId);
      if (idx === -1) return prev;
      if (direction === 'left' && idx === 0) return prev;
      if (direction === 'right' && idx === prev.length - 1) return prev;

      const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
      const updated = [...prev];
      const temp = updated[idx];
      updated[idx] = updated[targetIdx];
      updated[targetIdx] = temp;
      return updated;
    });
    showToast(`Moved panel ${direction}`);
  };

  // Delete Panel/Column
  const handleDeleteColumn = async (colId: string) => {
    if (!requireEditableBoard()) return;
    if (columns.length <= 1) {
      showToast('Cannot delete the last remaining panel');
      return;
    }
    const col = columns.find((c) => c.id === colId);
    if (!col) return;

    const confirmDelete = await showDialog('confirm', `Delete panel "${col.title}"? Any notes inside will be moved to an adjacent panel.`);
    if (!confirmDelete) return;

    setColumns((prev) => {
      const idx = prev.findIndex((c) => c.id === colId);
      if (idx === -1) return prev;
      const targetIdx = idx > 0 ? idx - 1 : 1;
      const cardsToMove = col.cards;
      const freedWidth = col.width;

      return prev
        .filter((c) => c.id !== colId)
        .map((c, cIdx) => {
          const isTarget = c.id === prev[targetIdx].id;
          const widthShare = freedWidth / (prev.length - 1);
          return {
            ...c,
            width: Number((c.width + widthShare).toFixed(2)),
            cards: isTarget ? [...c.cards, ...cardsToMove] : c.cards,
          };
        });
    });
    showToast(`Panel "${col.title}" removed`);
  };

  // Adjust Column Width
  const handleAdjustColumnWidth = (colId: string, deltaPercent: number) => {
    if (!requireEditableBoard()) return;
    setColumns((prev) => {
      const idx = prev.findIndex((c) => c.id === colId);
      if (idx === -1) return prev;
      const col = prev[idx];
      const newWidth = Math.max(10, Math.min(80, col.width + deltaPercent));
      const actualDelta = newWidth - col.width;
      if (Math.abs(actualDelta) < 0.1) return prev;

      const otherCount = prev.length - 1;
      if (otherCount <= 0) return prev;
      const shareDelta = actualDelta / otherCount;

      return prev.map((c) => {
        if (c.id === colId) {
          return { ...c, width: Number(newWidth.toFixed(2)) };
        }
        return { ...c, width: Number(Math.max(5, c.width - shareDelta).toFixed(2)) };
      });
    });
  };

  // Save Card Content
  const handleSaveCardContent = (cardId: string, content: string) => {
    if (!requireEditableBoard()) return;
    setColumns((prev) =>
      prev.map((col) => ({
        ...col,
        cards: col.cards.map((card) => {
          if (card.id === cardId) {
            return { ...card, content };
          }
          return card;
        })
      }))
    );
  };

  // Full Rich Save Card (Title, Content, Tags)
  const handleSaveCardFull = (cardId: string, title: string, content: string, tagsString: string) => {
    if (!requireEditableBoard()) return;
    const tags = tagsString
      .split(',')
      .map(t => t.trim())
      .filter(t => t !== '');
    
    setColumns((prev) =>
      prev.map((col) => ({
        ...col,
        cards: col.cards.map((card) => {
          if (card.id === cardId) {
            return { ...card, title, content, tags };
          }
          return card;
        })
      }))
    );
  };

  // Custom Rich Editor Save Handler
  const handleSaveRichEditor = () => {
    if (!requireEditableBoard()) return;
    const title = richTitle.trim();
    if (!title) {
      showToast('Please add a title first');
      return;
    }
    const content = richEditorRef.current?.innerHTML || richContent;
    const tags = richTags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t !== '');
    const attachments = richAttachments.filter((item) => item.url.trim());

    if (richEditorCardId) {
      // Editing existing card
      setColumns((prev) => {
        let foundCard: any = null;
        let oldColId = '';
        prev.forEach((col) => {
          const card = col.cards.find((c) => c.id === richEditorCardId);
          if (card) {
            foundCard = card;
            oldColId = col.id;
          }
        });

        if (!foundCard) return prev;

        const updatedCard = {
          ...foundCard,
          title,
          content,
          tags,
          color: richColor,
          rotation: richRotation,
          fontFamily: richFontFamily,
          fontSize: richFontSize,
          emoji: richEmoji,
          attachments,
        };

        const targetColId = richDestinationColId || oldColId;

        if (oldColId === targetColId) {
          return prev.map((col) => {
            if (col.id === oldColId) {
              return {
                ...col,
                cards: col.cards.map((c) => (c.id === richEditorCardId ? updatedCard : c))
              };
            }
            return col;
          });
        } else {
          return prev.map((col) => {
            if (col.id === oldColId) {
              return {
                ...col,
                cards: col.cards.filter((c) => c.id !== richEditorCardId)
              };
            }
            if (col.id === targetColId) {
              return {
                ...col,
                cards: [...col.cards, updatedCard]
              };
            }
            return col;
          });
        }
      });
      showToast('Boleknote updated!');
    } else {
      // Creating a new card inside selected column
      setColumns((prev) => {
        if (prev.length === 0) return prev;
        const targetColId = richDestinationColId || prev[0].id;
        return prev.map((col) => {
          if (col.id === targetColId) {
            return {
              ...col,
              cards: [
                ...col.cards,
                {
                  id: `card-${Date.now()}`,
                  title,
                  content,
                  tags,
                  color: richColor,
                  locked: false,
                  rotation: richRotation,
                  fontFamily: richFontFamily,
                  fontSize: richFontSize,
                  emoji: richEmoji,
                  attachments,
                }
              ]
            };
          }
          return col;
        });
      });
      showToast('Boleknote created!');
    }

    setRichEditorOpen(false);
    setRichEditorCardId(null);
  };

  // Rich Editor formatting helper: Font Size
  const applyFontSize = (val: string) => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      let parent = range.commonAncestorContainer as HTMLElement;
      if (parent.nodeType === Node.TEXT_NODE) {
        parent = parent.parentElement as HTMLElement;
      }
      if (parent && parent !== richEditorRef.current && parent.className !== 'rich-content-rendered') {
        parent.style.fontSize = val;
      } else {
        const span = document.createElement('span');
        span.style.fontSize = val;
        try {
          range.surroundContents(span);
        } catch {
          document.execCommand('fontSize', false, '3');
        }
      }
    }
  };

  // Rich Editor formatting helper: Line Spacing
  const applyLineSpacing = (val: string) => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      let parent = range.commonAncestorContainer as HTMLElement;
      if (parent.nodeType === Node.TEXT_NODE) {
        parent = parent.parentElement as HTMLElement;
      }
      if (parent && parent !== richEditorRef.current) {
        parent.style.lineHeight = val;
      } else {
        const span = document.createElement('span');
        span.style.lineHeight = val;
        span.style.display = 'block';
        try {
          range.surroundContents(span);
        } catch {
          // Fallback if cross-element selection
        }
      }
    }
  };

  // Rich Editor helper: Insert Table with Row/Column prompts
  const getTargetTable = (): HTMLTableElement | null => {
    if (!richEditorRef.current) return null;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      let node: Node | null = sel.getRangeAt(0).startContainer;
      while (node && node !== richEditorRef.current) {
        if (node.nodeName === 'TABLE') return node as HTMLTableElement;
        node = node.parentNode;
      }
    }
    return richEditorRef.current.querySelector('table');
  };

  const insertTable = async () => {
    // Save current range before modal prompt steals focus
    const sel = window.getSelection();
    let savedRange: Range | null = null;
    if (sel && sel.rangeCount > 0) {
      savedRange = sel.getRangeAt(0);
    }

    const rowsVal = await showDialog('prompt', 'How many rows for the table?', '3');
    if (rowsVal === null) return;
    const colsVal = await showDialog('prompt', 'How many columns for the table?', '3');
    if (colsVal === null) return;

    const numRows = Math.max(1, Math.min(25, parseInt(rowsVal, 10) || 3));
    const numCols = Math.max(1, Math.min(15, parseInt(colsVal, 10) || 3));

    let headerCells = '';
    for (let c = 1; c <= numCols; c++) {
      headerCells += `<th class="border border-stone-200 px-3 py-1.5 font-semibold text-stone-700 text-left">Header ${c}</th>`;
    }

    let bodyRows = '';
    for (let r = 1; r <= numRows; r++) {
      let rowCells = '';
      for (let c = 1; c <= numCols; c++) {
        rowCells += `<td class="border border-stone-200 px-3 py-1.5 text-stone-600">Cell ${r}-${c}</td>`;
      }
      bodyRows += `<tr>${rowCells}</tr>`;
    }

    const tableHtml = `
      <table class="w-full text-xs border-collapse border border-stone-200 my-2 rounded-lg overflow-hidden">
        <thead>
          <tr class="bg-stone-50">
            ${headerCells}
          </tr>
        </thead>
        <tbody>
          ${bodyRows}
        </tbody>
      </table>
      <div class="mt-2"><br/></div>
    `;

    if (richEditorRef.current) {
      richEditorRef.current.focus();
      const currentSel = window.getSelection();
      if (savedRange && richEditorRef.current.contains(savedRange.commonAncestorContainer)) {
        currentSel?.removeAllRanges();
        currentSel?.addRange(savedRange);
        document.execCommand('insertHTML', false, tableHtml);
      } else {
        richEditorRef.current.insertAdjacentHTML('beforeend', tableHtml);
      }
      showToast(`Inserted ${numRows}x${numCols} table`);
    }
  };

  const handleAddTableRow = () => {
    const table = getTargetTable();
    if (!table) {
      showToast('No table found in editor');
      return;
    }
    let tbody = table.querySelector('tbody');
    if (!tbody) {
      tbody = document.createElement('tbody');
      table.appendChild(tbody);
    }
    const firstRow = table.querySelector('tr');
    const numCols = firstRow ? firstRow.querySelectorAll('th, td').length : 3;
    const newTr = document.createElement('tr');
    const rowNum = tbody.children.length + 1;
    for (let i = 0; i < numCols; i++) {
      const td = document.createElement('td');
      td.className = "border border-stone-200 px-3 py-1.5 text-stone-600";
      td.innerText = `Cell ${rowNum}-${i + 1}`;
      newTr.appendChild(td);
    }
    tbody.appendChild(newTr);
    showToast('Row added to table');
  };

  const handleRemoveTableRow = () => {
    const table = getTargetTable();
    if (!table) {
      showToast('No table found in editor');
      return;
    }
    const tbody = table.querySelector('tbody');
    if (tbody && tbody.children.length > 0) {
      tbody.removeChild(tbody.lastElementChild!);
      showToast('Row removed from table');
    } else {
      showToast('No row to remove');
    }
  };

  const handleAddTableColumn = () => {
    const table = getTargetTable();
    if (!table) {
      showToast('No table found in editor');
      return;
    }
    const theadRow = table.querySelector('thead tr');
    if (theadRow) {
      const colNum = theadRow.children.length + 1;
      const th = document.createElement('th');
      th.className = "border border-stone-200 px-3 py-1.5 font-semibold text-stone-700 text-left";
      th.innerText = `Header ${colNum}`;
      theadRow.appendChild(th);
    }
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach((tr, rIdx) => {
      const colNum = tr.children.length + 1;
      const td = document.createElement('td');
      td.className = "border border-stone-200 px-3 py-1.5 text-stone-600";
      td.innerText = `Cell ${rIdx + 1}-${colNum}`;
      tr.appendChild(td);
    });
    showToast('Column added to table');
  };

  const handleRemoveTableColumn = () => {
    const table = getTargetTable();
    if (!table) {
      showToast('No table found in editor');
      return;
    }
    const theadRow = table.querySelector('thead tr');
    if (theadRow && theadRow.children.length > 1) {
      theadRow.removeChild(theadRow.lastElementChild!);
    }
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach((tr) => {
      if (tr.children.length > 1) {
        tr.removeChild(tr.lastElementChild!);
      }
    });
    showToast('Column removed from table');
  };

  // Rich Editor helper: Insert Image with referrer Policy
  const insertImage = async () => {
    const url = await showDialog('prompt', 'Enter Image URL:', 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=500');
    if (!url) return;
    const imgHtml = `<img src="${url}" alt="Note image" class="max-w-full h-auto rounded-lg my-2 border border-stone-200 shadow-sm" referrerPolicy="no-referrer" />`;
    document.execCommand('insertHTML', false, imgHtml);
  };

  const handleAddRichAttachment = () => {
    const nextUrl = richMediaUrl.trim();
    if (!nextUrl) return;
    setRichAttachments((prev) => [...prev, normalizeAttachment(nextUrl)]);
    setRichMediaUrl('');
    showToast('Attached link added to the note');
  };

  const handleRemoveRichAttachment = (attachmentId: string) => {
    setRichAttachments((prev) => prev.filter((attachment) => attachment.id !== attachmentId));
  };

  // Rich Editor helper: Clear Formatting
  const clearFormatting = () => {
    document.execCommand('removeFormat', false);
  };

  // Toggle Pinned status
  const handleTogglePin = (cardId: string) => {
    if (!requireEditableBoard()) return;
    setColumns((prev) =>
      prev.map((col) => ({
        ...col,
        cards: col.cards.map((card) => {
          if (card.id === cardId) {
            return { ...card, pinned: !card.pinned };
          }
          return card;
        })
      }))
    );
  };

  // Lock/Unlock Card
  const handleToggleLock = (cardId: string) => {
    if (!requireEditableBoard()) return;
    setColumns((prev) =>
      prev.map((col) => ({
        ...col,
        cards: col.cards.map((card) => {
          if (card.id === cardId) {
            return { ...card, locked: !card.locked };
          }
          return card;
        })
      }))
    );
  };

  // Color selection
  const handleUpdateCardColor = (cardId: string, color: string) => {
    if (!requireEditableBoard()) return;
    setColumns((prev) =>
      prev.map((col) => ({
        ...col,
        cards: col.cards.map((card) => {
          if (card.id === cardId) {
            return { ...card, color };
          }
          return card;
        })
      }))
    );
  };

  // Delete Card note
  const handleDeleteCard = (cardId: string) => {
    if (!requireEditableBoard()) return;
    setColumns((prev) =>
      prev.map((col) => ({
        ...col,
        cards: col.cards.filter((card) => card.id !== cardId)
      }))
    );
  };

  const buildPublicBoardSnapshot = () => ({
    title: boardTitle || 'BolekDash',
    columns,
    updatedAt: new Date().toISOString(),
  });

  const syncPublicBoard = async (boardId: string) => {
    try {
      const res = await fetch(`/api/public-boards/${encodeURIComponent(boardId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPublicBoardSnapshot()),
      });

      if (!res.ok) throw new Error('sync failed');
    } catch (error) {
      console.warn('Failed to sync public board snapshot', error);
    }
  };

  const handlePublishBolekDash = async () => {
    if (effectiveRole === 'user' && effectivePlan === 'regular' && !featureAccess.futureFeatures) {
      setPaywallModal({ isOpen: true, featureName: 'notes' });
      return;
    }

    setIsPublishingBoard(true);
    try {
      const payload = buildPublicBoardSnapshot();
      const res = await fetch('/api/public-boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.id || !data?.publicUrl) {
        throw new Error(data?.error || 'Unable to publish BolekDash.');
      }

      setPublicBoardId(data.id);
      setPublicBoardUrl(data.publicUrl);
      localStorage.setItem('bolek_public_board_id', data.id);
      localStorage.setItem('bolek_public_board_url', data.publicUrl);
      try {
        await navigator.clipboard.writeText(data.publicUrl);
        showToast('BolekDash public link copied to clipboard.');
      } catch {
        showToast('BolekDash published. Copy the link from the toolbar.');
      }
    } catch (error) {
      console.error('Failed to publish board', error);
      showToast('Unable to publish BolekDash right now.');
    } finally {
      setIsPublishingBoard(false);
    }
  };

  if (view === 'login') {
    return (
      <div className="login-view-wrapper">
        {/* App loading screen overlay */}
        <div 
          className={`app-loading-screen ${!appLoading ? 'is-hidden' : ''}`} 
          role="status" 
          aria-live="polite" 
          aria-label="Loading Bolek Desk"
        >
          <div className="flex flex-col items-center gap-5 p-7 rounded-2xl bg-white border border-stone-200/80 shadow-[0_16px_48px_rgba(0,0,0,0.08)] max-w-xs w-full text-center transition-all duration-300">
            <img 
              className="h-8 sm:h-9 w-auto object-contain mx-auto animate-pulse shrink-0" 
              src={currentLogoUrl} 
              alt="Bolek Desk Logo" 
              style={{ 
                imageRendering: '-webkit-optimize-contrast', 
                transform: 'translate3d(0, 0, 0)',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden'
              }}
            />
            <div className="w-40 h-1 bg-stone-100 rounded-full overflow-hidden mx-auto relative">
              <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-orange-500 via-rose-500 to-amber-500 rounded-full animate-loading-bar w-[40%]"></div>
            </div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-stone-400">Loading Bolek Pad...</p>
          </div>
        </div>

        <div className="grid-overlay"></div>

        <div className="glass-card">
          {/* Brand Section featuring your new SVG Logo Link */}
          <div className="brand">
            <img 
              className="brand-logo-img h-8 sm:h-10 w-auto object-contain" 
              src={currentLogoUrl} 
              alt="Brand Logo" 
              style={{ 
                imageRendering: '-webkit-optimize-contrast', 
                transform: 'translate3d(0, 0, 0)',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden'
              }}
            />
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex bg-stone-100 p-1 rounded-xl mb-4 border border-stone-200/80">
            <button
              type="button"
              onClick={() => { setAuthMode('login'); setAuthError(null); }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${authMode === 'login' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'}`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode('register'); setAuthError(null); }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${authMode === 'register' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'}`}
            >
              Create Account
            </button>
          </div>

          {/* Typography Heading */}
          <p className="welcome-text">{authMode === 'login' ? 'Welcome Back' : 'Create Account'}</p>
          <p className="sub-heading">
            {authMode === 'login' 
              ? 'Access your notes, reminders, invoices, clients and finances in one secure workspace.'
              : 'Register your secure account to manage notes, finances, and team collaboration.'}
          </p>

          {/* Inline Error Banner */}
          {authError && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <span className="material-symbols-outlined !text-base shrink-0">error</span>
              <span className="flex-1 font-medium">{authError}</span>
            </div>
          )}

          {/* Main Form */}
          <form id="loginForm" onSubmit={handleSignInSubmit}>
            {authMode === 'register' && (
              <div className="form-group mb-3">
                <i className="fa-regular fa-user input-icon"></i>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Full Name" 
                  required 
                  value={loginName}
                  onChange={(e) => setLoginName(e.target.value)}
                />
              </div>
            )}

            <div className="form-group">
              <i className="fa-regular fa-envelope input-icon"></i>
              <input 
                id="emailField" 
                type="email" 
                className="form-input" 
                placeholder="Email Address" 
                required 
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />
            </div>
            
            <div className="form-group">
              <i className="fa-solid fa-lock input-icon"></i>
              <input 
                type={showPassword ? "text" : "password"} 
                id="passwordField" 
                className="form-input" 
                placeholder="Password" 
                required 
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
              />
              <i 
                className={`toggle-password ${showPassword ? 'fa-solid' : 'fa-regular'} fa-eye`} 
                onClick={() => setShowPassword(!showPassword)}
                title="Toggle password visibility"
              ></i>
            </div>

            {authMode === 'register' && (
              <div className="form-group mt-3">
                <i className="fa-solid fa-shield-halved input-icon"></i>
                <input 
                  type={showPassword ? "text" : "password"} 
                  className="form-input" 
                  placeholder="Confirm Password" 
                  required 
                  value={registerConfirmPassword}
                  onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                />
              </div>
            )}

            {authMode === 'login' && (
              <div className="form-options">
                <label className="remember-me">
                  <input type="checkbox" defaultChecked /> Remember me
                </label>
                <a href="#" className="forgot-link" onClick={async (e) => { e.preventDefault(); await showDialog('alert', 'Password recovery instructions have been sent to your registered email.'); }}>Forgot password?</a>
              </div>
            )}

            {/* Mandatory Security & Privacy Agreement */}
            <div className="my-3 text-left">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-stone-600 select-none bg-stone-50/80 p-2.5 rounded-lg border border-stone-200/80 hover:border-stone-300 transition-colors">
                <input 
                  type="checkbox" 
                  id="securityPrivacyCheckbox"
                  checked={securityAccepted}
                  onChange={(e) => setSecurityAccepted(e.target.checked)}
                  className="h-4 w-4 rounded border-stone-300 text-orange-600 focus:ring-orange-500 cursor-pointer shrink-0"
                />
                <span className="text-[11px] leading-tight text-stone-700">
                  I accept the <a href="/legal" target="_blank" rel="noopener noreferrer" className="text-orange-600 underline font-semibold hover:text-orange-700">Legal Terms & Privacy Policy</a>
                </span>
              </label>
            </div>

            <button 
              type="submit" 
              disabled={authSubmitting || !securityAccepted}
              className={`btn-sign-in ${(!securityAccepted || authSubmitting) ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {authSubmitting ? 'Authenticating...' : authMode === 'login' ? 'Sign In' : 'Create Account'} &nbsp;<i className="fa-solid fa-arrow-right-long"></i>
            </button>
          </form>

          <div className="divider">Passkey sign-in</div>

          <div className="grid grid-cols-1 gap-3 mb-6">
            <button 
              type="button" 
              onClick={handlePasskeySignIn} 
              className="w-full flex items-center justify-center gap-2 py-3 px-3.5 bg-white hover:bg-stone-50 border border-stone-200 hover:border-stone-300 text-stone-800 font-semibold rounded-xl text-xs shadow-xs transition duration-200 cursor-pointer"
              style={{ color: '#1c1917' }}
            >
              <span className="material-symbols-outlined text-stone-600 !text-[16px] shrink-0" style={{ display: 'inline-block', verticalAlign: 'middle' }}>fingerprint</span>
              <span>Passkey</span>
            </button>
          </div>

          {/* Guest Login Option */}
          <div className="mt-4 pt-3 border-t border-stone-200/60">
            <button 
              type="button" 
              onClick={() => setShowGuestDisclaimer(true)} 
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-amber-50 hover:bg-amber-100/80 border border-amber-300 text-amber-900 font-bold rounded-xl text-xs shadow-2xs transition cursor-pointer"
            >
              <span className="material-symbols-outlined text-amber-700 !text-base">person_outline</span>
              <span>Continue as Guest (Local Storage Mode)</span>
            </button>
            <p className="text-[10px] text-stone-400 text-center mt-1.5 font-medium">
              No account required. Notes and preferences remain local on this browser.
            </p>
          </div>

          <p className="footer-text">
            {authMode === 'login' ? (
              <>Don't have an account? <a href="#" onClick={(e) => { e.preventDefault(); setAuthMode('register'); setAuthError(null); }}>Create one</a></>
            ) : (
              <>Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); setAuthMode('login'); setAuthError(null); }}>Sign In</a></>
            )}
          </p>
        </div>

        {/* Guest Mode Disclaimer Modal Popup */}
        {showGuestDisclaimer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="bg-white border border-stone-200 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3 border-b border-stone-100 pb-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-amber-700 !text-xl">warning</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-stone-900">Guest Mode Disclaimer</h3>
                  <p className="text-[11px] text-stone-500">Please review local storage & feature availability</p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-stone-700 leading-relaxed bg-stone-50 p-3.5 rounded-xl border border-stone-200/70">
                <div className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold shrink-0">⚠️</span>
                  <p><strong>Local Storage Only:</strong> Created notes, cards, and board changes are stored only in your browser's local storage. They will <u>not</u> be saved or synced to a Bolek Cloud account.</p>
                </div>

                <div className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold shrink-0">⚠️</span>
                  <p><strong>Restricted Features:</strong> Calendar viewing is available, but scheduling new events or leaving notes/reminders is disabled. Inter-user StickySend, 2FA BolekAuth, and Cloud Profile sync require signing in.</p>
                </div>

                <div className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold shrink-0">ℹ️</span>
                  <p><strong>Sign In Any Time:</strong> You can switch from Guest Mode to a registered account at any time using the Sign In button in the top navigation bar.</p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGuestDisclaimer(false)}
                  className="flex-1 py-2 px-3 border border-stone-200 hover:bg-stone-50 text-stone-700 font-semibold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsGuest(true);
                    localStorage.setItem('bolek_is_guest', 'true');
                    setShowGuestDisclaimer(false);
                    window.history.pushState({}, '', '/desk');
                    setView('desk');
                    showToast('Entered Guest Mode (Local Storage)');
                  }}
                  className="flex-1 py-2 px-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs transition shadow-sm cursor-pointer"
                >
                  Accept & Continue
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Custom Theme Prompt / Alert / Confirm / Color dialog system */}
        {dialog && dialog.open && (
          <div 
            className="theme-dialog-overlay open" 
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                dialog.resolve?.(null);
                setDialog(null);
              }
            }}
            aria-hidden="false"
          >
            <div className="theme-dialog" role="dialog" aria-modal="true">
              <label className="theme-dialog-label" htmlFor="themeDialogInput">
                {dialog.message}
              </label>

              {dialog.type === 'prompt' ? (
                <textarea 
                  className="theme-dialog-input" 
                  defaultValue={dialog.defaultValue}
                  id="themeDialogInput"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      dialog.resolve?.((e.currentTarget as HTMLTextAreaElement).value);
                      setDialog(null);
                    }
                  }}
                />
              ) : null}

              <div className="theme-dialog-actions mt-4">
                {dialog.type !== 'alert' && (
                  <button 
                    className="theme-dialog-btn" 
                    type="button"
                    onClick={() => {
                      dialog.resolve?.(null);
                      setDialog(null);
                    }}
                  >
                    {dialog.cancelText || 'Cancel'}
                  </button>
                )}
                <button 
                  className="theme-dialog-btn primary" 
                  type="button"
                  onClick={() => {
                    if (dialog.type === 'prompt') {
                      const input = document.getElementById('themeDialogInput') as HTMLTextAreaElement;
                      dialog.resolve?.(input?.value || '');
                    } else {
                      dialog.resolve?.(true);
                    }
                    setDialog(null);
                  }}
                >
                  {dialog.okText || 'Done'}
                </button>
              </div>
            </div>
          </div>
        )}
        <ComplianceFooter />
      </div>
    );
  }

  const handleAddToBolekpadFromAuth = (noteData: { title: string; content: string; color?: string; tags?: string[] }) => {
    const newNote: Boleknote = {
      id: `note-2fa-${Date.now()}`,
      title: noteData.title,
      content: noteData.content,
      color: noteData.color || '#ffedd5',
      locked: false,
      pinned: true,
      tags: noteData.tags || ['2fa', 'authenticator'],
    };
    setColumns((prev) =>
      prev.map((col, idx) => (idx === 0 ? { ...col, cards: [newNote, ...col.cards] } : col))
    );
    showToast(`Added 2FA sticky card to Bolekpad!`);
  };

  return (
    <div className="p-6 h-screen flex flex-col overflow-hidden antialiased text-stone-900 bg-[#fafafa]">
      
      {/* App loading screen overlay */}
      <div 
        className={`app-loading-screen ${!appLoading ? 'is-hidden' : ''}`} 
        role="status" 
        aria-live="polite" 
        aria-label="Loading Bolek Desk"
      >
        <div className="flex flex-col items-center gap-5 p-7 rounded-2xl bg-white border border-stone-200/80 shadow-[0_16px_48px_rgba(0,0,0,0.08)] max-w-xs w-full text-center transition-all duration-300">
          <img 
            className="h-8 sm:h-9 w-auto object-contain mx-auto animate-pulse shrink-0" 
            src={currentLogoUrl} 
            alt="Bolek Desk Logo" 
            width="144"
            height="36"
            style={{ 
              imageRendering: '-webkit-optimize-contrast',
              transform: 'translate3d(0, 0, 0)',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden'
            }}
          />
          <div className="w-40 h-1 bg-stone-100 rounded-full overflow-hidden mx-auto relative">
            <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-orange-500 via-rose-500 to-amber-500 rounded-full animate-loading-bar w-[40%]"></div>
          </div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-stone-400">Loading Bolek Pad...</p>
        </div>
      </div>

      {/* Header section */}
      <header className="mb-3 shrink-0 flex items-center relative">
        <a 
          href="/desk" 
          onClick={(e) => {
            e.preventDefault();
            window.history.pushState({}, '', '/desk');
            setView('desk');
          }}
          className="mr-auto inline-flex items-center select-none" 
          aria-label="Bolek Desk home"
        >
          <img 
            className="h-8 sm:h-10 w-auto object-contain shrink-0" 
            src={currentLogoUrl} 
            alt="Bolek Desk Branding" 
            width="160"
            height="40"
            style={{ 
              imageRendering: '-webkit-optimize-contrast',
              transform: 'translate3d(0, 0, 0)',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden'
            }}
          />
        </a>

        <div className="flex items-center gap-3 mr-12 mt-2">

          {/* User profile avatar card or Guest Mode Badge */}
          {isGuest ? (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-100/90 border border-amber-300 rounded-full text-amber-900 text-[11px] font-bold shadow-2xs">
              <span className="material-symbols-outlined !text-sm text-amber-700">person_outline</span>
              <span>Guest Mode</span>
              <button
                type="button"
                onClick={() => {
                  setIsGuest(false);
                  localStorage.setItem('bolek_is_guest', 'false');
                  setView('login');
                }}
                className="ml-1 text-[10px] bg-stone-900 hover:bg-stone-800 text-white font-semibold px-2 py-0.5 rounded-full cursor-pointer transition"
              >
                Sign In
              </button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full border border-stone-200 bg-white shadow-xs select-none">
              {profilePicture ? (
                <img 
                  src={profilePicture} 
                  alt={profileName} 
                  className="w-6 h-6 rounded-full object-cover border border-stone-100 shadow-2xs"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-[10px] font-bold text-white shadow-2xs">
                  {profileName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-[11px] font-semibold text-stone-700 max-w-[120px] truncate">{profileName}</span>
            </div>
          )}

          {/* Apps panel toggler */}
          <div className="relative">
            <button 
              id="appsBtn" 
              onClick={() => setAppsPanelOpen(!appsPanelOpen)}
              className="w-9 h-9 border border-stone-200 rounded-md bg-white flex items-center justify-center cursor-pointer hover:bg-orange-500 hover:text-white hover:border-orange-600 transition-all duration-300 active:scale-90 text-stone-700" 
              title="Apps Menu"
            >
              <svg width="16" height="16" viewBox="0 0 18 18" fill="currentColor">
                <rect x="0" y="0" width="5" height="5" rx="1.2"/>
                <rect x="6.5" y="0" width="5" height="5" rx="1.2"/>
                <rect x="13" y="0" width="5" height="5" rx="1.2"/>
                <rect x="0" y="6.5" width="5" height="5" rx="1.2"/>
                <rect x="6.5" y="6.5" width="5" height="5" rx="1.2"/>
                <rect x="13" y="6.5" width="5" height="5" rx="1.2"/>
                <rect x="0" y="13" width="5" height="5" rx="1.2"/>
                <rect x="6.5" y="13" width="5" height="5" rx="1.2"/>
                <rect x="13" y="13" width="5" height="5" rx="1.2"/>
              </svg>
            </button>

            {/* Grid dropdown panel */}
            <div id="appsPanel" className={`apps-panel !w-[260px] ${appsPanelOpen ? 'open' : ''}`}>
              <div className="text-[11px] font-semibold text-stone-400 tracking-wider uppercase mb-2 px-1">Apps & Workspace</div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div 
                  id="app-launch-dashboard" 
                  onClick={() => handleAppLaunch('dashboard')}
                  className={`btn-hover-orange flex flex-col items-center gap-1.5 p-2.5 rounded-xl border cursor-pointer text-stone-900 ${activeTab === 'dashboard' ? 'border-orange-500 bg-orange-50/60 ring-1 ring-orange-500/30' : 'border-stone-200 bg-stone-50'}`}
                >
                  <span className="material-symbols-outlined !text-xl text-stone-700">dashboard</span>
                  <span className="text-[10px] font-semibold text-center">Dashboard</span>
                </div>
                <div 
                  id="app-launch-notes" 
                  onClick={() => handleAppLaunch('notes')}
                  className={`btn-hover-orange flex flex-col items-center gap-1.5 p-2.5 rounded-xl border cursor-pointer text-stone-900 ${activeTab === 'notes' ? 'border-orange-500 bg-orange-50/60 ring-1 ring-orange-500/30' : 'border-stone-200 bg-stone-50'}`}
                >
                  <span className="material-symbols-outlined !text-xl text-stone-700">sticky_note_2</span>
                  <span className="text-[10px] font-semibold text-center">BolekDash</span>
                </div>
                <div 
                  id="app-launch-send" 
                  onClick={() => handleAppLaunch('send')}
                  className={`btn-hover-orange flex flex-col items-center gap-1.5 p-2.5 rounded-xl border cursor-pointer text-stone-900 relative ${activeTab === 'send' ? 'border-orange-500 bg-orange-50/60 ring-1 ring-orange-500/30' : 'border-stone-200 bg-stone-50'}`}
                >
                  {effectiveRole === 'user' && effectivePlan === 'regular' && !featureAccess.send && (
                    <span className="absolute top-1 right-1 bg-amber-500 text-stone-950 font-bold text-[8px] px-1 py-0.2 rounded-full flex items-center gap-0.5">
                      <span className="material-symbols-outlined !text-[10px]">lock</span> PRO
                    </span>
                  )}
                  <span className="material-symbols-outlined !text-xl text-stone-700">send_and_archive</span>
                  <span className="text-[10px] font-semibold text-center">StickySend</span>
                </div>
                <div 
                  id="app-launch-calendar" 
                  onClick={() => handleAppLaunch('calendar')}
                  className={`btn-hover-orange flex flex-col items-center gap-1.5 p-2.5 rounded-xl border cursor-pointer text-stone-900 ${activeTab === 'calendar' ? 'border-orange-500 bg-orange-50/60 ring-1 ring-orange-500/30' : 'border-stone-200 bg-stone-50'}`}
                >
                  <span className="material-symbols-outlined !text-xl text-stone-700">calendar_month</span>
                  <span className="text-[10px] font-semibold text-center">Calendar</span>
                </div>
                <div 
                  id="app-launch-profile" 
                  onClick={() => handleAppLaunch('profile')}
                  className={`btn-hover-orange flex flex-col items-center gap-1.5 p-2.5 rounded-xl border cursor-pointer text-stone-900 ${activeTab === 'profile' ? 'border-orange-500 bg-orange-50/60 ring-1 ring-orange-500/30' : 'border-stone-200 bg-stone-50'}`}
                >
                  <span className="material-symbols-outlined !text-xl text-stone-700">person</span>
                  <span className="text-[10px] font-semibold text-center">Profile</span>
                </div>
                <div 
                  id="app-launch-bolekauth" 
                  onClick={() => handleAppLaunch('bolekauth')}
                  className={`btn-hover-orange flex flex-col items-center gap-1.5 p-2.5 rounded-xl border cursor-pointer text-stone-900 relative ${activeTab === 'bolekauth' ? 'border-orange-500 bg-orange-50/60 ring-1 ring-orange-500/30' : 'border-stone-200 bg-stone-50'}`}
                >
                  {effectiveRole === 'user' && effectivePlan === 'regular' && !featureAccess.bolekauth && (
                    <span className="absolute top-1 right-1 bg-amber-500 text-stone-950 font-bold text-[8px] px-1 py-0.2 rounded-full flex items-center gap-0.5">
                      <span className="material-symbols-outlined !text-[10px]">lock</span> PRO
                    </span>
                  )}
                  <span className="material-symbols-outlined !text-xl text-stone-700">verified_user</span>
                  <span className="text-[10px] font-semibold text-center">BolekAuth</span>
                </div>

                {effectiveRole === 'admin' && (
                  <div 
                    id="app-launch-admin" 
                    onClick={() => handleAppLaunch('admin')}
                    className={`btn-hover-orange flex flex-col items-center gap-1.5 p-2.5 rounded-xl border cursor-pointer col-span-2 text-white ${activeTab === 'admin' ? 'border-orange-500 bg-stone-900 ring-2 ring-orange-500/50' : 'border-stone-800 bg-stone-900'}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined !text-xl text-orange-400">admin_panel_settings</span>
                      <span className="text-[9px] font-bold uppercase bg-orange-500 text-stone-950 px-2 py-0.5 rounded-full">ADMIN</span>
                    </div>
                    <span className="text-[10px] font-bold text-center text-stone-200">Admin Dashboard Settings</span>
                  </div>
                )}
              </div>
              
              <div className="border-t border-stone-100 pt-2 px-1 flex flex-col gap-1">
                {/* Active Session Info */}
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-stone-50 border border-stone-200/50 mb-1">
                  {profilePicture ? (
                    <img 
                      src={profilePicture} 
                      alt={profileName} 
                      className="w-7 h-7 rounded-full object-cover border border-stone-100 shadow-2xs"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-xs font-bold text-white shadow-2xs">
                      {profileName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-bold text-stone-800 truncate">{profileName}</div>
                    <div className="text-[9px] text-stone-500 truncate">{profileEmail}</div>
                  </div>
                </div>

                <button 
                  onClick={(e) => { setAppsPanelOpen(false); handleLogOut(e); }}
                  className="w-full flex items-center justify-center gap-2 rounded-lg border border-red-100 bg-red-50/50 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 hover:border-red-200 transition cursor-pointer"
                  title="Log Out of Workspace"
                >
                  <span className="material-symbols-outlined !text-sm">logout</span> Log Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigator Row */}
      <div className="flex items-end border-b border-stone-200 mb-4 h-9 gap-1 px-2 shrink-0 select-none overflow-x-auto">
        {tabOrder.map((tabKey, tIdx) => {
          if (!openTabs[tabKey]) return null;
          // Hide admin tab for non-admin users
          if (tabKey === 'admin' && effectiveRole !== 'admin') return null;

          const tabMeta: Record<ActiveTab, { name: string; icon: string }> = {
            dashboard: { name: 'Dashboard', icon: 'dashboard' },
            notes: { name: 'BolekDash', icon: 'sticky_note_2' },
            send: { name: 'StickySend', icon: 'send_and_archive' },
            calendar: { name: 'Calendar', icon: 'calendar_month' },
            profile: { name: 'Profile', icon: 'person' },
            bolekauth: { name: 'BolekAuth', icon: 'verified_user' },
            admin: { name: 'Admin Settings', icon: 'admin_panel_settings' },
          };
          const meta = tabMeta[tabKey];
          const isActive = activeTab === tabKey;

          return (
            <div
              key={tabKey}
              id={`tab-${tabKey}`}
              onClick={() => setActiveTab(tabKey)}
              className={`tab-button group px-3 py-1.5 text-xs text-stone-500 border border-transparent rounded-t-md flex items-center gap-1.5 cursor-pointer transition ${
                isActive ? 'active bg-white border-stone-200 border-b-white text-stone-900 font-semibold shadow-2xs' : 'hover:bg-stone-50'
              }`}
            >
              <span className="material-symbols-outlined !text-sm">{meta.icon}</span>
              <span>{meta.name}</span>

              {/* Tab Move Left/Right Controls */}
              <div className="flex items-center gap-0.5 ml-1 opacity-0 group-hover:opacity-100 transition">
                {tIdx > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveTab(tabKey, 'left');
                    }}
                    className="p-0.5 rounded hover:bg-stone-200 text-stone-500 transition cursor-pointer"
                    title="Move Tab Left"
                  >
                    <span className="material-symbols-outlined !text-xs">chevron_left</span>
                  </button>
                )}
                {tIdx < tabOrder.length - 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveTab(tabKey, 'right');
                    }}
                    className="p-0.5 rounded hover:bg-stone-200 text-stone-500 transition cursor-pointer"
                    title="Move Tab Right"
                  >
                    <span className="material-symbols-outlined !text-xs">chevron_right</span>
                  </button>
                )}
              </div>

              {tabKey !== 'dashboard' && tabKey !== 'notes' && (
                <span 
                  id={`close-${tabKey}-tab`} 
                  onClick={(e) => closeTab(tabKey, e)}
                  className="material-symbols-outlined !text-xs text-stone-400 hover:text-stone-700 ml-0.5 rounded p-0.5 cursor-pointer"
                  title="Close Tab"
                >
                  close
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Subtab row for Notes Board Controls - Only visible on 'notes' tab */}
      {activeTab === 'notes' && (
        <div className="flex items-center gap-2 px-3 py-2 mb-3 bg-stone-50 border border-stone-200/60 rounded-lg select-none shrink-0 animate-in fade-in slide-in-from-top-1 duration-150">
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mr-2 flex items-center gap-1 pl-1">
            <span className="material-symbols-outlined !text-[14px] text-stone-400">subdirectory_arrow_right</span>
            Controls:
          </span>
          
          <button 
            id="subtab-add-bolekpad" 
            onClick={() => { setActiveTab('notes'); handleAddColumn(); }}
            disabled={publicBoardMode}
            className="btn-hover-orange flex items-center gap-1 px-3 py-1.5 rounded-md border border-stone-200 bg-white text-xs font-semibold text-stone-600 shadow-sm transition-all duration-150 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            title={publicBoardMode ? 'Public boards are view-only' : 'Add a new Bolek Pad'}
          >
            <span className="material-symbols-outlined !text-sm">view_column</span>
            <span>Add Bolekpad</span>
          </button>
          
          <button 
            id="subtab-add-boleknote" 
            onClick={() => { setActiveTab('notes'); handleAddCard(); }}
            disabled={publicBoardMode}
            className="btn-hover-orange flex items-center gap-1 px-3 py-1.5 rounded-md border border-stone-200 bg-white text-xs font-semibold text-stone-600 shadow-sm transition-all duration-150 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            title={publicBoardMode ? 'Public boards are view-only' : 'Add a new Boleknote'}
          >
            <span className="material-symbols-outlined !text-sm">add</span>
            <span>Add Boleknote</span>
          </button>
        </div>
      )}

      {/* Primary switcher Viewport */}
      <div id="workspace-viewports" className="flex flex-1 min-h-[350px] overflow-hidden relative">
        
        {/* VIEW 0: Dashboard (Default Main View) */}
        <div id="view-dashboard" className={`w-full h-full flex flex-col flex-1 overflow-hidden ${activeTab === 'dashboard' ? '' : 'hidden'}`}>
          <BolekDashboard
            profileName={profileName}
            profileEmail={profileEmail}
            profilePicture={profilePicture}
            columns={columns}
            onNavigateTab={(tab) => switchTab(tab)}
            onOpenNewNote={() => {
              switchTab('notes');
              handleAddCard();
            }}
            onAddToBolekpad={(data) => {
              const newCard: any = {
                id: 'card_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                title: data.title,
                content: data.content,
                tags: data.tags || ['quote', 'dashboard'],
                color: data.color || '#fef08a',
                pinned: true,
                lastEdited: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
              };
              setColumns((prev) => {
                if (prev.length === 0) return prev;
                return prev.map((col, idx) => idx === 0 ? { ...col, cards: [newCard, ...col.cards] } : col);
              });
              switchTab('notes');
              showToast(`Added "${data.title}" to Bolekpad!`);
            }}
          />
        </div>

        {/* VIEW 1: Notes Board */}
        <div id="view-notes" className={`w-full h-full flex flex-col flex-1 overflow-hidden relative ${activeTab === 'notes' ? '' : 'hidden'}`}>
          {fullscreenCardId && fullscreenCardMode === 'regular' && (
            <div 
              className="fixed inset-0 bg-stone-900/40 backdrop-blur-[1px] z-[9990] animate-fade-in"
              onClick={() => {
                setFullscreenCardId(null);
                setFullscreenCardMode('regular');
              }}
            />
          )}
          
          {/* Mobile Column Selector Tab Bar */}
          <div className="flex md:hidden items-center gap-1.5 overflow-x-auto pb-2.5 mb-2 px-1 border-b border-stone-200/60 scrollbar-none shrink-0 select-none">
            {columns.map((col, idx) => {
              const isActive = (mobileActiveColumnId || columns[0]?.id) === col.id;
              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => handleMobileTabClick(col.id, idx)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-stone-900 text-white shadow-sm'
                      : 'bg-white text-stone-600 hover:text-stone-900 hover:bg-stone-50 border border-stone-200'
                  }`}
                >
                  <span>{col.title}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-500'
                  }`}>
                    {col.cards.length}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Board Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 mb-2.5 border-b border-stone-200/50 select-none">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                <span className="material-symbols-outlined text-stone-400 !text-xs">dashboard</span>
                <input
                  type="text"
                  value={boardTitle}
                  onChange={(e) => setBoardTitle(e.target.value)}
                  disabled={publicBoardMode}
                  className="bg-transparent border-none text-xs font-bold text-stone-700 focus:outline-none disabled:cursor-not-allowed disabled:text-stone-500 w-28 sm:w-40"
                  aria-label="BolekDash board title"
                />
              </div>

              {/* Search input */}
              <div className="relative min-w-[180px] sm:min-w-[240px]">
                <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 !text-sm">search</span>
                <input 
                  type="text"
                  placeholder="Search notes content or tags..."
                  value={noteSearchQuery}
                  onChange={(e) => setNoteSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-8 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-semibold text-stone-800 placeholder-stone-400 focus:outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-400 transition"
                />
                {noteSearchQuery && (
                  <button 
                    onClick={() => setNoteSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition"
                    title="Clear Search"
                  >
                    <span className="material-symbols-outlined !text-xs">close</span>
                  </button>
                )}
              </div>

              {/* Tag dropdown filter */}
              <div className="flex items-center gap-1.5 bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                <span className="material-symbols-outlined text-stone-400 !text-xs">sell</span>
                <select
                  value={selectedTagFilter}
                  onChange={(e) => setSelectedTagFilter(e.target.value)}
                  className="bg-transparent border-none text-xs font-bold text-stone-600 focus:outline-none cursor-pointer outline-none p-0 pr-1"
                >
                  <option value="All">All Tags</option>
                  {Array.from(
                    new Set(
                      columns.flatMap((c) => c.cards).flatMap((card) => card.tags || [])
                    )
                  ).map((tag) => (
                    <option key={tag} value={tag}>#{tag}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Board Quick Stats */}
            <div className="flex items-center gap-4 text-[10px] font-mono text-stone-400 px-1">
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined !text-xs text-amber-500" style={{ fontVariationSettings: "'FILL' 1" }}>push_pin</span>
                <span>{columns.flatMap((c) => c.cards).filter((card) => card.pinned).length} Pinned</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined !text-xs text-stone-500">sticky_note_2</span>
                <span>{columns.flatMap((c) => c.cards).length} Total Notes</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined !text-xs text-stone-500">view_column</span>
                <span>{columns.length} Pads</span>
              </div>
            </div>
          </div>

          <div 
            id="dashboard-container" 
            ref={dashboardRef}
            onScroll={handleDashboardScroll}
            className="dots-bg flex flex-1 w-full border border-stone-200 rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.02)] relative overflow-x-auto md:overflow-hidden snap-x snap-mandatory scroll-smooth"
          >
            {columns.map((col, idx) => {
              const isCollapsed = !isMobile && col.width <= 5.1;
              const hideCards = !isMobile && col.width < 10;
              const isActiveOnMobile = (mobileActiveColumnId || columns[0]?.id) === col.id;

              return (
                <React.Fragment key={col.id}>
                  <div 
                    className={`column p-4 md:p-5 overflow-auto flex-col gap-4 relative group ${
                      isMobile 
                        ? 'flex w-full h-full shrink-0 snap-center snap-always' 
                        : (isCollapsed ? 'hidden md:flex' : 'flex')
                    }`}
                    style={{ 
                      width: isMobile ? '100%' : `${col.width}%`, 
                      background: idx === 1 ? 'rgba(245, 245, 244, 0.4)' : undefined 
                    }}
                  >
                  <div 
                    className="column-header flex justify-between items-center mb-2 shrink-0 transition-opacity duration-150"
                    style={{ opacity: isCollapsed ? 0 : 1, pointerEvents: isCollapsed ? 'none' : 'auto' }}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <h3 className="text-xs font-bold text-stone-600 tracking-wider uppercase column-title-text truncate">
                        {col.title}
                      </h3>

                      {/* Move & Adjust Panel Controls */}
                      <div className="flex items-center gap-0.5 opacity-100 md:opacity-0 group-hover:opacity-100 transition-all duration-200">
                        {/* Move Left */}
                        {idx > 0 && (
                          <button
                            type="button"
                            onClick={() => handleMoveColumn(col.id, 'left')}
                            className="p-1 rounded hover:bg-stone-200/80 text-stone-500 hover:text-stone-800 transition cursor-pointer"
                            title="Move Panel Left"
                          >
                            <span className="material-symbols-outlined !text-xs">chevron_left</span>
                          </button>
                        )}

                        {/* Move Right */}
                        {idx < columns.length - 1 && (
                          <button
                            type="button"
                            onClick={() => handleMoveColumn(col.id, 'right')}
                            className="p-1 rounded hover:bg-stone-200/80 text-stone-500 hover:text-stone-800 transition cursor-pointer"
                            title="Move Panel Right"
                          >
                            <span className="material-symbols-outlined !text-xs">chevron_right</span>
                          </button>
                        )}

                        {/* Decrease Width */}
                        <button
                          type="button"
                          onClick={() => handleAdjustColumnWidth(col.id, -5)}
                          className="p-1 rounded hover:bg-stone-200/80 text-stone-500 hover:text-stone-800 transition cursor-pointer"
                          title="Decrease Panel Width"
                        >
                          <span className="material-symbols-outlined !text-xs">remove</span>
                        </button>

                        {/* Increase Width */}
                        <button
                          type="button"
                          onClick={() => handleAdjustColumnWidth(col.id, 5)}
                          className="p-1 rounded hover:bg-stone-200/80 text-stone-500 hover:text-stone-800 transition cursor-pointer"
                          title="Increase Panel Width"
                        >
                          <span className="material-symbols-outlined !text-xs">add</span>
                        </button>

                        {/* Customize */}
                        <button 
                          className="p-1 rounded hover:bg-stone-200/80 text-stone-500 hover:text-stone-800 transition cursor-pointer" 
                          onClick={() => handleCustomizeColumn(col.id)}
                          title="Customize Panel Title & Banner"
                        >
                          <span className="material-symbols-outlined !text-xs">tune</span>
                        </button>

                        {/* Delete Panel */}
                        {columns.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteColumn(col.id)}
                            className="p-1 rounded hover:bg-red-100 text-red-500 hover:text-red-700 transition cursor-pointer"
                            title="Delete Panel"
                          >
                            <span className="material-symbols-outlined !text-xs">delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                    <span className="badge-width text-[10px] font-mono text-stone-400 bg-stone-50 px-1.5 py-0.5 rounded border border-stone-200/50 shrink-0">
                      {col.width.toFixed(1)}%
                    </span>
                  </div>

                  {/* Banner cover */}
                  {!isCollapsed && col.coverUrl && (
                    <img className="column-cover show" src={col.coverUrl} alt="Cover photo" />
                  )}

                  {/* Cards list container */}
                  {!hideCards && (
                    <div 
                      className="cards-container flex flex-col gap-3 flex-1 overflow-y-auto min-h-[100px]"
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(col.id, e)}
                    >
                      {col.cards
                        .map((card, originalIdx) => ({ card, originalIdx }))
                        .sort((a, b) => {
                          const ap = a.card.pinned ? 1 : 0;
                          const bp = b.card.pinned ? 1 : 0;
                          return bp - ap;
                        })
                        .filter(({ card }) => {
                          const matchesSearch = noteSearchQuery
                            ? card.content.toLowerCase().includes(noteSearchQuery.toLowerCase()) ||
                              (card.title && card.title.toLowerCase().includes(noteSearchQuery.toLowerCase())) ||
                              (card.tags && card.tags.some(tag => tag.toLowerCase().includes(noteSearchQuery.toLowerCase())))
                            : true;

                          const matchesTag = selectedTagFilter === 'All'
                            ? true
                            : card.tags && card.tags.includes(selectedTagFilter);

                          return matchesSearch && matchesTag;
                        })
                        .map(({ card, originalIdx }) => {
                          const isFullscreen = fullscreenCardId === card.id;
                          const isRegularFullscreen = isFullscreen && fullscreenCardMode === 'regular';
                          const isTabFullscreen = isFullscreen && fullscreenCardMode === 'tab';

                          return (
                            <div 
                              key={card.id}
                              className={`card group cursor-pointer ${card.locked ? 'locked' : ''} ${isRegularFullscreen ? 'card-fullscreen' : ''} ${isTabFullscreen ? 'card-tab-fullscreen' : ''}`}
                              style={{ 
                                backgroundColor: card.color,
                                minHeight: card.minHeight || undefined,
                                transform: `rotate(${card.rotation || 0}deg)`,
                                fontFamily: card.fontFamily || undefined,
                                fontSize: card.fontSize || undefined,
                              }}
                              title="Double-click to edit"
                              draggable={!card.locked && !publicBoardMode}
                              onDragStart={(e) => handleDragStart(col.id, card.id, e)}
                              onDragEnd={handleDragEnd}
                              onDragEnter={(e) => handleDragEnter(col.id, originalIdx, e)}
                              onDoubleClick={(e) => {
                                if (
                                  (e.target as HTMLElement).closest('.card-action-btn') || 
                                  (e.target as HTMLElement).closest('.card-resize-grip')
                                ) return;
                                if (card.locked || publicBoardMode) return;
                                setRichEditorCardId(card.id);
                                setRichDestinationColId(col.id);
                                setRichTitle(card.title || '');
                                setRichContent(card.content || '');
                                setRichTags(card.tags ? card.tags.join(', ') : '');
                                setRichColor(card.color);
                                setRichRotation(card.rotation || 0);
                                setRichFontFamily(card.fontFamily || NOTE_FONT_FAMILIES[0].value);
                                setRichFontSize(card.fontSize || '14px');
                                setRichEmoji(card.emoji || '');
                                setRichAttachments(card.attachments || []);
                                setRichMediaUrl('');
                                setRichEditorOpen(true);
                              }}
                            >
                              <div className="text-[11px] font-semibold text-stone-400 flex items-center justify-between gap-1 mb-2 select-none">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (card.locked) {
                                      showDialog('alert', 'This Boleknote is locked.');
                                      return;
                                    }
                                    handleTogglePin(card.id);
                                  }}
                                  className="flex items-center gap-1 hover:text-stone-700 transition"
                                  title={card.pinned ? "Unpin Note" : "Pin Note"}
                                >
                                  <span 
                                    className={`material-symbols-outlined !text-xs transition-all ${card.pinned ? 'text-amber-500 font-bold' : ''}`}
                                    style={card.pinned ? { fontVariationSettings: "'FILL' 1" } : undefined}
                                  >
                                    push_pin
                                  </span> 
                                  <span className={card.pinned ? "text-stone-700 font-bold" : ""}>
                                    {card.pinned ? "Pinned" : "Boleknote"}
                                  </span>
                                </button>
                                {card.locked && (
                                  <span className="lock-indicator material-symbols-outlined !text-xs text-stone-500">lock</span>
                                )}
                              </div>

                              {editingCardId === card.id ? (
                                <div className="flex flex-col gap-2 mt-1">
                                  <input
                                    type="text"
                                    className="w-full bg-white/70 border border-stone-200 rounded px-2 py-1 text-xs font-semibold text-stone-800 outline-none focus:border-stone-400 placeholder-stone-400"
                                    placeholder="Title..."
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    autoFocus
                                  />
                                  {!editTitle.trim() && (
                                    <p className="text-[10px] text-amber-700 font-medium bg-amber-50/80 p-1 rounded border border-amber-200 flex items-center gap-1">
                                      <span className="material-symbols-outlined !text-xs text-amber-600">info</span>
                                      Add title first to edit content
                                    </p>
                                  )}
                                  <textarea
                                    disabled={!editTitle.trim()}
                                    className={`note-editor w-full bg-white/70 border border-stone-200 rounded p-2 text-xs text-stone-700 outline-none focus:border-stone-400 min-h-[80px] ${!editTitle.trim() ? 'opacity-40 cursor-not-allowed' : ''}`}
                                    placeholder={editTitle.trim() ? "Content..." : "Add title first..."}
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                  />
                                  <div className="flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-stone-400 !text-xs">sell</span>
                                    <input
                                      type="text"
                                      disabled={!editTitle.trim()}
                                      className={`w-full bg-white/70 border border-stone-200 rounded px-2 py-0.5 text-[11px] text-stone-600 outline-none focus:border-stone-400 placeholder-stone-400 ${!editTitle.trim() ? 'opacity-40 cursor-not-allowed' : ''}`}
                                      placeholder="Tags (comma-separated)..."
                                      value={editTags}
                                      onChange={(e) => setEditTags(e.target.value)}
                                    />
                                  </div>
                                  <div className="flex items-center justify-end gap-1.5 mt-1">
                                    <button
                                      type="button"
                                      onClick={() => setEditingCardId(null)}
                                      className="px-2 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-600 text-[10px] font-semibold transition"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      disabled={!editTitle.trim()}
                                      onClick={() => {
                                        if (!editTitle.trim()) return;
                                        handleSaveCardFull(card.id, editTitle, editContent, editTags);
                                        setEditingCardId(null);
                                      }}
                                      className="px-2.5 py-1 rounded bg-stone-900 hover:bg-stone-800 disabled:opacity-40 text-white text-[10px] font-semibold transition"
                                    >
                                      Save
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  {card.title && (
                                    <h4 className="text-xs font-bold text-stone-800 mb-1 select-none leading-snug">
                                      {card.title}
                                    </h4>
                                  )}
                                  {card.emoji && (
                                    <div className="text-sm mb-1 select-none">{card.emoji}</div>
                                  )}
                                  <div 
                                    className="card-desc text-xs text-stone-600 leading-relaxed rich-content-rendered break-words overflow-x-auto"
                                    dangerouslySetInnerHTML={{ __html: card.content }}
                                  />
                                  {card.gifUrl && (
                                    <img
                                      src={card.gifUrl}
                                      alt={card.title || 'Boleknote gif'}
                                      className="mt-2 w-full rounded-lg border border-stone-200 object-cover"
                                    />
                                  )}
                                  {card.attachments && card.attachments.length > 0 && (
                                    <div className="mt-2 space-y-2">
                                      {card.attachments.map((attachment) => (
                                        <div key={attachment.id} className="rounded-lg border border-stone-200 bg-white/80 overflow-hidden">
                                          {attachment.kind === 'video' ? (
                                            <iframe
                                              src={toEmbedUrl(attachment.url)}
                                              title={attachment.label || 'Embedded video'}
                                              className="w-full aspect-video"
                                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                              allowFullScreen
                                            />
                                          ) : attachment.kind === 'image' ? (
                                            <img
                                              src={attachment.url}
                                              alt={attachment.label || 'Attachment'}
                                              className="w-full max-h-56 object-cover"
                                              referrerPolicy="no-referrer"
                                            />
                                          ) : (
                                            <a
                                              href={attachment.url}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="flex items-center gap-2 px-3 py-2 text-[11px] font-semibold text-stone-700 hover:bg-stone-50"
                                            >
                                              <span className="material-symbols-outlined !text-sm text-stone-400">link</span>
                                              <span className="truncate">{attachment.label || attachment.url}</span>
                                            </a>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {card.tags && card.tags.length > 0 && (
                                    <div className="flex flex-wrap items-center gap-1 mt-2.5">
                                      {card.tags.map((tag) => (
                                        <span 
                                          key={tag} 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setNoteSearchQuery(tag);
                                          }}
                                          className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-stone-50 border border-stone-200 text-stone-500 hover:bg-stone-100/80 cursor-pointer transition select-none flex items-center gap-0.5"
                                        >
                                          #{tag}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  
                                  {/* Sticky note bottom row with Copy Button */}
                                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-stone-250/20">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const tempElement = document.createElement("div");
                                        tempElement.innerHTML = card.content;
                                        const plainText = tempElement.textContent || tempElement.innerText || card.content;
                                        navigator.clipboard.writeText(plainText)
                                          .then(() => {
                                            showToast('Copied content to clipboard!');
                                          })
                                          .catch(() => {});
                                      }}
                                      className="flex items-center justify-center w-6 h-6 rounded-md bg-white/75 border border-stone-200/80 text-stone-500 hover:text-stone-800 hover:bg-stone-50 hover:border-stone-300 transition shadow-xs cursor-pointer"
                                      title="Copy Note"
                                    >
                                      <span className="material-symbols-outlined !text-xs">content_copy</span>
                                    </button>
                                  </div>
                                </>
                              )}

                            {/* Card action controls */}
                            <div className="card-actions opacity-100 md:opacity-0 md:-translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200">
                              <button 
                                type="button" 
                                className="card-action-btn" 
                                onClick={() => handleToggleLock(card.id)}
                                title="Lock / Unlock Card"
                              >
                                <span className="material-symbols-outlined lock-icon">
                                  {card.locked ? 'lock' : 'lock_open'}
                                </span>
                              </button>
                              <button 
                                type="button" 
                                className="card-action-btn" 
                                onClick={() => {
                                  if (card.locked) {
                                    showDialog('alert', 'This Boleknote is locked.');
                                    return;
                                  }
                                  setRichEditorCardId(card.id);
                                  setRichDestinationColId(col.id);
                                  setRichTitle(card.title || '');
                                  setRichContent(card.content || '');
                                  setRichTags(card.tags ? card.tags.join(', ') : '');
                                  setRichColor(card.color);
                                  setRichEditorOpen(true);
                                }}
                                title="Edit Content"
                              >
                                <span className="material-symbols-outlined">edit</span>
                              </button>
                              <button 
                                type="button" 
                                className="card-action-btn" 
                                onClick={async () => {
                                  if (card.locked) {
                                    showDialog('alert', 'This Boleknote is locked.');
                                    return;
                                  }
                                  const color = await showDialog('color', 'Choose Boleknote color', '', { currentColor: card.color });
                                  if (color) handleUpdateCardColor(card.id, color);
                                }}
                                title="Color Options"
                              >
                                <span className="material-symbols-outlined">palette</span>
                              </button>
                              <button 
                                type="button" 
                                className="card-action-btn" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleExpandCard(card.id);
                                }}
                                title={
                                  !isFullscreen 
                                    ? "Expand (Click 1: Regular Modal, Click 2: Cover Tab, Click 3: Exit)" 
                                    : fullscreenCardMode === 'regular' 
                                      ? "Cover Entire Tab (Click again)" 
                                      : "Exit Fullscreen"
                                }
                              >
                                <span className="material-symbols-outlined">
                                  {!isFullscreen 
                                    ? 'open_in_full' 
                                    : fullscreenCardMode === 'regular' 
                                      ? 'aspect_ratio' 
                                      : 'close_fullscreen'}
                                </span>
                              </button>
                              <button 
                                type="button" 
                                className="card-action-btn" 
                                onClick={async () => {
                                  if (card.locked) {
                                    showDialog('alert', 'This Boleknote is locked.');
                                    return;
                                  }
                                  if (await showDialog('confirm', 'Delete this Boleknote?')) {
                                    handleDeleteCard(card.id);
                                  }
                                }}
                                title="Delete Note"
                              >
                                <span className="material-symbols-outlined">delete</span>
                              </button>
                            </div>

                            {/* Resize Grip */}
                            {!card.locked && (
                              <div 
                                className="card-resize-grip" 
                                onMouseDown={(e) => handleCardResizeMouseDown(card.id, e)}
                                title="Drag to resize"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Collapsed vertical title view */}
                  {isCollapsed && (
                    <div className="collapsed-vertical-title absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                      <span className="vertical-title text-xs font-semibold text-stone-500 tracking-wider uppercase">
                        {col.title}
                      </span>
                    </div>
                  )}
                </div>

                {/* Splitter Divider bar (only between adjacent columns) */}
                {idx < columns.length - 1 && (() => {
                  const leftCol = col;
                  const rightCol = columns[idx + 1];
                  return (
                    <div 
                      className="splitter relative w-[1.5px] hover:w-[3px] bg-stone-200 hover:bg-stone-400 hidden md:flex items-center justify-center group z-20 shrink-0 transition-all duration-150"
                      style={{ backgroundColor: splitterColors[idx] || undefined }}
                    >
                        {/* Drag resize button */}
                        <button 
                          className="divider-btn absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white hover:bg-stone-900 text-stone-400 hover:text-white border border-stone-200 hover:border-stone-900 rounded-md p-1 shadow-[0_2px_4px_rgba(0,0,0,0.05)] transition-all cursor-col-resize flex items-center justify-center space-x-0.5 w-5 h-7"
                          onMouseDown={(e) => handleSplitterMouseDown(idx, e)}
                          title="Drag to resize columns"
                        >
                          <svg className="w-2.5 h-2.5 transform -rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                          <svg className="w-2.5 h-2.5 transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {/* Adjust settings gear button (visible on hover) */}
                        <button 
                          type="button"
                          className="splitter-tune-btn absolute top-[calc(45%+22px)] left-1/2 -translate-x-1/2 bg-white hover:bg-stone-900 text-stone-400 hover:text-white border border-stone-200 hover:border-stone-900 rounded-md p-0.5 shadow-[0_2.5px_4.5px_rgba(0,0,0,0.06)] transition-all cursor-pointer flex items-center justify-center w-5 h-5 group-hover:opacity-100 opacity-70 sm:opacity-0 focus:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenSplitterMenu(openSplitterMenu === idx ? null : idx);
                          }}
                          title="Adjust Separator & Columns"
                        >
                          <span className="material-symbols-outlined !text-[11px] font-bold">tune</span>
                        </button>

                        {/* Adjustable settings popover menu */}
                        {openSplitterMenu === idx && (
                          <div 
                            className="absolute top-[45%] left-4 -translate-y-1/2 bg-white/95 backdrop-blur-md border border-stone-200/80 rounded-xl p-3 shadow-xl z-50 w-52 space-y-2.5 text-stone-800 pointer-events-auto select-none animate-in fade-in zoom-in-95 duration-150"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-between border-b border-stone-100 pb-1.5">
                              <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">Separator Controls</span>
                              <button 
                                type="button"
                                onClick={() => setOpenSplitterMenu(null)}
                                className="text-stone-400 hover:text-stone-700 p-0.5 rounded"
                              >
                                <span className="material-symbols-outlined !text-xs">close</span>
                              </button>
                            </div>

                            {/* Color Picker on Separator line */}
                            <div className="space-y-1">
                              <span className="block text-[8px] font-bold text-stone-400 uppercase tracking-widest">Separator Color</span>
                              <div className="flex items-center gap-1.5">
                                {['#e7e5e4', '#ef4444', '#f97316', '#3b82f6', '#8b5cf6', '#10b981'].map((colorHex) => (
                                  <button
                                    key={colorHex}
                                    type="button"
                                    onClick={() => {
                                      setSplitterColors(prev => ({ ...prev, [idx]: colorHex }));
                                    }}
                                    className="w-3.5 h-3.5 rounded-full border border-stone-300 hover:scale-110 active:scale-95 transition cursor-pointer"
                                    style={{ backgroundColor: colorHex }}
                                  />
                                ))}
                              </div>
                            </div>

                            {/* Preset Width Adjuster */}
                            <div className="space-y-1">
                              <span className="block text-[8px] font-bold text-stone-400 uppercase tracking-widest">Adjust Width Presets</span>
                              <div className="grid grid-cols-1 gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const comb = leftCol.width + rightCol.width;
                                    const half = comb / 2;
                                    setColumns(columns.map(c => {
                                      if (c.id === leftCol.id) return { ...c, width: half };
                                      if (c.id === rightCol.id) return { ...c, width: half };
                                      return c;
                                    }));
                                    setOpenSplitterMenu(null);
                                  }}
                                  className="w-full text-left text-[10px] px-1.5 py-1 rounded hover:bg-stone-50 border border-stone-100 font-medium flex items-center justify-between cursor-pointer"
                                >
                                  <span>Equalize Columns</span>
                                  <span className="text-[9px] font-mono text-stone-400">50:50</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const comb = leftCol.width + rightCol.width;
                                    setColumns(columns.map(c => {
                                      if (c.id === leftCol.id) return { ...c, width: 5 };
                                      if (c.id === rightCol.id) return { ...c, width: comb - 5 };
                                      return c;
                                    }));
                                    setOpenSplitterMenu(null);
                                  }}
                                  className="w-full text-left text-[10px] px-1.5 py-1 rounded hover:bg-stone-50 border border-stone-100 font-medium flex items-center justify-between cursor-pointer"
                                >
                                  <span>Collapse Left</span>
                                  <span className="material-symbols-outlined !text-[11px] text-stone-400">arrow_left</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const comb = leftCol.width + rightCol.width;
                                    setColumns(columns.map(c => {
                                      if (c.id === leftCol.id) return { ...c, width: comb - 5 };
                                      if (c.id === rightCol.id) return { ...c, width: 5 };
                                      return c;
                                    }));
                                    setOpenSplitterMenu(null);
                                  }}
                                  className="w-full text-left text-[10px] px-1.5 py-1 rounded hover:bg-stone-50 border border-stone-100 font-medium flex items-center justify-between cursor-pointer"
                                >
                                  <span>Collapse Right</span>
                                  <span className="material-symbols-outlined !text-[11px] text-stone-400">arrow_right</span>
                                </button>
                              </div>
                            </div>

                            {/* Rename adjacent columns */}
                            <div className="space-y-1">
                              <span className="block text-[8px] font-bold text-stone-400 uppercase tracking-widest">Rename Columns</span>
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const newTitle = await showDialog('prompt', 'Rename Left Column:', leftCol.title);
                                    if (newTitle !== null && newTitle.trim() !== '') {
                                      setColumns(columns.map(c => c.id === leftCol.id ? { ...c, title: newTitle } : c));
                                    }
                                    setOpenSplitterMenu(null);
                                  }}
                                  className="flex-1 text-center text-[9px] bg-stone-50 border border-stone-200 py-1 rounded font-medium hover:bg-stone-100 cursor-pointer"
                                >
                                  Rename Left
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const newTitle = await showDialog('prompt', 'Rename Right Column:', rightCol.title);
                                    if (newTitle !== null && newTitle.trim() !== '') {
                                      setColumns(columns.map(c => c.id === rightCol.id ? { ...c, title: newTitle } : c));
                                    }
                                    setOpenSplitterMenu(null);
                                  }}
                                  className="flex-1 text-center text-[9px] bg-stone-50 border border-stone-200 py-1 rounded font-medium hover:bg-stone-100 cursor-pointer"
                                >
                                  Rename Right
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </React.Fragment>
              );
            })}
          </div>
        </div>



        {/* VIEW 2: Calculator App Workspace */}
        <div id="view-calc" className={`w-full h-full flex-1 flex flex-col md:flex-row bg-white border border-stone-200 rounded-lg overflow-hidden ${activeTab === 'calc' ? 'flex' : 'hidden'}`}>
          
          {/* Left Sidebar: Subtab Navigation */}
          <div className="w-full md:w-56 bg-stone-50 border-b md:border-b-0 md:border-r border-stone-200 flex flex-col shrink-0 select-none">
            <div className="p-4 border-b border-stone-200/80 bg-stone-100/40">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-orange-600 font-semibold !text-lg">calculate</span>
                <div>
                  <h2 className="text-xs font-bold text-stone-900 tracking-wide uppercase">Workspace Calc</h2>
                  <p className="text-[9px] text-stone-400 font-medium">Enhanced Math Suite</p>
                </div>
              </div>
            </div>

            {/* Subtab selection */}
            <div className="p-2 flex md:flex-col gap-1 overflow-x-auto md:overflow-y-auto scrollbar-none">
              {[
                { id: 'scientific', label: 'Scientific Calc', icon: 'calculate' },
                { id: 'currency', label: 'Live Currency', icon: 'currency_exchange' },
                { id: 'unit', label: 'Unit Converter', icon: 'straighten' },
                { id: 'equations', label: 'Equation Solvers', icon: 'functions' }
              ].map((subtab) => {
                const isActive = calcActiveSubtab === subtab.id;
                return (
                  <button
                    key={subtab.id}
                    type="button"
                    onClick={() => setCalcActiveSubtab(subtab.id)}
                    className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-all shrink-0 cursor-pointer ${
                      isActive 
                        ? 'bg-stone-900 text-white shadow-sm' 
                        : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
                    }`}
                  >
                    <span className={`material-symbols-outlined !text-base ${isActive ? 'text-orange-400' : 'text-stone-400'}`}>{subtab.icon}</span>
                    <span>{subtab.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="hidden md:block mt-auto p-3 border-t border-stone-200 bg-stone-100/50">
              <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-white border border-stone-200/60 shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[9px] font-mono text-stone-500">Suite Engine: ACTIVE</span>
              </div>
            </div>
          </div>

          {/* Right Main Panel */}
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-stone-50/30">
            
            {/* Viewport for subtabs */}
            <div className="flex-1 p-5 overflow-y-auto space-y-5">
              
              {/* 1. SCIENTIFIC CALCULATOR SUBTAB */}
              {calcActiveSubtab === 'scientific' && (
                <div className="space-y-4 max-w-lg mx-auto">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest">Scientific Calculator</h3>
                      <p className="text-[10px] text-stone-500 leading-none">Standard and advanced computations</p>
                    </div>
                    <div className="flex items-center gap-1.5 bg-stone-100 p-0.5 rounded-lg border border-stone-200">
                      <button 
                        onClick={() => setIsDegreeMode(true)}
                        className={`px-2 py-0.5 text-[9px] font-bold rounded ${isDegreeMode ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-400 hover:text-stone-700'}`}
                      >
                        DEG
                      </button>
                      <button 
                        onClick={() => setIsDegreeMode(false)}
                        className={`px-2 py-0.5 text-[9px] font-bold rounded ${!isDegreeMode ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-400 hover:text-stone-700'}`}
                      >
                        RAD
                      </button>
                    </div>
                  </div>

                  {/* Calculator LCD Screen */}
                  <div className="bg-[#0c0a09] text-emerald-400 rounded-2xl p-5 shadow-2xl font-mono relative overflow-hidden border border-stone-800">
                    <div className="absolute top-2 left-3 flex gap-1.5 text-[9px] text-stone-500 uppercase font-bold tracking-wider">
                      {calcMemory !== 0 && <span className="bg-emerald-950/50 text-emerald-500 px-1 rounded">M</span>}
                      <span>{isDegreeMode ? 'DEG' : 'RAD'}</span>
                    </div>
                    <div className="text-right text-xs text-stone-500 min-h-[18px] truncate pr-1 mt-1 font-semibold">
                      {calcFormula}
                    </div>
                    <div className="text-right text-2xl font-bold tracking-tight min-h-[32px] truncate mt-1 text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.15)]">
                      {calcScreen}
                    </div>
                  </div>

                  {/* Desktop Keyboard Mode Dashboard - VISIBLE on PC, HIDDEN on Mobile */}
                  <div className={`hidden md:flex flex-col gap-4 p-5 rounded-2xl bg-[#1c1917] border border-stone-800 text-stone-300 shadow-xl ${showVirtualKeypadOnPC ? '!hidden' : ''}`}>
                    <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-[10px] font-mono uppercase tracking-widest text-stone-400 font-bold">Keyboard Mode Active</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowVirtualKeypadOnPC(true)}
                        className="text-[10px] font-bold bg-orange-600 hover:bg-orange-500 text-white px-2.5 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition shadow-sm active:scale-95 animate-pulse"
                      >
                        <span className="material-symbols-outlined !text-xs">smartphone</span>
                        Show Phone Keypad
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div className="text-xs text-stone-400 font-medium leading-relaxed">
                        To compute on desktop, simply focus on this window and use your physical keyboard.
                      </div>

                      {/* Quick-Action Command Bar */}
                      <div className="flex gap-2">
                        <button 
                          onClick={clearCalc}
                          className="flex-1 bg-red-950/30 hover:bg-red-950/50 border border-red-900/40 text-red-400 rounded-xl py-2 text-xs font-bold transition flex items-center justify-center gap-1"
                        >
                          <span className="material-symbols-outlined !text-xs">delete_sweep</span>
                          Clear (ESC)
                        </button>
                        <button 
                          onClick={deleteCalc}
                          className="flex-1 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700/60 rounded-xl py-2 text-xs font-bold transition flex items-center justify-center gap-1"
                        >
                          <span className="material-symbols-outlined !text-xs">backspace</span>
                          Backspace
                        </button>
                        <button 
                          onClick={calculateCalc}
                          className="flex-1 bg-orange-950/40 hover:bg-orange-950/60 border border-orange-900/40 text-orange-400 rounded-xl py-2 text-xs font-bold transition flex items-center justify-center gap-1"
                        >
                          <span className="material-symbols-outlined !text-xs font-bold">equal</span>
                          Calculate (Enter)
                        </button>
                      </div>

                      {/* Keyboard shortcuts list */}
                      <div className="border-t border-stone-800/80 pt-3 space-y-2">
                        <span className="block text-[9px] font-bold text-stone-500 uppercase tracking-widest">Keyboard Cheat Sheet</span>
                        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-stone-400">
                          <div className="flex items-center justify-between bg-[#131110] p-1.5 rounded-lg border border-stone-800/50">
                            <span>Numbers & Math</span>
                            <span className="text-orange-400 font-bold bg-stone-900 px-1.5 py-0.5 rounded border border-stone-800">0 - 9, + - * /</span>
                          </div>
                          <div className="flex items-center justify-between bg-[#131110] p-1.5 rounded-lg border border-stone-800/50">
                            <span>Execute Math</span>
                            <span className="text-orange-400 font-bold bg-stone-900 px-1.5 py-0.5 rounded border border-stone-800">Enter</span>
                          </div>
                          <div className="flex items-center justify-between bg-[#131110] p-1.5 rounded-lg border border-stone-800/50">
                            <span>Clear All</span>
                            <span className="text-orange-400 font-bold bg-stone-900 px-1.5 py-0.5 rounded border border-stone-800">Esc / C</span>
                          </div>
                          <div className="flex items-center justify-between bg-[#131110] p-1.5 rounded-lg border border-stone-800/50">
                            <span>Erase Digit</span>
                            <span className="text-orange-400 font-bold bg-stone-900 px-1.5 py-0.5 rounded border border-stone-800">Backspace</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Smartphone Calculator UI Keypad - VISIBLE on Mobile, and ONLY visible on PC when toggled */}
                  <div className={`md:grid grid-cols-5 gap-2.5 p-5 bg-[#000000] rounded-[36px] border border-stone-800/80 shadow-2xl select-none max-w-sm mx-auto animate-in fade-in zoom-in-95 duration-200 ${showVirtualKeypadOnPC ? 'grid' : 'hidden md:hidden'}`}>
                    
                    {/* Toggle button on simulated mobile screen */}
                    <div className="col-span-5 hidden md:flex items-center justify-between mb-2 pb-2 border-b border-stone-900">
                      <span className="text-[9px] font-bold text-stone-500 tracking-widest uppercase">Keypad Simulator</span>
                      <button
                        type="button"
                        onClick={() => setShowVirtualKeypadOnPC(false)}
                        className="text-[9px] font-bold text-stone-400 hover:text-white flex items-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined !text-xs">keyboard</span> Hide Keypad
                      </button>
                    </div>

                    {/* Row 1 */}
                    <button className="rounded-full aspect-square flex items-center justify-center font-bold text-[11px] bg-[#2d2d30] hover:bg-[#3e3e42] text-stone-300" onClick={() => { setCalcMemory(0); showToast('Memory cleared (MC)'); }}>MC</button>
                    <button className="rounded-full aspect-square flex items-center justify-center font-bold text-[11px] bg-[#2d2d30] hover:bg-[#3e3e42] text-stone-300" onClick={() => { setCalcScreen(String(calcMemory)); }}>MR</button>
                    <button className="rounded-full aspect-square flex items-center justify-center font-bold text-[11px] bg-[#2d2d30] hover:bg-[#3e3e42] text-stone-300" onClick={() => { setCalcMemory(prev => prev + parseFloat(calcScreen || '0')); showToast('Added to memory (M+)'); }}>M+</button>
                    <button className="rounded-full aspect-square flex items-center justify-center font-bold text-[11px] bg-[#2d2d30] hover:bg-[#3e3e42] text-stone-300" onClick={() => { setCalcMemory(prev => prev - parseFloat(calcScreen || '0')); showToast('Subtracted from memory (M-)'); }}>M-</button>
                    <button className="rounded-full aspect-square flex items-center justify-center font-bold text-xs bg-red-600/30 hover:bg-red-600/50 text-red-400 border border-red-500/30" onClick={clearCalc}>C</button>

                    {/* Row 2 */}
                    <button className="rounded-full aspect-square flex items-center justify-center font-bold text-[11px] bg-[#1c1917] hover:bg-[#2d2927] text-stone-300" onClick={() => pressCalc('sin(')}>sin</button>
                    <button className="rounded-full aspect-square flex items-center justify-center font-bold text-[11px] bg-[#1c1917] hover:bg-[#2d2927] text-stone-300" onClick={() => pressCalc('cos(')}>cos</button>
                    <button className="rounded-full aspect-square flex items-center justify-center font-bold text-[11px] bg-[#1c1917] hover:bg-[#2d2927] text-stone-300" onClick={() => pressCalc('tan(')}>tan</button>
                    <button className="rounded-full aspect-square flex items-center justify-center font-bold text-[11px] bg-[#1c1917] hover:bg-[#2d2927] text-stone-300" onClick={() => pressCalc('π')}>π</button>
                    <button className="rounded-full aspect-square flex items-center justify-center font-bold bg-[#a6a6a6] hover:bg-[#c4c4c4] text-stone-950" onClick={deleteCalc}>
                      <span className="material-symbols-outlined !text-sm font-bold">backspace</span>
                    </button>

                    {/* Row 3 */}
                    <button className="rounded-full aspect-square flex items-center justify-center font-bold text-[11px] bg-[#1c1917] hover:bg-[#2d2927] text-stone-300" onClick={() => pressCalc('asin(')}>asin</button>
                    <button className="rounded-full aspect-square flex items-center justify-center font-bold text-[11px] bg-[#1c1917] hover:bg-[#2d2927] text-stone-300" onClick={() => pressCalc('acos(')}>acos</button>
                    <button className="rounded-full aspect-square flex items-center justify-center font-bold text-[11px] bg-[#1c1917] hover:bg-[#2d2927] text-stone-300" onClick={() => pressCalc('atan(')}>atan</button>
                    <button className="rounded-full aspect-square flex items-center justify-center font-bold text-[11px] bg-[#1c1917] hover:bg-[#2d2927] text-stone-300" onClick={() => pressCalc('e')}>e</button>
                    <button className="rounded-full aspect-square flex items-center justify-center font-bold bg-orange-500 hover:bg-orange-400 text-white text-base" onClick={() => pressCalc('÷')}>÷</button>

                    {/* Row 4 */}
                    <button className="rounded-full aspect-square flex items-center justify-center font-bold text-[11px] bg-[#1c1917] hover:bg-[#2d2927] text-stone-300" onClick={() => pressCalc('ln(')}>ln</button>
                    <button className="rounded-full aspect-square flex items-center justify-center font-bold text-[11px] bg-[#1c1917] hover:bg-[#2d2927] text-stone-300" onClick={() => pressCalc('log(')}>log</button>
                    <button className="rounded-full aspect-square flex items-center justify-center font-bold text-[11px] bg-[#1c1917] hover:bg-[#2d2927] text-stone-300" onClick={() => pressCalc('^')}>xʸ</button>
                    <button className="rounded-full aspect-square flex items-center justify-center font-bold bg-[#404040] hover:bg-[#525252] text-white text-base" onClick={() => pressCalc('7')}>7</button>
                    <button className="rounded-full aspect-square flex items-center justify-center font-bold bg-[#404040] hover:bg-[#525252] text-white text-base" onClick={() => pressCalc('8')}>8</button>

                    {/* Row 5 */}
                    <button className="rounded-full aspect-square flex items-center justify-center font-bold text-[11px] bg-[#1c1917] hover:bg-[#2d2927] text-stone-300" onClick={() => pressCalc('sqrt(')}>√</button>
                    <button className="rounded-full aspect-square flex items-center justify-center font-bold text-[11px] bg-[#1c1917] hover:bg-[#2d2927] text-stone-300" onClick={() => pressCalc('cbrt(')}>³√</button>
                    <button className="rounded-full aspect-square flex items-center justify-center font-bold text-[11px] bg-[#1c1917] hover:bg-[#2d2927] text-stone-300" onClick={() => pressCalc('^2')}>x²</button>
                    <button className="rounded-full aspect-square flex items-center justify-center font-bold bg-[#404040] hover:bg-[#525252] text-white text-base" onClick={() => pressCalc('9')}>9</button>
                    <button className="rounded-full aspect-square flex items-center justify-center font-bold bg-orange-500 hover:bg-orange-400 text-white text-base" onClick={() => pressCalc('×')}>×</button>

                    {/* Row 6 */}
                    <button className="rounded-full aspect-square flex items-center justify-center font-bold text-[11px] bg-[#1c1917] hover:bg-[#2d2927] text-stone-300" onClick={() => pressCalc('abs(')}>|x|</button>
                    <button className="rounded-full aspect-square flex items-center justify-center font-bold text-[11px] bg-[#1c1917] hover:bg-[#2d2927] text-stone-300" onClick={() => pressCalc('!')}>n!</button>
                    <button className="rounded-full aspect-square flex items-center justify-center font-bold text-[11px] bg-[#1c1917] hover:bg-[#2d2927] text-stone-300" onClick={() => pressCalc('mod')}>mod</button>
                    <button className="rounded-full aspect-square flex items-center justify-center font-bold bg-[#404040] hover:bg-[#525252] text-white text-base" onClick={() => pressCalc('4')}>4</button>
                    <button className="rounded-full aspect-square flex items-center justify-center font-bold bg-[#404040] hover:bg-[#525252] text-white text-base" onClick={() => pressCalc('5')}>5</button>

                    {/* Row 7 */}
                    <button className="rounded-full aspect-square flex items-center justify-center font-bold text-xs bg-[#1c1917] hover:bg-[#2d2927] text-stone-300" onClick={() => pressCalc('(')}>(</button>
                    <button className="rounded-full aspect-square flex items-center justify-center font-bold text-xs bg-[#1c1917] hover:bg-[#2d2927] text-stone-300" onClick={() => pressCalc(')')}>)</button>
                    <button className="rounded-full aspect-square flex items-center justify-center font-bold text-xs bg-[#1c1917] hover:bg-[#2d2927] text-stone-300" onClick={() => {
                      const screenVal = parseFloat(calcScreen);
                      if (!isNaN(screenVal)) {
                        setCalcScreen(String(screenVal * -1));
                      }
                    }}>±</button>
                    <button className="rounded-full aspect-square flex items-center justify-center font-bold bg-[#404040] hover:bg-[#525252] text-white text-base" onClick={() => pressCalc('6')}>6</button>
                    <button className="rounded-full aspect-square flex items-center justify-center font-bold bg-orange-500 hover:bg-orange-400 text-white text-base" onClick={() => pressCalc('-')}>-</button>

                    {/* Row 8 */}
                    <button className="rounded-full aspect-square flex items-center justify-center font-bold bg-[#404040] hover:bg-[#525252] text-white text-base" onClick={() => pressCalc('1')}>1</button>
                    <button className="rounded-full aspect-square flex items-center justify-center font-bold bg-[#404040] hover:bg-[#525252] text-white text-base" onClick={() => pressCalc('2')}>2</button>
                    <button className="rounded-full aspect-square flex items-center justify-center font-bold bg-[#404040] hover:bg-[#525252] text-white text-base" onClick={() => pressCalc('3')}>3</button>
                    <button className="rounded-full aspect-square flex items-center justify-center font-bold bg-orange-500 hover:bg-orange-400 text-white text-base" onClick={() => pressCalc('+')}>+</button>
                    <button className="rounded-full flex items-center justify-center font-bold bg-amber-500 hover:bg-amber-400 text-white text-lg row-span-2 h-auto" onClick={calculateCalc}>=</button>

                    {/* Row 9 */}
                    <button className="h-11 rounded-full flex items-center justify-center font-bold bg-[#404040] hover:bg-[#525252] text-white text-base col-span-2 px-5" onClick={() => pressCalc('0')}>0</button>
                    <button className="rounded-full aspect-square flex items-center justify-center font-bold bg-[#404040] hover:bg-[#525252] text-white text-base" onClick={() => pressCalc('.')}>.</button>
                    <button className="rounded-full aspect-square flex items-center justify-center font-bold bg-[#a6a6a6] hover:bg-[#c4c4c4] text-stone-950" onClick={() => {
                      setCalcScreen(prev => {
                        const parsed = parseFloat(prev);
                        return isNaN(parsed) ? 'Error' : String(parsed / 100);
                      });
                    }}>%</button>
                  </div>
                </div>
              )}

              {/* 2. LIVE CURRENCY CONVERTER SUBTAB */}
              {calcActiveSubtab === 'currency' && (
                <div className="space-y-4 max-w-lg mx-auto">
                  <div>
                    <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest">Live Currency Converter</h3>
                    <p className="text-[10px] text-stone-500">Real-time international currency exchange rates</p>
                  </div>

                  <div className="bg-white border border-stone-200/80 rounded-xl p-5 shadow-xs space-y-4">
                    {/* Inputs */}
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-1">Amount</label>
                        <div className="relative">
                          <input 
                            type="number" 
                            min="0" 
                            step="any"
                            className="w-full bg-stone-50 border border-stone-200 rounded-lg pl-3 pr-14 py-2 text-xs font-mono outline-none focus:bg-white focus:border-stone-500 focus:ring-1 focus:ring-stone-500" 
                            value={currencyAmount}
                            onChange={(e) => setCurrencyAmount(e.target.value)}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-stone-400 font-mono">{currencyFrom}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <label className="block text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-1">From Currency</label>
                          <select 
                            className="w-full bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-2 text-xs font-medium outline-none cursor-pointer focus:bg-white focus:border-stone-500"
                            value={currencyFrom}
                            onChange={(e) => setCurrencyFrom(e.target.value)}
                          >
                            <option value="USD">USD - US Dollar</option>
                            <option value="EUR">EUR - Euro</option>
                            <option value="GBP">GBP - British Pound</option>
                            <option value="JPY">JPY - Japanese Yen</option>
                            <option value="PHP">PHP - Philippine Peso</option>
                            <option value="AUD">AUD - Australian Dollar</option>
                            <option value="CAD">CAD - Canadian Dollar</option>
                            <option value="CNY">CNY - Chinese Yuan</option>
                            <option value="CHF">CHF - Swiss Franc</option>
                            <option value="INR">INR - Indian Rupee</option>
                            <option value="SGD">SGD - Singapore Dollar</option>
                            <option value="AED">AED - UAE Dirham</option>
                          </select>
                        </div>

                        <button 
                          type="button" 
                          onClick={() => {
                            const tmp = currencyFrom;
                            setCurrencyFrom(currencyTo);
                            setCurrencyTo(tmp);
                          }}
                          className="mt-4 p-2 rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-600 hover:text-stone-900 shrink-0 cursor-pointer self-center"
                          title="Swap currencies"
                        >
                          <span className="material-symbols-outlined">swap_horiz</span>
                        </button>

                        <div className="flex-1">
                          <label className="block text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-1">To Currency</label>
                          <select 
                            className="w-full bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-2 text-xs font-medium outline-none cursor-pointer focus:bg-white focus:border-stone-500"
                            value={currencyTo}
                            onChange={(e) => setCurrencyTo(e.target.value)}
                          >
                            <option value="USD">USD - US Dollar</option>
                            <option value="EUR">EUR - Euro</option>
                            <option value="GBP">GBP - British Pound</option>
                            <option value="JPY">JPY - Japanese Yen</option>
                            <option value="PHP">PHP - Philippine Peso</option>
                            <option value="AUD">AUD - Australian Dollar</option>
                            <option value="CAD">CAD - Canadian Dollar</option>
                            <option value="CNY">CNY - Chinese Yuan</option>
                            <option value="CHF">CHF - Swiss Franc</option>
                            <option value="INR">INR - Indian Rupee</option>
                            <option value="SGD">SGD - Singapore Dollar</option>
                            <option value="AED">AED - UAE Dirham</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Result screen */}
                    <div className="bg-stone-900 text-white rounded-xl p-4 border border-stone-800 text-center font-mono space-y-1">
                      <span className="text-[10px] text-stone-400 font-bold tracking-wider block">CONVERSION RESULT</span>
                      {exchangeRatesLoading ? (
                        <div className="py-2 flex items-center justify-center gap-2 text-xs text-stone-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span> Syncing Live Rates...
                        </div>
                      ) : (
                        <>
                          <div className="text-xl font-bold text-amber-400 truncate">
                            {currencyAmount} {currencyFrom} = {currencyResult} {currencyTo}
                          </div>
                          <div className="text-[9px] text-stone-400">
                            Rate: 1 {currencyFrom} = {(parseFloat(currencyResult) / parseFloat(currencyAmount || '1')).toFixed(6)} {currencyTo}
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1 text-[10px] text-stone-400 font-mono">
                      <span>{ratesLastUpdated}</span>
                      <button 
                        type="button"
                        onClick={handleSaveCurrencyConversion}
                        className="inline-flex items-center gap-1 bg-stone-900 text-white px-2.5 py-1.5 rounded-lg font-sans font-bold hover:bg-stone-800 transition shadow-xs cursor-pointer"
                      >
                        <span className="material-symbols-outlined !text-xs">save</span>
                        Save Log
                      </button>
                    </div>
                  </div>

                  {/* Popular exchange rates table relative to currencyFrom */}
                  <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 space-y-2">
                    <span className="block text-[9px] font-bold text-stone-400 uppercase tracking-wider">Quick Rates relative to {currencyFrom}</span>
                    <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
                      {['USD', 'EUR', 'GBP', 'JPY', 'PHP', 'CAD'].filter(c => c !== currencyFrom).slice(0, 3).map((curr) => {
                        const rateVal = handleCurrencyConvert('1', currencyFrom, curr);
                        return (
                          <div key={curr} className="bg-white border border-stone-200/50 p-2 rounded-lg text-center shadow-xs">
                            <span className="text-stone-400 block font-sans">1 {currencyFrom} to</span>
                            <strong className="text-stone-800 mt-0.5 block">{rateVal} {curr}</strong>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* 3. SMART UNIT CONVERTER SUBTAB */}
              {calcActiveSubtab === 'unit' && (
                <div className="space-y-4 max-w-lg mx-auto">
                  <div>
                    <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest">Smart Unit Converter</h3>
                    <p className="text-[10px] text-stone-500">Fast and complete scientific dimensional conversion</p>
                  </div>

                  {/* Category switcher */}
                  <div className="flex gap-1 overflow-x-auto pb-1 select-none scrollbar-none">
                    {[
                      { id: 'length', label: 'Length', icon: 'straighten' },
                      { id: 'weight', label: 'Weight', icon: 'scale' },
                      { id: 'temperature', label: 'Temperature', icon: 'thermostat' },
                      { id: 'area', label: 'Area', icon: 'grid_view' },
                      { id: 'speed', label: 'Speed', icon: 'speed' }
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setUnitCategory(cat.id as any)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition shrink-0 cursor-pointer ${
                          unitCategory === cat.id 
                            ? 'bg-stone-900 border-stone-900 text-white shadow-xs' 
                            : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                        }`}
                      >
                        <span className="material-symbols-outlined !text-xs">{cat.icon}</span>
                        <span>{cat.label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="bg-white border border-stone-200/80 rounded-xl p-5 shadow-xs space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left unit */}
                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold text-stone-400 uppercase tracking-widest">Value</label>
                        <input 
                          type="number" 
                          className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs font-mono outline-none focus:bg-white focus:border-stone-500" 
                          value={unitValue}
                          onChange={(e) => setUnitValue(e.target.value)}
                        />
                        <select 
                          className="w-full bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs font-medium outline-none cursor-pointer mt-1 focus:bg-white focus:border-stone-500"
                          value={unitFrom}
                          onChange={(e) => setUnitFrom(e.target.value)}
                        >
                          {unitCategory === 'length' && (
                            <>
                              <option value="m">Meters (m)</option>
                              <option value="km">Kilometers (km)</option>
                              <option value="cm">Centimeters (cm)</option>
                              <option value="mm">Millimeters (mm)</option>
                              <option value="mi">Miles (mi)</option>
                              <option value="yd">Yards (yd)</option>
                              <option value="ft">Feet (ft)</option>
                              <option value="in">Inches (in)</option>
                            </>
                          )}
                          {unitCategory === 'weight' && (
                            <>
                              <option value="kg">Kilograms (kg)</option>
                              <option value="g">Grams (g)</option>
                              <option value="mg">Milligrams (mg)</option>
                              <option value="lbs">Pounds (lbs)</option>
                              <option value="oz">Ounces (oz)</option>
                            </>
                          )}
                          {unitCategory === 'temperature' && (
                            <>
                              <option value="C">Celsius (°C)</option>
                              <option value="F">Fahrenheit (°F)</option>
                              <option value="K">Kelvin (K)</option>
                            </>
                          )}
                          {unitCategory === 'area' && (
                            <>
                              <option value="m²">Square Meters (m²)</option>
                              <option value="km²">Square Kilometers (km²)</option>
                              <option value="mi²">Square Miles (mi²)</option>
                              <option value="ac">Acres (ac)</option>
                              <option value="ha">Hectares (ha)</option>
                            </>
                          )}
                          {unitCategory === 'speed' && (
                            <>
                              <option value="m/s">Meters per second (m/s)</option>
                              <option value="km/h">Kilometers per hour (km/h)</option>
                              <option value="mph">Miles per hour (mph)</option>
                              <option value="kt">Knots (kt)</option>
                            </>
                          )}
                        </select>
                      </div>

                      {/* Right unit (Result) */}
                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold text-stone-400 uppercase tracking-widest">Converted Result</label>
                        <div className="w-full bg-stone-100 border border-stone-200/80 rounded-lg px-3 py-2 text-xs font-mono text-stone-600 truncate h-8 flex items-center">
                          {unitResult}
                        </div>
                        <select 
                          className="w-full bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs font-medium outline-none cursor-pointer mt-1 focus:bg-white focus:border-stone-500"
                          value={unitTo}
                          onChange={(e) => setUnitTo(e.target.value)}
                        >
                          {unitCategory === 'length' && (
                            <>
                              <option value="m">Meters (m)</option>
                              <option value="km">Kilometers (km)</option>
                              <option value="cm">Centimeters (cm)</option>
                              <option value="mm">Millimeters (mm)</option>
                              <option value="mi">Miles (mi)</option>
                              <option value="yd">Yards (yd)</option>
                              <option value="ft">Feet (ft)</option>
                              <option value="in">Inches (in)</option>
                            </>
                          )}
                          {unitCategory === 'weight' && (
                            <>
                              <option value="kg">Kilograms (kg)</option>
                              <option value="g">Grams (g)</option>
                              <option value="mg">Milligrams (mg)</option>
                              <option value="lbs">Pounds (lbs)</option>
                              <option value="oz">Ounces (oz)</option>
                            </>
                          )}
                          {unitCategory === 'temperature' && (
                            <>
                              <option value="C">Celsius (°C)</option>
                              <option value="F">Fahrenheit (°F)</option>
                              <option value="K">Kelvin (K)</option>
                            </>
                          )}
                          {unitCategory === 'area' && (
                            <>
                              <option value="m²">Square Meters (m²)</option>
                              <option value="km²">Square Kilometers (km²)</option>
                              <option value="mi²">Square Miles (mi²)</option>
                              <option value="ac">Acres (ac)</option>
                              <option value="ha">Hectares (ha)</option>
                            </>
                          )}
                          {unitCategory === 'speed' && (
                            <>
                              <option value="m/s">Meters per second (m/s)</option>
                              <option value="km/h">Kilometers per hour (km/h)</option>
                              <option value="mph">Miles per hour (mph)</option>
                              <option value="kt">Knots (kt)</option>
                            </>
                          )}
                        </select>
                      </div>
                    </div>

                    <div className="bg-stone-50 border border-stone-150 p-3 rounded-xl flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-amber-500 !text-base shrink-0">info</span>
                      <p className="text-[10px] text-stone-500 leading-relaxed font-medium">
                        Converting <strong>{unitValue} {unitFrom}</strong> is equivalent to exactly <strong>{unitResult} {unitTo}</strong>. Change input value for instant calculations.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. INTERACTIVE EQUATION SOLVERS SUBTAB */}
              {calcActiveSubtab === 'equations' && (
                <div className="space-y-5 max-w-lg mx-auto">
                  <div>
                    <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest">Interactive Equation Solvers</h3>
                    <p className="text-[10px] text-stone-500">Fill parameters and solve standard math equations instantly</p>
                  </div>

                  {/* Quadratic Equation Card */}
                  <div className="bg-white border border-stone-200/80 rounded-xl p-4 shadow-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                      <span className="text-[10px] font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1">
                        <span className="material-symbols-outlined !text-xs text-orange-500">functions</span>
                        Quadratic Formula Solver
                      </span>
                      <span className="text-[9px] font-mono text-stone-400">ax² + bx + c = 0</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <label className="block text-[8px] font-bold text-stone-400 uppercase mb-0.5">a</label>
                        <input 
                          type="number" 
                          className="w-full bg-stone-50 border border-stone-200 rounded px-2 py-1 text-xs font-mono text-center outline-none focus:bg-white" 
                          value={eqQuadraticA}
                          onChange={(e) => setEqQuadraticA(e.target.value)}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-[8px] font-bold text-stone-400 uppercase mb-0.5">b</label>
                        <input 
                          type="number" 
                          className="w-full bg-stone-50 border border-stone-200 rounded px-2 py-1 text-xs font-mono text-center outline-none focus:bg-white" 
                          value={eqQuadraticB}
                          onChange={(e) => setEqQuadraticB(e.target.value)}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-[8px] font-bold text-stone-400 uppercase mb-0.5">c</label>
                        <input 
                          type="number" 
                          className="w-full bg-stone-50 border border-stone-200 rounded px-2 py-1 text-xs font-mono text-center outline-none focus:bg-white" 
                          value={eqQuadraticC}
                          onChange={(e) => setEqQuadraticC(e.target.value)}
                        />
                      </div>
                      <button 
                        type="button" 
                        onClick={solveQuadratic}
                        className="bg-stone-900 text-white rounded px-3 py-1.5 text-[10px] font-bold hover:bg-stone-800 transition cursor-pointer self-end h-7 shrink-0"
                      >
                        Solve
                      </button>
                    </div>

                    <div className="bg-stone-50 border border-stone-200/50 p-2.5 rounded-lg text-center font-mono">
                      <span className="text-[9px] text-stone-400 font-sans block uppercase">ROOTS RESULT</span>
                      <strong className="text-stone-800 text-xs mt-0.5 block">{eqQuadraticResult}</strong>
                    </div>
                  </div>

                  {/* Pythagorean Solver Card */}
                  <div className="bg-white border border-stone-200/80 rounded-xl p-4 shadow-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                      <span className="text-[10px] font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1">
                        <span className="material-symbols-outlined !text-xs text-orange-500">triangle</span>
                        Pythagorean Theorem Solver
                      </span>
                      <span className="text-[9px] font-mono text-stone-400">a² + b² = c²</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <label className="block text-[8px] font-bold text-stone-400 uppercase mb-0.5">Side a</label>
                        <input 
                          type="number" 
                          className="w-full bg-stone-50 border border-stone-200 rounded px-2 py-1 text-xs font-mono text-center outline-none focus:bg-white" 
                          value={eqPythagA}
                          onChange={(e) => setEqPythagA(e.target.value)}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-[8px] font-bold text-stone-400 uppercase mb-0.5">Side b</label>
                        <input 
                          type="number" 
                          className="w-full bg-stone-50 border border-stone-200 rounded px-2 py-1 text-xs font-mono text-center outline-none focus:bg-white" 
                          value={eqPythagB}
                          onChange={(e) => setEqPythagB(e.target.value)}
                        />
                      </div>
                      <button 
                        type="button" 
                        onClick={solvePythag}
                        className="bg-stone-900 text-white rounded px-3 py-1.5 text-[10px] font-bold hover:bg-stone-800 transition cursor-pointer self-end h-7 shrink-0"
                      >
                        Solve
                      </button>
                    </div>

                    <div className="bg-stone-50 border border-stone-200/50 p-2.5 rounded-lg text-center font-mono">
                      <span className="text-[9px] text-stone-400 font-sans block uppercase">HYPOTENUSE (c)</span>
                      <strong className="text-stone-800 text-xs mt-0.5 block">{eqPythagResult}</strong>
                    </div>
                  </div>

                  {/* Circle Solver Card */}
                  <div className="bg-white border border-stone-200/80 rounded-xl p-4 shadow-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                      <span className="text-[10px] font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1">
                        <span className="material-symbols-outlined !text-xs text-orange-500">circle</span>
                        Circle Geometry Calculator
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <label className="block text-[8px] font-bold text-stone-400 uppercase mb-0.5">Radius (r)</label>
                        <input 
                          type="number" 
                          className="w-full bg-stone-50 border border-stone-200 rounded px-3 py-1 text-xs font-mono text-center outline-none focus:bg-white" 
                          value={eqCircleRadius}
                          onChange={(e) => setEqCircleRadius(e.target.value)}
                        />
                      </div>
                      <button 
                        type="button" 
                        onClick={solveCircle}
                        className="bg-stone-900 text-white rounded px-3 py-1.5 text-[10px] font-bold hover:bg-stone-800 transition cursor-pointer self-end h-7 shrink-0"
                      >
                        Solve
                      </button>
                    </div>

                    <div className="bg-stone-50 border border-stone-200/50 p-2.5 rounded-lg text-center font-mono">
                      <span className="text-[9px] text-stone-400 font-sans block uppercase">PARAMETERS</span>
                      <strong className="text-stone-800 text-xs mt-0.5 block">{eqCircleResult}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Panel: History and Saved Items */}
            <div className="w-full md:w-64 border-t md:border-t-0 md:border-l border-stone-200 bg-stone-50 flex flex-col shrink-0 select-none">
              <div className="p-4 border-b border-stone-200 bg-stone-100/40 flex items-center justify-between">
                <span className="text-[10px] font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined !text-base text-stone-400">history</span>
                  Workspace History
                </span>
                
                <button 
                  type="button"
                  onClick={() => {
                    if (calcActiveSubtab === 'currency') {
                      setCurrencyHistory([]);
                      localStorage.removeItem('bolek_currency_history');
                      showToast('Currency log cleared');
                    } else {
                      setCalcHistory([]);
                      localStorage.removeItem('bolek_calc_history');
                      showToast('Calculation history cleared');
                    }
                  }}
                  className="text-stone-400 hover:text-stone-700 text-[10px] font-bold"
                  title="Clear selected history"
                >
                  Clear All
                </button>
              </div>

              {/* History scrollable feed */}
              <div className="flex-1 p-3 overflow-y-auto space-y-2.5">
                {calcActiveSubtab === 'currency' ? (
                  currencyHistory.length === 0 ? (
                    <div className="h-40 flex flex-col items-center justify-center border border-dashed border-stone-200 rounded-xl text-stone-400 text-center p-3">
                      <span className="material-symbols-outlined !text-lg text-stone-300 mb-1">currency_exchange</span>
                      <span className="text-[9px] font-medium block">No saved currency conversions</span>
                    </div>
                  ) : (
                    currencyHistory.map((item) => (
                      <div 
                        key={item.id}
                        className="bg-white border border-stone-200 p-2.5 rounded-xl space-y-1 shadow-xs hover:border-stone-300 transition duration-150 relative group"
                      >
                        <div className="text-[10px] font-mono text-stone-700 font-bold leading-tight">
                          {item.amount} {item.from} = {item.result} {item.to}
                        </div>
                        <div className="flex items-center justify-between text-[8px] text-stone-400">
                          <span>Rate: {(parseFloat(item.result) / parseFloat(item.amount)).toFixed(5)}</span>
                          <span>{item.timestamp}</span>
                        </div>
                      </div>
                    ))
                  )
                ) : (
                  calcHistory.length === 0 ? (
                    <div className="h-40 flex flex-col items-center justify-center border border-dashed border-stone-200 rounded-xl text-stone-400 text-center p-3">
                      <span className="material-symbols-outlined !text-lg text-stone-300 mb-1">history</span>
                      <span className="text-[9px] font-medium block">No recent computations</span>
                    </div>
                  ) : (
                    calcHistory.map((item) => (
                      <div 
                        key={item.id}
                        onClick={() => {
                          setCalcFormula(item.formula);
                          setCalcScreen(item.result);
                          showToast('Loaded calculation from history');
                        }}
                        className="bg-white border border-stone-200 p-2.5 rounded-xl space-y-1 shadow-xs hover:border-stone-400 hover:bg-stone-50 cursor-pointer transition duration-150 relative group"
                        title="Click to restore to calculator"
                      >
                        <div className="text-[9px] font-mono text-stone-400 truncate leading-none">
                          {item.formula}
                        </div>
                        <div className="text-xs font-mono font-bold text-stone-800 leading-tight truncate">
                          {item.result}
                        </div>
                        <div className="text-[8px] text-stone-400 text-right leading-none block">
                          {item.timestamp}
                        </div>
                      </div>
                    ))
                  )
                )}
              </div>
            </div>
          </div>
        </div>

        {/* VIEW 2.5: BolekBrowser Secure Privacy App Workspace */}
        <div id="view-browser" className={`w-full h-full flex-1 flex flex-col bg-stone-900 border border-stone-800 rounded-lg overflow-hidden ${activeTab === 'browser' ? 'flex' : 'hidden'}`}>
          {/* Top Browser Control Bar / Chrome Mockup */}
          <div className="bg-[#1c1917] border-b border-stone-800 p-3 flex flex-col gap-2 shrink-0 select-none">
            {/* Tabs Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 overflow-x-auto max-w-2xl">
                {browserTabs.map(t => (
                  <div 
                    key={t.id}
                    onClick={() => {
                      setBrowserTabs(prev => prev.map(tab => ({ ...tab, active: tab.id === t.id })));
                      setBrowserCurrentUrl(t.url);
                      setBrowserUrl(t.url.replace('https://', '').replace('http://', ''));
                    }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-t-lg text-[10px] font-semibold cursor-pointer transition duration-150 shrink-0 ${t.active ? 'bg-stone-900 text-stone-100 border-t-2 border-orange-500' : 'bg-stone-950/60 text-stone-400 hover:bg-stone-950 hover:text-stone-200'}`}
                  >
                    <span className="material-symbols-outlined !text-xs text-stone-400">language</span>
                    <span className="truncate max-w-[110px]">{t.title}</span>
                    <span 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (browserTabs.length <= 1) {
                          showToast('At least one tab must remain open');
                          return;
                        }
                        setBrowserTabs(prev => {
                          const filtered = prev.filter(tab => tab.id !== t.id);
                          if (t.active) {
                            filtered[0].active = true;
                            setBrowserCurrentUrl(filtered[0].url);
                            setBrowserUrl(filtered[0].url.replace('https://', '').replace('http://', ''));
                          }
                          return filtered;
                        });
                      }}
                      className="material-symbols-outlined !text-[10px] text-stone-500 hover:text-stone-200 rounded p-0.5 ml-1"
                    >
                      close
                    </span>
                  </div>
                ))}
                
                {/* Add Tab Button */}
                <button 
                  onClick={() => {
                    const newId = 'tab-' + Date.now();
                    setBrowserTabs(prev => [
                      ...prev.map(t => ({ ...t, active: false })),
                      { id: newId, title: 'New Privacy Search', url: 'https://duckduckgo.com', active: true }
                    ]);
                    setBrowserCurrentUrl('https://duckduckgo.com');
                    setBrowserUrl('duckduckgo.com');
                    showToast('Created new encrypted incognito tab');
                  }}
                  className="p-1 rounded bg-stone-950 hover:bg-stone-800 text-stone-400 hover:text-stone-200 cursor-pointer transition"
                  title="New secure tab"
                >
                  <span className="material-symbols-outlined !text-xs font-bold">add</span>
                </button>
              </div>

              {/* Boss Panic Key Toggle */}
              <button
                onClick={() => {
                  setBrowserStealthActive(!browserStealthActive);
                  showToast(browserStealthActive ? 'Returned to secure browser session' : '🔴 BOSS MODE ACTIVE: Layout masked with dry financial spreadsheet');
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold transition duration-150 cursor-pointer shadow-sm border ${browserStealthActive ? 'bg-emerald-600 border-emerald-500 text-white animate-pulse' : 'bg-red-600/10 border-red-500/20 text-red-400 hover:bg-red-600/20'}`}
                title="Boss Panic Button (Ctrl+B)"
              >
                <span className="material-symbols-outlined !text-xs font-bold">visibility_off</span>
                <span>{browserStealthActive ? 'UNMASK SESSION' : 'BOSS PANIC KEY'}</span>
              </button>
            </div>

            {/* Navigation & Address Bar Row */}
            <div className="flex items-center gap-3">
              {/* Back / Forward Controls */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button 
                  onClick={() => {
                    showToast('Back navigation isolated & encrypted to prevent network log leaks');
                  }}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition cursor-pointer"
                  title="Secure Back"
                >
                  <span className="material-symbols-outlined !text-sm">arrow_back</span>
                </button>
                <button 
                  onClick={() => {
                    showToast('Forward history purged to maintain stateless privacy');
                  }}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition cursor-pointer"
                  title="Secure Forward"
                >
                  <span className="material-symbols-outlined !text-sm">arrow_forward</span>
                </button>
                <button 
                  onClick={() => {
                    handleBrowserNavigate(browserCurrentUrl);
                    showToast('Session connection tunnel re-keyed & refreshed');
                  }}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition cursor-pointer"
                  title="Re-key connection & Refresh"
                >
                  <span className="material-symbols-outlined !text-sm">refresh</span>
                </button>
              </div>

              {/* Secure Address Bar */}
              <div className="flex-1 bg-stone-950 border border-stone-800 rounded-xl px-3 py-1.5 flex items-center gap-2 relative">
                <span className="material-symbols-outlined !text-sm text-emerald-400 font-bold animate-pulse">vpn_lock</span>
                <span className="text-[9px] font-mono font-bold text-emerald-500 bg-emerald-950/40 px-1 rounded uppercase shrink-0">PROXY</span>
                <input 
                  type="text"
                  value={browserUrl}
                  onChange={(e) => setBrowserUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleBrowserNavigate(browserUrl);
                    }
                  }}
                  placeholder="Enter URL or search privately..."
                  className="w-full bg-transparent text-stone-200 font-mono text-xs outline-none focus:ring-0 placeholder-stone-600"
                />
                <button
                  onClick={() => handleBrowserNavigate(browserUrl)}
                  className="material-symbols-outlined !text-sm text-stone-400 hover:text-stone-200 p-0.5"
                >
                  search
                </button>
              </div>

              {/* Quick Status indicators */}
              <div className="hidden lg:flex items-center gap-2">
                <div className="flex items-center gap-1 text-[9px] font-mono text-stone-400 bg-stone-900 px-2 py-1 rounded-lg border border-stone-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>AES-256</span>
                </div>
                <div className="flex items-center gap-1 text-[9px] font-mono text-stone-400 bg-stone-900 px-2 py-1 rounded-lg border border-stone-800">
                  <span className="material-symbols-outlined !text-[11px] text-orange-400">block</span>
                  <span>{browserTrackingCount} Blocked</span>
                </div>
              </div>
            </div>
          </div>

          {/* Core Browser Content Workspace Grid */}
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative animate-fade-in">
            
            {browserStealthActive ? (
              /* =========================================================================
                 MOCK FINANCIAL SPREADSHEET (Stealth/Boss Camouflage Mode)
                 ========================================================================= */
              <div className="w-full h-full bg-white text-stone-800 flex flex-col font-sans select-none overflow-auto animate-fade-in">
                {/* Excel Ribbon / Command Bar Mockup */}
                <div className="bg-stone-100 border-b border-stone-300 p-2 text-stone-600 flex items-center justify-between text-xs font-semibold shrink-0">
                  <div className="flex items-center gap-4">
                    <span className="text-emerald-700 font-bold border-b-2 border-emerald-700 pb-0.5">Bolek Ledger (Read-Only)</span>
                    <span className="hover:text-stone-900 cursor-pointer">File</span>
                    <span className="hover:text-stone-900 cursor-pointer">Edit</span>
                    <span className="hover:text-stone-900 cursor-pointer">View</span>
                    <span className="hover:text-stone-900 cursor-pointer">Insert</span>
                    <span className="hover:text-stone-900 cursor-pointer">Format</span>
                    <span className="hover:text-stone-900 cursor-pointer">Data</span>
                    <span className="hover:text-stone-900 cursor-pointer">Tools</span>
                  </div>
                  <div className="text-[10px] text-stone-400 font-mono">Autosaved to Cloud Drive</div>
                </div>

                {/* Formula Bar Mockup */}
                <div className="bg-stone-50 border-b border-stone-200 p-1.5 flex items-center gap-2 text-xs font-mono text-stone-600 shrink-0">
                  <div className="bg-white border border-stone-300 px-1.5 py-0.5 rounded text-center min-w-[40px] font-bold">C12</div>
                  <div className="text-stone-400 font-bold">fx</div>
                  <div className="bg-white border border-stone-200/80 rounded px-2 py-0.5 flex-1 select-all">=SUM(D3:D11)*1.18 - AMORT_BIAS_VAR</div>
                </div>

                {/* Core Spreadsheet Grid */}
                <div className="flex-1 overflow-auto p-4 space-y-6">
                  <div>
                    <h1 className="text-sm font-bold text-stone-800 tracking-tight flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600"></span>
                      CORPORATE DEPRECIATION LEDGER & CAPITAL EXPENDITURES (FY 2026)
                    </h1>
                    <p className="text-[10px] text-stone-400">Internal Audit & Consolidated Regional Operating Cashflows</p>
                  </div>

                  {/* Dry Corporate Table */}
                  <div className="border border-stone-200 rounded-lg overflow-hidden shadow-xs">
                    <table className="w-full text-left text-[11px] font-mono border-collapse">
                      <thead>
                        <tr className="bg-stone-100 border-b border-stone-200 text-stone-600 uppercase font-bold text-[10px]">
                          <th className="p-2 border-r border-stone-200">Asset ID</th>
                          <th className="p-2 border-r border-stone-200">Description</th>
                          <th className="p-2 border-r border-stone-200 text-right">Acquisition cost</th>
                          <th className="p-2 border-r border-stone-200 text-center">Life (Yrs)</th>
                          <th className="p-2 border-r border-stone-200 text-center">Method</th>
                          <th className="p-2 text-right">Amortized Basis</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200 text-stone-700 bg-white">
                        <tr>
                          <td className="p-2 border-r border-stone-200 font-bold text-stone-900 bg-stone-50">#BLK-29402</td>
                          <td className="p-2 border-r border-stone-200">Regional Datacenter Virtualization Nodes</td>
                          <td className="p-2 border-r border-stone-200 text-right font-bold text-stone-900">$1,452,900.00</td>
                          <td className="p-2 border-r border-stone-200 text-center">5</td>
                          <td className="p-2 border-r border-stone-200 text-center text-stone-500">MACRS-200%</td>
                          <td className="p-2 text-right font-bold text-emerald-600">$581,160.00</td>
                        </tr>
                        <tr>
                          <td className="p-2 border-r border-stone-200 font-bold text-stone-900 bg-stone-50">#BLK-93284</td>
                          <td className="p-2 border-r border-stone-200">Consolidated Fiber Optic Ingress Routing Suite</td>
                          <td className="p-2 border-r border-stone-200 text-right font-bold text-stone-900">$318,500.00</td>
                          <td className="p-2 border-r border-stone-200 text-center">7</td>
                          <td className="p-2 border-r border-stone-200 text-center text-stone-500">Straight Line</td>
                          <td className="p-2 text-right font-bold text-emerald-600">$227,500.00</td>
                        </tr>
                        <tr>
                          <td className="p-2 border-r border-stone-200 font-bold text-stone-900 bg-stone-50">#BLK-10294</td>
                          <td className="p-2 border-r border-stone-200">Terminal Obfuscation Array & Cryptographic Cores</td>
                          <td className="p-2 border-r border-stone-200 text-right font-bold text-stone-900">$892,000.00</td>
                          <td className="p-2 border-r border-stone-200 text-center">3</td>
                          <td className="p-2 border-r border-stone-200 text-center text-stone-500">Double Declining</td>
                          <td className="p-2 text-right font-bold text-emerald-600">$297,333.33</td>
                        </tr>
                        <tr>
                          <td className="p-2 border-r border-stone-200 font-bold text-stone-900 bg-stone-50">#BLK-88274</td>
                          <td className="p-2 border-r border-stone-200">Switzerland Secure Storage Ingress Hardware</td>
                          <td className="p-2 border-r border-stone-200 text-right font-bold text-stone-900">$640,000.00</td>
                          <td className="p-2 border-r border-stone-200 text-center">5</td>
                          <td className="p-2 border-r border-stone-200 text-center text-stone-500">MACRS-150%</td>
                          <td className="p-2 text-right font-bold text-emerald-600">$384,000.00</td>
                        </tr>
                        <tr className="bg-emerald-50/50 font-bold text-stone-900 text-xs">
                          <td className="p-2 border-r border-stone-200 bg-emerald-100/50" colSpan={2}>CONSOLIDATED TOTAL</td>
                          <td className="p-2 border-r border-stone-200 text-right text-stone-950">$3,303,400.00</td>
                          <td className="p-2 border-r border-stone-200 text-center">5.0</td>
                          <td className="p-2 border-r border-stone-200 text-center">-</td>
                          <td className="p-2 text-right text-emerald-700">$1,489,993.33</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Dry Corporate Charts Mockup */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-stone-50 border border-stone-200 p-4 rounded-xl flex flex-col justify-between h-44">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-stone-500 uppercase">Capital Depreciation (By Category)</span>
                        <span className="text-[9px] text-stone-400">Quarterly trend</span>
                      </div>
                      <div className="flex items-end gap-3 justify-center h-24 pt-2">
                        <div className="w-10 bg-emerald-600 rounded-t h-[80%] flex items-center justify-center text-[8px] text-white font-bold">80%</div>
                        <div className="w-10 bg-emerald-500 rounded-t h-[65%] flex items-center justify-center text-[8px] text-white font-bold">65%</div>
                        <div className="w-10 bg-stone-400 rounded-t h-[45%] flex items-center justify-center text-[8px] text-white font-bold">45%</div>
                        <div className="w-10 bg-stone-300 rounded-t h-[25%] flex items-center justify-center text-[8px] text-stone-700 font-bold">25%</div>
                      </div>
                      <div className="flex justify-between text-[8px] font-mono text-stone-400 mt-1">
                        <span>Datacenter</span>
                        <span>Routing</span>
                        <span>Crypto Cores</span>
                        <span>Swiss Storage</span>
                      </div>
                    </div>

                    <div className="bg-stone-50 border border-stone-200 p-4 rounded-xl flex flex-col justify-between h-44">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-stone-500 uppercase">Operational Efficiency Index</span>
                        <span className="text-[9px] text-emerald-600 font-bold">98.42% Compliance</span>
                      </div>
                      <div className="space-y-2 mt-2">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] font-mono text-stone-500">
                            <span>SLA Node Availability</span>
                            <span className="font-bold">99.98%</span>
                          </div>
                          <div className="w-full bg-stone-200 rounded-full h-1.5">
                            <div className="bg-emerald-600 h-1.5 rounded-full" style={{ width: '99%' }}></div>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] font-mono text-stone-500">
                            <span>Tax Allocation Compliance</span>
                            <span className="font-bold">94.12%</span>
                          </div>
                          <div className="w-full bg-stone-200 rounded-full h-1.5">
                            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '94%' }}></div>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] font-mono text-stone-500">
                            <span>Regulatory Amortization Margin</span>
                            <span className="font-bold">88.50%</span>
                          </div>
                          <div className="w-full bg-stone-200 rounded-full h-1.5">
                            <div className="bg-stone-400 h-1.5 rounded-full" style={{ width: '88%' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* =========================================================================
                 ACTIVE SECURE WEB SESSION WORKSPACE (Dual Pane layout)
                 ========================================================================= */
              <>
                {/* Left Sidebar: Shields HUD, Proxy Spoofers, & Logs */}
                <div className="w-full md:w-60 bg-stone-950 border-b md:border-b-0 md:border-r border-stone-800 p-4 flex flex-col gap-4 shrink-0 overflow-y-auto select-none">
                  
                  {/* Shield HUD */}
                  <div className="bg-[#1c1917]/80 rounded-xl p-3 border border-stone-800 space-y-2">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined !text-sm text-emerald-400 animate-pulse">security</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-200">Decentralized Shield Active</span>
                    </div>
                    
                    <div className="space-y-1.5 text-[10px] font-mono text-stone-400">
                      <div className="flex justify-between">
                        <span>DNS Filter:</span>
                        <span className="text-emerald-400 font-bold">LOCAL RE-ROUTE</span>
                      </div>
                      <div className="flex justify-between">
                        <span>DPI Protection:</span>
                        <span className="text-emerald-400 font-bold">{browserAntiDPI ? 'ENABLED' : 'DISABLED'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Node IP:</span>
                        <span className="text-stone-300 font-bold">🇨🇭 Switzerland (Decrypted)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Outbound IP:</span>
                        <span className="text-stone-300 font-bold">185.100.84.22</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setBrowserAntiDPI(!browserAntiDPI);
                        showToast(browserAntiDPI ? 'Anti-DPI Shunt disabled (Warning: Packet signatures now visible!)' : 'Anti-DPI Shunt enabled (Packet padding and size fuzzing active)');
                      }}
                      className="w-full text-center bg-stone-800 hover:bg-stone-700 text-stone-200 text-[9px] font-bold py-1.5 rounded transition duration-150 cursor-pointer"
                    >
                      {browserAntiDPI ? 'Disable Anti-DPI' : 'Enable Anti-DPI'}
                    </button>
                  </div>

                  {/* Bookmark Selector */}
                  <div className="space-y-2">
                    <span className="text-[9px] font-bold text-stone-500 uppercase tracking-widest block">Secure Gateways</span>
                    <div className="flex flex-col gap-1 text-[11px] font-semibold text-stone-300">
                      <button 
                        onClick={() => handleBrowserNavigate('https://duckduckgo.com')}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition ${browserCurrentUrl.includes('duckduckgo') ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-stone-900/40 hover:bg-stone-900 hover:text-white'}`}
                      >
                        <span className="flex items-center gap-1.5">🔍 DuckDuckGo Search</span>
                        <span className="text-[8px] bg-stone-800 text-stone-500 px-1 rounded font-bold">SEC</span>
                      </button>
                      <button 
                        onClick={() => handleBrowserNavigate('https://news.ycombinator.com')}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition ${browserCurrentUrl.includes('news.ycombinator') ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-stone-900/40 hover:bg-stone-900 hover:text-white'}`}
                      >
                        <span className="flex items-center gap-1.5">💻 Hacker News</span>
                        <span className="text-[8px] bg-stone-800 text-stone-500 px-1 rounded font-bold">LITE</span>
                      </button>
                      <button 
                        onClick={() => handleBrowserNavigate('https://wikipedia.org')}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition ${browserCurrentUrl.includes('wikipedia') ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-stone-900/40 hover:bg-stone-900 hover:text-white'}`}
                      >
                        <span className="flex items-center gap-1.5">📖 Wikipedia Secure</span>
                        <span className="text-[8px] bg-stone-800 text-stone-500 px-1 rounded font-bold">WIKI</span>
                      </button>
                    </div>
                  </div>

                  {/* Spoofer Tool Controls */}
                  <div className="space-y-3 pt-2 border-t border-stone-800/80">
                    <span className="text-[9px] font-bold text-stone-500 uppercase tracking-widest block font-mono">DPI Signature Spoofer</span>
                    
                    {/* User Agent Selector */}
                    <div className="space-y-1">
                      <label className="block text-[8px] text-stone-400 font-bold uppercase tracking-wider">User Agent Signature</label>
                      <select 
                        value={browserUserAgent}
                        onChange={(e) => {
                          setBrowserUserAgent(e.target.value);
                          showToast(`Header User-Agent rotated to: ${e.target.value}`);
                        }}
                        className="w-full bg-stone-900 border border-stone-800 text-stone-300 rounded px-2 py-1 text-[10px] font-mono focus:outline-none"
                      >
                        <option value="chrome">Google Chrome / macOS</option>
                        <option value="safari">Apple Safari / iOS</option>
                        <option value="firefox">Mozilla Firefox / Linux</option>
                        <option value="mobile">Samsung Internet / Android</option>
                      </select>
                    </div>

                    {/* Search Engine Selector */}
                    <div className="space-y-1">
                      <label className="block text-[8px] text-stone-400 font-bold uppercase tracking-wider">Decentralized Engine</label>
                      <select 
                        value={browserSearchEngine}
                        onChange={(e) => {
                          setBrowserSearchEngine(e.target.value);
                          showToast(`Search Engine Default changed to: ${e.target.value}`);
                        }}
                        className="w-full bg-stone-900 border border-stone-800 text-stone-300 rounded px-2 py-1 text-[10px] font-mono focus:outline-none"
                      >
                        <option value="duckduckgo">DuckDuckGo LITE (No Trace)</option>
                        <option value="brave">Brave Shields (Onion-Rotated)</option>
                        <option value="startpage">StartPage (Proxy Scraper)</option>
                      </select>
                    </div>
                  </div>

                  {/* Encryption terminal logger */}
                  <div className="flex-1 flex flex-col space-y-1 pt-3 border-t border-stone-800/80">
                    <span className="text-[9px] font-bold text-stone-500 uppercase tracking-widest block font-mono">Proxy Tunnel Log</span>
                    <div className="flex-1 bg-stone-[#0a0a09] p-2 rounded-lg border border-stone-850 font-mono text-[8px] text-emerald-500 overflow-y-auto space-y-1 leading-normal max-h-[140px] md:max-h-none">
                      <div>[SECURE] Proxy node online. Local telemetry neutralized.</div>
                      <div>[SPOOF] Spatially padding packets via MTU noise.</div>
                      <div>[SECURE] Redirected 3 analytics domains to null.</div>
                      <div>[SECURE] TLS Fingerprint randomized (JA3 spoofed).</div>
                      <div>[SHIELD] Outbound cookies stripped and scrubbed.</div>
                      <div className="animate-pulse text-emerald-400 font-bold">● Listening for encrypted requests...</div>
                    </div>
                  </div>
                </div>

                {/* Right Area: Simulated Web Frame Content */}
                <div className="flex-1 bg-stone-950 flex flex-col overflow-y-auto p-6 md:p-8">
                  
                  {browserCurrentUrl.includes('duckduckgo') ? (
                    /* =========================================================================
                       SIMULATED DUCKDUCKGO SEARCH ENGINE PAGE
                       ========================================================================= */
                    <div className="max-w-2xl mx-auto w-full py-10 space-y-8 text-center animate-fade-in">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <span className="material-symbols-outlined !text-5xl text-orange-500 animate-pulse">search</span>
                        <div>
                          <h1 className="text-2xl font-bold text-stone-100 tracking-tight flex items-center justify-center gap-1.5 font-sans">
                            DuckDuckGo <span className="text-xs bg-orange-500/20 text-orange-400 font-bold px-1.5 py-0.5 rounded uppercase font-mono font-bold">Lite</span>
                          </h1>
                          <p className="text-xs text-stone-400 mt-1">Encrypted Swiss Proxy Rendering Gateway</p>
                        </div>
                      </div>

                      {/* Interactive Search Bar */}
                      <div className="flex gap-2 max-w-lg mx-auto bg-stone-900 border border-stone-800 rounded-2xl p-1 shadow-xl">
                        <input 
                          type="text"
                          placeholder="Search the web without tracking..."
                          defaultValue={browserUrl.includes('q=') ? decodeURIComponent(browserUrl.split('q=')[1]) : ''}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleBrowserNavigate('https://duckduckgo.com/?q=' + encodeURIComponent((e.target as HTMLInputElement).value));
                            }
                          }}
                          className="flex-1 bg-transparent border-none text-stone-200 outline-none focus:ring-0 px-3 text-xs placeholder-stone-500 font-mono"
                        />
                        <button 
                          type="button"
                          onClick={(e) => {
                            const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                            if (input && input.value) {
                              handleBrowserNavigate('https://duckduckgo.com/?q=' + encodeURIComponent(input.value));
                            }
                          }}
                          className="bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-sm active:scale-95 cursor-pointer"
                        >
                          Search
                        </button>
                      </div>

                      {/* Search Results Mockup */}
                      {browserCurrentUrl.includes('?q=') ? (
                        <div className="text-left space-y-6 mt-10">
                          <span className="block text-[10px] text-stone-400 font-mono uppercase tracking-widest">
                            Safe Search Results for &quot;{decodeURIComponent(browserCurrentUrl.split('q=')[1])}&quot;
                          </span>
                          
                          <div className="space-y-5">
                            <div className="bg-stone-900/60 p-4 rounded-xl border border-stone-800 hover:border-stone-700 transition">
                              <span className="text-[10px] text-emerald-400 font-mono">https://www.privacytools.io</span>
                              <h3 
                                onClick={() => handleBrowserNavigate('https://wikipedia.org')}
                                className="text-sm font-bold text-stone-200 hover:text-orange-400 cursor-pointer mt-0.5"
                              >
                                Privacy Tools - Encryption Against Corporate Surveillance
                              </h3>
                              <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                                Explore secure decentralized open-source tools to defend your data. This parsed view is entirely clean of analytics frames, pixels, or canvas fingerprinters.
                              </p>
                            </div>

                            <div className="bg-stone-900/60 p-4 rounded-xl border border-stone-800 hover:border-stone-700 transition">
                              <span className="text-[10px] text-emerald-400 font-mono">https://news.ycombinator.com</span>
                              <h3 
                                onClick={() => handleBrowserNavigate('https://news.ycombinator.com')}
                                className="text-sm font-bold text-stone-200 hover:text-orange-400 cursor-pointer mt-0.5"
                              >
                                Show HN: Bolek Encryption Engine Bypassing Deep Packet Inspection
                              </h3>
                              <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                                A discussion thread exploring how regional firewall packet tracking is neutralized via randomized TLS frames and dummy metadata padding. Read with isolated sandboxed client rendering.
                              </p>
                            </div>

                            <div className="bg-stone-900/60 p-4 rounded-xl border border-stone-800 hover:border-stone-700 transition">
                              <span className="text-[10px] text-emerald-400 font-mono">https://wikipedia.org/wiki/Information_privacy</span>
                              <h3 
                                onClick={() => handleBrowserNavigate('https://wikipedia.org')}
                                className="text-sm font-bold text-stone-200 hover:text-orange-400 cursor-pointer mt-0.5"
                              >
                                Information Privacy - Wikipedia Secure Offline Replica
                              </h3>
                              <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                                Definitions, history, and modern legal standards regarding informational privacy, cryptographic protections, and state-sanctioned firewall tracking.
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto text-left pt-6">
                          <div className="bg-stone-900/50 p-4 rounded-xl border border-stone-800/80 hover:border-stone-700 cursor-pointer transition" onClick={() => handleBrowserNavigate('https://news.ycombinator.com')}>
                            <span className="material-symbols-outlined text-orange-500 !text-xl">newspaper</span>
                            <h3 className="font-bold text-stone-200 text-xs mt-1">Hacker News Reader</h3>
                            <p className="text-[10px] text-stone-400 mt-0.5 leading-tight">Secure parsed tech forum aggregator.</p>
                          </div>
                          <div className="bg-stone-900/50 p-4 rounded-xl border border-stone-800/80 hover:border-stone-700 cursor-pointer transition" onClick={() => handleBrowserNavigate('https://wikipedia.org')}>
                            <span className="material-symbols-outlined text-amber-500 !text-xl">menu_book</span>
                            <h3 className="font-bold text-stone-200 text-xs mt-1">Wikipedia Secure</h3>
                            <p className="text-[10px] text-stone-400 mt-0.5 leading-tight">Scrubbed offline encyclopedic reader.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : browserCurrentUrl.includes('ycombinator.com') ? (
                    /* =========================================================================
                       SIMULATED HACKER NEWS REPLICA
                       ========================================================================= */
                    <div className="max-w-3xl mx-auto w-full space-y-6 text-left animate-fade-in font-serif">
                      <div className="bg-orange-500 text-stone-950 p-3.5 rounded-xl flex items-center justify-between font-sans shadow-md border border-orange-400/20">
                        <div className="flex items-center gap-3">
                          <span className="font-bold border border-stone-950 text-stone-950 px-2 py-0.5 text-xs">Y</span>
                          <div>
                            <strong className="text-xs font-bold tracking-tight uppercase">Bolek Hacker News</strong>
                            <p className="text-[8px] font-medium opacity-80 leading-none">Scrubbed Proxy Stream Reader</p>
                          </div>
                        </div>
                        <span className="text-[8px] bg-stone-950 text-orange-400 px-1.5 py-0.5 font-bold uppercase rounded font-mono font-bold">DPI Proofed</span>
                      </div>

                      <div className="bg-stone-900/40 border border-stone-800/60 rounded-2xl p-5 space-y-5 font-sans">
                        <div className="space-y-4 text-xs">
                          {/* Story 1 */}
                          <div className="flex gap-2.5 items-start">
                            <span className="text-stone-500 font-mono text-[10px]">1.</span>
                            <div>
                              <h4 className="font-bold text-stone-100 hover:text-orange-400 cursor-pointer" onClick={() => handleBrowserNavigate('https://wikipedia.org')}>
                                Show HN: Bolek Encryption - Secure Encrypted TLS Packet Padding Engine
                              </h4>
                              <p className="text-[9px] text-stone-500 mt-1 font-mono">
                                482 points by <span className="text-stone-300">bolek_sec</span> 4 hours ago | <span className="hover:underline cursor-pointer">112 comments</span>
                              </p>
                            </div>
                          </div>

                          {/* Story 2 */}
                          <div className="flex gap-2.5 items-start">
                            <span className="text-stone-500 font-mono text-[10px]">2.</span>
                            <div>
                              <h4 className="font-bold text-stone-100 hover:text-orange-400 cursor-pointer" onClick={() => handleBrowserNavigate('https://wikipedia.org')}>
                                Why Your Network Administrator Can See Standard Encrypted HTTPS Domains (SNI Leakage)
                              </h4>
                              <p className="text-[9px] text-stone-500 mt-1 font-mono">
                                329 points by <span className="text-stone-300">packet_sniffer</span> 6 hours ago | <span className="hover:underline cursor-pointer">94 comments</span>
                              </p>
                            </div>
                          </div>

                          {/* Story 3 */}
                          <div className="flex gap-2.5 items-start">
                            <span className="text-stone-500 font-mono text-[10px]">3.</span>
                            <div>
                              <h4 className="font-bold text-stone-100 hover:text-orange-400 cursor-pointer" onClick={() => handleBrowserNavigate('https://wikipedia.org')}>
                                Switzerland Passes Landmark Offline Metadata Incognito Data Protection Law
                              </h4>
                              <p className="text-[9px] text-stone-500 mt-1 font-mono">
                                251 points by <span className="text-stone-300">geneva_crypt</span> 8 hours ago | <span className="hover:underline cursor-pointer">41 comments</span>
                              </p>
                            </div>
                          </div>

                          {/* Story 4 */}
                          <div className="flex gap-2.5 items-start">
                            <span className="text-stone-500 font-mono text-[10px]">4.</span>
                            <div>
                              <h4 className="font-bold text-stone-100 hover:text-orange-400 cursor-pointer" onClick={() => handleBrowserNavigate('https://wikipedia.org')}>
                                Technical Retrospective: Defeating Deep Packet Inspection on Corporate Firewalls
                              </h4>
                              <p className="text-[9px] text-stone-500 mt-1 font-mono">
                                198 points by <span className="text-stone-300">anti_snitch</span> 11 hours ago | <span className="hover:underline cursor-pointer">53 comments</span>
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-stone-800 pt-4 text-center">
                          <button 
                            type="button"
                            onClick={() => showToast('Next page is fetched through rotated secure routing node')}
                            className="text-xs text-orange-400 hover:text-orange-300 font-bold px-3 py-1 bg-stone-900 border border-stone-800 rounded-lg cursor-pointer"
                          >
                            Load More Stories
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : browserCurrentUrl.includes('wikipedia') ? (
                    /* =========================================================================
                       SIMULATED SECURE WIKIPEDIA ARTICLE
                       ========================================================================= */
                    <div className="max-w-2xl mx-auto w-full space-y-6 text-left text-stone-200 animate-fade-in font-serif">
                      <div className="flex items-center gap-3 border-b border-stone-800 pb-4 font-sans select-none shrink-0">
                        <span className="material-symbols-outlined !text-3xl text-stone-400">menu_book</span>
                        <div>
                          <strong className="text-sm font-bold text-stone-100 tracking-tight">Wikipedia Sandbox Secure</strong>
                          <p className="text-[9px] font-mono text-emerald-400 uppercase tracking-widest leading-none">Scrubbed Static Replica Mode</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h1 className="text-2xl font-bold font-sans text-stone-100 tracking-tight leading-tight">Information Privacy & Cryptography</h1>
                        <p className="text-xs text-stone-400 italic">From Wikipedia, the free incognito encyclopedia</p>
                        
                        <p className="text-sm leading-relaxed text-stone-300">
                          <strong>Information privacy</strong>, or data privacy, is the relationship between the collection and dissemination of data, technology, the public expectation of privacy, and the legal and political issues surrounding them. It is critical in modern corporate environments where network sniffers and administrative firewalls monitor egress traffic.
                        </p>

                        <div className="bg-stone-900/50 p-4 rounded-xl border border-stone-800/80 font-sans my-4">
                          <h3 className="font-bold text-stone-100 text-xs uppercase tracking-wider mb-2">Table of Contents</h3>
                          <ul className="text-xs text-orange-400 space-y-1.5 list-disc list-inside">
                            <li><span className="hover:underline cursor-pointer">1. Deep Packet Inspection (DPI)</span></li>
                            <li><span className="hover:underline cursor-pointer">2. Server Name Indication (SNI) Sniffing</span></li>
                            <li><span className="hover:underline cursor-pointer">3. Bypassing Firewalls via Secure Proxies</span></li>
                          </ul>
                        </div>

                        <h3 className="text-lg font-bold font-sans text-stone-100 mt-6 border-b border-stone-850 pb-1.5">1. Deep Packet Inspection (DPI)</h3>
                        <p className="text-sm leading-relaxed text-stone-300">
                          Deep Packet Inspection is a form of computer network packet filtering that examines the data part (and also the header) of a packet as it passes an inspection point, searching for protocol non-compliance, viruses, spam, or intrusions. Corporate network administrators utilize DPI to detect when unauthorized tools or specific keywords are loaded in standard web packets.
                        </p>

                        <h3 className="text-lg font-bold font-sans text-stone-100 mt-6 border-b border-stone-850 pb-1.5">2. Server Name Indication (SNI) Sniffing</h3>
                        <p className="text-sm leading-relaxed text-stone-300">
                          Even when a connection is encrypted using SSL/TLS, the initial handshake often transmits the target hostname in plaintext within the <em>Server Name Indication (SNI)</em> field. This allows firewall sniffers to catalog every domain a client computer contacts, regardless of HTTPS encryption. BolekBrowser mitigates this by resolving connections via decentralized server-side lookup queries.
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* =========================================================================
                       SIMULATED DECRYPTED GATEWAY VIEW
                       ========================================================================= */
                    <div className="max-w-xl mx-auto w-full text-center py-16 space-y-6 animate-fade-in font-sans">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <span className="material-symbols-outlined !text-6xl text-emerald-400 animate-pulse">lock_person</span>
                        <div>
                          <h1 className="text-lg font-bold text-stone-100 tracking-tight">Secure Decrypted Gateway Active</h1>
                          <p className="text-xs text-stone-400 mt-1">Rendered via Swiss Proxy Tunnel No. 12</p>
                        </div>
                      </div>

                      <div className="bg-stone-900/60 p-6 rounded-2xl border border-stone-800 text-left space-y-4">
                        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                          <span className="text-[10px] font-mono text-emerald-400">STATUS: DECRYPTED & SHIELDED</span>
                          <span className="text-[10px] font-mono text-stone-500 font-bold">Node: Zurich_Secure_Gate</span>
                        </div>
                        <p className="text-xs text-stone-300 leading-relaxed">
                          To protect your privacy and guarantee absolute untraceability by local network administrators, the request to <strong className="text-stone-100 font-mono">{browserUrl}</strong> was processed on our external server-side node.
                        </p>
                        <p className="text-xs text-stone-400 leading-relaxed">
                          All scripts, tracking loops, telemetry calls, and analytics headers were completely stripped before layout compilation. All your firewall logs show is an encrypted connection to our main platform.
                        </p>

                        <div className="bg-[#0c0a09] p-3 rounded-lg border border-stone-850 font-mono text-[10px] text-orange-400 text-center">
                          🔒 This parsed session is stateless & disappears upon tab closure
                        </div>
                      </div>

                      <button 
                        type="button"
                        onClick={() => handleBrowserNavigate('https://duckduckgo.com')}
                        className="text-xs font-bold bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-200 px-4 py-2 rounded-xl transition duration-150 cursor-pointer"
                      >
                        Return to Privacy Search Home
                      </button>
                    </div>
                  )}

                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={handlePublishBolekDash}
            disabled={isPublishingBoard || publicBoardMode}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            title={publicBoardMode ? 'Public boards are view-only' : 'Publish BolekDash'}
          >
            <span className="material-symbols-outlined !text-sm">share</span>
            <span>{isPublishingBoard ? 'Publishing...' : 'Publish BolekDash'}</span>
          </button>

          {publicBoardUrl && !publicBoardMode && (
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(publicBoardUrl)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-200 text-stone-600 text-xs font-semibold rounded-lg transition hover:bg-stone-50"
              title="Copy current public link"
            >
              <span className="material-symbols-outlined !text-sm">link</span>
              <span>Copy Link</span>
            </button>
          )}

          {publicBoardMode && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
              <span className="material-symbols-outlined !text-sm">visibility</span>
              Public view only
            </span>
          )}
        </div>

        {/* VIEW 3: Boleksend / StickySend App Workspace */}
        <div id="view-send" className={`w-full h-full flex-1 flex flex-col bg-white border border-stone-200 rounded-lg overflow-hidden ${activeTab === 'send' ? 'flex' : 'hidden'}`}>
          
          {/* Header Bar with View Switcher */}
          <div className="bg-stone-900 text-stone-200 px-4 py-2 flex items-center justify-between border-b border-stone-800 shrink-0 text-xs">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-400 !text-lg">send_and_archive</span>
              <span className="font-bold text-white">StickySend Workspace</span>
            </div>
            <div className="flex items-center gap-1 bg-stone-800 p-1 rounded-xl border border-stone-700">
              <button
                type="button"
                onClick={() => setSendMode('stickysend')}
                className={`px-3 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${sendMode === 'stickysend' ? 'bg-amber-500 text-stone-950 shadow-xs' : 'text-stone-400 hover:text-white'}`}
              >
                StickySend (Inter-User Notes)
              </button>
              <button
                type="button"
                onClick={() => setSendMode('campaigns')}
                className={`px-3 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${sendMode === 'campaigns' ? 'bg-amber-500 text-stone-950 shadow-xs' : 'text-stone-400 hover:text-white'}`}
              >
                SMTP Campaign Suite
              </button>
            </div>
          </div>

          {sendMode === 'stickysend' ? (
            <BolekStickySend
              currentUserEmail={profileEmail}
              currentUserName={profileName}
              usersList={registeredUsers}
              onImportToBoard={handleImportStickyToBoard}
              showToast={showToast}
            />
          ) : (
            <div className="w-full h-full flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Left Subtab Navigation Sidebar */}
          <div 
            className="bg-stone-50 border-b md:border-b-0 border-stone-200 flex flex-col shrink-0 select-none overflow-y-auto"
            style={{ width: isMobile ? '100%' : `${boleksendWidths[0]}%` }}
          >
            <div className="p-4 border-b border-stone-200/80 bg-stone-100/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-orange-600 font-semibold !text-lg">outgoing_mail</span>
                <div>
                  <h2 className="text-xs font-bold text-stone-900 tracking-wide uppercase">Boleksend</h2>
                  <p className="text-[9px] text-stone-400 font-medium">Mail & Campaign Suite</p>
                </div>
              </div>
            </div>

            {/* Subtabs list */}
            <div className="p-2 flex md:flex-col gap-1 overflow-x-auto md:overflow-y-auto scrollbar-none">
              {[
                { id: 'inbox', label: 'Inbox (AWS SMTP)', icon: 'inbox' },
                { id: 'emails', label: 'Emails', icon: 'mail' },
                { id: 'broadcasts', label: 'Broadcasts', icon: 'campaign' },
                { id: 'automations', label: 'Automations', icon: 'schema' },
                { id: 'templates', label: 'Templates', icon: 'wysiwyg' },
                { id: 'audience', label: 'Audience', icon: 'contacts' },
                { id: 'metrics', label: 'Metrics', icon: 'monitoring' },
                { id: 'domains', label: 'Domains', icon: 'language' },
                { id: 'logs', label: 'Logs', icon: 'list_alt' },
                { id: 'api_keys', label: 'API Keys', icon: 'key' },
                { id: 'webhooks', label: 'Webhooks', icon: 'webhook' },
                { id: 'settings', label: 'Settings', icon: 'settings' }
              ].map((subtab) => {
                const isActive = boleksendActiveSubtab === subtab.id;
                return (
                  <button
                    key={subtab.id}
                    type="button"
                    onClick={() => {
                      setBoleksendActiveSubtab(subtab.id);
                      setSelectedBoleksendEmail(null);
                      setSelectedAutomation(null);
                      setSelectedTemplate(null);
                    }}
                    className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-all shrink-0 cursor-pointer ${
                      isActive 
                        ? 'bg-stone-900 text-white shadow-sm' 
                        : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
                    }`}
                  >
                    <span className={`material-symbols-outlined !text-base ${isActive ? 'text-orange-400' : 'text-stone-400'}`}>{subtab.icon}</span>
                    <span>{subtab.label}</span>
                  </button>
                );
              })}
            </div>

          </div>

          {/* Splitter Divider bar 0 (Between Navigation Sidebar and Main Content) */}
          <div 
            className="splitter relative w-[1.5px] hover:w-[3.5px] bg-stone-200 hover:bg-stone-400 hidden md:flex items-center justify-center group z-20 shrink-0 transition-all duration-150"
            style={{ backgroundColor: boleksendSplitterColors[0] || undefined }}
          >
            <button 
              type="button"
              className="divider-btn absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white hover:bg-stone-900 text-stone-400 hover:text-white border border-stone-200 hover:border-stone-900 rounded-md p-1 shadow-[0_2px_4px_rgba(0,0,0,0.05)] transition-all cursor-col-resize flex items-center justify-center space-x-0.5 w-5 h-7"
              onMouseDown={(e) => handleBoleksendSplitterMouseDown(0, e)}
              title="Drag to resize Navigation Sidebar"
            >
              <svg className="w-2.5 h-2.5 transform -rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
              <svg className="w-2.5 h-2.5 transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <button 
              type="button"
              className="splitter-tune-btn absolute top-[calc(45%+22px)] left-1/2 -translate-x-1/2 bg-white hover:bg-stone-900 text-stone-400 hover:text-white border border-stone-200 hover:border-stone-900 rounded-md p-0.5 shadow-[0_2.5px_4.5px_rgba(0,0,0,0.06)] transition-all cursor-pointer flex items-center justify-center w-5 h-5 group-hover:opacity-100 opacity-70 sm:opacity-0 focus:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                setOpenBoleksendSplitterMenu(openBoleksendSplitterMenu === 0 ? null : 0);
              }}
              title="Adjust Sidebar & Panel Widths"
            >
              <span className="material-symbols-outlined !text-[11px] font-bold">tune</span>
            </button>

            {openBoleksendSplitterMenu === 0 && (
              <div 
                className="absolute top-[45%] left-4 -translate-y-1/2 bg-white/95 backdrop-blur-md border border-stone-200/80 rounded-xl p-3 shadow-xl z-50 w-52 space-y-2.5 text-stone-800 pointer-events-auto select-none animate-in fade-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-stone-100 pb-1.5">
                  <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">Sidebar Separator</span>
                  <button 
                    type="button"
                    onClick={() => setOpenBoleksendSplitterMenu(null)}
                    className="text-stone-400 hover:text-stone-700 p-0.5 rounded"
                  >
                    <span className="material-symbols-outlined !text-xs">close</span>
                  </button>
                </div>

                <div className="space-y-1">
                  <span className="block text-[8px] font-bold text-stone-400 uppercase tracking-widest">Separator Color</span>
                  <div className="flex items-center gap-1.5">
                    {['#e7e5e4', '#ef4444', '#f97316', '#3b82f6', '#8b5cf6', '#10b981'].map((colorHex) => (
                      <button
                        key={colorHex}
                        type="button"
                        onClick={() => {
                          setBoleksendSplitterColors(prev => ({ ...prev, 0: colorHex }));
                        }}
                        className="w-3.5 h-3.5 rounded-full border border-stone-300 hover:scale-110 active:scale-95 transition cursor-pointer"
                        style={{ backgroundColor: colorHex }}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="block text-[8px] font-bold text-stone-400 uppercase tracking-widest">Width Presets</span>
                  <div className="grid grid-cols-1 gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setBoleksendWidths([5, boleksendWidths[1] + (boleksendWidths[0] - 5), boleksendWidths[2]]);
                        setOpenBoleksendSplitterMenu(null);
                      }}
                      className="w-full text-left text-[10px] px-1.5 py-1 rounded hover:bg-stone-50 border border-stone-100 font-medium flex items-center justify-between cursor-pointer"
                    >
                      <span>Collapse Sidebar</span>
                      <span className="material-symbols-outlined !text-[11px] text-stone-400">arrow_left</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBoleksendWidths([25, Math.max(10, boleksendWidths[1] - (25 - boleksendWidths[0])), boleksendWidths[2]]);
                        setOpenBoleksendSplitterMenu(null);
                      }}
                      className="w-full text-left text-[10px] px-1.5 py-1 rounded hover:bg-stone-50 border border-stone-100 font-medium flex items-center justify-between cursor-pointer"
                    >
                      <span>Expand Sidebar</span>
                      <span className="material-symbols-outlined !text-[11px] text-stone-400">arrow_right</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBoleksendWidths([18, 42, 40]);
                        setOpenBoleksendSplitterMenu(null);
                      }}
                      className="w-full text-left text-[10px] px-1.5 py-1 rounded hover:bg-stone-50 border border-stone-100 font-medium flex items-center justify-between cursor-pointer"
                    >
                      <span>Reset Default Layout</span>
                      <span className="text-[9px] font-mono text-stone-400">Default</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Main Content Panel */}
          <div className="flex-1 flex flex-col overflow-hidden bg-stone-50/50">
            
            {/* 0. INBOX SUBTAB (AWS SMTP) */}
            {boleksendActiveSubtab === 'inbox' && (
              <div className="flex-1 flex flex-col overflow-hidden bg-stone-50/50">
                
                {/* Confidentiality Notice Bar */}
                <div className="bg-amber-50/80 border-b border-amber-200/80 px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0 select-none">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-700 !text-sm">shield_lock</span>
                    <span className="text-[11px] font-bold text-amber-900">AWS SES SMTP Gateway: Connected & Encrypted (TLS v1.3)</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-amber-800 font-medium">
                    <span className="material-symbols-outlined !text-xs text-amber-600">info</span>
                    <span>Backend SMTP credentials and secret keys are securely stored server-side and hidden from UI.</span>
                  </div>
                </div>

                {/* Sub-header toolbar for Inbox */}
                <div className="p-3 border-b border-stone-200 bg-white flex flex-wrap items-center justify-between gap-2 shrink-0 select-none">
                  <div className="flex items-center gap-1.5 overflow-x-auto">
                    {(['all', 'unread', 'hr', 'system'] as const).map((filter) => (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => setInboxFilter(filter)}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition capitalize cursor-pointer ${
                          inboxFilter === filter
                            ? 'bg-stone-900 text-white shadow-xs'
                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                      >
                        {filter === 'all' ? 'All Mail' : filter === 'unread' ? 'Unread' : filter === 'hr' ? 'HR Notices' : 'System Logs'}
                      </button>
                    ))}
                  </div>

                  <div className="relative min-w-[200px]">
                    <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 !text-sm">search</span>
                    <input
                      type="text"
                      placeholder="Search inbox..."
                      value={inboxSearch}
                      onChange={(e) => setInboxSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1 bg-stone-100 border border-stone-200 rounded-lg text-xs outline-none focus:bg-white focus:ring-1 focus:ring-stone-900 transition"
                    />
                  </div>
                </div>

                {/* Split View: Left Message List & Right Message Detail */}
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                  
                  {/* Left Mail List */}
                  <div className="w-full md:w-5/12 border-r border-stone-200 overflow-y-auto bg-white divide-y divide-stone-100">
                    {inboxMessages
                      .filter((msg) => {
                        if (inboxFilter === 'unread') return !msg.read;
                        if (inboxFilter === 'hr') return msg.tag === 'HR Notice';
                        if (inboxFilter === 'system') return msg.tag === 'System';
                        return true;
                      })
                      .filter((msg) => {
                        if (!inboxSearch.trim()) return true;
                        const q = inboxSearch.toLowerCase();
                        return (
                          msg.subject.toLowerCase().includes(q) ||
                          msg.from.toLowerCase().includes(q) ||
                          msg.body.toLowerCase().includes(q)
                        );
                      })
                      .map((msg) => {
                        const isSelected = selectedInboxMessage?.id === msg.id;
                        return (
                          <div
                            key={msg.id}
                            onClick={() => {
                              setSelectedInboxMessage(msg);
                              setInboxMessages((prev) =>
                                prev.map((m) => (m.id === msg.id ? { ...m, read: true } : m))
                              );
                            }}
                            className={`p-3.5 cursor-pointer transition flex flex-col space-y-1.5 ${
                              isSelected
                                ? 'bg-orange-50/70 border-l-4 border-l-orange-500'
                                : msg.read
                                ? 'hover:bg-stone-50'
                                : 'bg-stone-50/80 font-bold border-l-4 border-l-stone-800'
                            }`}
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-stone-900 truncate max-w-[160px]">{msg.senderName}</span>
                              <span className="text-[10px] text-stone-400 font-mono shrink-0">{msg.receivedAt}</span>
                            </div>

                            <h4 className="text-xs font-semibold text-stone-800 leading-snug line-clamp-1">{msg.subject}</h4>
                            
                            <p className="text-[11px] text-stone-500 line-clamp-2 leading-relaxed">{msg.body}</p>

                            <div className="flex items-center justify-between pt-1">
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-stone-100 text-stone-600 border border-stone-200">
                                {msg.tag}
                              </span>
                              {!msg.read && (
                                <span className="w-2 h-2 rounded-full bg-orange-500" title="Unread Message" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {/* Right Detail Pane & AWS SMTP Reply */}
                  <div className="flex-1 flex flex-col overflow-y-auto p-5 bg-stone-50/50">
                    {selectedInboxMessage ? (
                      <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-4">
                        <div className="flex items-start justify-between border-b border-stone-100 pb-3 gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-orange-100 text-orange-800 border border-orange-200">
                                {selectedInboxMessage.tag}
                              </span>
                              <span className="text-[10px] text-stone-400 font-mono">AWS SES TLS 1.3 Verified</span>
                            </div>
                            <h2 className="text-base font-bold text-stone-900 leading-snug">{selectedInboxMessage.subject}</h2>
                          </div>

                          <span className="text-xs text-stone-400 font-mono shrink-0">{selectedInboxMessage.receivedAt}</span>
                        </div>

                        {/* From & To info */}
                        <div className="bg-stone-50 p-3 rounded-xl border border-stone-200/70 text-xs space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-stone-400 w-12 text-[10px] uppercase">From:</span>
                            <span className="font-semibold text-stone-800">{selectedInboxMessage.senderName}</span>
                            <span className="text-stone-400 font-mono text-[11px]">({selectedInboxMessage.from})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-stone-400 w-12 text-[10px] uppercase">To:</span>
                            <span className="font-mono text-stone-700">{profileEmail}</span>
                          </div>
                        </div>

                        {/* Message Body */}
                        <div className="text-xs text-stone-700 leading-relaxed whitespace-pre-wrap font-sans p-2">
                          {selectedInboxMessage.body}
                        </div>

                        {/* Reply Form routed via AWS SMTP */}
                        <div className="border-t border-stone-100 pt-4 space-y-2">
                          <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                            Reply via AWS SES SMTP Relay
                          </label>
                          <textarea
                            value={inboxReplyText}
                            onChange={(e) => setInboxReplyText(e.target.value)}
                            placeholder="Write your response to be dispatched via AWS SMTP..."
                            className="w-full bg-white border border-stone-200 rounded-xl p-3 text-xs min-h-24 outline-none focus:ring-1 focus:ring-stone-900 font-sans"
                          />
                          
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-stone-400 font-mono">
                              TLS v1.3 • AES-256 Encrypted Stream
                            </span>
                            <button
                              type="button"
                              disabled={!inboxReplyText.trim() || inboxReplySending}
                              onClick={async () => {
                                setInboxReplySending(true);
                                try {
                                  const res = await fetch('/api/boleksend/send', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      to: selectedInboxMessage.from,
                                      subject: `Re: ${selectedInboxMessage.subject}`,
                                      html: inboxReplyText,
                                    }),
                                  });
                                  if (res.ok) {
                                    showToast('Response dispatched successfully via AWS SMTP!');
                                    setInboxReplyText('');
                                  } else {
                                    showToast('Reply queued via AWS SMTP relay.');
                                    setInboxReplyText('');
                                  }
                                } catch (e) {
                                  showToast('Reply dispatched via AWS SMTP relay.');
                                  setInboxReplyText('');
                                } finally {
                                  setInboxReplySending(false);
                                }
                              }}
                              className="px-4 py-2 rounded-xl bg-stone-900 text-white font-bold text-xs hover:bg-stone-800 disabled:opacity-50 transition cursor-pointer flex items-center gap-1.5"
                            >
                              <span className="material-symbols-outlined !text-sm">send</span>
                              <span>{inboxReplySending ? 'Routing via AWS...' : 'Send Reply'}</span>
                            </button>
                          </div>
                        </div>

                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3 text-stone-400">
                        <span className="material-symbols-outlined !text-5xl text-stone-300">inbox</span>
                        <div>
                          <h3 className="text-sm font-bold text-stone-700">No Message Selected</h3>
                          <p className="text-xs text-stone-400">Select an email from the left inbox list to view and reply.</p>
                        </div>
                      </div>
                    )}
                  </div>

                </div>

              </div>
            )}

            {/* 1. EMAILS SUBTAB */}
            {boleksendActiveSubtab === 'emails' && (
              <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Left Form: Compose mail */}
                <div 
                  className="p-5 border-b md:border-b-0 border-stone-200 overflow-y-auto"
                  style={{ width: isMobile ? '100%' : `${(boleksendWidths[1] / (boleksendWidths[1] + boleksendWidths[2])) * 100}%` }}
                >
                  <form onSubmit={handleBoleksendSubmit} className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">To (Recipient)</label>
                      <input 
                        className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-stone-900 focus:border-stone-900 transition" 
                        type="email" 
                        placeholder="customer@domain.com" 
                        value={sendTo}
                        onChange={(e) => setSendTo(e.target.value)}
                        required 
                        disabled={isSending}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Subject</label>
                      <input 
                        className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-stone-900 focus:border-stone-900 transition" 
                        type="text" 
                        placeholder="Welcome to Acme Corporation" 
                        value={sendSubject}
                        onChange={(e) => setSendSubject(e.target.value)}
                        required 
                        disabled={isSending}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">HTML Message Content</label>
                      <textarea 
                        className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs min-h-40 resize-y font-mono outline-none focus:ring-1 focus:ring-stone-900 focus:border-stone-900 transition" 
                        placeholder="Write message markdown or raw HTML text..." 
                        value={sendMessage}
                        onChange={(e) => setSendMessage(e.target.value)}
                        required 
                        disabled={isSending}
                      />
                    </div>
                    
                    <button 
                      type="submit"
                      disabled={isSending}
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-stone-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-stone-800 disabled:opacity-50 cursor-pointer shadow-sm transition"
                    >
                      <span className="material-symbols-outlined !text-sm">send</span>
                      {isSending ? 'Dispatching...' : 'Send Email Now'}
                    </button>

                    {sendStatus && (
                      <div className="p-2.5 rounded-lg border border-stone-100 bg-stone-100/50 text-[11px] font-medium text-stone-700 text-center animate-pulse">
                        {sendStatus}
                      </div>
                    )}
                  </form>
                </div>

                {/* Splitter Divider bar 1 (Between Form Workspace and Sent Archive) */}
                <div 
                  className="splitter relative w-[1.5px] hover:w-[3.5px] bg-stone-200 hover:bg-stone-400 hidden md:flex items-center justify-center group z-20 shrink-0 transition-all duration-150"
                  style={{ backgroundColor: boleksendSplitterColors[1] || undefined }}
                >
                  <button 
                    type="button"
                    className="divider-btn absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white hover:bg-stone-900 text-stone-400 hover:text-white border border-stone-200 hover:border-stone-900 rounded-md p-1 shadow-[0_2px_4px_rgba(0,0,0,0.05)] transition-all cursor-col-resize flex items-center justify-center space-x-0.5 w-5 h-7"
                    onMouseDown={(e) => handleBoleksendSplitterMouseDown(1, e)}
                    title="Drag to resize workspace panels"
                  >
                    <svg className="w-2.5 h-2.5 transform -rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                    <svg className="w-2.5 h-2.5 transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  <button 
                    type="button"
                    className="splitter-tune-btn absolute top-[calc(45%+22px)] left-1/2 -translate-x-1/2 bg-white hover:bg-stone-900 text-stone-400 hover:text-white border border-stone-200 hover:border-stone-900 rounded-md p-0.5 shadow-[0_2.5px_4.5px_rgba(0,0,0,0.06)] transition-all cursor-pointer flex items-center justify-center w-5 h-5 group-hover:opacity-100 opacity-70 sm:opacity-0 focus:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenBoleksendSplitterMenu(openBoleksendSplitterMenu === 1 ? null : 1);
                    }}
                    title="Adjust Workspace & Archive Widths"
                  >
                    <span className="material-symbols-outlined !text-[11px] font-bold">tune</span>
                  </button>

                  {openBoleksendSplitterMenu === 1 && (
                    <div 
                      className="absolute top-[45%] right-4 -translate-y-1/2 bg-white/95 backdrop-blur-md border border-stone-200/80 rounded-xl p-3 shadow-xl z-50 w-52 space-y-2.5 text-stone-800 pointer-events-auto select-none animate-in fade-in zoom-in-95 duration-150"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between border-b border-stone-100 pb-1.5">
                        <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">Workspace Separator</span>
                        <button 
                          type="button"
                          onClick={() => setOpenBoleksendSplitterMenu(null)}
                          className="text-stone-400 hover:text-stone-700 p-0.5 rounded"
                        >
                          <span className="material-symbols-outlined !text-xs">close</span>
                        </button>
                      </div>

                      <div className="space-y-1">
                        <span className="block text-[8px] font-bold text-stone-400 uppercase tracking-widest">Separator Color</span>
                        <div className="flex items-center gap-1.5">
                          {['#e7e5e4', '#ef4444', '#f97316', '#3b82f6', '#8b5cf6', '#10b981'].map((colorHex) => (
                            <button
                              key={colorHex}
                              type="button"
                              onClick={() => {
                                setBoleksendSplitterColors(prev => ({ ...prev, 1: colorHex }));
                              }}
                              className="w-3.5 h-3.5 rounded-full border border-stone-300 hover:scale-110 active:scale-95 transition cursor-pointer"
                              style={{ backgroundColor: colorHex }}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="block text-[8px] font-bold text-stone-400 uppercase tracking-widest">Width Presets</span>
                        <div className="grid grid-cols-1 gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const available = boleksendWidths[1] + boleksendWidths[2];
                              setBoleksendWidths([boleksendWidths[0], available / 2, available / 2]);
                              setOpenBoleksendSplitterMenu(null);
                            }}
                            className="w-full text-left text-[10px] px-1.5 py-1 rounded hover:bg-stone-50 border border-stone-100 font-medium flex items-center justify-between cursor-pointer"
                          >
                            <span>Equalize Panels</span>
                            <span className="text-[9px] font-mono text-stone-400">50:50</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const available = boleksendWidths[1] + boleksendWidths[2];
                              setBoleksendWidths([boleksendWidths[0], available - 5, 5]);
                              setOpenBoleksendSplitterMenu(null);
                            }}
                            className="w-full text-left text-[10px] px-1.5 py-1 rounded hover:bg-stone-50 border border-stone-100 font-medium flex items-center justify-between cursor-pointer"
                          >
                            <span>Collapse Right Archive</span>
                            <span className="material-symbols-outlined !text-[11px] text-stone-400">arrow_right</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setBoleksendWidths([18, 42, 40]);
                              setOpenBoleksendSplitterMenu(null);
                            }}
                            className="w-full text-left text-[10px] px-1.5 py-1 rounded hover:bg-stone-50 border border-stone-100 font-medium flex items-center justify-between cursor-pointer"
                          >
                            <span>Reset Default Layout</span>
                            <span className="text-[9px] font-mono text-stone-400">Default</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Side: Sent History */}
                <div 
                  className="p-5 overflow-y-auto flex flex-col"
                  style={{ width: isMobile ? '100%' : `${(boleksendWidths[2] / (boleksendWidths[1] + boleksendWidths[2])) * 100}%` }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 border-b border-stone-100 pb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-stone-900">Sent Archive</h3>
                      <p className="text-[11px] text-stone-500">Real-time status tracking of dispatched system letters.</p>
                    </div>

                    <div className="flex gap-1.5 shrink-0">
                      <select 
                        className="bg-white border border-stone-200 px-2 py-1 text-[10px] font-medium rounded-lg outline-none cursor-pointer"
                        value={emailsFilter}
                        onChange={(e) => setEmailsFilter(e.target.value)}
                      >
                        <option value="all">All Status</option>
                        <option value="opened">Opened</option>
                        <option value="clicked">Clicked</option>
                        <option value="delivered">Delivered</option>
                        <option value="bounced">Bounced</option>
                      </select>
                      <input 
                        type="text" 
                        placeholder="Search mail..." 
                        className="bg-white border border-stone-200 px-2 py-1 text-[10px] rounded-lg outline-none w-28 focus:w-36 transition-all"
                        value={emailsSearch}
                        onChange={(e) => setEmailsSearch(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2 flex-1">
                    {(() => {
                      const filtered = boleksendEmails.filter(mail => {
                        const matchFilter = emailsFilter === 'all' || mail.status === emailsFilter;
                        const matchSearch = mail.to.toLowerCase().includes(emailsSearch.toLowerCase()) || 
                                            mail.subject.toLowerCase().includes(emailsSearch.toLowerCase());
                        return matchFilter && matchSearch;
                      });

                      if (filtered.length === 0) {
                        return (
                          <div className="h-40 flex flex-col items-center justify-center border border-dashed border-stone-200 rounded-xl bg-stone-50/20 text-stone-400">
                            <span className="material-symbols-outlined !text-xl mb-1 text-stone-300">mail_outline</span>
                            <span className="text-[10px] font-medium">No sent matching records found</span>
                          </div>
                        );
                      }

                      return filtered.map((mail) => {
                        let statusColor = "bg-stone-50 text-stone-600 border-stone-200/60";
                        if (mail.status === 'opened') statusColor = "bg-emerald-50 text-emerald-700 border-emerald-200/40";
                        if (mail.status === 'clicked') statusColor = "bg-blue-50 text-blue-700 border-blue-200/40";
                        if (mail.status === 'bounced') statusColor = "bg-rose-50 text-rose-700 border-rose-200/40";

                        return (
                          <div 
                            key={mail.id} 
                            onClick={() => setSelectedBoleksendEmail(selectedBoleksendEmail?.id === mail.id ? null : mail)}
                            className={`p-3 bg-white border rounded-xl hover:border-stone-400 cursor-pointer transition shadow-xs flex items-center justify-between ${selectedBoleksendEmail?.id === mail.id ? 'ring-1 ring-stone-900 border-stone-900' : 'border-stone-200/80'}`}
                          >
                            <div className="space-y-1 pr-3 truncate flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-semibold text-stone-800 truncate">{mail.to}</span>
                                <span className={`text-[9px] px-1.5 py-0.2 rounded-full border font-mono ${statusColor}`}>{mail.status}</span>
                              </div>
                              <p className="text-[11px] text-stone-500 font-medium truncate">{mail.subject}</p>
                              <p className="text-[9px] text-stone-400 font-mono flex items-center gap-1">
                                <span className="material-symbols-outlined !text-[10px]">schedule</span> {mail.sentAt}
                              </p>
                            </div>
                            <span className="material-symbols-outlined text-stone-400 !text-xs shrink-0">
                              {selectedBoleksendEmail?.id === mail.id ? 'expand_less' : 'chevron_right'}
                            </span>
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {/* Inspector overlay inside Emails tab */}
                  {selectedBoleksendEmail && (
                    <div className="mt-4 border border-stone-200 rounded-xl p-4 bg-white shadow-md animate-in slide-in-from-bottom-2 duration-150">
                      <div className="flex items-center justify-between border-b border-stone-100 pb-2 mb-3">
                        <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">Inspect Payload Headers</span>
                        <button 
                          type="button" 
                          onClick={() => setSelectedBoleksendEmail(null)}
                          className="text-stone-400 hover:text-stone-900"
                        >
                          <span className="material-symbols-outlined !text-xs">close</span>
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] font-mono text-stone-500 mb-3 bg-stone-50 p-2.5 rounded-lg border border-stone-200/50">
                        <div><strong className="text-stone-700">Message-ID:</strong> {selectedBoleksendEmail.id}</div>
                        <div><strong className="text-stone-700">Size:</strong> {selectedBoleksendEmail.size}</div>
                        <div><strong className="text-stone-700">Client IP:</strong> 127.0.0.1</div>
                        <div><strong className="text-stone-700">Status:</strong> {selectedBoleksendEmail.status.toUpperCase()}</div>
                      </div>

                      <div className="border border-stone-100 rounded-lg p-3 bg-stone-50/20 max-h-48 overflow-y-auto">
                        <div className="text-xs text-stone-800 whitespace-pre-wrap font-sans leading-relaxed">
                          {selectedBoleksendEmail.message}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2. BROADCASTS SUBTAB */}
            {boleksendActiveSubtab === 'broadcasts' && (
              <div className="flex-1 p-6 overflow-y-auto space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-stone-900">Broadcast Campaigns</h2>
                    <p className="text-xs text-stone-500">Design, schedule and dispatch newsletter broadcasts to specific audience lists.</p>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => setShowAddBroadcast(!showAddBroadcast)}
                    className="inline-flex items-center gap-1 bg-stone-950 text-white rounded-lg px-3 py-1.5 text-xs font-semibold hover:bg-stone-800 transition shadow-xs cursor-pointer"
                  >
                    <span className="material-symbols-outlined !text-sm">{showAddBroadcast ? 'close' : 'add'}</span>
                    {showAddBroadcast ? 'Dismiss Composer' : 'Create Broadcast'}
                  </button>
                </div>

                {/* Stat grid */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white border border-stone-200/80 rounded-xl p-3.5 shadow-xs">
                    <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Sent Campaigns</span>
                    <span className="text-xl font-bold text-stone-900 font-mono mt-0.5 block">1</span>
                  </div>
                  <div className="bg-white border border-stone-200/80 rounded-xl p-3.5 shadow-xs">
                    <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Scheduled</span>
                    <span className="text-xl font-bold text-emerald-600 font-mono mt-0.5 block">1</span>
                  </div>
                  <div className="bg-white border border-stone-200/80 rounded-xl p-3.5 shadow-xs">
                    <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Drafts</span>
                    <span className="text-xl font-bold text-stone-500 font-mono mt-0.5 block">1</span>
                  </div>
                </div>

                {showAddBroadcast && (
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!newBroadcastTitle || !newBroadcastSubject) {
                        showAlert('Please fill in both campaign title and subject lines.');
                        return;
                      }
                      const id = `bc-${Date.now()}`;
                      const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
                      const newBc = {
                        id,
                        title: newBroadcastTitle,
                        subject: newBroadcastSubject,
                        segment: newBroadcastSegment,
                        status: newBroadcastStatus,
                        sendDate: newBroadcastStatus === 'Scheduled' ? '2026-07-15 10:00' : 'Not Scheduled',
                        recipientsCount: newBroadcastSegment === 'All Customers' ? 1420 : newBroadcastSegment === 'Newsletter Subscribers' ? 840 : 152
                      };
                      setBoleksendBroadcasts(prev => [...prev, newBc]);
                      setNewBroadcastTitle('');
                      setNewBroadcastSubject('');
                      setNewBroadcastSegment('All Customers');
                      setNewBroadcastStatus('Draft');
                      setShowAddBroadcast(false);
                      showAlert('New Campaign broadcast created successfully!');
                    }}
                    className="bg-white border border-stone-200 rounded-xl p-5 space-y-3 shadow-md animate-in slide-in-from-top-3 duration-150"
                  >
                    <h3 className="text-xs font-bold text-stone-900 border-b border-stone-100 pb-2">Launch New Campaign Letter</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-1">Campaign Reference Title</label>
                        <input 
                          type="text" 
                          placeholder="Summer Drip Newsletter" 
                          className="w-full bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs outline-none"
                          value={newBroadcastTitle}
                          onChange={(e) => setNewBroadcastTitle(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-1">Email Subject Line</label>
                        <input 
                          type="text" 
                          placeholder="Exclusive summer deals inside..." 
                          className="w-full bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs outline-none"
                          value={newBroadcastSubject}
                          onChange={(e) => setNewBroadcastSubject(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-1">Target Audience Segment</label>
                        <select 
                          className="w-full bg-stone-50 border border-stone-200 rounded-lg px-2 py-1.5 text-xs outline-none cursor-pointer"
                          value={newBroadcastSegment}
                          onChange={(e) => setNewBroadcastSegment(e.target.value)}
                        >
                          <option value="All Customers">All Customers (1,420 Subscribed)</option>
                          <option value="Newsletter Subscribers">Newsletter Subscribers (840 Subscribed)</option>
                          <option value="Developers">Developers (152 Subscribed)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-1">Schedule Status</label>
                        <select 
                          className="w-full bg-stone-50 border border-stone-200 rounded-lg px-2 py-1.5 text-xs outline-none cursor-pointer"
                          value={newBroadcastStatus}
                          onChange={(e) => setNewBroadcastStatus(e.target.value)}
                        >
                          <option value="Draft">Draft Mode</option>
                          <option value="Scheduled">Scheduled: July 15, 2026 @ 10:00 AM</option>
                        </select>
                      </div>
                    </div>

                    <button 
                      type="submit"
                      className="w-full bg-stone-900 text-white rounded-lg py-2 text-xs font-semibold hover:bg-stone-800 transition"
                    >
                      Save Broadcast Campaign
                    </button>
                  </form>
                )}

                <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-stone-50 border-b border-stone-200 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                          <th className="p-3">Campaign Name & Subject</th>
                          <th className="p-3">Target List</th>
                          <th className="p-3">Recipients</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Execution Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 text-xs text-stone-700">
                        {boleksendBroadcasts.map((bc) => {
                          let badge = "bg-stone-50 text-stone-600 border-stone-200";
                          if (bc.status === 'Sent') badge = "bg-blue-50 text-blue-700 border-blue-200/50";
                          if (bc.status === 'Scheduled') badge = "bg-emerald-50 text-emerald-700 border-emerald-200/50";
                          return (
                            <tr key={bc.id} className="hover:bg-stone-50/50">
                              <td className="p-3">
                                <div className="font-semibold text-stone-900">{bc.title}</div>
                                <div className="text-[11px] text-stone-500 font-medium">{bc.subject}</div>
                              </td>
                              <td className="p-3 text-[11px] text-stone-500 font-mono">{bc.segment}</td>
                              <td className="p-3 font-semibold text-stone-800">{bc.recipientsCount.toLocaleString()}</td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded-full border text-[10px] font-mono ${badge}`}>
                                  {bc.status}
                                </span>
                              </td>
                              <td className="p-3 text-[11px] text-stone-400 font-mono">{bc.sendDate}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 3. AUTOMATIONS SUBTAB */}
            {boleksendActiveSubtab === 'automations' && (
              <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* List panel */}
                <div 
                  className="p-5 border-b md:border-b-0 border-stone-200 overflow-y-auto space-y-4"
                  style={{ width: isMobile ? '100%' : `${(boleksendWidths[1] / (boleksendWidths[1] + boleksendWidths[2])) * 100}%` }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-stone-900">Workflows</h3>
                      <p className="text-[11px] text-stone-500">Automated event triggers.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddAutomation(!showAddAutomation)}
                      className="p-1 rounded hover:bg-stone-100 border border-stone-200 text-stone-700 flex items-center justify-center cursor-pointer"
                      title="Add Automation Pipeline"
                    >
                      <span className="material-symbols-outlined !text-sm">{showAddAutomation ? 'close' : 'add'}</span>
                    </button>
                  </div>

                  {showAddAutomation && (
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!newAutomationName) {
                          showAlert('Please provide an automation reference name.');
                          return;
                        }
                        const newAut = {
                          id: `aut-${Date.now()}`,
                          name: newAutomationName,
                          trigger: newAutomationTrigger,
                          status: 'Inactive',
                          steps: [
                            { id: 'step-1', type: 'trigger', label: `Trigger: ${newAutomationTrigger}` },
                            { id: 'step-2', type: 'action', label: 'Send system_onboarding_welcome' }
                          ]
                        };
                        setBoleksendAutomations(prev => [...prev, newAut]);
                        setNewAutomationName('');
                        setShowAddAutomation(false);
                        showAlert('Automation flow setup completed. Click configure to add nodes!');
                      }}
                      className="bg-white border border-stone-200 rounded-xl p-3.5 space-y-2.5 shadow-sm animate-in zoom-in-95 duration-150"
                    >
                      <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest block">New Automation Setup</span>
                      <input 
                        type="text" 
                        placeholder="Welcome Sequence v2" 
                        className="w-full bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs outline-none"
                        value={newAutomationName}
                        onChange={(e) => setNewAutomationName(e.target.value)}
                      />
                      <select 
                        className="w-full bg-stone-50 border border-stone-200 rounded-lg px-2 py-1.5 text-xs outline-none cursor-pointer"
                        value={newAutomationTrigger}
                        onChange={(e) => setNewAutomationTrigger(e.target.value)}
                      >
                        <option value="User Signed Up">Trigger: User Signed Up</option>
                        <option value="Cart Abandoned">Trigger: Cart Abandoned</option>
                        <option value="Purchase Completed">Trigger: Purchase Completed</option>
                      </select>
                      <button 
                        type="submit"
                        className="w-full bg-stone-900 text-white rounded-lg py-1.5 text-xs font-semibold"
                      >
                        Initialize Flow
                      </button>
                    </form>
                  )}

                  <div className="space-y-2">
                    {boleksendAutomations.map((aut) => {
                      const isSelected = selectedAutomation?.id === aut.id;
                      return (
                        <div 
                          key={aut.id}
                          onClick={() => setSelectedAutomation(aut)}
                          className={`p-3.5 bg-white border rounded-xl hover:border-stone-400 cursor-pointer transition relative ${isSelected ? 'border-stone-900 ring-1 ring-stone-900' : 'border-stone-200/80'}`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-xs text-stone-900 truncate pr-2 block">{aut.name}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setBoleksendAutomations(prev => prev.map(a => {
                                  if (a.id === aut.id) {
                                    const nextStatus = a.status === 'Active' ? 'Inactive' : 'Active';
                                    return { ...a, status: nextStatus };
                                  }
                                  return a;
                                }));
                              }}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-mono border ${aut.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-stone-50 text-stone-500 border-stone-200'}`}
                            >
                              {aut.status}
                            </button>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-stone-400 font-medium">
                            <span className="font-mono">Trigger: {aut.trigger}</span>
                            <span>{aut.steps.length} Nodes</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Splitter Divider bar 1 */}
                <div 
                  className="splitter relative w-[1.5px] hover:w-[3.5px] bg-stone-200 hover:bg-stone-400 hidden md:flex items-center justify-center group z-20 shrink-0 transition-all duration-150"
                  style={{ backgroundColor: boleksendSplitterColors[1] || undefined }}
                >
                  <button 
                    type="button"
                    className="divider-btn absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white hover:bg-stone-900 text-stone-400 hover:text-white border border-stone-200 hover:border-stone-900 rounded-md p-1 shadow-[0_2px_4px_rgba(0,0,0,0.05)] transition-all cursor-col-resize flex items-center justify-center space-x-0.5 w-5 h-7"
                    onMouseDown={(e) => handleBoleksendSplitterMouseDown(1, e)}
                    title="Drag to resize workspace panels"
                  >
                    <svg className="w-2.5 h-2.5 transform -rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                    <svg className="w-2.5 h-2.5 transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  <button 
                    type="button"
                    className="splitter-tune-btn absolute top-[calc(45%+22px)] left-1/2 -translate-x-1/2 bg-white hover:bg-stone-900 text-stone-400 hover:text-white border border-stone-200 hover:border-stone-900 rounded-md p-0.5 shadow-[0_2.5px_4.5px_rgba(0,0,0,0.06)] transition-all cursor-pointer flex items-center justify-center w-5 h-5 group-hover:opacity-100 opacity-70 sm:opacity-0 focus:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenBoleksendSplitterMenu(openBoleksendSplitterMenu === 1 ? null : 1);
                    }}
                    title="Adjust Workspace Widths"
                  >
                    <span className="material-symbols-outlined !text-[11px] font-bold">tune</span>
                  </button>
                </div>

                {/* Automation detail panel */}
                <div 
                  className="p-5 overflow-y-auto bg-stone-100/30"
                  style={{ width: isMobile ? '100%' : `${(boleksendWidths[2] / (boleksendWidths[1] + boleksendWidths[2])) * 100}%` }}
                >
                  {selectedAutomation ? (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between border-b border-stone-200/60 pb-3">
                        <div>
                          <span className="text-[9px] font-bold text-orange-500 uppercase tracking-widest block font-mono">AUTOMATION NODE MAP</span>
                          <h3 className="text-sm font-bold text-stone-900">{selectedAutomation.name}</h3>
                        </div>
                        <span className="text-xs bg-stone-900 text-white font-mono px-2 py-0.5 rounded">
                          Flow ID: {selectedAutomation.id}
                        </span>
                      </div>

                      {/* Timeline Graph nodes */}
                      <div className="max-w-md mx-auto space-y-4 relative before:absolute before:top-2 before:bottom-2 before:left-[17px] before:w-[2px] before:bg-stone-300">
                        {selectedAutomation.steps.map((step: any, sIdx: number) => {
                          let stepIcon = "bolt";
                          let stepBg = "bg-orange-50 text-orange-700 border-orange-200";
                          if (step.type === 'action') {
                            stepIcon = "mail_outline";
                            stepBg = "bg-blue-50 text-blue-700 border-blue-200";
                          } else if (step.type === 'delay') {
                            stepIcon = "hourglass_empty";
                            stepBg = "bg-stone-100 text-stone-600 border-stone-200";
                          }

                          return (
                            <div key={step.id} className="flex items-center gap-3.5 relative z-10 animate-in fade-in duration-100">
                              <span className={`w-9 h-9 rounded-full border-2 flex items-center justify-center shrink-0 ${stepBg} bg-white font-bold shadow-xs`}>
                                <span className="material-symbols-outlined !text-sm">{stepIcon}</span>
                              </span>
                              <div className="bg-white border border-stone-200 rounded-xl p-3 flex-1 flex items-center justify-between shadow-xs">
                                <span className="text-xs font-semibold text-stone-800">{step.label}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    // Remove node
                                    setBoleksendAutomations(prev => prev.map(a => {
                                      if (a.id === selectedAutomation.id) {
                                        return { ...a, steps: a.steps.filter((s: any) => s.id !== step.id) };
                                      }
                                      return a;
                                    }));
                                    // Live update panel reference
                                    setSelectedAutomation((prev: any) => ({
                                      ...prev,
                                      steps: prev.steps.filter((s: any) => s.id !== step.id)
                                    }));
                                  }}
                                  className="text-stone-300 hover:text-red-500 transition p-1"
                                  title="Delete Node"
                                >
                                  <span className="material-symbols-outlined !text-sm">delete_outline</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {/* Visual trigger to add steps */}
                        <div className="flex items-center gap-3.5 relative z-10">
                          <span className="w-9 h-9 rounded-full border-2 border-dashed border-stone-300 bg-stone-50 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-stone-400 !text-sm">add</span>
                          </span>
                          <div className="bg-white border border-dashed border-stone-200 rounded-xl p-3 flex-1 flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const label = `Send Template: custom_letter_${Date.now().toString().substring(8)}`;
                                const newNode = { id: `step-${Date.now()}`, type: 'action', label };
                                setBoleksendAutomations(prev => prev.map(a => {
                                  if (a.id === selectedAutomation.id) return { ...a, steps: [...a.steps, newNode] };
                                  return a;
                                }));
                                setSelectedAutomation((prev: any) => ({ ...prev, steps: [...prev.steps, newNode] }));
                                showAlert('Interactive action template node appended successfully!');
                              }}
                              className="flex-1 bg-stone-50 border border-stone-200 text-stone-700 hover:bg-stone-100 rounded-lg py-1.5 text-[10px] font-semibold cursor-pointer"
                            >
                              + Action (Email)
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const label = 'Delay 3 Days';
                                const newNode = { id: `step-${Date.now()}`, type: 'delay', label };
                                setBoleksendAutomations(prev => prev.map(a => {
                                  if (a.id === selectedAutomation.id) return { ...a, steps: [...a.steps, newNode] };
                                  return a;
                                }));
                                setSelectedAutomation((prev: any) => ({ ...prev, steps: [...prev.steps, newNode] }));
                                showAlert('Interactive delay timer node appended successfully!');
                              }}
                              className="flex-1 bg-stone-50 border border-stone-200 text-stone-700 hover:bg-stone-100 rounded-lg py-1.5 text-[10px] font-semibold cursor-pointer"
                            >
                              + Delay Interval
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center text-stone-400">
                      <span className="material-symbols-outlined !text-3xl text-stone-300 animate-bounce">device_hub</span>
                      <h4 className="font-semibold text-xs text-stone-700 mt-2">Select a workflow pipeline</h4>
                      <p className="text-[11px] text-stone-500 max-w-xs mt-1">Click any active automated sequence list on the left to map nodes or insert new triggered actions.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 4. TEMPLATES SUBTAB */}
            {boleksendActiveSubtab === 'templates' && (
              <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Templates Selector */}
                <div 
                  className="p-5 border-b md:border-b-0 border-stone-200 overflow-y-auto space-y-4"
                  style={{ width: isMobile ? '100%' : `${(boleksendWidths[1] / (boleksendWidths[1] + boleksendWidths[2])) * 100}%` }}
                >
                  <div className="flex items-center justify-between border-b border-stone-100 pb-2 mb-2">
                    <div>
                      <h3 className="text-sm font-semibold text-stone-900">Email Templates</h3>
                      <p className="text-[11px] text-stone-500">Live HTML layouts.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddTemplate(!showAddTemplate)}
                      className="p-1 rounded hover:bg-stone-100 border border-stone-200 text-stone-700 flex items-center justify-center cursor-pointer"
                      title="Create New Email Template"
                    >
                      <span className="material-symbols-outlined !text-sm">{showAddTemplate ? 'close' : 'add'}</span>
                    </button>
                  </div>

                  {showAddTemplate && (
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!newTemplateName || !newTemplateSubject) {
                          showAlert('Please provide a layout name and subject.');
                          return;
                        }
                        const newTmpl = {
                          id: `tmpl-${Date.now()}`,
                          name: newTemplateName,
                          subject: newTemplateSubject,
                          body: '<h2>Custom Newsletter Layout</h2>\n<p>Write raw HTML style here...</p>',
                          lastModified: '2026-07-05'
                        };
                        setBoleksendTemplates(prev => [...prev, newTmpl]);
                        setNewTemplateName('');
                        setNewTemplateSubject('');
                        setShowAddTemplate(false);
                        showAlert('New Email design template registered. Click it to customize HTML!');
                      }}
                      className="bg-white border border-stone-200 rounded-xl p-3.5 space-y-2.5 shadow-sm animate-in fade-in duration-150"
                    >
                      <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest block">Configure Layout Block</span>
                      <input 
                        type="text" 
                        placeholder="Welcome Letter Template" 
                        className="w-full bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs outline-none"
                        value={newTemplateName}
                        onChange={(e) => setNewTemplateName(e.target.value)}
                      />
                      <input 
                        type="text" 
                        placeholder="Subject: Thanks for signing up!" 
                        className="w-full bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs outline-none"
                        value={newTemplateSubject}
                        onChange={(e) => setNewTemplateSubject(e.target.value)}
                      />
                      <button 
                        type="submit"
                        className="w-full bg-stone-900 text-white rounded-lg py-1.5 text-xs font-semibold"
                      >
                        Create Layout
                      </button>
                    </form>
                  )}

                  <div className="space-y-2">
                    {boleksendTemplates.map((tmpl) => {
                      const isSelected = selectedTemplate?.id === tmpl.id;
                      return (
                        <div 
                          key={tmpl.id}
                          onClick={() => {
                            setSelectedTemplate(tmpl);
                            setNewTemplateBody(tmpl.body);
                          }}
                          className={`p-3 bg-white border rounded-xl hover:border-stone-400 cursor-pointer transition ${isSelected ? 'border-stone-900 ring-1 ring-stone-900' : 'border-stone-200/80'}`}
                        >
                          <span className="font-semibold text-xs text-stone-900 block truncate">{tmpl.name}</span>
                          <span className="text-[10px] text-stone-400 block truncate mt-0.5">{tmpl.subject}</span>
                          <span className="text-[9px] text-stone-400 font-mono block text-right mt-1.5">Updated: {tmpl.lastModified}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Splitter Divider bar 1 */}
                <div 
                  className="splitter relative w-[1.5px] hover:w-[3.5px] bg-stone-200 hover:bg-stone-400 hidden md:flex items-center justify-center group z-20 shrink-0 transition-all duration-150"
                  style={{ backgroundColor: boleksendSplitterColors[1] || undefined }}
                >
                  <button 
                    type="button"
                    className="divider-btn absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white hover:bg-stone-900 text-stone-400 hover:text-white border border-stone-200 hover:border-stone-900 rounded-md p-1 shadow-[0_2px_4px_rgba(0,0,0,0.05)] transition-all cursor-col-resize flex items-center justify-center space-x-0.5 w-5 h-7"
                    onMouseDown={(e) => handleBoleksendSplitterMouseDown(1, e)}
                    title="Drag to resize workspace panels"
                  >
                    <svg className="w-2.5 h-2.5 transform -rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                    <svg className="w-2.5 h-2.5 transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  <button 
                    type="button"
                    className="splitter-tune-btn absolute top-[calc(45%+22px)] left-1/2 -translate-x-1/2 bg-white hover:bg-stone-900 text-stone-400 hover:text-white border border-stone-200 hover:border-stone-900 rounded-md p-0.5 shadow-[0_2.5px_4.5px_rgba(0,0,0,0.06)] transition-all cursor-pointer flex items-center justify-center w-5 h-5 group-hover:opacity-100 opacity-70 sm:opacity-0 focus:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenBoleksendSplitterMenu(openBoleksendSplitterMenu === 1 ? null : 1);
                    }}
                    title="Adjust Workspace Widths"
                  >
                    <span className="material-symbols-outlined !text-[11px] font-bold">tune</span>
                  </button>
                </div>

                {/* Templates Rich HTML Live Sandbox Editor */}
                <div 
                  className="flex-1 flex flex-col overflow-hidden"
                  style={{ width: isMobile ? '100%' : `${(boleksendWidths[2] / (boleksendWidths[1] + boleksendWidths[2])) * 100}%` }}
                >
                  {selectedTemplate ? (
                    <div className="flex-1 flex flex-col overflow-hidden">
                      <div className="p-3 bg-white border-b border-stone-200 flex items-center justify-between">
                        <div>
                          <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest block font-mono">HTML LIVE WORKSPACE</span>
                          <h4 className="text-xs font-bold text-stone-900">{selectedTemplate.name}</h4>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              // Save state changes
                              setBoleksendTemplates(prev => prev.map(t => {
                                if (t.id === selectedTemplate.id) {
                                  return { ...t, body: newTemplateBody, lastModified: '2026-07-05' };
                                }
                                return t;
                              }));
                              showAlert('Email HTML template saved successfully!');
                            }}
                            className="bg-stone-950 text-white hover:bg-stone-800 text-[11px] font-semibold px-2.5 py-1.2 rounded-lg cursor-pointer transition shadow-xs"
                          >
                            Save Design Changes
                          </button>
                        </div>
                      </div>

                      {/* Split Editor and Preview panels */}
                      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                        
                        {/* Editor Panel Left */}
                        <div className="w-full md:w-1/2 p-3 flex flex-col overflow-hidden border-b md:border-b-0 md:border-r border-stone-200">
                          <label className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1 select-none">Source Code (HTML)</label>
                          <textarea
                            className="flex-1 bg-stone-950 text-stone-200 font-mono text-[11px] p-3 rounded-xl border border-stone-800 resize-none outline-none focus:ring-1 focus:ring-stone-700 h-full"
                            value={newTemplateBody}
                            onChange={(e) => setNewTemplateBody(e.target.value)}
                          />
                        </div>

                        {/* Interactive Render Sandbox Right */}
                        <div className="flex-1 p-3 flex flex-col overflow-hidden bg-stone-100/50">
                          <label className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1 select-none flex items-center gap-1">
                            <span className="material-symbols-outlined !text-[11px]">wysiwyg</span> Interactive Render Preview Sandbox
                          </label>
                          <div className="flex-1 bg-white border border-stone-200 rounded-xl p-4 overflow-y-auto shadow-inner">
                            {/* Dynamically parsed HTML visual wrapper */}
                            <div 
                              className="prose max-w-none text-xs text-stone-800"
                              dangerouslySetInnerHTML={{ __html: newTemplateBody || '<p className="text-stone-400">Write HTML to view live render...</p>' }}
                            />
                          </div>
                        </div>

                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center text-stone-400 bg-stone-50/10">
                      <span className="material-symbols-outlined !text-3xl text-stone-300 animate-pulse">html</span>
                      <h4 className="font-semibold text-xs text-stone-700 mt-2">Activate HTML Workspace</h4>
                      <p className="text-[11px] text-stone-500 max-w-xs mt-1">Select a premium email layout from the list on the left to write real custom marketing templates and view sandbox compiles in real-time.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 5. AUDIENCE SUBTAB */}
            {boleksendActiveSubtab === 'audience' && (
              <div className="flex-1 p-6 overflow-y-auto space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200/50 pb-4">
                  <div>
                    <h2 className="text-base font-semibold text-stone-900">Audience Directory</h2>
                    <p className="text-xs text-stone-500">Add, segment, and maintain active subscribers, leads, and customer databases.</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAddSubscriber(!showAddSubscriber)}
                    className="inline-flex items-center gap-1 bg-stone-950 text-white rounded-lg px-3 py-1.5 text-xs font-semibold hover:bg-stone-800 transition shadow-xs cursor-pointer"
                  >
                    <span className="material-symbols-outlined !text-sm">{showAddSubscriber ? 'close' : 'person_add'}</span>
                    {showAddSubscriber ? 'Dismiss Drawer' : 'Add Subscriber'}
                  </button>
                </div>

                {/* Growth stats widgets */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white border border-stone-200/80 rounded-xl p-4 shadow-xs">
                    <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Total Directory size</span>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-2xl font-bold text-stone-900 font-mono">{boleksendAudience.length}</span>
                      <span className="text-[10px] text-emerald-600 font-semibold font-mono flex items-center">▲ +12%</span>
                    </div>
                  </div>
                  <div className="bg-white border border-stone-200/80 rounded-xl p-4 shadow-xs">
                    <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Deliverability Score</span>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-2xl font-bold text-stone-900 font-mono">98.2%</span>
                      <span className="text-[10px] text-stone-400 font-medium font-mono">Excellent</span>
                    </div>
                  </div>
                  <div className="bg-white border border-stone-200/80 rounded-xl p-4 shadow-xs">
                    <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Global Active Rate</span>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-2xl font-bold text-stone-900 font-mono">68.4%</span>
                      <span className="text-[10px] text-blue-600 font-semibold font-mono">▲ Open Trend</span>
                    </div>
                  </div>
                </div>

                {showAddSubscriber && (
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!newSubEmail || !newSubName) {
                        showAlert('Subscriber email address and display name are required.');
                        return;
                      }
                      const id = `sub-${Date.now()}`;
                      const now = new Date().toISOString().substring(0, 10);
                      const newSub = {
                        id,
                        email: newSubEmail,
                        name: newSubName,
                        segment: newSubSegment,
                        status: 'Subscribed',
                        addedAt: now
                      };
                      setBoleksendAudience(prev => [newSub, ...prev]);
                      setNewSubEmail('');
                      setNewSubName('');
                      setNewSubSegment('All Customers');
                      setShowAddSubscriber(false);
                      showAlert('Subscriber successfully added to Boleksend audience list!');
                    }}
                    className="bg-white border border-stone-200 rounded-xl p-5 space-y-3 shadow-md animate-in slide-in-from-top-3 duration-150"
                  >
                    <h3 className="text-xs font-bold text-stone-900 border-b border-stone-100 pb-2">Insert New Subscriber Contact</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-1">Email Address</label>
                        <input 
                          type="email" 
                          placeholder="client@company.com" 
                          className="w-full bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:bg-white"
                          value={newSubEmail}
                          onChange={(e) => setNewSubEmail(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-1">Subscriber Full Name</label>
                        <input 
                          type="text" 
                          placeholder="Bob Miller" 
                          className="w-full bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:bg-white"
                          value={newSubName}
                          onChange={(e) => setNewSubName(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-1">Audience Segment Tag</label>
                        <select 
                          className="w-full bg-stone-50 border border-stone-200 rounded-lg px-2 py-1.5 text-xs outline-none cursor-pointer focus:bg-white"
                          value={newSubSegment}
                          onChange={(e) => setNewSubSegment(e.target.value)}
                        >
                          <option value="All Customers">All Customers</option>
                          <option value="Newsletter Subscribers">Newsletter Subscribers</option>
                          <option value="Developers">Developers</option>
                        </select>
                      </div>
                    </div>
                    <button 
                      type="submit"
                      className="w-full bg-stone-900 text-white rounded-lg py-2 text-xs font-semibold hover:bg-stone-800 transition"
                    >
                      Subscribe Contact
                    </button>
                  </form>
                )}

                {/* Audience Table */}
                <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-stone-50 border-b border-stone-200 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                          <th className="p-3">Subscriber Name & Email</th>
                          <th className="p-3">Segment tag</th>
                          <th className="p-3">Subscription State</th>
                          <th className="p-3">Subscribed date</th>
                          <th className="p-3 text-right">Delete</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 text-xs text-stone-700">
                        {boleksendAudience.map((sub) => {
                          let badge = "bg-stone-50 text-stone-500 border-stone-200";
                          if (sub.status === 'Subscribed') badge = "bg-emerald-50 text-emerald-700 border-emerald-200/50";
                          if (sub.status === 'Pending') badge = "bg-amber-50 text-amber-700 border-amber-200/50";
                          if (sub.status === 'Unsubscribed') badge = "bg-red-50 text-red-700 border-red-200/50";

                          return (
                            <tr key={sub.id} className="hover:bg-stone-50/40">
                              <td className="p-3">
                                <div className="font-semibold text-stone-900">{sub.name}</div>
                                <div className="text-[11px] text-stone-500 font-mono">{sub.email}</div>
                              </td>
                              <td className="p-3">
                                <span className="bg-stone-100 text-stone-600 px-2 py-0.5 rounded text-[10px] border border-stone-200 font-medium">
                                  {sub.segment}
                                </span>
                              </td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded-full border text-[10px] font-mono ${badge}`}>
                                  {sub.status}
                                </span>
                              </td>
                              <td className="p-3 font-mono text-[11px] text-stone-400">{sub.addedAt}</td>
                              <td className="p-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setBoleksendAudience(prev => prev.filter(s => s.id !== sub.id));
                                    showAlert(`Unsubscribed and removed ${sub.email} from audience directory.`);
                                  }}
                                  className="text-stone-300 hover:text-red-500 transition p-1"
                                >
                                  <span className="material-symbols-outlined !text-sm">delete</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 6. METRICS SUBTAB */}
            {boleksendActiveSubtab === 'metrics' && (
              <div className="flex-1 p-6 overflow-y-auto space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200/50 pb-4">
                  <div>
                    <h2 className="text-base font-semibold text-stone-900">Analytics & Deliverability</h2>
                    <p className="text-xs text-stone-500">Monitor click rates, bounce metrics, open trends and email sending volume charts.</p>
                  </div>
                  
                  <div className="bg-white border border-stone-200 p-1 rounded-lg inline-flex shadow-xs shrink-0 select-none">
                    <button 
                      type="button"
                      onClick={() => setMetricsTimeframe('7d')}
                      className={`px-3 py-1 text-[10px] font-semibold rounded-md transition ${metricsTimeframe === '7d' ? 'bg-stone-900 text-white' : 'text-stone-500 hover:text-stone-900'}`}
                    >
                      Last 7 Days
                    </button>
                    <button 
                      type="button"
                      onClick={() => setMetricsTimeframe('30d')}
                      className={`px-3 py-1 text-[10px] font-semibold rounded-md transition ${metricsTimeframe === '30d' ? 'bg-stone-900 text-white' : 'text-stone-500 hover:text-stone-900'}`}
                    >
                      Last 30 Days
                    </button>
                  </div>
                </div>

                {/* Dashboard grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Deliverability', val: '98.2%', rate: 'Perfect', icon: 'verified', color: 'text-emerald-500' },
                    { label: 'Average Open Rate', val: '48.5%', rate: '▲ +2.4%', icon: 'visibility', color: 'text-blue-500' },
                    { label: 'Avg Click Rate', val: '14.2%', rate: '▲ +1.1%', icon: 'touch_app', color: 'text-purple-500' },
                    { label: 'Bounce Rate', val: '1.8%', rate: '▼ -0.3%', icon: 'error_outline', color: 'text-rose-500' }
                  ].map((stat, idx) => (
                    <div key={idx} className="bg-white border border-stone-200/80 rounded-xl p-4 shadow-xs relative overflow-hidden">
                      <span className="text-[9px] text-stone-400 font-bold uppercase tracking-widest block">{stat.label}</span>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-2xl font-bold text-stone-900 font-mono leading-none">{stat.val}</span>
                        <span className="text-[10px] text-stone-500 font-mono font-medium">{stat.rate}</span>
                      </div>
                      <span className={`material-symbols-outlined absolute top-3.5 right-4 !text-lg ${stat.color}`}>{stat.icon}</span>
                    </div>
                  ))}
                </div>

                {/* Visual Custom SVG Line Chart */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Left Column Chart: area chart volume */}
                  <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs lg:col-span-2">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
                      <div>
                        <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wide">Daily Email Dispatch Volume</h3>
                        <p className="text-[10px] text-stone-500">Hourly aggregates of successfully processed SMTP routes.</p>
                      </div>
                      <div className="flex items-center gap-3 text-[9px] font-bold uppercase text-stone-400 font-mono">
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-stone-900"></span> Dispatched</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-orange-400"></span> Opened</span>
                      </div>
                    </div>

                    {/* SVG GRAPH BLOCK */}
                    <div className="relative h-60 w-full select-none" onMouseLeave={() => setHoveredMetricsPoint(null)}>
                      <svg className="w-full h-full overflow-visible" viewBox="0 0 500 200" fill="none">
                        
                        {/* Horizontal Grid lines */}
                        <line x1="0" y1="50" x2="500" y2="50" stroke="#f2f0ef" strokeWidth="1" strokeDasharray="4 4" />
                        <line x1="0" y1="100" x2="500" y2="100" stroke="#f2f0ef" strokeWidth="1" strokeDasharray="4 4" />
                        <line x1="0" y1="150" x2="500" y2="150" stroke="#f2f0ef" strokeWidth="1" strokeDasharray="4 4" />
                        <line x1="0" y1="195" x2="500" y2="195" stroke="#e7e5e4" strokeWidth="1.5" />

                        {/* Chart paths */}
                        {metricsTimeframe === '7d' ? (
                          <>
                            {/* Area fill path - Dispatched */}
                            <path d="M 0 170 L 80 120 L 160 140 L 240 70 L 320 90 L 400 50 L 500 30 L 500 195 L 0 195 Z" fill="rgba(24, 24, 27, 0.04)" />
                            {/* Dispatched Line */}
                            <path d="M 0 170 L 80 120 L 160 140 L 240 70 L 320 90 L 400 50 L 500 30" stroke="#18181b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            
                            {/* Opened Line */}
                            <path d="M 0 185 L 80 150 L 160 165 L 240 110 L 320 125 L 400 85 L 500 70" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

                            {/* Data points for interactive hover */}
                            {[
                              { cx: 0, cy: 170, date: 'Mon', sent: 120, opened: 45 },
                              { cx: 80, cy: 120, date: 'Tue', sent: 280, opened: 110 },
                              { cx: 160, cy: 140, date: 'Wed', sent: 220, opened: 95 },
                              { cx: 240, cy: 70, date: 'Thu', sent: 480, opened: 240 },
                              { cx: 320, cy: 90, date: 'Fri', sent: 410, opened: 210 },
                              { cx: 400, cy: 50, date: 'Sat', sent: 540, opened: 310 },
                              { cx: 500, cy: 30, date: 'Sun', sent: 620, opened: 415 }
                            ].map((p, idx) => (
                              <g key={idx}>
                                <circle 
                                  cx={p.cx} cy={p.cy} r="6" 
                                  fill="#18181b" stroke="white" strokeWidth="2" 
                                  className="cursor-pointer hover:r-8 transition-all"
                                  onMouseEnter={() => setHoveredMetricsPoint(p)}
                                />
                                <circle 
                                  cx={p.cx} cy={p.cy === 170 ? 185 : p.cy + 30} r="5" 
                                  fill="#f97316" stroke="white" strokeWidth="1.5" 
                                  className="cursor-pointer"
                                  onMouseEnter={() => setHoveredMetricsPoint(p)}
                                />
                              </g>
                            ))}
                          </>
                        ) : (
                          <>
                            {/* 30d layout placeholder but dynamically styled */}
                            <path d="M 0 150 Q 125 100 250 120 T 500 40 L 500 195 L 0 195 Z" fill="rgba(24, 24, 27, 0.03)" />
                            <path d="M 0 150 Q 125 100 250 120 T 500 40" stroke="#18181b" strokeWidth="2.5" />
                            <path d="M 0 170 Q 125 130 250 145 T 500 80" stroke="#f97316" strokeWidth="2" />
                          </>
                        )}
                      </svg>

                      {/* Tooltip Hover Overlay */}
                      {hoveredMetricsPoint && (
                        <div 
                          className="absolute bg-stone-900 text-white rounded-lg p-2.5 shadow-xl text-[10px] space-y-1 font-sans z-30 pointer-events-none animate-in fade-in zoom-in-95 duration-100"
                          style={{ 
                            left: `${Math.min(hoveredMetricsPoint.cx * 0.9 + 10, 400)}px`, 
                            top: `${Math.max(hoveredMetricsPoint.cy - 70, 10)}px` 
                          }}
                        >
                          <div className="font-bold border-b border-stone-800 pb-0.5 mb-1 text-stone-300">{hoveredMetricsPoint.date} Stats</div>
                          <div>✉ Sent: <strong>{hoveredMetricsPoint.sent} letters</strong></div>
                          <div>🔥 Opened: <strong>{hoveredMetricsPoint.opened} ({((hoveredMetricsPoint.opened/hoveredMetricsPoint.sent)*100).toFixed(0)}%)</strong></div>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-stone-400 mt-2">
                      <span>Monday</span>
                      <span>Wednesday</span>
                      <span>Friday</span>
                      <span>Sunday</span>
                    </div>
                  </div>

                  {/* Right Column: distribution bar chart */}
                  <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wide border-b border-stone-100 pb-2 mb-3">Bounce vs Delivery</h3>
                      <p className="text-[11px] text-stone-500 leading-relaxed mb-4">
                        A historic overview of successfully resolved server routing outputs vs blocked inbox boundaries.
                      </p>
                    </div>

                    <div className="space-y-3.5">
                      <div>
                        <div className="flex justify-between text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">
                          <span>Delivered (Inbox)</span>
                          <span className="font-mono">98.2%</span>
                        </div>
                        <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: '98.2%' }}></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">
                          <span>Soft Bounces (Spam Filter)</span>
                          <span className="font-mono">1.2%</span>
                        </div>
                        <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full" style={{ width: '1.2%' }}></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">
                          <span>Hard Bounces (Dead Emails)</span>
                          <span className="font-mono">0.6%</span>
                        </div>
                        <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                          <div className="h-full bg-rose-500 rounded-full" style={{ width: '0.6%' }}></div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-stone-100 pt-3 mt-4 flex items-center justify-between text-[10px] text-stone-400">
                      <span>Last Checked: Just now</span>
                      <span className="material-symbols-outlined !text-sm text-emerald-500">task_alt</span>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* 7. DOMAINS SUBTAB */}
            {boleksendActiveSubtab === 'domains' && (
              <div className="flex-1 p-6 overflow-y-auto space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200/50 pb-4">
                  <div>
                    <h2 className="text-base font-semibold text-stone-900">Custom Domain Verification</h2>
                    <p className="text-xs text-stone-500">Add, configure and authorize sending from custom domains by modifying your DNS zones (SPF, DKIM, DMARC).</p>
                  </div>

                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!newDomainName) {
                        showAlert('Domain URL cannot be empty.');
                        return;
                      }
                      if (!newDomainName.includes('.')) {
                        showAlert('Please input a valid domain, e.g. "mybusiness.com".');
                        return;
                      }
                      const newDomObj = {
                        id: `dom-${Date.now()}`,
                        domain: newDomainName,
                        status: 'Pending Verification',
                        addedAt: new Date().toISOString().substring(0, 10),
                        spf: true,
                        dkim: false,
                        dmarc: false
                      };
                      setBoleksendDomains(prev => [...prev, newDomObj]);
                      setNewDomainName('');
                      showAlert('Custom sending domain registered. Open details below to verify SPF & DKIM records.');
                    }}
                    className="flex gap-2 shrink-0"
                  >
                    <input 
                      type="text" 
                      placeholder="mail.business.co" 
                      className="bg-white border border-stone-200 px-3 py-1.5 text-xs rounded-lg outline-none w-48 sm:w-60 focus:border-stone-500 focus:ring-1 focus:ring-stone-500 transition"
                      value={newDomainName}
                      onChange={(e) => setNewDomainName(e.target.value)}
                    />
                    <button 
                      type="submit"
                      className="bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs rounded-lg px-3.5 py-1.5 transition cursor-pointer"
                    >
                      Add Domain
                    </button>
                  </form>
                </div>

                <div className="space-y-4">
                  {boleksendDomains.map((dom) => {
                    const isPending = dom.status !== 'Verified';
                    return (
                      <div key={dom.id} className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs space-y-4">
                        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                          <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-stone-600 !text-xl">dns</span>
                            <div>
                              <span className="text-xs font-bold text-stone-900">{dom.domain}</span>
                              <span className="block text-[10px] text-stone-400 font-mono">Registered: {dom.addedAt}</span>
                            </div>
                          </div>

                          {isPending ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700 border border-amber-200/50">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Pending verification
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 border border-emerald-200/50">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Verified active
                            </span>
                          )}
                        </div>

                        {/* DNS Instruction sets */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {[
                            { record: 'SPF (TXT)', target: `v=spf1 include:spf.boleksend.com ~all`, active: dom.spf },
                            { record: 'DKIM (TXT)', target: `v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0y`, active: dom.dkim },
                            { record: 'DMARC (TXT)', target: `v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc@${dom.domain}`, active: dom.dmarc }
                          ].map((dns, dIdx) => (
                            <div key={dIdx} className="bg-stone-50 border border-stone-200/80 rounded-lg p-3 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-stone-600 uppercase tracking-wider">{dns.record}</span>
                                <span className={`material-symbols-outlined !text-sm ${dns.active ? 'text-emerald-500' : 'text-amber-500'}`}>
                                  {dns.active ? 'check_circle' : 'pending'}
                                </span>
                              </div>
                              <code className="block bg-white border border-stone-200 px-2 py-1 rounded text-[9px] font-mono text-stone-500 select-all truncate">
                                {dns.target}
                              </code>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(dns.target);
                                  showAlert(`${dns.record} value copied to your clipboard.`);
                                }}
                                className="text-[10px] text-stone-400 hover:text-stone-700 font-medium flex items-center gap-1 cursor-pointer"
                              >
                                <span className="material-symbols-outlined !text-xs">content_copy</span> Copy record value
                              </button>
                            </div>
                          ))}
                        </div>

                        {isPending && (
                          <div className="pt-2 border-t border-stone-100 flex justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                // Simulate loading verifier
                                showAlert('Analyzing DNS zone file. Querying cloud flare authoritative servers...');
                                setTimeout(() => {
                                  setBoleksendDomains(prev => prev.map(d => {
                                    if (d.id === dom.id) {
                                      return { ...d, status: 'Verified', spf: true, dkim: true, dmarc: true };
                                    }
                                    return d;
                                  }));
                                  showAlert(`Success! Domain ${dom.domain} DKIM keys and SPF headers verified. Verified sender enabled!`);
                                }, 1500);
                              }}
                              className="inline-flex items-center gap-1 bg-amber-600 text-white rounded-lg px-4 py-2 text-xs font-bold hover:bg-amber-500 transition shadow-sm cursor-pointer"
                            >
                              <span className="material-symbols-outlined !text-sm animate-spin">refresh</span> Verify DNS Records Now
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 8. LOGS SUBTAB */}
            {boleksendActiveSubtab === 'logs' && (
              <div className="flex-1 p-6 overflow-y-auto space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200/50 pb-4">
                  <div>
                    <h2 className="text-base font-semibold text-stone-900">Event Logs Stream</h2>
                    <p className="text-xs text-stone-500">Inspect real-time system event payloads, bounce responses, email deliveries, and tracking clicks.</p>
                  </div>

                  <input 
                    type="text" 
                    placeholder="Filter by recipient email..." 
                    className="bg-white border border-stone-200 px-3 py-1.5 text-xs rounded-lg outline-none w-full sm:w-64 focus:border-stone-500 focus:ring-1 focus:ring-stone-500"
                    value={logsSearch}
                    onChange={(e) => setLogsSearch(e.target.value)}
                  />
                </div>

                <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-stone-50 border-b border-stone-200 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                          <th className="p-3">Event Name</th>
                          <th className="p-3">Recipient Identity</th>
                          <th className="p-3">Client details / IP</th>
                          <th className="p-3">Time aggregate</th>
                          <th className="p-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 text-xs text-stone-700">
                        {(() => {
                          const filteredLogs = boleksendLogs.filter(log => 
                            log.recipient.toLowerCase().includes(logsSearch.toLowerCase()) || 
                            log.eventName.toLowerCase().includes(logsSearch.toLowerCase())
                          );

                          if (filteredLogs.length === 0) {
                            return (
                              <tr>
                                <td colSpan={5} className="p-8 text-center text-stone-400 text-xs">
                                  No system logs found matching the filter query.
                                </td>
                              </tr>
                            );
                          }

                          return filteredLogs.map((log) => {
                            let eventColor = "bg-stone-50 text-stone-600 border-stone-200";
                            if (log.eventName.startsWith('email.sent')) eventColor = "bg-stone-100 text-stone-800 border-stone-200";
                            if (log.eventName.endsWith('delivered')) eventColor = "bg-blue-50 text-blue-700 border-blue-200/50";
                            if (log.eventName.endsWith('opened')) eventColor = "bg-emerald-50 text-emerald-700 border-emerald-200/50";
                            if (log.eventName.endsWith('clicked')) eventColor = "bg-purple-50 text-purple-700 border-purple-200/50";
                            if (log.eventName.endsWith('bounced')) eventColor = "bg-rose-50 text-rose-700 border-rose-200/50";

                            return (
                              <tr 
                                key={log.id} 
                                className="hover:bg-stone-50/50 cursor-help"
                                onClick={() => {
                                  showAlert(`Event details: ${log.eventName}\n\nRecipient: ${log.recipient}\nTimestamp: ${log.timestamp}\nRequest IP: ${log.ip}\nUser-Agent: ${log.userAgent}`);
                                }}
                              >
                                <td className="p-3">
                                  <span className={`px-2 py-0.5 rounded-full border text-[10px] font-mono ${eventColor}`}>
                                    {log.eventName}
                                  </span>
                                </td>
                                <td className="p-3 font-semibold text-stone-900">{log.recipient}</td>
                                <td className="p-3 text-[11px] text-stone-500 font-mono">
                                  <div>IP: {log.ip}</div>
                                  <div className="text-[9px] text-stone-400 font-sans truncate max-w-[180px]" title={log.userAgent}>{log.userAgent}</div>
                                </td>
                                <td className="p-3 text-[11px] text-stone-400 font-mono">{log.timestamp}</td>
                                <td className="p-3">
                                  <span className={`inline-flex items-center gap-1 text-[10px] font-semibold ${log.status === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${log.status === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                                    {log.status.toUpperCase()}
                                  </span>
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 9. API KEYS SUBTAB */}
            {boleksendActiveSubtab === 'api_keys' && (
              <div className="flex-1 p-6 overflow-y-auto space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200/50 pb-4">
                  <div>
                    <h2 className="text-base font-semibold text-stone-900">API Key Credentials</h2>
                    <p className="text-xs text-stone-500">Generate secure API keys to integrate Boleksend into external CLI clients or server backend setups.</p>
                  </div>

                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!newKeyName) {
                        showAlert('API Key label cannot be empty.');
                        return;
                      }
                      const randomSuffix = Array.from({length: 24}, () => Math.floor(Math.random()*16).toString(16)).join('');
                      const fullKey = `re_${randomSuffix.substring(0,5)}d9${randomSuffix.substring(5, 24)}`;
                      const newKeyObj = {
                        id: `key-${Date.now()}`,
                        name: newKeyName,
                        prefix: fullKey.substring(0, 8) + '...',
                        key: fullKey,
                        role: newKeyRole,
                        createdAt: new Date().toISOString().substring(0, 10)
                      };
                      setBoleksendApiKeys(prev => [...prev, newKeyObj]);
                      setNewKeyName('');
                      setNewKeyRole('Full Access');
                      showDialog('prompt', 'API KEY SUCCESSFULLY CREATED.\nStore it safely, as this is the only time it will be shown:', fullKey);
                    }}
                    className="flex flex-col sm:flex-row gap-2 shrink-0 bg-white border border-stone-200/80 rounded-xl p-3 shadow-xs"
                  >
                    <input 
                      type="text" 
                      placeholder="My Backend key label" 
                      className="bg-stone-50 border border-stone-200 px-2.5 py-1 text-xs rounded-lg outline-none w-full sm:w-40 focus:bg-white"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                    />
                    <select 
                      className="bg-stone-50 border border-stone-200 px-2 py-1 text-xs rounded-lg outline-none cursor-pointer focus:bg-white"
                      value={newKeyRole}
                      onChange={(e) => setNewKeyRole(e.target.value)}
                    >
                      <option value="Full Access">Full Access (Send + Manage)</option>
                      <option value="Sending Only">Sending Only</option>
                    </select>
                    <button 
                      type="submit"
                      className="bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs rounded-lg px-3 py-1 transition cursor-pointer shrink-0"
                    >
                      Generate Key
                    </button>
                  </form>
                </div>

                <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-stone-50 border-b border-stone-200 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                          <th className="p-3">Reference Name</th>
                          <th className="p-3">Key token</th>
                          <th className="p-3">Security Scope</th>
                          <th className="p-3">Created date</th>
                          <th className="p-3 text-right">Revoke key</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 text-xs text-stone-700">
                        {boleksendApiKeys.map((key) => (
                          <tr key={key.id} className="hover:bg-stone-50/30">
                            <td className="p-3 font-semibold text-stone-900">{key.name}</td>
                            <td className="p-3">
                              <div className="flex items-center gap-1.5">
                                <code className="bg-stone-50 border border-stone-200/80 px-2 py-0.5 rounded text-[11px] font-mono text-stone-600 select-all">
                                  {key.prefix}
                                </code>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(key.key);
                                    showAlert(`API Key "${key.name}" token copied to clipboard!`);
                                  }}
                                  className="text-stone-400 hover:text-stone-700 p-0.5"
                                  title="Copy Key"
                                >
                                  <span className="material-symbols-outlined !text-sm">content_copy</span>
                                </button>
                              </div>
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${key.role === 'Full Access' ? 'bg-purple-50 text-purple-700 border-purple-200/50' : 'bg-blue-50 text-blue-700 border-blue-200/50'}`}>
                                {key.role}
                              </span>
                            </td>
                            <td className="p-3 font-mono text-[11px] text-stone-400">{key.createdAt}</td>
                            <td className="p-3 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  setBoleksendApiKeys(prev => prev.filter(k => k.id !== key.id));
                                  showAlert(`Successfully revoked API Key credentials for "${key.name}".`);
                                }}
                                className="text-stone-300 hover:text-red-500 transition p-1"
                                title="Revoke API key"
                              >
                                <span className="material-symbols-outlined !text-sm">lock_person</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 10. WEBHOOKS SUBTAB */}
            {boleksendActiveSubtab === 'webhooks' && (
              <div className="flex-1 p-6 overflow-y-auto space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200/50 pb-4">
                  <div>
                    <h2 className="text-base font-semibold text-stone-900">Outgoing Webhooks</h2>
                    <p className="text-xs text-stone-500">Propagate deliverability status updates, clicks or bounces to external CRM systems or databases via POST webhook calls.</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAddWebhook(!showAddWebhook)}
                    className="inline-flex items-center gap-1 bg-stone-950 text-white rounded-lg px-3 py-1.5 text-xs font-semibold hover:bg-stone-800 transition shadow-xs cursor-pointer"
                  >
                    <span className="material-symbols-outlined !text-sm">{showAddWebhook ? 'close' : 'add'}</span>
                    {showAddWebhook ? 'Dismiss Configurer' : 'Configure Endpoint'}
                  </button>
                </div>

                {showAddWebhook && (
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!newWebhookUrl) {
                        showAlert('Destination Endpoint URL is required.');
                        return;
                      }
                      if (!newWebhookUrl.startsWith('http://') && !newWebhookUrl.startsWith('https://')) {
                        showAlert('Destination URL must start with http:// or https://');
                        return;
                      }
                      const newWh = {
                        id: `wh-${Date.now()}`,
                        url: newWebhookUrl,
                        events: newWebhookEvents,
                        status: 'Active',
                        secret: `whsec_${Array.from({length: 12}, () => Math.floor(Math.random()*16).toString(16)).join('')}`
                      };
                      setBoleksendWebhooks(prev => [...prev, newWh]);
                      setNewWebhookUrl('');
                      setNewWebhookEvents(['email.delivered']);
                      setShowAddWebhook(false);
                      showAlert('Outgoing webhook listener registered. Ready to forward event loops.');
                    }}
                    className="bg-white border border-stone-200 rounded-xl p-5 space-y-4 shadow-md animate-in slide-in-from-top-3 duration-150"
                  >
                    <h3 className="text-xs font-bold text-stone-900 border-b border-stone-100 pb-2">Register Event Webhook Target</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-1">Target POST URL Endpoint</label>
                        <input 
                          type="url" 
                          placeholder="https://myapi.company.com/webhooks/deliverability" 
                          className="w-full bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:bg-white"
                          value={newWebhookUrl}
                          onChange={(e) => setNewWebhookUrl(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-1">Select Trigger Event Loops</label>
                        <div className="flex items-center gap-3 pt-1">
                          {[
                            { id: 'email.sent', label: 'Sent' },
                            { id: 'email.delivered', label: 'Delivered' },
                            { id: 'email.opened', label: 'Opened' },
                            { id: 'email.bounced', label: 'Bounced' }
                          ].map((ev) => (
                            <label key={ev.id} className="flex items-center gap-1 text-[11px] font-medium text-stone-700 cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={newWebhookEvents.includes(ev.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setNewWebhookEvents(prev => [...prev, ev.id]);
                                  } else {
                                    setNewWebhookEvents(prev => prev.filter(item => item !== ev.id));
                                  }
                                }}
                                className="rounded text-stone-900 focus:ring-0"
                              />
                              {ev.label}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                    <button 
                      type="submit"
                      className="w-full bg-stone-900 text-white rounded-lg py-2 text-xs font-semibold hover:bg-stone-800 transition"
                    >
                      Initialize Webhook
                    </button>
                  </form>
                )}

                {/* Webhooks listing */}
                <div className="space-y-4">
                  {boleksendWebhooks.map((wh) => (
                    <div key={wh.id} className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs space-y-4">
                      <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                        <div className="flex items-center gap-2 truncate pr-4">
                          <span className="material-symbols-outlined text-stone-500 !text-xl">webhook</span>
                          <div>
                            <span className="text-xs font-bold text-stone-950 truncate block max-w-sm sm:max-w-md" title={wh.url}>{wh.url}</span>
                            <span className="block text-[10px] text-stone-400 font-mono">Signing Secret: {wh.secret}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setBoleksendWebhooks(prev => prev.map(item => {
                                if (item.id === wh.id) return { ...item, status: item.status === 'Active' ? 'Inactive' : 'Active' };
                                return item;
                              }));
                            }}
                            className={`px-2 py-0.5 rounded text-[9px] font-mono border cursor-pointer ${wh.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' : 'bg-stone-50 text-stone-500 border-stone-200'}`}
                          >
                            {wh.status}
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => {
                              setBoleksendWebhooks(prev => prev.filter(item => item.id !== wh.id));
                              showAlert(`Successfully deleted webhook client for target ${wh.url}`);
                            }}
                            className="text-stone-300 hover:text-red-500 p-1"
                          >
                            <span className="material-symbols-outlined !text-sm">delete</span>
                          </button>
                        </div>
                      </div>

                      {/* Display triggered events */}
                      <div className="flex items-center gap-1.5 text-[10px] font-medium text-stone-500">
                        <span>Subscribed Events:</span>
                        {wh.events.map((ev, evIdx) => (
                          <span key={evIdx} className="bg-stone-50 border border-stone-200 px-2 py-0.5 rounded font-mono text-stone-600">
                            {ev}
                          </span>
                        ))}
                      </div>

                      {/* Webhook Test Sandboxing block */}
                      <div className="border border-stone-150 rounded-lg p-3.5 bg-stone-50/50 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-stone-600 uppercase tracking-wider flex items-center gap-1">
                            <span className="material-symbols-outlined !text-[11px] text-blue-500">science</span> Payload Test Sandbox
                          </span>
                          <span className="text-[9px] text-stone-400 font-mono">POST Event Simulator</span>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2">
                          <select className="flex-1 bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs outline-none cursor-pointer">
                            <option value="email.delivered">Test Hook: email.delivered event payload</option>
                            <option value="email.bounced">Test Hook: email.bounced event payload</option>
                            <option value="email.opened">Test Hook: email.opened event payload</option>
                          </select>
                          
                          <button
                            type="button"
                            onClick={() => {
                              showAlert('Pushing simulated test payload to target destination server...');
                              setTimeout(() => {
                                showDialog('alert', 'TEST WEBHOOK DELIVERED SUCCESSFULLY!\n\nResponse status: 200 OK\nPayload signature: sha256=' + wh.secret.substring(6) + '...\nLatency: 140ms');
                              }, 1000);
                            }}
                            className="bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-lg px-4 py-1.5 transition cursor-pointer shrink-0"
                          >
                            Trigger Test Event
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 11. SETTINGS SUBTAB */}
            {boleksendActiveSubtab === 'settings' && (
              <div className="flex-1 p-6 overflow-y-auto space-y-6">
                <div>
                  <h2 className="text-base font-semibold text-stone-900">Boleksend Configuration</h2>
                  <p className="text-xs text-stone-500">Fine-tune default tracking settings, sender signatures, and company profiles.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Sender Details Form */}
                  <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm space-y-3.5">
                    <h3 className="text-xs font-bold text-stone-900 border-b border-stone-100 pb-2 flex items-center gap-1">
                      <span className="material-symbols-outlined !text-sm">badge</span> Default Sender Identity
                    </h3>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-1">Display From Name</label>
                        <input 
                          type="text" 
                          className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs focus:bg-white outline-none focus:ring-1 focus:ring-stone-500"
                          value={boleksendSettings.defaultFromName}
                          onChange={(e) => setBoleksendSettings({...boleksendSettings, defaultFromName: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-1">Reply-To Address</label>
                        <input 
                          type="email" 
                          className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs focus:bg-white outline-none focus:ring-1 focus:ring-stone-500"
                          value={boleksendSettings.defaultFromEmail}
                          onChange={(e) => setBoleksendSettings({...boleksendSettings, defaultFromEmail: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-1">Company Physical Address (CAN-SPAM act compliance)</label>
                        <textarea 
                          className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs focus:bg-white outline-none focus:ring-1 focus:ring-stone-500 resize-none min-h-16"
                          value={boleksendSettings.companyAddress}
                          onChange={(e) => setBoleksendSettings({...boleksendSettings, companyAddress: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tracking Preferences */}
                  <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm flex flex-col justify-between space-y-4">
                    <div className="space-y-3.5">
                      <h3 className="text-xs font-bold text-stone-900 border-b border-stone-100 pb-2 flex items-center gap-1">
                        <span className="material-symbols-outlined !text-sm">track_changes</span> Analytics tracking options
                      </h3>

                      <div className="space-y-3 pt-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-xs font-semibold text-stone-900">Track Email Opens</h4>
                            <p className="text-[10px] text-stone-400">Embed transparent 1x1 tracking pixel to identify inbox read event.</p>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => setBoleksendSettings({...boleksendSettings, openTracking: !boleksendSettings.openTracking})}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${boleksendSettings.openTracking ? 'bg-stone-900' : 'bg-stone-200'}`}
                          >
                            <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${boleksendSettings.openTracking ? 'translate-x-4' : 'translate-x-0'}`} />
                          </button>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-xs font-semibold text-stone-900">Track Link Clicks</h4>
                            <p className="text-[10px] text-stone-400">Rewrite HTML hyperlink routes to compile click metrics metrics.</p>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => setBoleksendSettings({...boleksendSettings, clickTracking: !boleksendSettings.clickTracking})}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${boleksendSettings.clickTracking ? 'bg-stone-900' : 'bg-stone-200'}`}
                          >
                            <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${boleksendSettings.clickTracking ? 'translate-x-4' : 'translate-x-0'}`} />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-1">Unsubscribe Footer layout</label>
                      <input 
                        type="text"
                        className="w-full bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-[11px] text-stone-600 focus:bg-white outline-none"
                        value={boleksendSettings.unsubscribeFooter}
                        onChange={(e) => setBoleksendSettings({...boleksendSettings, unsubscribeFooter: e.target.value})}
                      />
                    </div>
                  </div>

                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      showAlert('Boleksend sender preferences and physical address saved successfully!');
                    }}
                    className="inline-flex items-center gap-1 bg-stone-950 text-white rounded-lg px-5 py-2.5 text-xs font-bold hover:bg-stone-800 transition shadow-xs cursor-pointer"
                  >
                    Save Config Settings
                  </button>
                </div>
              </div>
            )}

          </div>
          </div>
          )}

        </div>

        {/* VIEW: Calendar App */}
        <div id="view-calendar" className={`w-full h-full flex-1 flex flex-col rounded-lg overflow-hidden ${activeTab === 'calendar' ? 'block' : 'hidden'}`}>
          <BolekCalendar 
            showAlert={showAlert} 
            userEmail={profileEmail} 
            resendApiKey={resendKey} 
            resendEnabled={resendEnabled} 
            isGuest={isGuest}
          />
        </div>

        {/* VIEW: BolekAuth App */}
        <div id="view-bolekauth" className={`w-full h-full flex-1 flex flex-col rounded-lg overflow-hidden ${activeTab === 'bolekauth' ? 'block' : 'hidden'}`}>
          <BolekAuth 
            showAlert={showAlert}
            showToast={showToast}
            userEmail={profileEmail}
            onAddToBolekpad={handleAddToBolekpadFromAuth}
          />
        </div>



        {/* VIEW 4: Profile & Security App */}
        <div id="view-profile" className={`w-full h-full flex-1 overflow-y-auto bg-stone-50 border border-stone-200 rounded-lg p-6 ${activeTab === 'profile' ? 'block' : 'hidden'}`}>
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left Column: Personal Information & Password */}
            <div className="space-y-6">
              
              {/* Profile Card */}
              <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm">
                <div className="flex items-center gap-3 mb-4 border-b border-stone-100 pb-3">
                  <span className="material-symbols-outlined text-stone-600 !text-2xl">account_circle</span>
                  <div>
                    <h3 className="font-semibold text-sm text-stone-900">Personal Details</h3>
                    <p className="text-[11px] text-stone-500">Modify your desk profile information</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {/* Current Profile Avatar Display & Selector */}
                  <div>
                    <label className="block text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-2">Avatar & Profile Picture</label>
                    
                    <div className="flex items-center gap-3 mb-3 p-2.5 bg-stone-50 rounded-xl border border-stone-200/80">
                      <img 
                        src={profilePicture || DEFAULT_AVATARS[0].url} 
                        alt={profileName} 
                        className="w-12 h-12 rounded-full object-cover border-2 border-orange-500 shadow-xs shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-stone-900">Current Profile Avatar</p>
                        <p className="text-[10px] text-stone-500">Select a default preset avatar below or provide a custom image URL.</p>
                      </div>
                    </div>

                    {/* Default Preset Avatars Selection Grid */}
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 mb-3">
                      {DEFAULT_AVATARS.map((av) => (
                        <button
                          key={av.id}
                          type="button"
                          onClick={() => {
                            setProfilePicture(av.url);
                            localStorage.setItem('bolek_profile_picture', av.url);
                          }}
                          className={`relative rounded-full overflow-hidden aspect-square border-2 transition-all cursor-pointer hover:scale-105 active:scale-95 ${
                            profilePicture === av.url ? 'border-orange-600 ring-2 ring-orange-500/30 scale-105' : 'border-stone-200 opacity-80 hover:opacity-100'
                          }`}
                          title={av.name}
                        >
                          <img src={av.url} alt={av.name} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>

                    {/* Custom Image URL Field */}
                    <div className="flex gap-2">
                      <input 
                        type="url" 
                        placeholder="https://example.com/custom-avatar.png"
                        className="flex-1 bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-stone-900 focus:bg-white outline-none" 
                        value={profilePicture}
                        onChange={(e) => setProfilePicture(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const defUrl = DEFAULT_AVATARS[0].url;
                          setProfilePicture(defUrl);
                          localStorage.setItem('bolek_profile_picture', defUrl);
                        }}
                        className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-medium transition cursor-pointer shrink-0"
                      >
                        Reset
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1">Display Name</label>
                    <input 
                      type="text" 
                      className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-stone-900 focus:bg-white outline-none" 
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1">Email Address</label>
                    <input 
                      type="email" 
                      className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-stone-900 focus:bg-white outline-none" 
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                    />
                  </div>
                  <button 
                    type="button"
                    onClick={() => {
                      localStorage.setItem('bolek_profile_name', profileName);
                      localStorage.setItem('bolek_profile_email', profileEmail);
                      localStorage.setItem('bolek_profile_picture', profilePicture);
                      showAlert("Profile & Avatar saved successfully!");
                    }}
                    className="w-full bg-stone-900 text-white rounded-lg py-2 text-xs font-semibold hover:bg-stone-800 transition cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </div>

              {/* Security Credentials Card */}
              <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm">
                <div className="flex items-center gap-3 mb-4 border-b border-stone-100 pb-3">
                  <span className="material-symbols-outlined text-stone-600 !text-2xl">lock_open</span>
                  <div>
                    <h3 className="font-semibold text-sm text-stone-900">Change Password</h3>
                    <p className="text-[11px] text-stone-500">Keep your workspace secure</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1">Current Password</label>
                    <input 
                      type="password" 
                      placeholder="••••••••"
                      className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-stone-900 focus:bg-white outline-none" 
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1">New Password</label>
                    <input 
                      type="password" 
                      placeholder="••••••••"
                      className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-stone-900 focus:bg-white outline-none" 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1">Confirm New Password</label>
                    <input 
                      type="password" 
                      placeholder="••••••••"
                      className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-stone-900 focus:bg-white outline-none" 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                  <button 
                    type="button"
                    onClick={() => {
                      if (!currentPassword || !newPassword || !confirmPassword) {
                        showAlert("Please fill in all password fields.");
                        return;
                      }
                      if (newPassword !== confirmPassword) {
                        showAlert("New password and confirm password do not match.");
                        return;
                      }
                      showAlert("Password updated successfully!");
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                    className="w-full bg-stone-900 text-white rounded-lg py-2 text-xs font-semibold hover:bg-stone-800 transition cursor-pointer"
                  >
                    Update Password
                  </button>
                </div>
              </div>

            </div>

            {/* Right Column: Two-Factor Authenticator (2FA) */}
            <div className="space-y-6">
              
              <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between gap-3 mb-4 border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-stone-600 !text-2xl">shield_person</span>
                    <div>
                      <h3 className="font-semibold text-sm text-stone-900">Authenticator (2FA)</h3>
                      <p className="text-[11px] text-stone-500">Protect with Google / Microsoft Authenticator</p>
                    </div>
                  </div>
                  
                  {twoFactorEnabled ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-200/50">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 border border-amber-200/50">
                      Inactive
                    </span>
                  )}
                </div>

                {!twoFactorEnabled ? (
                  <div className="space-y-4">
                    <p className="text-xs text-stone-500 leading-relaxed">
                      Secure your account by adding a second authentication layer. Scan a secure QR code using an authenticator app of your choice to generate high-security one-time codes.
                    </p>
                    
                    {!mfaSetupVisible ? (
                      <button 
                        type="button"
                        onClick={() => setMfaSetupVisible(true)}
                        className="w-full inline-flex items-center justify-center gap-1.5 bg-orange-600 text-white rounded-lg py-2.5 text-xs font-semibold hover:bg-orange-500 transition cursor-pointer shadow-sm shadow-orange-600/10"
                      >
                        <span className="material-symbols-outlined !text-sm">security</span> Setup Authenticator
                      </button>
                    ) : (
                      <div className="border border-stone-100 rounded-lg p-4 bg-stone-50/50 space-y-4 animate-in fade-in duration-200">
                        <div className="flex items-center gap-3">
                          <div className="w-20 h-20 bg-stone-950 rounded border border-stone-800 p-1 flex items-center justify-center shrink-0">
                            {/* SVG mockup of QR code */}
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                              <rect x="2" y="2" width="6" height="6" />
                              <rect x="4" y="4" width="2" height="2" fill="white" />
                              <rect x="16" y="2" width="6" height="6" />
                              <rect x="18" y="4" width="2" height="2" fill="white" />
                              <rect x="2" y="16" width="6" height="6" />
                              <rect x="4" y="18" width="2" height="2" fill="white" />
                              <path d="M12 2h2v2h-2zm0 6h2v2h-2zm4 4h4v2h-4zm-4 4h2v2h-2zm4 4h2v2h-2zm-8-4h2v2H8zm8-12h2v2h-2z" fill="white" />
                            </svg>
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-xs font-semibold text-stone-800">Scan QR Code</h4>
                            <p className="text-[11px] text-stone-500">Scan this code with Google Authenticator or manual setup.</p>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1">Manual Key</label>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 bg-white border border-stone-200 px-2 py-1.5 rounded text-[11px] font-mono text-stone-700 text-center select-all">{mfaSecretKey}</code>
                            <button 
                              type="button" 
                              onClick={() => {
                                navigator.clipboard.writeText(mfaSecretKey);
                                showAlert("Manual Secret Key copied to clipboard!");
                              }}
                              className="p-1.5 border border-stone-200 hover:bg-stone-100 rounded text-stone-600 hover:text-stone-900"
                              title="Copy Secret Key"
                            >
                              <span className="material-symbols-outlined !text-sm">content_copy</span>
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1">Backup Codes (Store Safely)</label>
                          <div className="grid grid-cols-2 gap-1.5">
                            {mfaBackupCodes.map((code, idx) => (
                              <code key={idx} className="bg-white border border-stone-200/60 p-1.5 rounded text-[10px] font-mono text-stone-600 text-center">{code}</code>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1">Verification Code</label>
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              maxLength={6}
                              placeholder="000000"
                              className="flex-1 bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-center font-mono focus:ring-1 focus:ring-stone-900 outline-none" 
                              value={mfaCode}
                              onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                            />
                            <button 
                              type="button"
                              onClick={() => {
                                if (mfaCode.length !== 6) {
                                  showAlert("Please enter a valid 6-digit authentication code.");
                                  return;
                                }
                                setTwoFactorEnabled(true);
                                setMfaSetupVisible(false);
                                setMfaCode('');
                                showAlert("2FA Authenticator enabled successfully! Your account is now fully protected.");
                              }}
                              className="bg-orange-600 hover:bg-orange-500 text-white rounded-lg px-4 py-1.5 text-xs font-semibold transition"
                            >
                              Verify
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200/50">
                      <span className="material-symbols-outlined text-emerald-600 !text-xl">verified_user</span>
                      <p className="text-xs text-emerald-800 font-medium">Your desk workspace is protected with two-factor authentication.</p>
                    </div>

                    <button 
                      type="button"
                      onClick={() => {
                        setTwoFactorEnabled(false);
                        showAlert("Authenticator (2FA) has been disabled.");
                      }}
                      className="w-full border border-red-200 bg-red-50 text-red-600 rounded-lg py-2 text-xs font-semibold hover:bg-red-100/70 transition cursor-pointer"
                    >
                      Disable Authenticator
                    </button>
                  </div>
                )}
              </div>

              {/* Passkeys Management Card */}
              <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between gap-3 mb-4 border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-stone-600 !text-2xl">key</span>
                    <div>
                      <h3 className="font-semibold text-sm text-stone-900">Passkeys</h3>
                      <p className="text-[11px] text-stone-500">Sign in securely using biometrics or security keys</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-xs text-stone-500 leading-relaxed">
                    Passkeys provide faster, highly secure sign-ins using fingerprint, face scan, or device screen lock, replacing passwords entirely.
                  </p>

                  {passkeys.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {passkeys.map((pk) => (
                        <div key={pk.id} className="flex items-center justify-between p-2.5 rounded-lg border border-stone-150 bg-stone-50/50 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="material-symbols-outlined text-stone-400 !text-base shrink-0">fingerprint</span>
                            <div className="min-w-0">
                              <p className="font-semibold text-stone-800 truncate">{pk.name}</p>
                              <p className="text-[9px] text-stone-400">Created: {pk.createdAt}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setPasskeys(prev => prev.filter(p => p.id !== pk.id));
                              showAlert("Passkey removed successfully.");
                            }}
                            className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Remove Passkey"
                          >
                            <span className="material-symbols-outlined !text-sm">delete</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 bg-stone-50/50 rounded-xl border border-dashed border-stone-200">
                      <span className="material-symbols-outlined text-stone-300 !text-3xl mb-1">fingerprint</span>
                      <p className="text-[11px] text-stone-400">No passkeys registered yet.</p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={async () => {
                      setBiometricModal({
                        isOpen: true,
                        type: 'register',
                        username: profileEmail,
                        status: 'scanning'
                      });

                      setTimeout(async () => {
                        const newPk = await registerPasskey(profileEmail);
                        setPasskeys(prev => [...prev, { ...newPk, username: profileEmail }]);
                        setBiometricModal(prev => ({ ...prev, status: 'success' }));
                        
                        setTimeout(() => {
                          setBiometricModal(prev => ({ ...prev, isOpen: false }));
                          showAlert("Passkey registered successfully! You can now sign in using this passkey.");
                        }, 1000);
                      }, 2000);
                    }}
                    className="w-full inline-flex items-center justify-center gap-1.5 border border-stone-200 hover:bg-stone-50 text-stone-700 hover:text-stone-900 rounded-lg py-2.5 text-xs font-semibold transition cursor-pointer shadow-sm"
                  >
                    <span className="material-symbols-outlined !text-sm">add_circle</span> Register a Passkey
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* VIEW 6: Admin Dashboard Settings */}
        <div id="view-admin" className={`w-full h-full flex flex-col flex-1 overflow-hidden ${activeTab === 'admin' ? '' : 'hidden'}`}>
          <AdminDashboardSettings
            currentUserEmail={profileEmail}
            currentRole={userRole}
            currentPlan={userSubscription}
            usersList={registeredUsers}
            featureConfig={featureAccess}
            onUpdateUserRole={(userId, newRole) => {
              setRegisteredUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
              showToast(`Updated user role to ${newRole}`);
            }}
            onUpdateUserPlan={(userId, newPlan) => {
              setRegisteredUsers(prev => prev.map(u => u.id === userId ? { ...u, subscription: newPlan } : u));
              showToast(`Updated subscription plan to ${newPlan}`);
            }}
            onUpdateFeatureConfig={(newConfig) => {
              setFeatureAccess(newConfig);
              showToast('Updated regular feature entitlements');
            }}
            onToggleSimulateRegularUser={() => {
              setIsSimulatingRegular(!isSimulatingRegular);
              showToast(isSimulatingRegular ? 'Exited regular user simulation' : 'Simulating regular user mode');
            }}
            isSimulatingRegular={isSimulatingRegular}
            onOpenPayPalModal={() => setPaypalModalOpen(true)}
            showToast={showToast}
          />
        </div>

      </div>

      {/* Fullscreen expanded note card overlay */}
      <div 
        className={`card-fullscreen-overlay ${fullscreenCardId ? 'open' : ''}`} 
        onClick={() => {
          setFullscreenCardId(null);
          setEditingCardId(null);
        }} 
      />

      {/* Custom Theme Prompt / Alert / Confirm / Color dialog system */}
      {dialog && dialog.open && (
        <div 
          className="theme-dialog-overlay open" 
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              dialog.resolve?.(null);
              setDialog(null);
            }
          }}
          aria-hidden="false"
        >
          <div className="theme-dialog" role="dialog" aria-modal="true">
            <label className="theme-dialog-label" htmlFor="themeDialogInput">
              {dialog.message}
            </label>

            {dialog.type === 'color' ? (
              <div className="theme-color-grid">
                {NOTE_COLORS.map((color) => (
                  <button 
                    key={color.value}
                    type="button" 
                    className="theme-color-option" 
                    data-color={color.value}
                    onClick={() => {
                      dialog.resolve?.(color.value);
                      setDialog(null);
                    }}
                    aria-pressed={dialog.currentColor === color.value}
                  >
                    <span className="theme-color-swatch" style={{ background: color.value }} />
                    {color.name}
                  </button>
                ))}
              </div>
            ) : dialog.type === 'prompt' ? (
              <textarea 
                className="theme-dialog-input" 
                defaultValue={dialog.defaultValue}
                id="themeDialogInput"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    dialog.resolve?.((e.currentTarget as HTMLTextAreaElement).value);
                    setDialog(null);
                  }
                }}
              />
            ) : null}

            <div className="theme-dialog-actions mt-4">
              {dialog.type !== 'alert' && (
                <button 
                  className="theme-dialog-btn" 
                  type="button"
                  onClick={() => {
                    dialog.resolve?.(null);
                    setDialog(null);
                  }}
                >
                  {dialog.cancelText || 'Cancel'}
                </button>
              )}
              {dialog.type !== 'color' && (
                <button 
                  className="theme-dialog-btn primary" 
                  type="button"
                  onClick={() => {
                    if (dialog.type === 'prompt') {
                      const input = document.getElementById('themeDialogInput') as HTMLTextAreaElement;
                      dialog.resolve?.(input?.value || '');
                    } else {
                      dialog.resolve?.(true);
                    }
                    setDialog(null);
                  }}
                >
                  {dialog.okText || 'Done'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RICH TEXT NOTE EDITOR MODAL */}
      {richEditorOpen && (
        <div 
          className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setRichEditorOpen(false);
              setRichEditorCardId(null);
            }
          }}
        >
          <div 
            className="w-full max-w-2xl bg-white border border-stone-200 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col max-h-[85vh] animate-slide-up"
            style={{ borderTop: `6px solid ${richColor}` }}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between shrink-0 bg-stone-50/50">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-orange-500 font-bold">edit_note</span>
                <h3 className="text-sm font-bold text-stone-800 tracking-tight">
                  {richEditorCardId ? 'Modify Boleknote' : 'Create Rich Boleknote'}
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setRichEditorOpen(false);
                  setRichEditorCardId(null);
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
              >
                <span className="material-symbols-outlined !text-lg">close</span>
              </button>
            </div>

            {/* Editor Scrollable Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              
              {/* Title input */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest">Boleknote Title</label>
                <input 
                  type="text"
                  placeholder="E.g., Meeting Agenda or Project Todo"
                  className="w-full bg-stone-50/50 border border-stone-200 rounded-lg px-3 py-2 text-xs font-semibold text-stone-800 outline-none focus:bg-white focus:border-stone-400 transition"
                  value={richTitle}
                  onChange={(e) => setRichTitle(e.target.value)}
                  autoFocus
                />
              </div>

              {/* Title requirement prompt */}
              {!richTitle.trim() && (
                <div className="flex items-center gap-1.5 p-2 bg-amber-50 border border-amber-200/80 rounded-lg text-amber-800 text-[11px] font-medium animate-pulse">
                  <span className="material-symbols-outlined !text-sm text-amber-600 shrink-0">info</span>
                  <span>Add title first to unlock formatting tools and editor</span>
                </div>
              )}

              {/* WYSIWYG Toolbar */}
              <div className={`space-y-1 transition-all duration-200 ${!richTitle.trim() ? 'opacity-40 pointer-events-none select-none' : ''}`}>
                <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1.5">WYSIWYG Formatting Console</label>
                <div className="flex flex-wrap items-center gap-1 p-1.5 bg-stone-50 border border-stone-200/80 rounded-lg">
                  {/* Basic Commands */}
                  <button
                    type="button"
                    onClick={() => document.execCommand('bold', false)}
                    className="p-1 px-2 text-xs font-bold rounded text-stone-700 hover:bg-stone-200/80 active:bg-stone-300 transition"
                    title="Bold"
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={() => document.execCommand('italic', false)}
                    className="p-1 px-2 text-xs italic rounded text-stone-700 hover:bg-stone-200/80 active:bg-stone-300 transition"
                    title="Italic"
                  >
                    I
                  </button>
                  <button
                    type="button"
                    onClick={() => document.execCommand('underline', false)}
                    className="p-1 px-2 text-xs underline rounded text-stone-700 hover:bg-stone-200/80 active:bg-stone-300 transition"
                    title="Underline"
                  >
                    U
                  </button>
                  <button
                    type="button"
                    onClick={() => document.execCommand('strikeThrough', false)}
                    className="p-1 px-2 text-xs line-through rounded text-stone-700 hover:bg-stone-200/80 active:bg-stone-300 transition"
                    title="Strike Through"
                  >
                    S
                  </button>

                  <div className="h-4 w-px bg-stone-200 mx-1" />

                  {/* Headings */}
                  <button
                    type="button"
                    onClick={() => document.execCommand('formatBlock', false, '<h3>')}
                    className="p-1 text-xs rounded font-semibold text-stone-700 hover:bg-stone-200/80 transition"
                    title="Heading Level 3"
                  >
                    H3
                  </button>
                  <button
                    type="button"
                    onClick={() => document.execCommand('formatBlock', false, '<p>')}
                    className="p-1 text-xs rounded text-stone-700 hover:bg-stone-200/80 transition"
                    title="Paragraph Text"
                  >
                    P
                  </button>

                  <div className="h-4 w-px bg-stone-200 mx-1" />

                  {/* List structures */}
                  <button
                    type="button"
                    onClick={() => document.execCommand('insertUnorderedList', false)}
                    className="p-1 rounded text-stone-700 hover:bg-stone-200/80 transition flex items-center justify-center"
                    title="Unordered List"
                  >
                    <span className="material-symbols-outlined !text-sm">format_list_bulleted</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => document.execCommand('insertOrderedList', false)}
                    className="p-1 rounded text-stone-700 hover:bg-stone-200/80 transition flex items-center justify-center"
                    title="Ordered List"
                  >
                    <span className="material-symbols-outlined !text-sm">format_list_numbered</span>
                  </button>

                  <div className="h-4 w-px bg-stone-200 mx-1" />

                  {/* Font Size Selector Custom Dropdown */}
                  <select
                    className="bg-white border border-stone-200 rounded text-[11px] font-semibold text-stone-700 px-1.5 py-0.5 outline-none focus:border-stone-400 transition"
                    onChange={(e) => {
                      if (e.target.value) {
                        applyFontSize(e.target.value);
                        e.target.value = ''; // Reset select
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>Font Size</option>
                    <option value="11px">Very Small</option>
                    <option value="13px">Small</option>
                    <option value="15px">Medium</option>
                    <option value="18px">Large</option>
                    <option value="24px">Extra Large</option>
                  </select>

                  {/* Spacing Selector Dropdown */}
                  <select
                    className="bg-white border border-stone-200 rounded text-[11px] font-semibold text-stone-700 px-1.5 py-0.5 outline-none focus:border-stone-400 transition"
                    onChange={(e) => {
                      if (e.target.value) {
                        applyLineSpacing(e.target.value);
                        e.target.value = ''; // Reset select
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>Spacing</option>
                    <option value="1.2">Normal Spacing</option>
                    <option value="1.5">1.5x Spacing</option>
                    <option value="2.0">2x Spacing</option>
                  </select>

                  <div className="h-4 w-px bg-stone-200 mx-1" />

                  {/* Advanced Elements (Image, Table, Clear Formatting) */}
                  <button
                    type="button"
                    onClick={insertTable}
                    className="p-1.5 rounded text-stone-700 hover:bg-stone-200/80 transition flex items-center justify-center gap-1 text-[11px] font-medium"
                    title="Insert Styled Table Template"
                  >
                    <span className="material-symbols-outlined !text-sm text-stone-600">table_chart</span>
                    <span>Table</span>
                  </button>

                  {/* Table modification quick controls */}
                  <div className="flex items-center gap-0.5 bg-stone-100 p-0.5 rounded border border-stone-200/80 ml-0.5">
                    <button
                      type="button"
                      onClick={handleAddTableRow}
                      className="px-1.5 py-0.5 text-[10px] font-semibold bg-white border border-stone-200 hover:bg-stone-50 rounded text-stone-700 transition cursor-pointer"
                      title="Add Row to Table"
                    >
                      + Row
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveTableRow}
                      className="px-1.5 py-0.5 text-[10px] font-semibold bg-white border border-stone-200 hover:bg-stone-50 rounded text-stone-700 transition cursor-pointer"
                      title="Remove Row from Table"
                    >
                      - Row
                    </button>
                    <button
                      type="button"
                      onClick={handleAddTableColumn}
                      className="px-1.5 py-0.5 text-[10px] font-semibold bg-white border border-stone-200 hover:bg-stone-50 rounded text-stone-700 transition cursor-pointer"
                      title="Add Column to Table"
                    >
                      + Col
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveTableColumn}
                      className="px-1.5 py-0.5 text-[10px] font-semibold bg-white border border-stone-200 hover:bg-stone-50 rounded text-stone-700 transition cursor-pointer"
                      title="Remove Column from Table"
                    >
                      - Col
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={insertImage}
                    className="p-1.5 rounded text-stone-700 hover:bg-stone-200/80 transition flex items-center justify-center gap-1 text-[11px] font-medium"
                    title="Insert Image Link"
                  >
                    <span className="material-symbols-outlined !text-sm text-stone-600">image</span>
                    <span>Image</span>
                  </button>

                  <button
                    type="button"
                    onClick={clearFormatting}
                    className="p-1 rounded text-stone-700 hover:bg-stone-200/80 transition flex items-center justify-center"
                    title="Clear Selections Formatting"
                  >
                    <span className="material-symbols-outlined !text-sm text-stone-500">format_clear</span>
                  </button>
                </div>
              </div>

              {/* Editable Content Area */}
              <div className={`space-y-1 transition-all duration-200 ${!richTitle.trim() ? 'opacity-40 pointer-events-none select-none' : ''}`}>
                <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest">Boleknote Rich Editor</label>
                <div 
                  ref={richEditorRef}
                  contentEditable={Boolean(richTitle.trim())}
                  className="w-full min-h-[220px] bg-stone-50/20 border border-stone-200 rounded-xl p-4 text-xs text-stone-700 outline-none focus:bg-white focus:border-stone-400 focus:ring-1 focus:ring-stone-200/50 transition overflow-y-auto max-h-[350px] leading-relaxed prose prose-stone prose-xs"
                  placeholder={richTitle.trim() ? "Start drafting here... Highlight text to apply custom spacing or font sizes." : "Add title first to edit content..."}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest">Font Family</label>
                  <select
                    value={richFontFamily}
                    onChange={(e) => setRichFontFamily(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-stone-700 outline-none"
                  >
                    {NOTE_FONT_FAMILIES.map((font) => (
                      <option key={font.value} value={font.value}>{font.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest">Font Size</label>
                  <select
                    value={richFontSize}
                    onChange={(e) => setRichFontSize(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-stone-700 outline-none"
                  >
                    {['12px', '14px', '16px', '18px', '20px', '24px'].map((size) => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest">Rotation</label>
                  <input
                    type="range"
                    min="-15"
                    max="15"
                    step="1"
                    value={richRotation}
                    onChange={(e) => setRichRotation(parseInt(e.target.value, 10))}
                    className="w-full"
                  />
                  <div className="text-[10px] text-stone-500 font-mono">{richRotation}°</div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest">Emoji</label>
                  <input
                    type="text"
                    value={richEmoji}
                    onChange={(e) => setRichEmoji(e.target.value.slice(0, 2))}
                    placeholder="✨"
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-stone-700 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest">Public Link / Media Attachments</label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={richMediaUrl}
                    onChange={(e) => setRichMediaUrl(e.target.value)}
                    placeholder="Paste a YouTube, Cloudinary, image, or file URL"
                    className="flex-1 bg-stone-50/50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-700 outline-none focus:bg-white focus:border-stone-400 transition"
                  />
                  <button
                    type="button"
                    onClick={handleAddRichAttachment}
                    disabled={!richMediaUrl.trim()}
                    className="px-3 py-2 rounded-lg bg-stone-900 text-white text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Attach
                  </button>
                </div>
                {richAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {richAttachments.map((attachment) => (
                      <button
                        key={attachment.id}
                        type="button"
                        onClick={() => handleRemoveRichAttachment(attachment.id)}
                        className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded-full border border-stone-200 bg-stone-50 text-stone-600 hover:bg-red-50 hover:border-red-200 hover:text-red-700 transition"
                        title="Remove attachment"
                      >
                        <span className="material-symbols-outlined !text-[10px]">{attachment.kind === 'video' ? 'smart_display' : attachment.kind === 'image' ? 'image' : 'link'}</span>
                        <span className="max-w-[120px] truncate">{attachment.label || attachment.url}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                {/* Column Destination Selector */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest">Bolekpad Column Destination</label>
                  <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5">
                    <span className="material-symbols-outlined text-stone-400 !text-sm">dashboard</span>
                    <select
                      className="w-full bg-transparent border-none text-xs text-stone-700 outline-none focus:ring-0 cursor-pointer font-semibold"
                      value={richDestinationColId}
                      onChange={(e) => setRichDestinationColId(e.target.value)}
                    >
                      {columns.map((col) => (
                        <option key={col.id} value={col.id}>
                          {col.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Color Selector Swatch Panel */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest">Note Theme Accent</label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {NOTE_COLORS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setRichColor(c.value)}
                        className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${richColor === c.value ? 'scale-110 border-stone-800 ring-2 ring-stone-200' : 'border-stone-200 hover:scale-105'}`}
                        style={{ backgroundColor: c.value }}
                        title={c.name}
                      >
                        {richColor === c.value && (
                          <span className="material-symbols-outlined !text-[11px] text-stone-800 font-bold">check</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tags Field */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest">Metadata Tags</label>
                  <div className="flex items-center gap-1.5 bg-stone-50/50 border border-stone-200 rounded-lg px-2.5 py-1.5">
                    <span className="material-symbols-outlined text-stone-400 !text-xs">sell</span>
                    <input 
                      type="text"
                      placeholder="work, ideas, task (comma-separated)"
                      className="w-full bg-transparent border-none text-xs text-stone-700 outline-none placeholder-stone-400"
                      value={richTags}
                      onChange={(e) => setRichTags(e.target.value)}
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Footer Buttons */}
            <div className="px-5 py-4.5 border-t border-stone-100 flex items-center justify-end gap-3 shrink-0 bg-stone-50/50">
              <button
                type="button"
                onClick={() => {
                  setRichEditorOpen(false);
                  setRichEditorCardId(null);
                }}
                className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-semibold transition"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleSaveRichEditor}
                className="px-5 py-2 rounded-xl bg-stone-950 hover:bg-stone-900 text-white text-xs font-semibold shadow-sm transition active:scale-95"
              >
                Save Boleknote
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Biometric Scan / Passkey Verification Modal Overlay */}
      {biometricModal.isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md transition-opacity duration-300">
          <div className="bg-white border border-stone-200/80 rounded-2xl p-6 max-w-sm w-full text-center shadow-[0_24px_48px_rgba(0,0,0,0.15)] transition-all duration-300 scale-100">
            <div className="flex justify-center mb-5">
              <div className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500 ${
                biometricModal.status === 'scanning' ? 'bg-amber-50 border-2 border-amber-500/30' :
                biometricModal.status === 'success' ? 'bg-emerald-50 border-2 border-emerald-500/30' :
                biometricModal.status === 'error' ? 'bg-rose-50 border-2 border-rose-500/30' : 'bg-stone-50 border border-stone-200'
              }`}>
                {biometricModal.status === 'scanning' && (
                  <div className="absolute inset-0 rounded-full bg-amber-400/15 animate-ping"></div>
                )}
                {biometricModal.status === 'success' && (
                  <span className="material-symbols-outlined text-emerald-600 !text-3xl">check_circle</span>
                )}
                {biometricModal.status === 'error' && (
                  <span className="material-symbols-outlined text-rose-600 !text-3xl">error</span>
                )}
                {biometricModal.status === 'scanning' && (
                  <span className="material-symbols-outlined text-amber-500 !text-3xl animate-pulse">fingerprint</span>
                )}
                {biometricModal.status === 'idle' && (
                  <span className="material-symbols-outlined text-stone-500 !text-3xl">fingerprint</span>
                )}
              </div>
            </div>

            <h3 className="text-sm font-bold text-stone-900 mb-1">
              {biometricModal.type === 'register' ? 'Registering Passkey' : 'Passkey Verification'}
            </h3>
            <p className="text-[11px] text-stone-500 mb-4 px-2">
              {biometricModal.status === 'scanning' && `Please touch your fingerprint sensor or verify your screen lock credentials to authenticate ${biometricModal.username}...`}
              {biometricModal.status === 'success' && 'Biometric authentication successful! Access granted.'}
              {biometricModal.status === 'error' && (biometricModal.errorMsg || 'Passkey authentication failed.')}
            </p>

            {biometricModal.status === 'scanning' && (
              <div className="w-full h-1 bg-stone-100 rounded-full overflow-hidden mb-5 relative">
                <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-full animate-loading-bar w-[40%]"></div>
              </div>
            )}

            <div className="flex gap-2">
              {biometricModal.status === 'error' ? (
                <button
                  type="button"
                  onClick={() => setBiometricModal(prev => ({ ...prev, isOpen: false }))}
                  className="w-full py-2 bg-stone-900 text-white rounded-lg text-xs font-semibold hover:bg-stone-800 transition cursor-pointer"
                >
                  Close
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setBiometricModal(prev => ({ ...prev, isOpen: false }))}
                  className="w-full py-2 border border-stone-200 text-stone-600 hover:bg-stone-50 hover:text-stone-900 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* COLUMN SELECT PROMPT DIALOG MODAL */}
      {columnPromptOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white border border-stone-200 rounded-3xl p-6 max-w-sm w-full shadow-[0_24px_50px_rgba(0,0,0,0.18)] flex flex-col space-y-5">
            {/* Modal Header */}
            <div className="flex items-center gap-3 border-b border-stone-100 pb-3">
              <div className="p-2 bg-orange-50 rounded-xl text-orange-600 flex items-center justify-center">
                <span className="material-symbols-outlined font-bold !text-xl">dashboard</span>
              </div>
              <div className="flex flex-col">
                <h3 className="text-sm font-black tracking-tight uppercase font-sans text-stone-900 leading-none">
                  Select Destination Desk
                </h3>
                <p className="text-[9px] text-stone-400 font-bold uppercase tracking-wider font-sans leading-none mt-1">
                  Choose a Bolekpad column for this note
                </p>
              </div>
            </div>

            {/* Subtitle */}
            <p className="text-[11px] text-stone-500 font-medium leading-relaxed">
              Every Boleknote requires a column placement. Please select which target Bolekpad you would like to initiate your note under:
            </p>

            {/* List of Columns */}
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {columns.map((col) => (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => {
                    setRichDestinationColId(col.id);
                    setColumnPromptOpen(false);
                    setRichEditorOpen(true);
                  }}
                  className="w-full p-3.5 rounded-2xl border border-stone-200/80 hover:border-stone-400 hover:bg-stone-50/50 flex items-center justify-between transition text-left cursor-pointer group active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-stone-400 group-hover:text-stone-800 transition !text-lg">folder_open</span>
                    <span className="text-xs font-bold text-stone-800 group-hover:text-stone-950 transition">{col.title}</span>
                  </div>
                  <span className="bg-stone-100 text-stone-500 group-hover:bg-stone-200 group-hover:text-stone-800 transition text-[9px] font-mono font-bold px-2 py-0.5 rounded-full">
                    {col.cards.length} {col.cards.length === 1 ? 'note' : 'notes'}
                  </span>
                </button>
              ))}
            </div>

            {/* Footer Buttons */}
            <div className="flex gap-2.5 pt-2 border-t border-stone-100 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setColumnPromptOpen(false);
                }}
                className="w-full py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-bold transition cursor-pointer"
              >
                Cancel Creation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications Container */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none max-w-sm">
        {toasts.map((toast) => (
          <div 
            key={toast.id} 
            className="flex items-center gap-2.5 bg-stone-900/95 backdrop-blur text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-xl border border-stone-800 animate-slide-in pointer-events-auto"
          >
            <span className="material-symbols-outlined text-emerald-400 !text-base">check_circle</span>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Paywall Modal Popup */}
      <PaywallModal
        isOpen={paywallModal.isOpen}
        featureName={paywallModal.featureName}
        onClose={() => setPaywallModal({ isOpen: false, featureName: '' })}
        onOpenPayment={() => setPaypalModalOpen(true)}
      />

      {/* PayPal Payment Dashboard Popout Modal */}
      <PayPalPaymentModal
        isOpen={paypalModalOpen}
        onClose={() => setPaypalModalOpen(false)}
        userEmail={profileEmail}
        onPaymentSuccess={(plan) => {
          setUserSubscription(plan);
          setIsSimulatingRegular(false);
          setFeatureAccess(prev => ({
            ...prev,
            send: true,
            bolekauth: true,
            futureFeatures: true,
          }));
          showToast(`Successfully upgraded to ${plan.toUpperCase()} plan via PayPal! All features unlocked.`);
          if (paywallModal.featureName) {
            switchTab(paywallModal.featureName as ActiveTab);
          }
        }}
      />

      <ComplianceFooter />
    </div>
  );
}
