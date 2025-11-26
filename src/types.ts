export interface ReceiptItem {
  name: string;
  qty: number;
  unitPrice: number;
  amount: number;
}

export interface Receipt {
  id: string;
  imageName: string; // Local File System URI
  storeName: string;
  purchaseDate: string; // ISO String for cleaner serialization in AsyncStorage
  totalAmount: number;
  subtotal?: number;
  hstAmount?: number;
  hstPercent?: number;
  currency?: string;
  items?: ReceiptItem[];
  paymentMethod?: string;
  category: string;
  subcategory?: string;
  notes?: string;
  rawText?: string;
  // Brand Identity
  brandId?: string;
  brandDisplayMode?: 'logo' | 'text';
  // Logo Detection Metadata
  logoDetected?: boolean;
  logoConfidence?: number;
  logoBounds?: number[]; // [ymin, xmin, ymax, xmax]
}

export interface UserProfile {
  name: string;
  email: string;
  avatar?: string;
  currency: string;
  hstDefaultPercent: number;
  reduceMotion: boolean;
  hapticsEnabled: boolean;
  showBrandLogos: boolean;
  ocrThreshold: number;
  autoCategorize: boolean;
  autoCrop: boolean;
  flashDefault: 'auto' | 'on' | 'off';
  notifications: {
      ocr: boolean;
      share: boolean;
      insights: boolean;
  };
  isPro: boolean;
}

export interface BrandAsset {
  name: string;
  logoUrl?: string;
  color: string;
  aliases: string[];
  sizeTier?: 'compact' | 'wide';
  padding?: number; 
}

// --- Category Management ---

export type Visibility = 'visible' | 'hidden' | 'archived';
export type ClassifierBoost = 'none' | 'low' | 'medium' | 'high';

export interface Subcategory {
  id: string;
  name: string;
}

export interface TaxRule {
  mode: 'included' | 'add' | 'none';
  percentOverride?: number;
}

export interface CategoryDefinition {
  id: string;
  name: string;
  iconName: string;
  color: string; // Tailwind class suffix logic mapped to Hex in Native
  visibility: Visibility;
  aliases: string[];
  keywords: string[];
  subcategories: Subcategory[];
  defaultSubcategoryId?: string;
  taxRule: TaxRule;
  isPinned: boolean;
  orderIndex: number;
  classifierBoost: ClassifierBoost;
}

export const TAXONOMY: Record<string, string[]> = {
  "Groceries": ["Food Retail", "Produce", "Dairy", "Bakery"],
  "Restaurant": ["Fast Food", "Dine-In", "Cafe"],
  "Gas/Fuel": ["Gasoline", "Diesel", "EV Charging"],
  "Pharmacy/Health": ["Medication", "Personal Care"],
  "Household": ["Supplies", "Decor", "Furniture"],
  "Electronics": ["Gadgets", "Computers", "Accessories"],
  "Clothing": ["Apparel", "Footwear", "Accessories"],
  "Utilities": ["Internet", "Mobile", "Electricity", "Water"],
  "Transport": ["Transit", "Rideshare", "Parking"],
  "Entertainment": ["Movies", "Events", "Games"],
  "Services": ["Repair", "Professional", "Cleaning"],
  "Other": ["General"]
};