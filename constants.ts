
import { Receipt, UserProfile, CategoryDefinition, BrandAsset } from './types';

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

export const BRAND_REGISTRY: Record<string, BrandAsset> = {
  "apple": { 
    name: "Apple", 
    color: "#000000", 
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg", 
    aliases: ["apple store", "apple inc"],
    sizeTier: 'compact',
    padding: 2
  },
  "starbucks": { 
    name: "Starbucks", 
    color: "#00704A", 
    logoUrl: "https://upload.wikimedia.org/wikipedia/en/thumb/d/d3/Starbucks_Corporation_Logo_2011.svg/1200px-Starbucks_Corporation_Logo_2011.svg.png", 
    aliases: ["starbucks coffee"],
    sizeTier: 'compact'
  },
  "costco": { 
    name: "Costco", 
    color: "#E31837", 
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/5/59/Costco_Wholesale_logo_2010-10-26.svg", 
    aliases: ["costco wholesale", "costco canada"],
    sizeTier: 'wide',
    padding: 2
  },
  "walmart": { 
    name: "Walmart", 
    color: "#0071CE", 
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/0/0b/Walmart_logo_%282025%3B_Alt%29.svg", 
    aliases: ["walmart supercentre", "walmart canada", "wal-mart"],
    sizeTier: 'wide',
    padding: 2
  },
  "shell": { 
    name: "Shell", 
    color: "#FBCE07", 
    logoUrl: "https://upload.wikimedia.org/wikipedia/en/e/e8/Shell_logo.svg", 
    aliases: ["shell station"],
    sizeTier: 'compact'
  },
  "mcdonalds": { 
    name: "McDonald's", 
    color: "#FFC72C", 
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/3/36/McDonald%27s_Golden_Arches.svg", 
    aliases: ["mcdonalds", "mcd"],
    sizeTier: 'compact'
  },
  "uber": { 
    name: "Uber", 
    color: "#000000", 
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/c/cc/Uber_logo_2018.png", 
    aliases: ["uber trip", "uber eats"],
    sizeTier: 'compact'
  },
  "netflix": {
    name: "Netflix",
    color: "#E50914",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg",
    aliases: ["netflix.com"],
    sizeTier: 'compact'
  },
  "wholefoods": {
    name: "Whole Foods",
    color: "#00674b",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/a/a2/Whole_Foods_Market_201x_logo.svg",
    aliases: ["whole foods market"],
    sizeTier: 'wide',
    padding: 2
  },
  // --- Canadian Retailers ---
  "foodbasics": {
    name: "Food Basics",
    color: "#7AB800",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/b/b5/Food_Basics_logo.svg",
    aliases: ["foodbasics", "food basics inc"],
    sizeTier: 'wide',
    padding: 2
  },
  "farmboy": {
    name: "Farm Boy",
    color: "#C41230",
    logoUrl: "https://upload.wikimedia.org/wikipedia/en/5/51/Farm_Boy_logo.svg",
    aliases: ["farmboy", "farm boy inc"],
    sizeTier: 'wide',
    padding: 2
  },
  "winners": {
    name: "Winners",
    color: "#005696",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/7/70/Winners_Logo.svg",
    aliases: ["winners homesense", "winners"],
    sizeTier: 'wide',
    padding: 2
  },
  "nofrills": {
    name: "No Frills",
    color: "#FFD200",
    logoUrl: "https://upload.wikimedia.org/wikipedia/en/2/23/No_Frills_logo.svg",
    aliases: ["nofrills", "loblaw no frills", "no frills"],
    sizeTier: 'wide',
    padding: 2
  },
  "loblaws": {
    name: "Loblaws",
    color: "#E75300",
    logoUrl: "https://upload.wikimedia.org/wikipedia/en/e/e2/Loblaws.svg",
    aliases: ["loblaws inc", "loblaws supermarket", "loblaw"],
    sizeTier: 'wide',
    padding: 2
  },
  "dollarama": {
    name: "Dollarama",
    color: "#32CD32",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/3/3c/Dollarama_logo.svg",
    aliases: ["dollarama inc", "dollarama"],
    sizeTier: 'wide',
    padding: 2
  },
  "dollartree": {
    name: "Dollar Tree",
    color: "#00994D",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/d/d4/Dollar_Tree_logo.svg",
    aliases: ["dollartree"],
    sizeTier: 'wide',
    padding: 2
  },
  "esso": {
    name: "Esso",
    color: "#E31837",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Esso_textlogo.svg/440px-Esso_textlogo.svg.png?20131024021441",
    aliases: ["imperial oil esso", "esso", "esso circle k"],
    sizeTier: 'compact'
  },
  "pioneer": {
    name: "Pioneer",
    color: "#F15D22",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/d/d4/Pioneer_Energy_logo.svg",
    aliases: ["pioneer gas", "pioneer energy"],
    sizeTier: 'wide',
    padding: 2
  },
  "timhortons": {
    name: "Tim Hortons",
    color: "#DD1021",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/5/57/Tim_Hortons_logo.svg",
    aliases: ["tims", "tim hortons", "tim horton's"],
    sizeTier: 'compact',
    padding: 1
  },
  "gianttiger": {
    name: "Giant Tiger",
    color: "#FFCC00",
    logoUrl: "https://upload.wikimedia.org/wikipedia/en/2/28/Giant_Tiger_logo.svg",
    aliases: ["gianttiger", "giant tiger"],
    sizeTier: 'wide',
    padding: 2
  },
  "canadiantire": {
    name: "Canadian Tire",
    color: "#DA291C",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/4/43/Canadian_Tire_logo.svg",
    aliases: ["canadiantire", "canadian tire", "ct", "canadian tire corp"],
    sizeTier: 'wide',
    padding: 2
  },
  "homedepot": {
    name: "Home Depot",
    color: "#F96302",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/5/5f/TheHomeDepot.svg",
    aliases: ["homedepot", "the home depot"],
    sizeTier: 'wide',
    padding: 2
  },
  "metro": {
    name: "Metro",
    color: "#DA291C",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/9/93/Metro_Inc._logo.svg",
    aliases: ["metro inc", "metro supermarket"],
    sizeTier: 'wide',
    padding: 2
  },
  "bestbuy": {
    name: "Best Buy",
    color: "#0046BE",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/f/f5/Best_Buy_Logo.svg",
    aliases: ["bestbuy", "best buy canada"],
    sizeTier: 'wide',
    padding: 2
  }
};

