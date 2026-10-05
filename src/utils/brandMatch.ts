/**
 * Which store a receipt's store name belongs to, so its logo can be shown. Plain pattern matching on the name,
 * no network. `slug` is the file name in assets/brands (see src/brandLogos.ts). The first match wins, so the
 * more specific names come first (Uber Eats before Uber, Taco Bell before Bell).
 */
export interface BrandMatch { slug: string; name: string }

const BRANDS: { slug: string; name: string; match: RegExp }[] = [
  { slug: 'uber-eats', name: 'Uber Eats', match: /uber\s*[-.]?\s*eats/ },
  { slug: 'taco-bell', name: 'Taco Bell', match: /taco\s*bell/ },
  { slug: 'tim-hortons', name: 'Tim Hortons', match: /tim\s*hortons?|\btims\b/ },
  { slug: 'starbucks', name: 'Starbucks', match: /starbucks/ },
  { slug: 'mcdonalds', name: 'McDonald’s', match: /mc\s*donald/ },
  { slug: 'a-and-w', name: 'A&W', match: /\ba\s*(&|and)\s*w\b/ },
  { slug: 'kfc', name: 'KFC', match: /\bkfc\b|kentucky\s*fried/ },
  { slug: 'chick-fil-a', name: 'Chick-fil-A', match: /chick[\s-]*fil[\s-]*a/ },
  { slug: 'popeyes', name: 'Popeyes', match: /popeye'?s/ },
  { slug: 'doordash', name: 'DoorDash', match: /door\s*dash/ },
  { slug: 'skip', name: 'Skip', match: /skip\s*the\s*dishes|^skip$/ },
  { slug: 'uber', name: 'Uber', match: /\buber\b/ },
  { slug: 'esso', name: 'Esso', match: /\besso\b/ },
  { slug: 'mobil', name: 'Mobil', match: /\bmobil\b/ },
  { slug: 'shell', name: 'Shell', match: /\bshell\b/ },
  { slug: 'pioneer', name: 'Pioneer', match: /\bpioneer\b/ },
  { slug: 'costco', name: 'Costco', match: /costco/ },
  { slug: 'walmart', name: 'Walmart', match: /wal\s*-?\s*mart/ },
  { slug: 'loblaws', name: 'Loblaws', match: /loblaws?\b/ },
  { slug: 'real-canadian-superstore', name: 'Real Canadian Superstore', match: /superstore/ },
  { slug: 'no-frills', name: 'No Frills', match: /no\s*frills/ },
  { slug: 'food-basics', name: 'Food Basics', match: /food\s*basics/ },
  { slug: 'freshco', name: 'FreshCo', match: /fresh\s*co\b/ },
  { slug: 'farm-boy', name: 'Farm Boy', match: /farm\s*boy/ },
  { slug: 'metro', name: 'Metro', match: /\bmetro\b/ },
  { slug: 'adonis', name: 'Adonis', match: /\badonis/ },
  { slug: 'giant-tiger', name: 'Giant Tiger', match: /giant\s*tiger/ },
  { slug: 'dollarama', name: 'Dollarama', match: /dollarama/ },
  { slug: 'canadian-tire', name: 'Canadian Tire', match: /canadian\s*tire/ },
  { slug: 'best-buy', name: 'Best Buy', match: /best\s*buy/ },
  { slug: 'amazon', name: 'Amazon', match: /\bamazon|\bamzn\b/ },
  { slug: 'h-and-m', name: 'H&M', match: /\bh\s*(&|and)\s*m\b/ },
  { slug: 'nike', name: 'Nike', match: /\bnike\b/ },
  { slug: 'bell', name: 'Bell', match: /\bbell\b/ },
  { slug: 'rogers', name: 'Rogers', match: /\brogers\b/ },
  { slug: 'london-hydro', name: 'London Hydro', match: /london\s*hydro/ },
  { slug: 'enbridge', name: 'Enbridge', match: /enbridge/ },
  { slug: 'td', name: 'TD', match: /^td\b|\btd\s*(bank|canada\s*trust)/ },
  { slug: 'anthropic', name: 'Anthropic', match: /anthropic/ },
  { slug: 'openai', name: 'OpenAI', match: /open\s*ai\b/ },
];

export const findBrand = (storeName: string | undefined | null): BrandMatch | null => {
  const text = (storeName ?? '').toLowerCase().replace(/[’`]/g, "'").replace(/\s+/g, ' ').trim();
  if (!text) return null;
  const hit = BRANDS.find(b => b.match.test(text));
  return hit ? { slug: hit.slug, name: hit.name } : null;
};

export const BRAND_SLUGS = BRANDS.map(b => b.slug);
