import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Receipt, UserProfile, CategoryDefinition } from '../types';
import { DEFAULT_USER_PROFILE, DEFAULT_CATEGORIES } from '../constants';
import { config } from '../config';
import { buildDemoReceipts } from '../data/demoReceipts';

interface ReceiptContextType {
  receipts: Receipt[];
  addReceipt: (r: Receipt) => void;
  updateReceipt: (r: Receipt) => void;
  deleteReceipt: (id: string) => void;
  userProfile: UserProfile;
  updateProfile: (p: UserProfile) => void;
  categories: CategoryDefinition[];
  updateCategories: (c: CategoryDefinition[]) => void;
  loading: boolean;
}

const ReceiptContext = createContext<ReceiptContextType | undefined>(undefined);

export const ReceiptProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE);
  const [categories, setCategories] = useState<CategoryDefinition[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [r, p, c] = await Promise.all([
          AsyncStorage.getItem('receipts'),
          AsyncStorage.getItem('profile'),
          AsyncStorage.getItem('categories')
        ]);
        
        if (r) setReceipts(JSON.parse(r));
        else if (config.seedDemoData) setReceipts(buildDemoReceipts());
        if (p) setUserProfile(JSON.parse(p));
        if (c) setCategories(JSON.parse(c));
      } catch (e) {
        console.error("Failed to load persistence", e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const persist = async (key: string, data: any) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (e) { console.error(e); }
  };

  // Functional updates so back-to-back edits don't overwrite each other.
  const setAndPersistReceipts = (update: (prev: Receipt[]) => Receipt[]) => {
    setReceipts(prev => {
      const next = update(prev);
      persist('receipts', next);
      return next;
    });
  };

  const addReceipt = (newReceipt: Receipt) => setAndPersistReceipts(prev => [newReceipt, ...prev]);

  const updateReceipt = (updated: Receipt) =>
    setAndPersistReceipts(prev => prev.map(r => r.id === updated.id ? updated : r));

  const deleteReceipt = (id: string) => setAndPersistReceipts(prev => prev.filter(r => r.id !== id));

  const updateProfile = (p: UserProfile) => {
    setUserProfile(p);
    persist('profile', p);
  };

  const updateCategories = (c: CategoryDefinition[]) => {
    setCategories(c);
    persist('categories', c);
  };

  return (
    <ReceiptContext.Provider value={{ receipts, addReceipt, updateReceipt, deleteReceipt, userProfile, updateProfile, categories, updateCategories, loading }}>
      {children}
    </ReceiptContext.Provider>
  );
};

export const useReceipts = () => {
  const context = useContext(ReceiptContext);
  if (!context) throw new Error("useReceipts must be used within Provider");
  return context;
};