
import { Receipt, UserProfile, CategoryDefinition } from './types';

// Helper to get date relative to today
const daysAgo = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
};

export const DEFAULT_USER_PROFILE: UserProfile = {
  name: "Guest User",
  email: "guest@receiptfy.app",
  currency: "USD",
  hstDefaultPercent: 13,
  reduceMotion: false,
  hapticsEnabled: true,
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

export const DEFAULT_CATEGORIES: CategoryDefinition[] = [
  {
    id: 'cat_1', name: "Groceries", iconName: "ShoppingBasket", color: "green-500", visibility: 'visible',
    aliases: ["Supermarket", "Food Market"], keywords: ["milk", "bread", "eggs", "organic"],
    subcategories: [{id: 's1', name: "Food Retail"}, {id: 's2', name: "Produce"}, {id: 's3', name: "Dairy"}, {id: 's4', name: "Bakery"}],
    taxRule: { mode: 'none' }, isPinned: true, orderIndex: 0, classifierBoost: 'high'
  },
  {
    id: 'cat_2', name: "Restaurant", iconName: "Utensils", color: "orange-500", visibility: 'visible',
    aliases: ["Diner", "Bistro", "Eatery"], keywords: ["tip", "server", "menu", "table"],
    subcategories: [{id: 's5', name: "Fast Food"}, {id: 's6', name: "Dine-In"}, {id: 's7', name: "Cafe"}],
    taxRule: { mode: 'add' }, isPinned: true, orderIndex: 1, classifierBoost: 'medium'
  },
  {
    id: 'cat_3', name: "Gas/Fuel", iconName: "Fuel", color: "red-500", visibility: 'visible',
    aliases: ["Petrol", "Station"], keywords: ["pump", "litre", "gallon", "unleaded"],
    subcategories: [{id: 's8', name: "Gasoline"}, {id: 's9', name: "Diesel"}, {id: 's10', name: "EV Charging"}],
    taxRule: { mode: 'included' }, isPinned: false, orderIndex: 2, classifierBoost: 'high'
  },
  {
    id: 'cat_4', name: "Pharmacy/Health", iconName: "Pill", color: "teal-500", visibility: 'visible',
    aliases: ["Drugstore", "Chemist"], keywords: ["rx", "prescription", "vitamin"],
    subcategories: [{id: 's11', name: "Medication"}, {id: 's12', name: "Personal Care"}],
    taxRule: { mode: 'add' }, isPinned: false, orderIndex: 3, classifierBoost: 'medium'
  },
  {
    id: 'cat_5', name: "Household", iconName: "Home", color: "indigo-500", visibility: 'visible',
    aliases: ["Home Goods"], keywords: ["decor", "furniture", "kitchen"],
    subcategories: [{id: 's13', name: "Supplies"}, {id: 's14', name: "Decor"}, {id: 's15', name: "Furniture"}],
    taxRule: { mode: 'add' }, isPinned: false, orderIndex: 4, classifierBoost: 'low'
  },
  {
    id: 'cat_6', name: "Electronics", iconName: "MonitorSmartphone", color: "zinc-500", visibility: 'visible',
    aliases: ["Tech", "Gadgets"], keywords: ["usb", "cable", "computer", "phone"],
    subcategories: [{id: 's16', name: "Gadgets"}, {id: 's17', name: "Computers"}, {id: 's18', name: "Accessories"}],
    taxRule: { mode: 'add' }, isPinned: false, orderIndex: 5, classifierBoost: 'medium'
  },
  {
    id: 'cat_7', name: "Clothing", iconName: "Shirt", color: "pink-500", visibility: 'visible',
    aliases: ["Apparel", "Fashion"], keywords: ["size", "cotton", "wear"],
    subcategories: [{id: 's19', name: "Apparel"}, {id: 's20', name: "Footwear"}, {id: 's21', name: "Accessories"}],
    taxRule: { mode: 'add' }, isPinned: false, orderIndex: 6, classifierBoost: 'low'
  },
  {
    id: 'cat_8', name: "Utilities", iconName: "Zap", color: "yellow-500", visibility: 'visible',
    aliases: ["Bills"], keywords: ["hydro", "water", "internet", "bill"],
    subcategories: [{id: 's22', name: "Internet"}, {id: 's23', name: "Mobile"}, {id: 's24', name: "Electricity"}, {id: 's25', name: "Water"}],
    taxRule: { mode: 'add' }, isPinned: false, orderIndex: 7, classifierBoost: 'medium'
  },
  {
    id: 'cat_9', name: "Transport", iconName: "Car", color: "blue-500", visibility: 'visible',
    aliases: ["Transit", "Travel"], keywords: ["uber", "lyft", "taxi", "fare", "ticket"],
    subcategories: [{id: 's26', name: "Transit"}, {id: 's27', name: "Rideshare"}, {id: 's28', name: "Parking"}],
    taxRule: { mode: 'included' }, isPinned: false, orderIndex: 8, classifierBoost: 'medium'
  },
  {
    id: 'cat_10', name: "Entertainment", iconName: "Clapperboard", color: "purple-500", visibility: 'visible',
    aliases: ["Fun"], keywords: ["movie", "cinema", "ticket", "event"],
    subcategories: [{id: 's29', name: "Movies"}, {id: 's30', name: "Events"}, {id: 's31', name: "Games"}],
    taxRule: { mode: 'add' }, isPinned: false, orderIndex: 9, classifierBoost: 'low'
  },
  {
    id: 'cat_11', name: "Services", iconName: "Wrench", color: "slate-500", visibility: 'visible',
    aliases: [], keywords: ["labor", "repair"],
    subcategories: [{id: 's32', name: "Repair"}, {id: 's33', name: "Professional"}, {id: 's34', name: "Cleaning"}],
    taxRule: { mode: 'add' }, isPinned: false, orderIndex: 10, classifierBoost: 'low'
  },
  {
    id: 'cat_12', name: "Other", iconName: "Box", color: "neutral-500", visibility: 'visible',
    aliases: ["General", "Misc"], keywords: [],
    subcategories: [{id: 's35', name: "General"}],
    taxRule: { mode: 'add' }, isPinned: false, orderIndex: 11, classifierBoost: 'none'
  }
];

export const MOCK_RECEIPTS: Receipt[] = [
  {
    id: '1',
    imageName: 'https://picsum.photos/400/600?random=1',
    storeName: 'Apple Store',
    purchaseDate: daysAgo(2),
    totalAmount: 1299.00,
    hstAmount: 168.87,
    hstPercent: 13,
    category: 'Electronics',
    subcategory: 'Computers',
    notes: 'New MacBook Pro for work.',
    rawText: 'Apple Store Yorkdale\nMacBook Pro 14"\nTotal: $1299.00'
  },
  {
    id: '2',
    imageName: 'https://picsum.photos/400/600?random=2',
    storeName: 'Whole Foods',
    purchaseDate: daysAgo(5),
    totalAmount: 84.50,
    category: 'Groceries',
    subcategory: 'Food Retail',
    notes: 'Weekly grocery run.',
    rawText: 'Whole Foods Market\nOrganic Bananas\nMilk\nTotal: 84.50'
  },
  {
    id: '3',
    imageName: 'https://picsum.photos/400/600?random=3',
    storeName: 'Starbucks',
    purchaseDate: daysAgo(0), // Today
    totalAmount: 12.40,
    hstAmount: 1.61,
    category: 'Restaurant',
    subcategory: 'Cafe',
    rawText: 'Starbucks Coffee\nLatte Grande\nCroissant\nTotal: 12.40'
  },
  {
    id: '4',
    imageName: 'https://picsum.photos/400/600?random=4',
    storeName: 'Uber',
    purchaseDate: daysAgo(8),
    totalAmount: 24.90,
    category: 'Transport',
    subcategory: 'Rideshare',
    notes: 'Ride home from airport.',
    rawText: 'Uber Receipt\nTrip to Downtown\nTotal: $24.90'
  },
  {
    id: '5',
    imageName: 'https://picsum.photos/400/600?random=5',
    storeName: 'Shell',
    purchaseDate: daysAgo(12),
    totalAmount: 65.00,
    category: 'Gas/Fuel',
    subcategory: 'Gasoline',
    rawText: 'Shell Station\nRegular 87\n50L @ 1.30\nTotal: 65.00'
  },
  {
    id: '6',
    imageName: 'https://picsum.photos/400/600?random=6',
    storeName: 'McDonalds',
    purchaseDate: daysAgo(3),
    totalAmount: 15.50,
    category: 'Restaurant',
    subcategory: 'Fast Food',
    rawText: 'McDonalds\nBig Mac Combo\nTotal: 15.50'
  },
  {
    id: '7',
    imageName: 'https://picsum.photos/400/600?random=7',
    storeName: 'Walmart',
    purchaseDate: daysAgo(15),
    totalAmount: 142.20,
    category: 'Groceries',
    subcategory: 'Food Retail',
    rawText: 'Walmart Supercentre\nGroceries\nTotal: 142.20'
  },
  {
    id: '8',
    imageName: 'https://picsum.photos/400/600?random=8',
    storeName: 'Netflix',
    purchaseDate: daysAgo(20),
    totalAmount: 16.99,
    category: 'Entertainment',
    subcategory: 'Movies',
    rawText: 'Netflix Subscription\nStandard Plan\nTotal: 16.99'
  },
  {
    id: '9',
    imageName: 'https://picsum.photos/400/600?random=9',
    storeName: 'Starbucks',
    purchaseDate: daysAgo(22),
    totalAmount: 8.50,
    category: 'Restaurant',
    subcategory: 'Cafe',
    rawText: 'Starbucks\nCoffee\nTotal: 8.50'
  }
];
