import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, AuthUser } from '../services/auth';

const ONBOARDED_KEY = 'app.onboarded';

interface AuthContextValue {
  loading: boolean;
  user: AuthUser | null;
  hasOnboarded: boolean;
  completeOnboarding: () => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithApple: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hasOnboarded, setHasOnboarded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [current, onboarded] = await Promise.all([auth.getCurrentUser(), AsyncStorage.getItem(ONBOARDED_KEY)]);
        setUser(current);
        setHasOnboarded(onboarded === '1');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const completeOnboarding = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDED_KEY, '1');
    setHasOnboarded(true);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    loading,
    user,
    hasOnboarded,
    completeOnboarding,
    signUp: async (name, email, password) => setUser(await auth.signUp(name, email, password)),
    signIn: async (email, password) => setUser(await auth.signIn(email, password)),
    signInWithApple: async () => setUser(await auth.signInWithApple()),
    sendPasswordReset: email => auth.sendPasswordReset(email),
    signOut: async () => { await auth.signOut(); setUser(null); },
  }), [loading, user, hasOnboarded, completeOnboarding]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