export const normalizeStoreName = (raw: string): string => {
  if (!raw) return "";
  return raw.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
};

export const getBrandAsset = (storeName: string): BrandAsset | null => {
  const normalized = normalizeStoreName(storeName);
  
  // 1. Direct match
  if (BRAND_REGISTRY[normalized]) return BRAND_REGISTRY[normalized];

  // 2. Alias match
  for (const key in BRAND_REGISTRY) {
    if (BRAND_REGISTRY[key].aliases.some(alias => normalizeStoreName(alias) === normalized)) {
      return BRAND_REGISTRY[key];
    }
    // Partial match check (simple)
    if (normalized.includes(key) || key.includes(normalized)) {
       return BRAND_REGISTRY[key];
    }
  }
  return null;
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
    storeName: 'Best Buy',
    purchaseDate: daysAgo(2),
    totalAmount: 249.99,
    subtotal: 221.23,
    hstAmount: 28.76,
    hstPercent: 13,
    category: 'Electronics',
    subcategory: 'Gadgets',
    items: [
      { name: "Sony Headphones", qty: 1, unitPrice: 221.23, amount: 221.23 }
    ],
    paymentMethod: "VISA **** 4242",
    notes: 'Noise cancelling headphones.',
    rawText: 'Best Buy Canada\nSony WH-1000XM5\nTotal: $249.99'
  },
  {
    id: '2',
    imageName: 'https://picsum.photos/400/600?random=2',
    storeName: 'Farm Boy',
    purchaseDate: daysAgo(5),
    totalAmount: 54.50,
    hstAmount: 0,
    category: 'Groceries',
    subcategory: 'Produce',
    items: [
      { name: "Honeycrisp Apples", qty: 4, unitPrice: 1.50, amount: 6.00 },
      { name: "Artisan Bread", qty: 1, unitPrice: 4.50, amount: 4.50 },
      { name: "Rotisserie Chicken", qty: 1, unitPrice: 12.00, amount: 12.00 },
      { name: "Salad Kit", qty: 2, unitPrice: 6.00, amount: 12.00 }
    ],
    notes: 'Weekly fresh produce.',
    rawText: 'Farm Boy Inc.\nApples\nBread\nTotal: 54.50'
  },
  {
    id: '3',
    imageName: 'https://picsum.photos/400/600?random=3',
    storeName: 'Tim Hortons',
    purchaseDate: daysAgo(0), // Today
    totalAmount: 8.45,
    hstAmount: 0.97,
    hstPercent: 13,
    category: 'Restaurant',
    subcategory: 'Cafe',
    items: [
      { name: "Large Double Double", qty: 1, unitPrice: 2.15, amount: 2.15 },
      { name: "Boston Cream", qty: 2, unitPrice: 1.59, amount: 3.18 },
      { name: "Everything Bagel", qty: 1, unitPrice: 2.15, amount: 2.15 }
    ],
    rawText: 'Tim Hortons\nDouble Double\nDonut\nTotal: 8.45'
  },
  {
    id: '4',
    imageName: 'https://picsum.photos/400/600?random=4',
    storeName: 'Uber',
    purchaseDate: daysAgo(8),
    totalAmount: 24.90,
    hstAmount: 3.24,
    category: 'Transport',
    subcategory: 'Rideshare',
    items: [
        { name: "Trip Fare", qty: 1, unitPrice: 18.50, amount: 18.50 },
        { name: "Booking Fee", qty: 1, unitPrice: 3.16, amount: 3.16 }
    ],
    notes: 'Ride home from airport.',
    rawText: 'Uber Receipt\nTrip to Downtown\nTotal: $24.90'
  },
  {
    id: '5',
    imageName: 'https://picsum.photos/400/600?random=5',
    storeName: 'Esso',
    purchaseDate: daysAgo(12),
    totalAmount: 65.00,
    category: 'Gas/Fuel',
    subcategory: 'Gasoline',
    items: [{ name: "Regular 87", qty: 50, unitPrice: 1.30, amount: 65.00 }],
    rawText: 'Imperial Oil Esso\nRegular 87\n50L @ 1.30\nTotal: 65.00'
  },
  {
    id: '6',
    imageName: 'https://picsum.photos/400/600?random=6',
    storeName: 'Dollarama',
    purchaseDate: daysAgo(3),
    totalAmount: 14.50,
    category: 'Household',
    subcategory: 'Supplies',
    items: [
        { name: "Cleaning Wipes", qty: 2, unitPrice: 4.00, amount: 8.00 },
        { name: "Notebook", qty: 1, unitPrice: 3.50, amount: 3.50 }
    ],
    hstAmount: 1.89,
    rawText: 'Dollarama Inc.\nWipes\nTotal: 14.50'
  },
  {
    id: '7',
    imageName: 'https://picsum.photos/400/600?random=7',
    storeName: 'Walmart',
    purchaseDate: daysAgo(15),
    totalAmount: 142.20,
    category: 'Groceries',
    subcategory: 'Food Retail',
    items: [
       { name: "Groceries", qty: 1, unitPrice: 142.20, amount: 142.20 }
    ],
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
    items: [{ name: "Standard Plan", qty: 1, unitPrice: 16.99, amount: 16.99 }],
    rawText: 'Netflix Subscription\nStandard Plan\nTotal: 16.99'
  },
  {
    id: '9',
    imageName: 'https://picsum.photos/400/600?random=9',
    storeName: 'Loblaws',
    purchaseDate: daysAgo(1),
    totalAmount: 89.50,
    category: 'Groceries',
    subcategory: 'Food Retail',
    items: [
        { name: "President's Choice Cookies", qty: 2, unitPrice: 3.50, amount: 7.00 },
        { name: "Steak", qty: 2, unitPrice: 25.00, amount: 50.00 }
    ],
    rawText: 'Loblaws Supermarket\nSteak\nCookies\nTotal: 89.50'
  },
  {
    id: '10',
    imageName: 'https://picsum.photos/400/600?random=10',
    storeName: 'No Frills',
    purchaseDate: daysAgo(6),
    totalAmount: 42.15,
    category: 'Groceries',
    subcategory: 'Food Retail',
    items: [
      { name: "No Name Paper Towels", qty: 1, unitPrice: 6.99, amount: 6.99 },
      { name: "Lean Ground Beef", qty: 1, unitPrice: 12.50, amount: 12.50 },
      { name: "Apples 3lb", qty: 1, unitPrice: 4.99, amount: 4.99 }
    ],
    rawText: 'No Frills #123\nThank you for shopping\nTotal: 42.15'
  },
  {
    id: '11',
    imageName: 'https://picsum.photos/400/600?random=11',
    storeName: 'Costco',
    purchaseDate: daysAgo(4),
    totalAmount: 215.97,
    category: 'Groceries',
    subcategory: 'Food Retail',
    items: [
      { name: "Kirkland Bath Tissue", qty: 1, unitPrice: 22.99, amount: 22.99 },
      { name: "Rotisserie Chicken", qty: 2, unitPrice: 7.99, amount: 15.98 },
      { name: "AAA Ribeye Steaks", qty: 1, unitPrice: 65.00, amount: 65.00 },
      { name: "Kirkland Protein Bars", qty: 1, unitPrice: 24.99, amount: 24.99 }
    ],
    rawText: 'Costco Wholesale #543\nMember 123456789\nTotal: 215.97'
  }
];
