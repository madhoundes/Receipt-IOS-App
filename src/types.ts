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
  /** The user confirmed the tax amount after OCR, including "no tax on this receipt". */
  taxReviewed?: boolean;
  currency?: string;
  items?: ReceiptItem[];
  paymentMethod?: string;
  category: string;
  subcategory?: string;
  notes?: string;
  rawText?: string;
  /** Last day the purchase can be returned (ISO). Set when the user adds a return reminder. */
  returnBy?: string;
  /** Id of the scheduled local notification for the return reminder, if one is set. */
  returnNotificationId?: string;
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
  /** Light, Dark, or follow the device (the default). */
  appearance?: 'system' | 'light' | 'dark';
  /** Default return window, in days, for new return reminders. */
  returnWindowDays?: number;
  /** How many days before a return window closes to send the notification. */
  remindDaysBefore?: number;
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
/** What reading a receipt photo produces. */
export interface OcrResult {
  storeName: string;
  purchaseDate: string; // ISO
  totalAmount: number;
  subtotal?: number;
  hstAmount?: number;
  hstPercent?: number;
  items: ReceiptItem[];
  category: string;
  subcategory?: string;
  /** How it was paid, when the receipt says so: "Mastercard •••• 8443", "Debit •••• 1023", "Cash". */
  paymentMethod?: string;
  /** The tax was worked out from subtotal and total because no tax line was read. */
  hstInferred?: boolean;
  /** 0 to 1: how sure the reader is about the key values. */
  confidence: number;
}
