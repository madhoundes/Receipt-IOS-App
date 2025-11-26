import { UserProfile, CategoryDefinition, BrandAsset } from './types';

export const THEME = {
  colors: {
    bg: '#F2F2F7',
    card: '#FFFFFF',
    blue: '#007AFF',
    teal: '#30B0C7',
    red: '#FF3B30',
    gray: '#8E8E93',
    separator: '#C6C6C8',
    text: '#000000',
    textSecondary: '#8E8E93',
  },
  radius: {
    md: 12,
    lg: 16,
    xl: 20
  }
};

// --- Brand Registry (Same as Web) ---
export const BRAND_REGISTRY: Record<string, BrandAsset> = {
  "costco": { 
    name: "Costco", 
    color: "#E31837", 
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/5/59/Costco_Wholesale_logo_2010-10-26.svg", 
    aliases: ["costco wholesale", "costco canada"],
    sizeTier: 'wide'
  },
  "walmart": { 
    name: "Walmart", 
    color: "#0071CE", 
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/0/0b/Walmart_logo_%282025%3B_Alt%29.svg", 
    aliases: ["walmart supercentre", "walmart canada", "wal-mart"],
    sizeTier: 'wide'
  },
  "timhortons": {
    name: "Tim Hortons",
    color: "#DD1021",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/5/57/Tim_Hortons_logo.svg",
    aliases: ["tims", "tim hortons", "tim horton's"],
    sizeTier: 'compact'
  },
  "dollarama": {
    name: "Dollarama",
    color: "#32CD32",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/3/3c/Dollarama_logo.svg",
    aliases: ["dollarama inc", "dollarama"],
    sizeTier: 'wide'
  },
  "uber": { 
    name: "Uber", 
    color: "#000000", 
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/c/cc/Uber_logo_2018.png", 
    aliases: ["uber trip", "uber eats"],
    sizeTier: 'compact'
  },
  "esso": {
    name: "Esso",
    color: "#E31837",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Esso_textlogo.svg/440px-Esso_textlogo.svg.png?20131024021441",
    aliases: ["imperial oil esso", "esso", "esso circle k"],
    sizeTier: 'compact'
  },
  // ... (Other brands would be here)
};

export const normalizeStoreName = (raw: string): string => {
  if (!raw) return "";
  return raw.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
};

export const getBrandAsset = (storeName: string): BrandAsset | null => {
  const normalized = normalizeStoreName(storeName);
  if (BRAND_REGISTRY[normalized]) return BRAND_REGISTRY[normalized];
  for (const key in BRAND_REGISTRY) {
    if (BRAND_REGISTRY[key].aliases.some(alias => normalizeStoreName(alias) === normalized)) {
      return BRAND_REGISTRY[key];
    }
    if (normalized.includes(key) || key.includes(normalized)) {
       return BRAND_REGISTRY[key];
    }
  }
  return null;
};

export const DEFAULT_USER_PROFILE: UserProfile = {
  name: "Guest User",
  email: "guest@receiptfy.app",
  currency: "USD",
  hstDefaultPercent: 13,
  reduceMotion: false,
  hapticsEnabled: true,
  showBrandLogos: true,
  ocrThreshold: 0.7,
  autoCategorize: true,
  autoCrop: true,
  flashDefault: 'off',
  notifications: {
    ocr: true,
    share: true,
    insights: true
  },
  isPro: false
};

// Default Categories with Native Color Mapping
export const DEFAULT_CATEGORIES: CategoryDefinition[] = [
  {
    id: 'cat_1', name: "Groceries", iconName: "ShoppingBasket", color: "#22c55e", visibility: 'visible',
    aliases: [], keywords: ["milk"], subcategories: [{id: 's1', name: "Food Retail"}],
    taxRule: { mode: 'none' }, isPinned: true, orderIndex: 0, classifierBoost: 'high'
  },
  {
    id: 'cat_2', name: "Restaurant", iconName: "Utensils", color: "#f97316", visibility: 'visible',
    aliases: [], keywords: [], subcategories: [],
    taxRule: { mode: 'add' }, isPinned: true, orderIndex: 1, classifierBoost: 'medium'
  },
  {
    id: 'cat_3', name: "Gas/Fuel", iconName: "Fuel", color: "#ef4444", visibility: 'visible',
    aliases: [], keywords: [], subcategories: [],
    taxRule: { mode: 'included' }, isPinned: false, orderIndex: 2, classifierBoost: 'high'
  },
  // ... others mapped similarly
];