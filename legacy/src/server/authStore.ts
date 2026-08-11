import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

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
}

// Ensure data directory and users.json exist with an initial seed user
function initUserStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(USERS_FILE)) {
    // Seed default admin user so existing login credentials work out of the box
    const defaultPasswordHash = bcrypt.hashSync('bolek2026', 10);
    const seedUser: UserAccount = {
      id: 'usr_seed_001',
      email: 'rjelvanbaloaloa@gmail.com',
      passwordHash: defaultPasswordHash,
      name: 'Jelvan Ricolcol',
      picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
      createdAt: new Date().toISOString(),
      verified: true,
      totpSecret: 'GBSWY3DPEHPK3PXP',
      passkeys: [
        {
          id: 'pk_seed_01',
          name: 'Primary Security Key',
          createdAt: new Date().toLocaleDateString(),
          real: true,
          username: 'rjelvanbaloaloa@gmail.com'
        }
      ]
    };
    fs.writeFileSync(USERS_FILE, JSON.stringify([seedUser], null, 2), 'utf-8');
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

  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(passwordPlain, saltRounds);

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
    passkeys: []
  };

  users.push(newUser);
  saveUsers(users);
  return newUser;
}

export async function verifyPassword(passwordPlain: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(passwordPlain, passwordHash);
}

export function generateAuthToken(user: UserAccount): string {
  const payload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    picture: user.picture || ''
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '14d' });
}

export function verifyAuthToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
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

export async function changeUserPassword(userId: string, oldPasswordPlain: string, newPasswordPlain: string): Promise<boolean> {
  const users = getAllUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) throw new Error('User not found.');

  const isValid = await bcrypt.compare(oldPasswordPlain, users[idx].passwordHash);
  if (!isValid) {
    throw new Error('Current password is incorrect.');
  }

  users[idx].passwordHash = await bcrypt.hash(newPasswordPlain, 10);
  saveUsers(users);
  return true;
}
