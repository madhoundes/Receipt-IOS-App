import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  provider: 'email' | 'apple';
}

/**
 * Everything the app needs from an auth backend. Screens only talk to this
 * interface, so swapping the mock for Firebase, Supabase, Cognito or your own
 * API means writing one new implementation and changing `auth` below.
 */
export interface AuthService {
  getCurrentUser(): Promise<AuthUser | null>;
  signUp(name: string, email: string, password: string): Promise<AuthUser>;
  signIn(email: string, password: string): Promise<AuthUser>;
  signInWithApple(): Promise<AuthUser>;
  sendPasswordReset(email: string): Promise<void>;
  updateProfile(changes: { name: string; email: string }): Promise<AuthUser>;
  signOut(): Promise<void>;
}

export class AuthError extends Error {}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const isValidEmail = (email: string) => EMAIL_RE.test(email.trim());
export const MIN_PASSWORD_LENGTH = 8;

const SESSION_KEY = 'auth.session';
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

/**
 * Prototype-only auth: any valid email and 8+ character password signs in.
 * It keeps only the signed-in user's profile on the device, never passwords.
 */
const mockAuthService: AuthService = {
  async getCurrentUser() {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  },
  async signUp(name, email, password) {
    await delay(700);
    if (!name.trim()) throw new AuthError('Enter your name.');
    if (!isValidEmail(email)) throw new AuthError('Enter a valid email address.');
    if (password.length < MIN_PASSWORD_LENGTH) throw new AuthError(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
    const user: AuthUser = { id: `u_${Date.now()}`, name: name.trim(), email: email.trim().toLowerCase(), provider: 'email' };
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(user));
    return user;
  },
  async signIn(email, password) {
    await delay(700);
    if (!isValidEmail(email)) throw new AuthError('Enter a valid email address.');
    if (password.length < MIN_PASSWORD_LENGTH) throw new AuthError('Email or password is incorrect.');
    const clean = email.trim().toLowerCase();
    const name = clean.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const user: AuthUser = { id: `u_${clean}`, name, email: clean, provider: 'email' };
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(user));
    return user;
  },
  async signInWithApple() {
    // TODO(auth): use expo-apple-authentication with the real backend.
    await delay(500);
    const user: AuthUser = { id: 'u_apple_demo', name: 'Apple User', email: 'private@privaterelay.appleid.com', provider: 'apple' };
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(user));
    return user;
  },
  async sendPasswordReset(email) {
    await delay(600);
    if (!isValidEmail(email)) throw new AuthError('Enter a valid email address.');
  },
  async updateProfile({ name, email }) {
    await delay(400);
    if (!name.trim()) throw new AuthError('Enter your name.');
    if (!isValidEmail(email)) throw new AuthError('Enter a valid email address.');
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) throw new AuthError('You are signed out.');
    const user: AuthUser = { ...(JSON.parse(raw) as AuthUser), name: name.trim(), email: email.trim().toLowerCase() };
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(user));
    return user;
  },
  async signOut() {
    await AsyncStorage.removeItem(SESSION_KEY);
  },
};

// TODO(auth): replace with the production implementation.
export const auth: AuthService = mockAuthService;
