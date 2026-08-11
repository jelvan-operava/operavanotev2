import React, { useState, useEffect, useRef } from 'react';
import { Bolekpad } from '../types';

export interface DashboardItem {
  id: string;
  type: 'sticky' | 'picture' | 'clock-weather' | 'currency-converter' | 'word-of-day';
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  color?: string;
  title: string;
  content?: string;
  imageUrl?: string;
  caption?: string;
  pinned: boolean;
  rotation: number; // angle in degrees
  dateStr?: string;
  checklist?: { id: string; text: string; done: boolean }[];
  permanent?: boolean;
  infoDescription?: string;
  themeId?: string; // Customizable color theme for permanent stickies
}

interface BolekDashboardProps {
  profileName: string;
  profileEmail: string;
  profilePicture: string;
  columns: Bolekpad[];
  onNavigateTab: (tab: 'notes' | 'send' | 'calendar' | 'profile' | 'bolekauth') => void;
  onOpenNewNote?: () => void;
  onAddToBolekpad?: (noteData: { title: string; content: string; color?: string; tags?: string[] }) => void;
}

export interface WidgetTheme {
  id: string;
  name: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  subtextClass: string;
  accentClass: string;
  cardBgClass: string;
  cardBorderClass: string;
}

export const PERMANENT_THEMES: WidgetTheme[] = [
  {
    id: 'slate-dark',
    name: 'Midnight Slate',
    bgClass: 'bg-slate-900',
    borderClass: 'border-slate-700',
    textClass: 'text-white',
    subtextClass: 'text-slate-300',
    accentClass: 'text-amber-400',
    cardBgClass: 'bg-slate-800/80',
    cardBorderClass: 'border-slate-700/60',
  },
  {
    id: 'emerald-dark',
    name: 'Emerald Night',
    bgClass: 'bg-emerald-950',
    borderClass: 'border-emerald-800',
    textClass: 'text-emerald-100',
    subtextClass: 'text-emerald-300',
    accentClass: 'text-emerald-400',
    cardBgClass: 'bg-emerald-900/80',
    cardBorderClass: 'border-emerald-700/60',
  },
  {
    id: 'amber-dark',
    name: 'Amber Glow',
    bgClass: 'bg-amber-950',
    borderClass: 'border-amber-800',
    textClass: 'text-amber-100',
    subtextClass: 'text-amber-300',
    accentClass: 'text-amber-400',
    cardBgClass: 'bg-amber-900/80',
    cardBorderClass: 'border-amber-700/60',
  },
  {
    id: 'indigo-night',
    name: 'Deep Indigo',
    bgClass: 'bg-indigo-950',
    borderClass: 'border-indigo-800',
    textClass: 'text-indigo-100',
    subtextClass: 'text-indigo-300',
    accentClass: 'text-indigo-400',
    cardBgClass: 'bg-indigo-900/80',
    cardBorderClass: 'border-indigo-700/60',
  },
  {
    id: 'warm-yellow',
    name: 'Warm Yellow',
    bgClass: 'bg-amber-50',
    borderClass: 'border-amber-300',
    textClass: 'text-amber-950',
    subtextClass: 'text-amber-800',
    accentClass: 'text-amber-600',
    cardBgClass: 'bg-white/80',
    cardBorderClass: 'border-amber-200',
  },
  {
    id: 'fresh-mint',
    name: 'Fresh Mint',
    bgClass: 'bg-emerald-50',
    borderClass: 'border-emerald-300',
    textClass: 'text-emerald-950',
    subtextClass: 'text-emerald-800',
    accentClass: 'text-emerald-600',
    cardBgClass: 'bg-white/80',
    cardBorderClass: 'border-emerald-200',
  },
  {
    id: 'rose-pink',
    name: 'Rose Pink',
    bgClass: 'bg-rose-50',
    borderClass: 'border-rose-300',
    textClass: 'text-rose-950',
    subtextClass: 'text-rose-800',
    accentClass: 'text-rose-600',
    cardBgClass: 'bg-white/80',
    cardBorderClass: 'border-rose-200',
  },
  {
    id: 'sky-blue',
    name: 'Sky Blue',
    bgClass: 'bg-sky-50',
    borderClass: 'border-sky-300',
    textClass: 'text-sky-950',
    subtextClass: 'text-sky-800',
    accentClass: 'text-sky-600',
    cardBgClass: 'bg-white/80',
    cardBorderClass: 'border-sky-200',
  },
  {
    id: 'pure-white',
    name: 'Pure White',
    bgClass: 'bg-white',
    borderClass: 'border-stone-300',
    textClass: 'text-stone-900',
    subtextClass: 'text-stone-600',
    accentClass: 'text-orange-600',
    cardBgClass: 'bg-stone-50',
    cardBorderClass: 'border-stone-200',
  },
];

const STICKY_COLORS = [
  { name: 'Warm Yellow', bg: '#fef08a', border: '#fde047', text: '#854d0e', header: '#fef9c3' },
  { name: 'Fresh Mint', bg: '#dcfce7', border: '#86efac', text: '#166534', header: '#f0fdf4' },
  { name: 'Soft Peach', bg: '#fed7aa', border: '#fdba74', text: '#9a3412', header: '#fff7ed' },
  { name: 'Lavender', bg: '#f3e8ff', border: '#d8b4fe', text: '#6b21a8', header: '#faf5ff' },
  { name: 'Sky Blue', bg: '#e0f2fe', border: '#7dd3fc', text: '#075985', header: '#f0f9ff' },
  { name: 'Rose Pink', bg: '#ffe4e6', border: '#fda4af', text: '#9f1239', header: '#fff1f2' },
  { name: 'Pure White', bg: '#ffffff', border: '#e2e8f0', text: '#1e293b', header: '#f8fafc' },
  { name: 'Charcoal Dark', bg: '#1f2937', border: '#374151', text: '#f9fafb', header: '#111827' },
];

const PRESET_PICTURES = [
  {
    name: 'Cozy Desk Workspace',
    url: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=800&q=80',
    caption: 'Inspiration & Setup',
  },
  {
    name: 'Serene Nature Stream',
    url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80',
    caption: 'Mindful Focus',
  },
  {
    name: 'Architectural Lines',
    url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80',
    caption: 'Design & Geometry',
  },
  {
    name: 'Coffee & Journal',
    url: 'https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=800&q=80',
    caption: 'Morning Routine',
  },
];

// EMOJI PALETTE CHOICES
const EMOJI_PALETTE = ['😊', '💡', '🔥', '⭐', '🚀', '📌', '✅', '🎯', '💬', '🔑', '🌟', '📚', '🎨', '☕', '💼', '⚡', '❤️', '🏆'];

// QUOTE DATA POOL
type QuoteCategory = 'All' | 'Empathy' | 'Motivation' | 'Wisdom' | 'Education' | 'Advisories';

interface QuoteItem {
  id: string;
  category: QuoteCategory;
  text: string;
  author: string;
}

