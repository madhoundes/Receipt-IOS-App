import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Receipt, UserProfile, CategoryDefinition } from '../types';
import { DEFAULT_USER_PROFILE, DEFAULT_CATEGORIES } from '../constants';
import { config } from '../config';
import { buildDemoReceipts, isDemoReceipt } from '../data/demoReceipts';
import { setHapticsEnabled } from '../utils/nativeUtils';

interface ReceiptContextType {
  receipts: Receipt[];
  addReceipt: (r: Receipt) => void;
  updateReceipt: (r: Receipt) => void;
  deleteReceipt: (id: string) => void;
  userProfile: UserProfile;
  updateProfile: (p: UserProfile) => void;
  categories: CategoryDefinition[];
  updateCategories: (c: CategoryDefinition[]) => void;
  /** Save a category; renaming it also moves its receipts to the new name. */
  saveCategory: (c: CategoryDefinition, previousName?: string) => void;
  /** Move every receipt from `source` to `target`, then remove `source`. */
  mergeCategory: (sourceId: string, targetId: string) => void;
  /** Remove a category; its receipts move to "Other". */
  deleteCategory: (id: string) => void;
  deleteAllReceipts: () => void;
  /** Developer tools: put the sample receipts in (replacing older samples) or take them out. The user's own receipts stay. */
  loadDemoReceipts: () => void;
  removeDemoReceipts: () => void;
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

  useEffect(() => setHapticsEnabled(userProfile.hapticsEnabled), [userProfile.hapticsEnabled]);

  const moveReceipts = (from: string, to: string, subcategory?: string) =>
    setAndPersistReceipts(prev => prev.map(r => r.category === from ? { ...r, category: to, subcategory: subcategory ?? r.subcategory } : r));

  const saveCategory = (c: CategoryDefinition, previousName?: string) => {
    const exists = categories.some(x => x.id === c.id);
    updateCategories(exists ? categories.map(x => x.id === c.id ? c : x) : [...categories, { ...c, orderIndex: categories.length }]);
    if (previousName && previousName !== c.name) moveReceipts(previousName, c.name);
  };

  const mergeCategory = (sourceId: string, targetId: string) => {
    const source = categories.find(c => c.id === sourceId), target = categories.find(c => c.id === targetId);
    if (!source || !target || source.id === target.id) return;
    const defaultSub = target.subcategories.find(s => s.id === target.defaultSubcategoryId)?.name ?? target.subcategories[0]?.name;
    moveReceipts(source.name, target.name, defaultSub);
    updateCategories(categories.filter(c => c.id !== sourceId));
  };

  const deleteCategory = (id: string) => {
    const cat = categories.find(c => c.id === id);
    if (!cat || cat.name === 'Other') return;
    moveReceipts(cat.name, 'Other', 'General');
    updateCategories(categories.filter(c => c.id !== id));
  };

  const deleteAllReceipts = () => setAndPersistReceipts(() => []);
  const loadDemoReceipts = () => setAndPersistReceipts(prev => [...prev.filter(r => !isDemoReceipt(r)), ...buildDemoReceipts()]);
  const removeDemoReceipts = () => setAndPersistReceipts(prev => prev.filter(r => !isDemoReceipt(r)));

  const updateCategories = (c: CategoryDefinition[]) => {
    setCategories(c);
    persist('categories', c);
  };

  return (
    <ReceiptContext.Provider value={{ receipts, addReceipt, updateReceipt, deleteReceipt, userProfile, updateProfile, categories, updateCategories, saveCategory, mergeCategory, deleteCategory, deleteAllReceipts, loadDemoReceipts, removeDemoReceipts, loading }}>
      {children}
    </ReceiptContext.Provider>
  );
};

export const useReceipts = () => {
  const context = useContext(ReceiptContext);
  if (!context) throw new Error("useReceipts must be used within Provider");
  return context;
};