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
  email: "guest@maplestub.app",
  currency: "CAD",
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
    insights: false
  },
  isPro: false
};

// Default Categories with Native Color Mapping
export const DEFAULT_CATEGORIES: CategoryDefinition[] = [
  {
    id: 'cat_1', name: "Groceries", iconName: "ShoppingBasket", color: "#12805C", visibility: 'visible',
    aliases: ["Supermarket", "Food Market"], keywords: ["milk", "bread", "eggs", "organic"],
    subcategories: [{ id: 's1', name: "Food Retail" }, { id: 's2', name: "Produce" }, { id: 's3', name: "Dairy" }, { id: 's4', name: "Bakery" }],
    taxRule: { mode: 'none' }, isPinned: true, orderIndex: 0, classifierBoost: 'high'
  },
  {
    id: 'cat_2', name: "Restaurant", iconName: "Utensils", color: "#B4480A", visibility: 'visible',
    aliases: ["Diner", "Bistro", "Eatery"], keywords: ["tip", "server", "menu", "table"],
    subcategories: [{ id: 's5', name: "Fast Food" }, { id: 's6', name: "Dine-In" }, { id: 's7', name: "Cafe" }],
    taxRule: { mode: 'add' }, isPinned: true, orderIndex: 1, classifierBoost: 'medium'
  },
  {
    id: 'cat_3', name: "Gas/Fuel", iconName: "Fuel", color: "#B42318", visibility: 'visible',
    aliases: ["Petrol", "Station"], keywords: ["pump", "litre", "unleaded"],
    subcategories: [{ id: 's8', name: "Gasoline" }, { id: 's9', name: "Diesel" }, { id: 's10', name: "EV Charging" }],
    taxRule: { mode: 'included' }, isPinned: false, orderIndex: 2, classifierBoost: 'high'
  },
  {
    id: 'cat_4', name: "Pharmacy/Health", iconName: "Pill", color: "#0E7C8C", visibility: 'visible',
    aliases: ["Drugstore", "Chemist"], keywords: ["rx", "prescription", "vitamin"],
    subcategories: [{ id: 's11', name: "Medication" }, { id: 's12', name: "Personal Care" }],
    taxRule: { mode: 'add' }, isPinned: false, orderIndex: 3, classifierBoost: 'medium'
  },
  {
    id: 'cat_5', name: "Household", iconName: "Home", color: "#3949AB", visibility: 'visible',
    aliases: ["Home Goods"], keywords: ["decor", "furniture", "kitchen"],
    subcategories: [{ id: 's13', name: "Supplies" }, { id: 's14', name: "Decor" }, { id: 's15', name: "Furniture" }],
    taxRule: { mode: 'add' }, isPinned: false, orderIndex: 4, classifierBoost: 'low'
  },
  {
    id: 'cat_6', name: "Electronics", iconName: "MonitorSmartphone", color: "#0B7A55", visibility: 'visible',
    aliases: [], keywords: [],
    subcategories: [{ id: 's16', name: "Gadgets" }, { id: 's17', name: "Computers" }, { id: 's18', name: "Accessories" }],
    taxRule: { mode: 'add' }, isPinned: false, orderIndex: 5, classifierBoost: 'low'
  },
  {
    id: 'cat_7', name: "Clothing", iconName: "Shirt", color: "#B0266E", visibility: 'visible',
    aliases: [], keywords: [],
    subcategories: [{ id: 's19', name: "Apparel" }, { id: 's20', name: "Footwear" }, { id: 's21', name: "Accessories" }],
    taxRule: { mode: 'add' }, isPinned: false, orderIndex: 6, classifierBoost: 'low'
  },
  {
    id: 'cat_8', name: "Utilities", iconName: "Zap", color: "#8A6100", visibility: 'visible',
    aliases: [], keywords: [],
    subcategories: [{ id: 's22', name: "Internet" }, { id: 's23', name: "Mobile" }, { id: 's24', name: "Electricity" }, { id: 's25', name: "Water" }],
    taxRule: { mode: 'add' }, isPinned: false, orderIndex: 7, classifierBoost: 'medium'
  },
  {
    id: 'cat_9', name: "Transport", iconName: "Car", color: "#4A34B8", visibility: 'visible',
    aliases: [], keywords: [],
    subcategories: [{ id: 's26', name: "Transit" }, { id: 's27', name: "Rideshare" }, { id: 's28', name: "Parking" }],
    taxRule: { mode: 'included' }, isPinned: false, orderIndex: 8, classifierBoost: 'low'
  },
  {
    id: 'cat_10', name: "Entertainment", iconName: "Clapperboard", color: "#7E2BA8", visibility: 'visible',
    aliases: [], keywords: [],
    subcategories: [{ id: 's29', name: "Movies" }, { id: 's30', name: "Events" }, { id: 's31', name: "Games" }],
    taxRule: { mode: 'add' }, isPinned: false, orderIndex: 9, classifierBoost: 'low'
  },
  {
    id: 'cat_11', name: "Services", iconName: "Wrench", color: "#475467", visibility: 'visible',
    aliases: [], keywords: [],
    subcategories: [{ id: 's32', name: "Repair" }, { id: 's33', name: "Professional" }, { id: 's34', name: "Cleaning" }],
    taxRule: { mode: 'add' }, isPinned: false, orderIndex: 10, classifierBoost: 'low'
  },
  {
    id: 'cat_12', name: "Other", iconName: "Box", color: "#55555C", visibility: 'visible',
    aliases: ["General", "Misc"], keywords: [],
    subcategories: [{ id: 's35', name: "General" }],
    taxRule: { mode: 'add' }, isPinned: false, orderIndex: 11, classifierBoost: 'none'
  },
];