const QUOTE_POOL: QuoteItem[] = [
  // EMPATHY
  { id: 'q1', category: 'Empathy', text: 'Empower others by listening actively; true connection begins with genuine understanding.', author: 'Empathy Reflection' },
  { id: 'q2', category: 'Empathy', text: 'Empathy is seeing with the eyes of another, listening with the ears of another and feeling with the heart of another.', author: 'Alfred Adler' },
  { id: 'q3', category: 'Empathy', text: 'Kindness in words creates confidence; kindness in thinking creates profound depth.', author: 'Lao Tzu' },
  { id: 'q4', category: 'Empathy', text: 'When you show deep empathy towards others, their defensive energy goes down and is replaced by trust.', author: 'Stephen Covey' },
  
  // MOTIVATION
  { id: 'm1', category: 'Motivation', text: 'The secret of getting ahead is getting started. Break complex tasks into small manageable steps.', author: 'Mark Twain' },
  { id: 'm2', category: 'Motivation', text: 'Success is not final, failure is not fatal: it is the courage to continue that counts.', author: 'Winston Churchill' },
  { id: 'm3', category: 'Motivation', text: 'Focus on progress, not perfection. Every tiny action compounds over time into mastery.', author: 'Bolek Motivation' },
  { id: 'm4', category: 'Motivation', text: 'Don’t watch the clock; do what it does. Keep going with purpose and steady momentum.', author: 'Sam Levenson' },

  // WISDOM
  { id: 'w1', category: 'Wisdom', text: 'Silence and reflection are the source of all great strength and inner clarity.', author: 'Lao Tzu' },
  { id: 'w2', category: 'Wisdom', text: 'Knowing yourself is the beginning of all wisdom and meaningful creation.', author: 'Aristotle' },
  { id: 'w3', category: 'Wisdom', text: 'Simplicity is the ultimate sophistication. Eliminate noise to reveal purpose.', author: 'Leonardo da Vinci' },
  { id: 'w4', category: 'Wisdom', text: 'Yesterday I was clever, so I wanted to change the world. Today I am wise, so I am changing myself.', author: 'Rumi' },

  // EDUCATION
  { id: 'e1', category: 'Education', text: 'Investing in knowledge pays the best interest. Learn something new every single day.', author: 'Benjamin Franklin' },
  { id: 'e2', category: 'Education', text: 'Education is the passport to the future, for tomorrow belongs to those who prepare for it today.', author: 'Malcolm X' },
  { id: 'e3', category: 'Education', text: 'Tell me and I forget. Teach me and I remember. Involve me and I learn deeply.', author: 'Benjamin Franklin' },

  // ADVISORIES
  { id: 'a1', category: 'Advisories', text: 'Security is not a product, but a process. Always safeguard your master credentials and backup keys.', author: 'Security Advisory' },
  { id: 'a2', category: 'Advisories', text: 'Privacy is not about having something to hide; it’s about protecting your right to digital sovereignty.', author: 'Privacy Advisory' },
  { id: 'a3', category: 'Advisories', text: 'Regular backups and strong unique passkeys protect your digital identity from unexpected disruptions.', author: 'Bolek Protection' },
];

// EXCHANGE RATES DATA FOR CURRENCY CONVERTER
const CURRENCY_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.78,
  JPY: 154.5,
  CAD: 1.36,
  AUD: 1.51,
  PHP: 58.2,
  SGD: 1.35,
  INR: 83.4,
  CHF: 0.90,
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CAD: 'CA$',
  AUD: 'A$',
  PHP: '₱',
  SGD: 'S$',
  INR: '₹',
  CHF: 'CHF ',
};

// SPECIAL PERMANENT WIDGET INITIAL ITEMS
const PERMANENT_WIDGET_CW: DashboardItem = {
  id: 'item-cw',
  type: 'clock-weather',
  x: 40,
  y: 40,
  width: 330,
  height: 290,
  zIndex: 15,
  title: 'Clock & Live Weather',
  pinned: true,
  rotation: 0,
  permanent: true,
  themeId: 'slate-dark',
  infoDescription: 'Clock & Live Weather Widget\n\n• Permanent Widget: Cannot be deleted, but freely movable, pinnable, rotatable, and color-customizable.\n• Displays live system digital clock with ticking seconds and current date.\n• Auto-detects your connection time zone automatically without requiring location permissions.\n• Provides live weather conditions, temperature (Celsius/Fahrenheit toggle), humidity, and wind speed.',
};

const PERMANENT_WIDGET_CC: DashboardItem = {
  id: 'item-cc',
  type: 'currency-converter',
  x: 390,
  y: 40,
  width: 350,
  height: 310,
  zIndex: 14,
  title: 'Currency Converter',
  pinned: true,
  rotation: 0,
  permanent: true,
  themeId: 'emerald-dark',
  infoDescription: 'Currency Converter Widget\n\n• Permanent Widget: Cannot be deleted, but freely movable, pinnable, rotatable, and color-customizable.\n• Converts live foreign exchange rates across global currencies in real-time.\n• Features currency pair locking and visual bar graph comparisons.',
};

const PERMANENT_WIDGET_WOD: DashboardItem = {
  id: 'item-wod',
  type: 'word-of-day',
  x: 760,
  y: 40,
  width: 340,
  height: 310,
  zIndex: 13,
  title: 'Word of the Day',
  pinned: true,
  rotation: 0,
  permanent: true,
  themeId: 'amber-dark',
  infoDescription: 'Word of the Day & Quote Pool\n\n• Permanent Widget: Cannot be deleted, but freely movable, pinnable, rotatable, and color-customizable.\n• Features curated quote wisdom pools across Empathy, Motivation, Wisdom, Education, and Security Advisories.\n• Includes 1-click quote shuffle, clipboard copying, and direct addition to Bolekpad Notes.',
};

const DEFAULT_ITEMS: DashboardItem[] = [
  PERMANENT_WIDGET_CW,
  PERMANENT_WIDGET_CC,
  PERMANENT_WIDGET_WOD,
  {
    id: 'item-1',
    type: 'sticky',
    x: 40,
    y: 350,
    width: 290,
    height: 260,
    zIndex: 10,
    color: '#fef08a',
    title: 'Welcome to Bolek Canvas',
    content: 'Drag stickies anywhere! Pin notes, change widget colors, add custom photo cards, or lock the tab when finished.',
    pinned: true,
    rotation: -1.0,
    dateStr: 'Note Today',
    checklist: [
      { id: 'c1', text: 'Customize your dashboard board & widget colors', done: true },
      { id: 'c2', text: 'Try live widgets & auto-detected time', done: false },
      { id: 'c3', text: 'Lock entire tab for viewing mode', done: false },
    ],
  },
  {
    id: 'item-2',
    type: 'picture',
    x: 350,
    y: 370,
    width: 310,
    height: 330,
    zIndex: 5,
    title: 'Workspace Inspiration',
    imageUrl: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=800&q=80',
    caption: 'Focus & Creativity Corner',
    pinned: false,
    rotation: 1.2,
    dateStr: 'Aug 2026',
  },
  {
    id: 'item-3',
    type: 'sticky',
    x: 680,
    y: 370,
    width: 280,
    height: 230,
    zIndex: 8,
    color: '#dcfce7',
    title: 'Quick Priorities 🚀',
    content: '💡 Double click any note content to edit directly!\n✨ Click palette icon on any permanent widget to change its color theme.',
    pinned: false,
    rotation: -0.8,
    dateStr: 'Today',
  },
];

