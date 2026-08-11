export interface StickyAttachment {
  id: string;
  name: string;
  size: string;
  type: string;
  url: string;
}

export interface StickyMessage {
  id: string;
  senderEmail: string;
  senderName: string;
  senderUsername: string;
  recipientEmail: string;
  recipientName: string;
  recipientUsername: string;
  title?: string;
  content: string;
  color: string;
  pinned: boolean;
  isUnread: boolean;
  imageUrl?: string;
  attachments?: StickyAttachment[];
  createdAt: string;
  tags?: string[];
}

export interface Boleknote {
  id: string;
  title?: string;
  content: string;
  color: string;
  locked: boolean;
  minHeight?: string;
  pinned?: boolean;
  tags?: string[];
}

export interface Bolekpad {
  id: string;
  title: string;
  width: number; // percentage width
  coverUrl?: string; // empty means hidden, non-empty means shown
  cards: Boleknote[];
}

export type ActiveTab = 'dashboard' | 'notes' | 'send' | 'calendar' | 'profile' | 'bolekauth' | 'admin';

export type UserRole = 'admin' | 'user';
export type SubscriptionPlan = 'regular' | 'pro' | 'enterprise';

export interface PayPalSubscriptionState {
  subscriptionId: string;
  plan: SubscriptionPlan;
  status: 'ACTIVE' | 'APPROVAL_PENDING' | 'SUSPENDED' | 'CANCELLED' | 'EXPIRED' | 'UNKNOWN';
  trialEndsAt?: string | null;
  payerEmail?: string | null;
  updatedAt: string;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  subscription: SubscriptionPlan;
  createdAt: string;
  status: 'active' | 'suspended';
}

export interface FeatureAccessConfig {
  dashboard: boolean;
  notes: boolean;
  calendar: boolean;
  profile: boolean;
  send: boolean;
  bolekauth: boolean;
  futureFeatures: boolean;
}

export interface TotpAccount {
  id: string;
  issuer: string;
  account: string;
  secret: string;
  pinned?: boolean;
  tag?: string;
  tags?: string[];
  category?: 'All' | 'Bolek Workspace' | 'Personal' | 'Work';
  iconType?: 'facebook' | 'instagram' | 'zoho' | 'google' | 'github' | 'custom';
  cardColor?: string;
  createdAt?: string;
}

export interface ThemeDialogConfig {
  open: boolean;
  type: 'prompt' | 'confirm' | 'alert' | 'color';
  message: string;
  defaultValue?: string;
  okText?: string;
  cancelText?: string;
  currentColor?: string;
  resolve?: (value: any) => void;
}

export interface DocFootnote {
  id: string;
  number: number;
  text: string;
}

export interface DocComment {
  id: string;
  author: string;
  text: string;
  timestamp: string;
}

export interface DocTable {
  id: string;
  headers: string[];
  rows: string[][];
}

export interface DocImage {
  id: string;
  url: string;
  caption: string;
  rotate: number; // degrees
  brightness: number; // 0-200%
  contrast: number; // 0-200%
  scale: number; // 50-150%
}

export interface DocSignature {
  id: string;
  type: 'drawn' | 'typed';
  content: string; // Base64 data for drawn or text for typed
  font?: string;
  x: number;
  y: number;
}
