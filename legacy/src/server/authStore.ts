import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'bolek_desk_jwt_secret_key_2026_prod';
const DATA_DIR = path.resolve(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

export interface UserPasskey {
  id: string;
  name: string;
  createdAt: string;
  real: boolean;
  username: string;
  publicKey?: string;
}

export interface NotificationPreferences {
  securityEmails: boolean;
  loginEmails: boolean;
  welcomeEmail: boolean;
  passwordResetEmails: boolean;
  productEmails: boolean;
}

export interface UserAccount {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  picture?: string;
  createdAt: string;
  verified: boolean;
  totpSecret: string;
  passkeys: UserPasskey[];
  notificationPreferences: NotificationPreferences;
  lastLoginAt?: string;
  welcomeEmailSentAt?: string;
  passwordResetTokenHash?: string;
  passwordResetExpiresAt?: string;
}

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  securityEmails: true,
  loginEmails: true,
  welcomeEmail: true,
  passwordResetEmails: true,
  productEmails: false,
};

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

const PBKDF2_ITERATIONS = 120000;

function base64UrlEncode(value: Buffer | string): string {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecode(value: string): Buffer {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (padded.length % 4)) % 4;
  return Buffer.from(padded + '='.repeat(padLength), 'base64');
}

function hashPasswordSync(passwordPlain: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.pbkdf2Sync(passwordPlain, salt, PBKDF2_ITERATIONS, 64, 'sha512').toString('hex');
  return `pbkdf2$${PBKDF2_ITERATIONS}$${salt}$${derived}`;
}

async function hashPassword(passwordPlain: string): Promise<string> {
  return hashPasswordSync(passwordPlain);
}

async function verifyPasswordHash(passwordPlain: string, passwordHash: string): Promise<boolean> {
  const [scheme, iterationsStr, salt, stored] = passwordHash.split('$');
  if (scheme !== 'pbkdf2' || !iterationsStr || !salt || !stored) return false;

  const derived = crypto.pbkdf2Sync(
    passwordPlain,
    salt,
    Number(iterationsStr),
    stored.length / 2,
    'sha512'
  ).toString('hex');

  const storedBuf = Buffer.from(stored, 'hex');
  const derivedBuf = Buffer.from(derived, 'hex');
  if (storedBuf.length !== derivedBuf.length) return false;
  return crypto.timingSafeEqual(storedBuf, derivedBuf);
}

function signAuthToken(payload: Record<string, unknown>, expiresInSeconds = 14 * 24 * 60 * 60): string {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const body = base64UrlEncode(JSON.stringify({ ...payload, iat: now, exp: now + expiresInSeconds }));
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
  return `${header}.${body}.${signature}`;
}

function verifyTokenSignature(token: string): Record<string, any> | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const expected = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

  const expectedBuf = Buffer.from(expected);
  const signatureBuf = Buffer.from(signature);
  if (expectedBuf.length !== signatureBuf.length) return null;
  if (!crypto.timingSafeEqual(expectedBuf, signatureBuf)) return null;

  const payload = JSON.parse(base64UrlDecode(body).toString('utf8'));
  if (payload.exp && typeof payload.exp === 'number' && payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }
  return payload;
}

function buildSeedUser(): UserAccount {
  const seedEmail = (process.env.ADMIN_BOOTSTRAP_EMAIL || 'rjelvanbaloaloa@gmail.com').trim().toLowerCase();
  const seedName = process.env.ADMIN_BOOTSTRAP_NAME || 'Jelvan Ricolcol';
  const seedPasswordHash = process.env.ADMIN_BOOTSTRAP_PASSWORD_HASH
    || hashPasswordSync(process.env.ADMIN_BOOTSTRAP_PASSWORD || 'bolek2026');
  const seedTotpSecret = process.env.ADMIN_BOOTSTRAP_TOTP_SECRET || 'GBSWY3DPEHPK3PXP';

  return {
    id: 'usr_seed_001',
    email: seedEmail,
    passwordHash: seedPasswordHash,
    name: seedName,
    picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
    createdAt: new Date().toISOString(),
    verified: true,
    totpSecret: seedTotpSecret,
    passkeys: [
      {
        id: 'pk_seed_01',
        name: 'Primary Security Key',
        createdAt: new Date().toLocaleDateString(),
        real: true,
        username: seedEmail,
      }
    ],
    notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES
  };
}

// Ensure data directory and users.json exist with an initial seed user
function initUserStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([buildSeedUser()], null, 2), 'utf-8');
  }
}

function getAllUsers(): UserAccount[] {
  initUserStore();
  try {
    const raw = fs.readFileSync(USERS_FILE, 'utf-8');
    return JSON.parse(raw) as UserAccount[];
  } catch (err) {
    console.error('Error reading users store file:', err);
    return [];
  }
}