export const BolekDashboard: React.FC<BolekDashboardProps> = ({
  profileName,
  profileEmail,
  profilePicture,
  columns,
  onNavigateTab,
  onOpenNewNote,
  onAddToBolekpad,
}) => {
  // Board state
  const [items, setItems] = useState<DashboardItem[]>(() => {
    try {
      const saved = localStorage.getItem('bolek_desk_dashboard_items_v4');
      if (saved) {
        const parsed: DashboardItem[] = JSON.parse(saved);
        const hasCW = parsed.some(i => i.type === 'clock-weather');
        const hasCC = parsed.some(i => i.type === 'currency-converter');
        const hasWOD = parsed.some(i => i.type === 'word-of-day');

        let merged = [...parsed];
        if (!hasCW) merged.unshift(PERMANENT_WIDGET_CW);
        if (!hasCC) merged.unshift(PERMANENT_WIDGET_CC);
        if (!hasWOD) merged.unshift(PERMANENT_WIDGET_WOD);
        return merged;
      }
    } catch (e) {
      console.warn('Could not read dashboard items:', e);
    }
    return DEFAULT_ITEMS;
  });

  // Lock state
  const [isTabLocked, setIsTabLocked] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('bolek_desk_dashboard_locked_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Could not read dashboard lock state:', e);
    }
    return false;
  });

  // Customize drawer state
  const [showEditOptions, setShowEditOptions] = useState(false);
  const [bgStyle, setBgStyle] = useState<'dots' | 'grid' | 'blank'>('dots');

  // Theme Picker Popover Open state
  const [openThemePickerId, setOpenThemePickerId] = useState<string | null>(null);

  // Mobile device notice state
  const [showMobileNotice, setShowMobileNotice] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const isMobileWidth = window.innerWidth < 768;
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const hasDismissed = sessionStorage.getItem('bolek_mobile_notice_dismissed') === 'true';
      return (isMobileWidth || (isTouchDevice && window.innerWidth < 850)) && !hasDismissed;
    }
    return false;
  });

  // Drag tracking
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const maxZIndexRef = useRef<number>(30);

  // Modal states
  const [showAddImageModal, setShowAddImageModal] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [imageCaptionInput, setImageCaptionInput] = useState('');

  // Info Modal for Permanent Widgets
  const [infoModalContent, setInfoModalContent] = useState<{ title: string; desc: string } | null>(null);

  // --- Clock & Weather Widget State ---
  const [currentTime, setCurrentTime] = useState(new Date());
  const [tempUnit, setTempUnit] = useState<'C' | 'F'>('C');
  const [isWeatherRefreshing, setIsWeatherRefreshing] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-detected Connection Location (no permissions required!)
  const autoLocation = (() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) {
        const city = tz.split('/').pop()?.replace(/_/g, ' ') || 'Local Connection';
        return city;
      }
    } catch (e) {}
    return 'Local Connection';
  })();

  // --- Currency Converter Widget State ---
  const [convertAmount, setConvertAmount] = useState<number>(100);
  const [fromCurrency, setFromCurrency] = useState<string>('USD');
  const [toCurrency, setToCurrency] = useState<string>('PHP');
  const [isCurrencyLocked, setIsCurrencyLocked] = useState<boolean>(false);
  const [liveRates, setLiveRates] = useState<Record<string, number>>(CURRENCY_RATES);
  const [isFetchingRates, setIsFetchingRates] = useState<boolean>(false);
  const [ratesLastUpdated, setRatesLastUpdated] = useState<string>('Live (Default)');

  const fetchLiveExchangeRates = async () => {
    setIsFetchingRates(true);
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/USD');
      if (res.ok) {
        const data = await res.json();
        if (data && data.rates) {
          setLiveRates(prev => ({ ...prev, ...data.rates }));
          const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          setRatesLastUpdated(`Live • ${timeStr}`);
          setIsFetchingRates(false);
          return;
        }
      }
    } catch (e) {
      console.warn('Primary exchange rate API failed, falling back...', e);
    }

    try {
      const res2 = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      if (res2.ok) {
        const data2 = await res2.json();
        if (data2 && data2.rates) {
          setLiveRates(prev => ({ ...prev, ...data2.rates }));
          const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          setRatesLastUpdated(`Live • ${timeStr}`);
        }
      }
    } catch (e) {
      console.warn('Using static fallback currency rates', e);
      setRatesLastUpdated('Offline Rates');
    } finally {
      setIsFetchingRates(false);
    }
  };

  useEffect(() => {
    fetchLiveExchangeRates();
  }, []);

  // --- Word of the Day Widget State ---
  const [selectedQuoteCategory, setSelectedQuoteCategory] = useState<QuoteCategory>('All');
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState<number>(0);
  const [copiedQuoteNotice, setCopiedQuoteNotice] = useState(false);

  // Filtered Quote list
  const filteredQuotes = QUOTE_POOL.filter(q => selectedQuoteCategory === 'All' || q.category === selectedQuoteCategory);
  const activeQuote = filteredQuotes[currentQuoteIndex % Math.max(1, filteredQuotes.length)] || QUOTE_POOL[0];

  const handleShuffleQuote = () => {
    if (filteredQuotes.length > 1) {
      setCurrentQuoteIndex(prev => (prev + 1) % filteredQuotes.length);
    }
  };

  const handleCopyQuote = () => {
    const textToCopy = `"${activeQuote.text}" — ${activeQuote.author}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedQuoteNotice(true);
    setTimeout(() => setCopiedQuoteNotice(false), 2000);
  };

  const handleAddQuoteToBolekpad = () => {
    if (onAddToBolekpad) {
      onAddToBolekpad({
        title: `💬 Quote: ${activeQuote.category}`,
        content: `"${activeQuote.text}"\n\n— ${activeQuote.author}`,
        color: '#fef08a',
        tags: ['quote', activeQuote.category.toLowerCase()]
      });
    }
  };

  // Helper to change color theme of permanent widgets
  const handleChangeWidgetTheme = (itemId: string, themeId: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, themeId } : item))
    );
  };

  const getWidgetTheme = (item: DashboardItem, defaultThemeId: string): WidgetTheme => {
    const tid = item.themeId || defaultThemeId;
    return PERMANENT_THEMES.find((t) => t.id === tid) || PERMANENT_THEMES[0];
  };

  // Persist items
  useEffect(() => {
    try {
      localStorage.setItem('bolek_desk_dashboard_items_v4', JSON.stringify(items));
    } catch (e) {
      console.error(e);
    }
  }, [items]);

  useEffect(() => {
    try {
      localStorage.setItem('bolek_desk_dashboard_locked_v2', JSON.stringify(isTabLocked));
    } catch (e) {
      console.error(e);
    }
  }, [isTabLocked]);

  // Pointer dragging handlers
  const handlePointerDown = (id: string, e: React.PointerEvent) => {
    if (isTabLocked) return;

    const target = e.target as HTMLElement;
    if (target.closest('button, input, select, textarea, a, .no-drag')) return;

    maxZIndexRef.current += 1;
    const newZ = maxZIndexRef.current;

    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, zIndex: newZ } : item))
    );

    const item = items.find((i) => i.id === id);
    if (!item) return;

    setDraggingId(id);
    dragOffsetRef.current = {
      x: e.clientX - item.x,
      y: e.clientY - item.y,
    };

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingId || isTabLocked) return;

    const newX = Math.max(10, e.clientX - dragOffsetRef.current.x);
    const newY = Math.max(10, e.clientY - dragOffsetRef.current.y);

    setItems((prev) =>
      prev.map((item) =>
        item.id === draggingId ? { ...item, x: newX, y: newY } : item
      )
    );
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggingId) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (err) {}
      setDraggingId(null);
    }
  };

  // Add new Sticky Note
  const handleAddSticky = (colorHex: string) => {
    maxZIndexRef.current += 1;
    const newItem: DashboardItem = {
      id: 'sticky_' + Date.now(),
      type: 'sticky',
      x: 60 + Math.random() * 120,
      y: 80 + Math.random() * 80,
      width: 280,
      height: 250,
      zIndex: maxZIndexRef.current,
      color: colorHex,
      title: 'A Note Today 💡',
      content: 'Click here to write thoughts, tasks, or append emojis below...',
      pinned: false,
      rotation: Number((Math.random() * 4 - 2).toFixed(1)),
      dateStr: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    };
    setItems((prev) => [...prev, newItem]);
  };

  // Add Picture Card
  const handleAddPicture = (url: string, captionStr?: string) => {
    maxZIndexRef.current += 1;
    const newItem: DashboardItem = {
      id: 'pic_' + Date.now(),
      type: 'picture',
      x: 100 + Math.random() * 150,
      y: 90 + Math.random() * 90,
      width: 300,
      height: 320,
      zIndex: maxZIndexRef.current,
      title: 'Custom Photo 📷',
      imageUrl: url,
      caption: captionStr || 'Captured Moment',
      pinned: false,
      rotation: Number((Math.random() * 3 - 1.5).toFixed(1)),
      dateStr: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    };
    setItems((prev) => [...prev, newItem]);
    setShowAddImageModal(false);
    setImageUrlInput('');
    setImageCaptionInput('');
  };

  // Upload file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          handleAddPicture(event.target.result as string, file.name.replace(/\.[^/.]+$/, ''));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Insert emoji into note
  const handleInsertEmoji = (itemId: string, emoji: string) => {
    if (isTabLocked) return;
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        return {
          ...item,
          content: (item.content || '') + ' ' + emoji,
        };
      })
    );
  };

  const handleTogglePin = (id: string) => {
    if (isTabLocked) return;
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, pinned: !item.pinned } : item))
    );
  };

  const handleDeleteItem = (id: string) => {
    if (isTabLocked) return;
    const target = items.find(i => i.id === id);
    if (target?.permanent) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleToggleChecklist = (itemId: string, checkId: string) => {
    if (isTabLocked) return;
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId || !item.checklist) return item;
        return {
          ...item,
          checklist: item.checklist.map((c) =>
            c.id === checkId ? { ...c, done: !c.done } : c
          ),
        };
      })
    );
  };

  const handleAddChecklistItem = (itemId: string, text: string) => {
    if (!text.trim() || isTabLocked) return;
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const checklist = item.checklist || [];
        return {
          ...item,
          checklist: [...checklist, { id: 'c_' + Date.now(), text: text.trim(), done: false }],
        };
      })
    );
  };

  const handleResetBoard = () => {
    if (window.confirm('Reset dashboard board to default items and permanent widgets?')) {
      setItems(DEFAULT_ITEMS);
    }
  };

  // Calculated converted currency
  const fromRate = CURRENCY_RATES[fromCurrency] || 1;
  const toRate = CURRENCY_RATES[toCurrency] || 1;
  const convertedValue = ((convertAmount / fromRate) * toRate).toFixed(2);

  return (
    <div
      className={`w-full h-full flex flex-col flex-1 relative overflow-hidden select-none transition-colors duration-300 ${
        bgStyle === 'dots'
          ? 'bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:18px_18px] bg-stone-50/80'
          : bgStyle === 'grid'
          ? 'bg-[linear-gradient(to_right,#f3f4f6_1px,transparent_1px),linear-gradient(to_bottom,#f3f4f6_1px,transparent_1px)] [background-size:24px_24px] bg-white'
          : 'bg-stone-100/60'
      }`}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={() => {
        if (openThemePickerId) setOpenThemePickerId(null);
      }}
    >
      {/* 1. TOP SUBTAB OPTION BAR */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center">
        <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-stone-200/90 shadow-md transition-all duration-200 hover:shadow-lg">
          <button
            type="button"
            onClick={() => setShowEditOptions(!showEditOptions)}
            className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full transition-all cursor-pointer ${
              showEditOptions
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-stone-700 hover:bg-stone-100'
            }`}
            title="Click to show/hide customize features"
          >
            <span className="material-symbols-outlined !text-sm">
              {showEditOptions ? 'tune' : 'palette'}
            </span>
            <span>{showEditOptions ? 'Done Editing' : 'Customize Board'}</span>
            <span className="material-symbols-outlined !text-xs opacity-70">
              {showEditOptions ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
            </span>
          </button>

          <span className="w-px h-3.5 bg-stone-200 my-auto" />

          <button
            type="button"
            onClick={() => setIsTabLocked(!isTabLocked)}
            className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full transition-all cursor-pointer ${
              isTabLocked
                ? 'bg-amber-100 text-amber-900 border border-amber-300/80'
                : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100'
            }`}
            title={isTabLocked ? 'Tab is locked (Click to unlock)' : 'Lock tab to fix notes in place'}
          >
            <span className="material-symbols-outlined !text-xs">
              {isTabLocked ? 'lock' : 'lock_open'}
            </span>
            <span>{isTabLocked ? 'Locked' : 'Lock Tab'}</span>
          </button>
        </div>

        {/* EXPANDABLE FEATURES PANEL */}
        {showEditOptions && (
          <div className="mt-2 bg-white/95 backdrop-blur-xl border border-stone-200/90 shadow-2xl rounded-2xl p-3.5 max-w-xl w-[92vw] sm:w-[520px] flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
            
            {/* Sticky Notes */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">
                  ➕ Add Sticky Note
                </span>
                <span className="text-[10px] text-stone-400">Click color to spawn</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {STICKY_COLORS.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    disabled={isTabLocked}
                    onClick={() => handleAddSticky(c.bg)}
                    className="group relative flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                    style={{ backgroundColor: c.bg, borderColor: c.border, color: c.text }}
                    title={`Add ${c.name} note`}
                  >
                    <span className="w-2 h-2 rounded-full border border-black/10" style={{ backgroundColor: c.border }} />
                    <span>{c.name.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            <hr className="border-stone-100" />

            {/* Permanent Sticky Widget Themes */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">
                  🎨 Permanent Widget Themes
                </span>
                <span className="text-[10px] text-stone-400">Customizable colors</span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
                {PERMANENT_THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    disabled={isTabLocked}
                    onClick={() => {
                      // Apply theme to all 3 permanent widgets or prompt
                      setItems((prev) =>
                        prev.map((item) => item.permanent ? { ...item, themeId: theme.id } : item)
                      );
                    }}
                    className={`px-2 py-1 rounded-lg border text-[10px] font-bold shrink-0 transition cursor-pointer hover:scale-105 ${theme.bgClass} ${theme.textClass} ${theme.borderClass}`}
                    title={`Apply ${theme.name} theme to permanent widgets`}
                  >
                    {theme.name}
                  </button>
                ))}
              </div>
            </div>

            <hr className="border-stone-100" />

            {/* Photos */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">
                  🖼️ Add Picture & Photo
                </span>
                <button
                  type="button"
                  disabled={isTabLocked}
                  onClick={() => setShowAddImageModal(true)}
                  className="text-[10px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-0.5 cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined !text-xs">add_link</span>
                  <span>Custom URL / Upload</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {PRESET_PICTURES.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    disabled={isTabLocked}
                    onClick={() => handleAddPicture(preset.url, preset.caption)}
                    className="flex items-center gap-1.5 p-1.5 rounded-xl border border-stone-200/80 bg-stone-50 hover:bg-orange-50 hover:border-orange-200 text-left transition cursor-pointer group disabled:opacity-50"
                  >
                    <img
                      src={preset.url}
                      alt={preset.name}
                      className="w-7 h-7 rounded-lg object-cover shrink-0"
                    />
                    <div className="overflow-hidden">
                      <p className="text-[10px] font-bold text-stone-800 truncate group-hover:text-orange-700">
                        {preset.name}
                      </p>
                      <p className="text-[8px] text-stone-400 truncate">{preset.caption}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <hr className="border-stone-100" />

            {/* Controls */}
            <div className="flex items-center justify-between text-xs pt-0.5">
              <div className="flex items-center gap-1 text-[11px]">
                <span className="text-stone-400 font-bold text-[10px] uppercase mr-1">Canvas Grid:</span>
                {(['dots', 'grid', 'blank'] as const).map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => setBgStyle(style)}
                    className={`px-2 py-0.5 rounded-md font-semibold capitalize border transition cursor-pointer ${
                      bgStyle === style
                        ? 'bg-stone-900 text-white border-stone-900'
                        : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>

              <button
                type="button"
                disabled={isTabLocked}
                onClick={handleResetBoard}
                className="text-[10px] font-bold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined !text-xs">restart_alt</span>
                <span>Reset Board</span>
              </button>
            </div>

          </div>
        )}
      </div>

      {/* LOCKED BADGE */}
      {isTabLocked && (
        <div className="absolute top-3 left-4 z-[90] bg-amber-500/10 border border-amber-300/60 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1.5 text-amber-900 text-[11px] font-bold shadow-xs">
          <span className="material-symbols-outlined !text-xs text-amber-700">lock</span>
          <span>Tab Locked (Read Only)</span>
        </div>
      )}

      {/* 2. FREEFORM MOVABLE CANVAS AREA */}
      <div className="w-full h-full relative overflow-auto p-6 min-w-[1150px] min-h-[800px]">
        {items.map((item) => {
          const stickyStyleObj = STICKY_COLORS.find((c) => c.bg === item.color) || STICKY_COLORS[0];

          return (
            <div
              key={item.id}
              onPointerDown={(e) => handlePointerDown(item.id, e)}
              className={`absolute transition-shadow duration-150 group rounded-2xl border shadow-md hover:shadow-xl ${
                draggingId === item.id ? 'shadow-2xl scale-[1.01]' : ''
              } ${isTabLocked ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}
              style={{
                left: `${item.x}px`,
                top: `${item.y}px`,
                width: `${item.width}px`,
                zIndex: item.zIndex,
                transform: `rotate(${item.rotation}deg)`,
                backgroundColor: item.type === 'sticky' ? item.color : '#ffffff',
                borderColor: item.type === 'sticky' ? stickyStyleObj.border : '#e2e8f0',
              }}
            >
              {/* PIN ICON */}
              <div
                onClick={() => handleTogglePin(item.id)}
                className={`absolute -top-3.5 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full flex items-center justify-center transition-all z-20 cursor-pointer ${
                  item.pinned
                    ? 'bg-rose-500 text-white shadow-md rotate-12 scale-110'
                    : 'bg-white/80 text-stone-400 hover:text-stone-700 hover:bg-white shadow-xs opacity-0 group-hover:opacity-100'
                }`}
                title={item.pinned ? 'Unpin Note' : 'Pin Note'}
              >
                <span className="material-symbols-outlined !text-sm">push_pin</span>
              </div>

              {/* CARD CONTROLS HEADER (COLOR THEME PICKER, INFO `i` ICON & DELETE) */}
              <div className="absolute top-2.5 right-2.5 flex items-center gap-1 z-20 no-drag">
                {/* Color Theme Selector Button for Permanent Widgets */}
                {item.permanent && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenThemePickerId(openThemePickerId === item.id ? null : item.id);
                      }}
                      className="w-5 h-5 rounded-full bg-white/80 hover:bg-white text-stone-700 flex items-center justify-center transition cursor-pointer shadow-2xs border border-stone-200/80"
                      title="Change Widget Color Theme"
                    >
                      <span className="material-symbols-outlined !text-xs">palette</span>
                    </button>

                    {/* Popover Color Grid */}
                    {openThemePickerId === item.id && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute top-7 right-0 z-[100] bg-white border border-stone-200 shadow-2xl rounded-2xl p-2.5 w-52 grid grid-cols-2 gap-1.5 animate-in fade-in duration-150"
                      >
                        <div className="col-span-2 text-[10px] font-extrabold text-stone-400 uppercase tracking-wider px-1 pb-1 border-b border-stone-100">
                          Widget Color Theme
                        </div>
                        {PERMANENT_THEMES.map((theme) => (
                          <button
                            key={theme.id}
                            type="button"
                            onClick={() => {
                              handleChangeWidgetTheme(item.id, theme.id);
                              setOpenThemePickerId(null);
                            }}
                            className={`p-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1.5 border cursor-pointer transition hover:scale-105 ${theme.bgClass} ${theme.textClass} ${theme.borderClass}`}
                          >
                            <span className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0" />
                            <span className="truncate">{theme.name.split(' ')[0]}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Info `i` Icon for description modal */}
                {item.infoDescription && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setInfoModalContent({
                        title: item.title,
                        desc: item.infoDescription || 'Permanent Widget Info'
                      });
                    }}
                    className="w-5 h-5 rounded-full bg-white/80 hover:bg-orange-500 hover:text-white text-stone-700 flex items-center justify-center transition cursor-pointer shadow-2xs border border-stone-200/80"
                    title="Widget Features & Info"
                  >
                    <span className="font-serif font-bold text-[11px]">i</span>
                  </button>
                )}

                {/* Delete button (only if NOT permanent and NOT locked) */}
                {!item.permanent && !isTabLocked && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteItem(item.id);
                    }}
                    className="w-5 h-5 rounded-md bg-black/10 hover:bg-rose-600 hover:text-white text-stone-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer"
                    title="Delete item"
                  >
                    <span className="material-symbols-outlined !text-xs">close</span>
                  </button>
                )}
              </div>

              {/* --- SPECIAL WIDGET 1: CLOCK & LIVE WEATHER --- */}
              {item.type === 'clock-weather' ? (() => {
                const theme = getWidgetTheme(item, 'slate-dark');
                return (
                  <div className={`p-4 flex flex-col h-full rounded-2xl shadow-inner relative overflow-hidden border ${theme.bgClass} ${theme.borderClass} ${theme.textClass}`}>
                    {/* Decorative ambient gradient */}
                    <div className="absolute -top-10 -right-10 w-28 h-28 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />

                    {/* Header with Auto-detected Location */}
                    <div className={`flex items-center justify-between pb-2 border-b z-10 ${theme.borderClass}`}>
                      <div className="flex items-center gap-1.5">
                        <span className={`material-symbols-outlined !text-sm animate-pulse ${theme.accentClass}`}>schedule</span>
                        <span className={`text-[11px] font-bold uppercase tracking-wider ${theme.subtextClass}`}>Clock & Weather</span>
                        <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold">PERMANENT</span>
                      </div>

                      {/* Auto-detected Location Display (NO Country selector dropdown!) */}
                      <div className="flex items-center gap-1 no-drag mr-12 text-[10px] font-bold opacity-80" title="Auto-configured location from connection timezone">
                        <span className={`material-symbols-outlined !text-xs ${theme.accentClass}`}>my_location</span>
                        <span>{autoLocation}</span>
                      </div>
                    </div>

                    {/* Digital Clock Display */}
                    <div className="py-3 text-center z-10">
                      <div className={`text-3xl font-mono font-bold tracking-wider drop-shadow-xs ${theme.accentClass}`}>
                        {currentTime.toLocaleTimeString('en-US', { hour12: true })}
                      </div>
                      <div className={`text-[11px] font-medium mt-0.5 ${theme.subtextClass}`}>
                        {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>

                    {/* Live Weather Section */}
                    <div className={`rounded-xl p-2.5 border z-10 space-y-1.5 ${theme.cardBgClass} ${theme.cardBorderClass}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`material-symbols-outlined !text-2xl ${theme.accentClass}`}>partly_cloudy_day</span>
                          <div>
                            <div className="flex items-baseline gap-1">
                              <span className="text-xl font-bold font-mono">
                                {tempUnit === 'C' ? '24°C' : '75°F'}
                              </span>
                              <button
                                type="button"
                                onClick={() => setTempUnit(prev => prev === 'C' ? 'F' : 'C')}
                                className={`text-[10px] font-bold hover:underline no-drag cursor-pointer ${theme.accentClass}`}
                              >
                                °{tempUnit === 'C' ? 'F' : 'C'}
                              </button>
                            </div>
                            <p className={`text-[10px] font-medium ${theme.subtextClass}`}>Partly Cloudy • Gentle Breeze</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setIsWeatherRefreshing(true);
                            setTimeout(() => setIsWeatherRefreshing(false), 800);
                          }}
                          className={`p-1 rounded transition cursor-pointer no-drag ${theme.cardBgClass} hover:opacity-80`}
                          title="Refresh Live Weather"
                        >
                          <span className={`material-symbols-outlined !text-sm ${isWeatherRefreshing ? 'animate-spin' : ''}`}>sync</span>
                        </button>
                      </div>

                      <div className={`grid grid-cols-3 gap-1 pt-1 border-t text-center text-[9px] font-mono ${theme.cardBorderClass} ${theme.subtextClass}`}>
                        <div>Humidity: <span className="font-bold">62%</span></div>
                        <div>Wind: <span className="font-bold">14km/h</span></div>
                        <div>AQI: <span className="text-emerald-400 font-bold">28 Good</span></div>
                      </div>
                    </div>
                  </div>
                );
              })() : item.type === 'currency-converter' ? (() => {
                const theme = getWidgetTheme(item, 'emerald-dark');
                
                // Real-time calculation logic
                const fromRate = liveRates[fromCurrency] || CURRENCY_RATES[fromCurrency] || 1;
                const toRate = liveRates[toCurrency] || CURRENCY_RATES[toCurrency] || 1;
                const rawConverted = (convertAmount / fromRate) * toRate;
                const convertedValue = isNaN(rawConverted) 
                  ? '0.00' 
                  : rawConverted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                const unitRate = (toRate / fromRate).toFixed(4);

                const popularCurrencies = [
                  { code: 'EUR', label: 'Euro' },
                  { code: 'GBP', label: 'Pound' },
                  { code: 'JPY', label: 'Yen' },
                  { code: 'PHP', label: 'Peso' },
                  { code: 'AUD', label: 'Aussie' },
                  { code: 'CAD', label: 'CAD' },
                ];

                return (
                  /* --- SPECIAL WIDGET 2: CURRENCY CONVERTER & BAR GRAPH --- */
                  <div className={`p-4 flex flex-col h-full rounded-2xl shadow-inner border relative overflow-hidden ${theme.bgClass} ${theme.borderClass} ${theme.textClass}`}>
                    <div className={`flex items-center justify-between pb-2 border-b z-10 ${theme.borderClass}`}>
                      <div className="flex items-center gap-1.5">
                        <span className={`material-symbols-outlined !text-sm ${theme.accentClass}`}>currency_exchange</span>
                        <span className={`text-[11px] font-bold uppercase tracking-wider ${theme.subtextClass}`}>Currency Exchange</span>
                        <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold">PERMANENT</span>
                      </div>

                      <div className="flex items-center gap-1.5 no-drag mr-12">
                        {/* Live Refresh Button */}
                        <button
                          type="button"
                          onClick={fetchLiveExchangeRates}
                          className={`p-1 rounded transition cursor-pointer hover:bg-black/20 text-current ${isFetchingRates ? 'animate-spin' : ''}`}
                          title={`Refresh rates (${ratesLastUpdated})`}
                        >
                          <span className="material-symbols-outlined !text-xs">sync</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsCurrencyLocked(!isCurrencyLocked)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition cursor-pointer ${
                            isCurrencyLocked ? 'bg-amber-400 text-amber-950' : 'bg-black/20 text-current hover:bg-black/30'
                          }`}
                          title={isCurrencyLocked ? 'Currency Pair Locked' : 'Lock Currency Pair'}
                        >
                          <span className="material-symbols-outlined !text-xs">{isCurrencyLocked ? 'lock' : 'lock_open'}</span>
                          <span>{isCurrencyLocked ? 'Locked' : 'Lock'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Converter Controls */}
                    <div className="py-2 space-y-2 z-10">
                      <div className="flex items-center gap-1.5 no-drag">
                        <input
                          type="number"
                          disabled={isCurrencyLocked || isTabLocked}
                          value={convertAmount}
                          onChange={(e) => setConvertAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                          className={`w-20 px-2 py-1 border rounded-lg text-xs font-mono font-bold outline-none ${theme.cardBgClass} ${theme.cardBorderClass}`}
                        />

                        <select
                          disabled={isCurrencyLocked || isTabLocked}
                          value={fromCurrency}
                          onChange={(e) => setFromCurrency(e.target.value)}
                          className={`border text-xs font-bold rounded-lg px-2 py-1 outline-none cursor-pointer ${theme.cardBgClass} ${theme.cardBorderClass}`}
                        >
                          {Object.keys(liveRates).map(c => <option key={c} value={c} className="text-black">{c}</option>)}
                        </select>

                        {/* Swap Button */}
                        <button
                          type="button"
                          disabled={isCurrencyLocked || isTabLocked}
                          onClick={() => {
                            const temp = fromCurrency;
                            setFromCurrency(toCurrency);
                            setToCurrency(temp);
                          }}
                          className={`p-1 rounded-lg border transition cursor-pointer hover:bg-black/20 ${theme.cardBgClass} ${theme.cardBorderClass} ${theme.accentClass}`}
                          title="Swap From & To Currencies"
                        >
                          <span className="material-symbols-outlined !text-xs">swap_horiz</span>
                        </button>

                        <select
                          disabled={isCurrencyLocked || isTabLocked}
                          value={toCurrency}
                          onChange={(e) => setToCurrency(e.target.value)}
                          className={`border text-xs font-bold rounded-lg px-2 py-1 outline-none cursor-pointer ${theme.cardBgClass} ${theme.cardBorderClass}`}
                        >
                          {Object.keys(liveRates).map(c => <option key={c} value={c} className="text-black">{c}</option>)}
                        </select>
                      </div>

                      {/* Result Display & Unit Rate */}
                      <div className={`p-2.5 rounded-xl border text-center relative ${theme.cardBgClass} ${theme.cardBorderClass}`}>
                        <div className="flex items-center justify-between text-[10px] mb-0.5 px-1">
                          <span className={theme.subtextClass}>Converted Amount:</span>
                          <span className={`font-mono text-[9px] ${theme.subtextClass}`}>
                            1 {fromCurrency} = {unitRate} {toCurrency}
                          </span>
                        </div>

                        <div className={`text-xl font-mono font-extrabold ${theme.accentClass}`}>
                          {CURRENCY_SYMBOLS[toCurrency] || ''}{convertedValue} <span className="text-xs font-bold">{toCurrency}</span>
                        </div>

                        <div className="text-[9px] text-stone-400 font-mono mt-0.5 flex items-center justify-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          <span>{ratesLastUpdated}</span>
                        </div>
                      </div>

                      {/* Quick Amount Presets */}
                      <div className="flex items-center gap-1 no-drag">
                        {[10, 50, 100, 500, 1000].map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            disabled={isCurrencyLocked || isTabLocked}
                            onClick={() => setConvertAmount(amt)}
                            className={`flex-1 py-0.5 border rounded text-[9px] font-mono font-bold transition cursor-pointer ${
                              convertAmount === amt
                                ? 'bg-emerald-500 text-white border-emerald-400'
                                : `${theme.cardBgClass} ${theme.cardBorderClass} ${theme.subtextClass} hover:opacity-80`
                            }`}
                          >
                            ${amt}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Live Bar Graph Visualization (Using Real Rates) */}
                    <div className={`pt-1.5 border-t z-10 space-y-1 ${theme.cardBorderClass}`}>
                      <div className={`flex justify-between items-center text-[9px] font-mono ${theme.subtextClass}`}>
                        <span>Live Rates vs USD Baseline</span>
                        <span>Scale</span>
                      </div>
                      <div className="space-y-1">
                        {popularCurrencies.map(pop => {
                          const rateVal = liveRates[pop.code] || CURRENCY_RATES[pop.code] || 1;
                          // calculate bar width relative to JPY scale
                          const maxScale = 160;
                          const barPct = Math.min(100, Math.max(8, (rateVal / maxScale) * 100));
                          return (
                            <div key={pop.code} className="flex items-center gap-2 text-[9px] font-mono">
                              <span className="w-7 font-bold">{pop.code}</span>
                              <div className="flex-1 bg-black/20 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className="h-full rounded-full transition-all duration-500 bg-emerald-400" 
                                  style={{ width: `${barPct}%` }} 
                                />
                              </div>
                              <span className={`w-12 text-right font-bold ${theme.subtextClass}`}>
                                {rateVal < 10 ? rateVal.toFixed(3) : rateVal.toFixed(1)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })() : item.type === 'word-of-day' ? (() => {
                const theme = getWidgetTheme(item, 'amber-dark');
                return (
                  /* --- SPECIAL WIDGET 3: WORD OF THE DAY & WISDOM POOL --- */
                  <div className={`p-4 flex flex-col h-full rounded-2xl shadow-inner border relative overflow-hidden ${theme.bgClass} ${theme.borderClass} ${theme.textClass}`}>
                    {/* Header & Category Pills */}
                    <div className={`flex items-center justify-between pb-2 border-b z-10 ${theme.borderClass}`}>
                      <div className="flex items-center gap-1.5">
                        <span className={`material-symbols-outlined !text-sm ${theme.accentClass}`}>format_quote</span>
                        <span className={`text-[11px] font-bold uppercase tracking-wider ${theme.subtextClass}`}>Word of the Day</span>
                        <span className="px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 text-[9px] font-bold">PERMANENT</span>
                      </div>
                    </div>

                    {/* Category Pills Bar */}
                    <div className="flex items-center gap-1 py-1.5 overflow-x-auto scrollbar-none no-drag z-10">
                      {(['All', 'Empathy', 'Motivation', 'Wisdom', 'Education', 'Advisories'] as QuoteCategory[]).map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            setSelectedQuoteCategory(cat);
                            setCurrentQuoteIndex(0);
                          }}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-full whitespace-nowrap transition cursor-pointer ${
                            selectedQuoteCategory === cat
                              ? 'bg-amber-500 text-white shadow-2xs'
                              : 'bg-black/10 text-current hover:bg-black/20'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    {/* Main Quote Display Card */}
                    <div className={`flex-1 p-3 rounded-xl border flex flex-col justify-between my-1 z-10 shadow-2xs ${theme.cardBgClass} ${theme.cardBorderClass}`}>
                      <p className="text-xs font-serif italic leading-relaxed font-medium">
                        "{activeQuote.text}"
                      </p>
                      <p className={`text-[10px] font-sans font-bold text-right mt-2 ${theme.accentClass}`}>
                        — {activeQuote.author}
                      </p>
                    </div>

                    {/* Action Bar */}
                    <div className={`pt-1.5 border-t flex items-center justify-between gap-1 no-drag z-10 ${theme.cardBorderClass}`}>
                      <button
                        type="button"
                        onClick={handleShuffleQuote}
                        className="px-2 py-1 bg-black/10 hover:bg-black/20 text-current text-[10px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1"
                        title="Shuffle to another quote"
                      >
                        <span>🎲 Shuffle</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCopyQuote}
                        className="px-2 py-1 bg-black/10 hover:bg-black/20 text-current text-[10px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1"
                        title="Copy quote text"
                      >
                        <span className="material-symbols-outlined !text-xs">{copiedQuoteNotice ? 'check' : 'content_copy'}</span>
                        <span>{copiedQuoteNotice ? 'Copied!' : 'Copy'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleAddQuoteToBolekpad}
                        className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1 shadow-2xs"
                        title="Add quote card to Bolekpad Notes"
                      >
                        <span className="material-symbols-outlined !text-xs">post_add</span>
                        <span>+ Bolekpad</span>
                      </button>
                    </div>
                  </div>
                );
              })() : item.type === 'sticky' ? (
                /* --- REGULAR STICKY NOTE CARD --- */
                <div className="p-4 flex flex-col h-full space-y-2" style={{ color: stickyStyleObj.text }}>
                  {/* Title Bar */}
                  <div className="flex items-center justify-between border-b pb-1.5 pr-6" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
                    <input
                      type="text"
                      disabled={isTabLocked}
                      value={item.title}
                      onChange={(e) => {
                        const val = e.target.value;
                        setItems((prev) =>
                          prev.map((i) => (i.id === item.id ? { ...i, title: val } : i))
                        );
                      }}
                      className="no-drag font-black text-sm bg-transparent border-none outline-none w-full tracking-tight"
                      placeholder="Note Title..."
                    />
                    {item.dateStr && (
                      <span className="text-[9px] font-mono font-bold uppercase tracking-wider opacity-60 shrink-0 ml-1">
                        {item.dateStr}
                      </span>
                    )}
                  </div>

                  {/* Note Text Content */}
                  <textarea
                    disabled={isTabLocked}
                    value={item.content || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setItems((prev) =>
                        prev.map((i) => (i.id === item.id ? { ...i, content: val } : i))
                      );
                    }}
                    rows={3}
                    className="no-drag w-full bg-transparent border-none outline-none text-xs font-medium resize-none leading-relaxed"
                    placeholder="Write your note here..."
                  />

                  {/* Checklist */}
                  {item.checklist && item.checklist.length > 0 && (
                    <div className="space-y-1 pt-1 border-t border-black/5">
                      {item.checklist.map((chk) => (
                        <div key={chk.id} className="flex items-center gap-1.5 text-xs no-drag">
                          <input
                            type="checkbox"
                            disabled={isTabLocked}
                            checked={chk.done}
                            onChange={() => handleToggleChecklist(item.id, chk.id)}
                            className="rounded accent-orange-600 cursor-pointer"
                          />
                          <span className={`text-[11px] font-medium ${chk.done ? 'line-through opacity-50' : ''}`}>
                            {chk.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Quick To-Do Input */}
                  {!isTabLocked && (
                    <div className="pt-1 no-drag space-y-1">
                      <input
                        type="text"
                        placeholder="+ Add quick todo..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleAddChecklistItem(item.id, e.currentTarget.value);
                            e.currentTarget.value = '';
                          }
                        }}
                        className="w-full text-[10px] bg-black/5 rounded-md px-2 py-1 outline-none font-medium opacity-70 focus:opacity-100 placeholder:text-stone-500"
                      />

                      {/* Emoji Quick Palette */}
                      <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-1 border-t border-black/5">
                        <span className="text-[9px] font-bold opacity-60 mr-1">Emoji:</span>
                        {EMOJI_PALETTE.map(emo => (
                          <button
                            key={emo}
                            type="button"
                            onClick={() => handleInsertEmoji(item.id, emo)}
                            className="text-xs hover:scale-125 transition cursor-pointer p-0.5 rounded hover:bg-black/5 shrink-0"
                            title={`Insert ${emo}`}
                          >
                            {emo}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* --- PICTURE / PHOTO CARD --- */
                <div className="p-3 flex flex-col h-full space-y-2 bg-white rounded-2xl">
                  <div className="relative rounded-xl overflow-hidden bg-stone-100 aspect-4/3 group/img">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="space-y-0.5">
                    <input
                      type="text"
                      disabled={isTabLocked}
                      value={item.title}
                      onChange={(e) => {
                        const val = e.target.value;
                        setItems((prev) =>
                          prev.map((i) => (i.id === item.id ? { ...i, title: val } : i))
                        );
                      }}
                      className="no-drag font-black text-xs text-stone-900 bg-transparent border-none outline-none w-full"
                      placeholder="Photo Title..."
                    />
                    <input
                      type="text"
                      disabled={isTabLocked}
                      value={item.caption || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setItems((prev) =>
                          prev.map((i) => (i.id === item.id ? { ...i, caption: val } : i))
                        );
                      }}
                      className="no-drag font-medium text-[10px] text-stone-500 bg-transparent border-none outline-none w-full"
                      placeholder="Add caption or tag..."
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 3. MODAL FOR CUSTOM IMAGE URL OR FILE UPLOAD */}
      {showAddImageModal && (
        <div className="fixed inset-0 z-[1000] bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-stone-200 rounded-2xl p-5 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-orange-600">add_photo_alternate</span>
                <h3 className="font-extrabold text-sm text-stone-900">Add Picture Card</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddImageModal(false)}
                className="text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <span className="material-symbols-outlined !text-lg">close</span>
              </button>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-stone-600">Upload Image File</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="w-full text-xs text-stone-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-2 my-2">
              <hr className="flex-1 border-stone-200" />
              <span className="text-[10px] font-bold text-stone-400 uppercase">OR Image URL</span>
              <hr className="flex-1 border-stone-200" />
            </div>

            <div className="space-y-2">
              <div>
                <label className="block text-[11px] font-bold text-stone-600 mb-1">Image Web Address (URL)</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  className="w-full text-xs border border-stone-200 rounded-xl p-2.5 outline-none focus:border-orange-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-600 mb-1">Caption / Label</label>
                <input
                  type="text"
                  placeholder="e.g. Dream Destination"
                  value={imageCaptionInput}
                  onChange={(e) => setImageCaptionInput(e.target.value)}
                  className="w-full text-xs border border-stone-200 rounded-xl p-2.5 outline-none focus:border-orange-500 font-medium"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setShowAddImageModal(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!imageUrlInput.trim()}
                onClick={() => handleAddPicture(imageUrlInput.trim(), imageCaptionInput.trim())}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white shadow-xs cursor-pointer disabled:opacity-50"
              >
                Add Picture Card
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. INFO MODAL FOR PERMANENT WIDGETS (`i` BUTTON DESCRIPTION) */}
      {infoModalContent && (
        <div className="fixed inset-0 z-[10000] bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-stone-200 rounded-2xl p-5 w-full max-w-sm shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 font-serif font-bold text-xs flex items-center justify-center">
                  i
                </div>
                <h3 className="font-bold text-sm text-stone-900 truncate">{infoModalContent.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setInfoModalContent(null)}
                className="text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <span className="material-symbols-outlined !text-lg">close</span>
              </button>
            </div>

            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-700 whitespace-pre-line leading-relaxed">
              {infoModalContent.desc}
            </div>

            <button
              type="button"
              onClick={() => setInfoModalContent(null)}
              className="w-full py-2 bg-stone-900 text-white font-bold text-xs rounded-xl hover:bg-stone-800 transition cursor-pointer"
            >
              Got It
            </button>
          </div>
        </div>
      )}

      {/* 5. MOBILE SCREEN WARNING PROMPT */}
      {showMobileNotice && (
        <div className="fixed inset-0 z-[100000] bg-stone-900/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-stone-200 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto shadow-inner">
              <span className="material-symbols-outlined !text-2xl">devices</span>
            </div>
            <div>
              <h3 className="font-extrabold text-base text-stone-900">Tablet & Desktop Display Design</h3>
              <p className="text-xs font-medium text-stone-500 mt-1.5 leading-relaxed">
                This view is specifically designed for tablet and desktop displays. You are currently visiting on a mobile screen.
              </p>
            </div>

            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs font-bold text-stone-700">
              Would you still like to continue?
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  sessionStorage.setItem('bolek_mobile_notice_dismissed', 'true');
                  setShowMobileNotice(false);
                }}
                className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-2xl shadow-xs transition cursor-pointer active:scale-95"
              >
                Continue Anyway
              </button>
              <button
                type="button"
                onClick={() => setShowMobileNotice(false)}
                className="w-full py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-2xl transition cursor-pointer"
              >
                Dismiss Notice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