function saveUsers(users: UserAccount[]): void {
  initUserStore();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

export function findUserByEmail(email: string): UserAccount | undefined {
  const users = getAllUsers();
  return users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
}

export function findUserById(id: string): UserAccount | undefined {
  const users = getAllUsers();
  return users.find(u => u.id === id);
}

export async function createUser(email: string, passwordPlain: string, name: string): Promise<UserAccount> {
  const users = getAllUsers();
  const normalizedEmail = email.trim().toLowerCase();

  if (users.some(u => u.email.toLowerCase() === normalizedEmail)) {
    throw new Error('An account with this email address already exists.');
  }

  const passwordHash = await hashPassword(passwordPlain);

  // Generate a random base32 TOTP secret for the user
  const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let totpSecret = '';
  for (let i = 0; i < 16; i++) {
    totpSecret += base32Chars.charAt(Math.floor(Math.random() * base32Chars.length));
  }

  const newUser: UserAccount = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    email: normalizedEmail,
    passwordHash,
    name: name.trim() || normalizedEmail.split('@')[0],
    createdAt: new Date().toISOString(),
    verified: true,
    totpSecret,
    passkeys: [],
    notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES
  };

  users.push(newUser);
  saveUsers(users);
  return newUser;
}

export async function verifyPassword(passwordPlain: string, passwordHash: string): Promise<boolean> {
  return verifyPasswordHash(passwordPlain, passwordHash);
}

export function generateAuthToken(user: UserAccount): string {
  const payload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    picture: user.picture || ''
  };
  return signAuthToken(payload);
}

export function verifyAuthToken(token: string): any {
  try {
    return verifyTokenSignature(token);
  } catch (err) {
    return null;
  }
}

export function updateUserPasskeys(userId: string, passkeys: UserPasskey[]): UserAccount | null {
  const users = getAllUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) return null;

  users[idx].passkeys = passkeys;
  saveUsers(users);
  return users[idx];
}

export function updateUserNotificationPreferences(userId: string, preferences: Partial<NotificationPreferences>): UserAccount | null {
  const users = getAllUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) return null;

  users[idx].notificationPreferences = {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...users[idx].notificationPreferences,
    ...preferences
  };
  saveUsers(users);
  return users[idx];
}

export function updateUserProfile(userId: string, name: string, picture?: string): UserAccount | null {
  const users = getAllUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) return null;

  users[idx].name = name;
  if (picture !== undefined) {
    users[idx].picture = picture;
  }
  saveUsers(users);
  return users[idx];
}

export function setUserLastLogin(userId: string): UserAccount | null {
  const users = getAllUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) return null;

  users[idx].lastLoginAt = new Date().toISOString();
  saveUsers(users);
  return users[idx];
}

export function markWelcomeEmailSent(userId: string): UserAccount | null {
  const users = getAllUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) return null;

  users[idx].welcomeEmailSentAt = new Date().toISOString();
  saveUsers(users);
  return users[idx];
}

export function setPasswordResetToken(userId: string, tokenPlain: string, expiresAt: string): UserAccount | null {
  const users = getAllUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) return null;

  users[idx].passwordResetTokenHash = hashToken(tokenPlain);
  users[idx].passwordResetExpiresAt = expiresAt;
  saveUsers(users);
  return users[idx];
}

export async function resetUserPasswordWithToken(tokenPlain: string, newPasswordPlain: string): Promise<UserAccount | null> {
  const users = getAllUsers();
  const tokenHash = hashToken(tokenPlain);
  const now = Date.now();
  const idx = users.findIndex(u =>
    u.passwordResetTokenHash === tokenHash &&
    !!u.passwordResetExpiresAt &&
    new Date(u.passwordResetExpiresAt).getTime() > now
  );

  if (idx === -1) return null;

  users[idx].passwordHash = await hashPassword(newPasswordPlain);
  delete users[idx].passwordResetTokenHash;
  delete users[idx].passwordResetExpiresAt;
  saveUsers(users);
  return users[idx];
}

export async function changeUserPassword(userId: string, oldPasswordPlain: string, newPasswordPlain: string): Promise<boolean> {
  const users = getAllUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) throw new Error('User not found.');

  const isValid = await verifyPasswordHash(oldPasswordPlain, users[idx].passwordHash);
  if (!isValid) {
    throw new Error('Current password is incorrect.');
  }

  users[idx].passwordHash = await hashPassword(newPasswordPlain);
  delete users[idx].passwordResetTokenHash;
  delete users[idx].passwordResetExpiresAt;
  saveUsers(users);
  return true;
}
