
import React, { useMemo, useState } from 'react';
import { Receipt, TAXONOMY } from '../types';
import { 
  Search, XCircle, ArrowUpDown, Flame, Clock,
  ShoppingBasket, Utensils, Fuel, Pill, 
  Home, Laptop, Shirt, Zap, Car, Ticket, Wrench, Box,
  Sparkles, MonitorSmartphone, Clapperboard, Droplets
} from 'lucide-react';

interface CategoriesOverviewViewProps {
  receipts: Receipt[];
  onSelectCategory: (category: string) => void;
}

type FilterType = 'all' | 'high-spend' | 'recent';
type DateRangeType = 'month' | '30days' | 'year' | 'all';

// --- Configuration ---
const getCategoryConfig = (category: string) => {
  const iconSize = 48;
  switch (category) {
    case "Groceries": 
      return { 
        icon: <ShoppingBasket size={iconSize} strokeWidth={1.5} />, 
        bg: "bg-green-100", text: "text-green-600", 
        border: "border-green-200" 
      };
    case "Restaurant": 
      return { 
        icon: <Utensils size={iconSize} strokeWidth={1.5} />, 
        bg: "bg-orange-100", text: "text-orange-600", 
        border: "border-orange-200" 
      };
    case "Gas/Fuel": 
      return { 
        icon: <Fuel size={iconSize} strokeWidth={1.5} />, 
        bg: "bg-red-100", text: "text-red-600", 
        border: "border-red-200" 
      };
    case "Pharmacy/Health": 
      return { 
        icon: <Pill size={iconSize} strokeWidth={1.5} />, 
        bg: "bg-teal-100", text: "text-teal-600", 
        border: "border-teal-200" 
      };
    case "Household": 
      return { 
        icon: <Home size={iconSize} strokeWidth={1.5} />, 
        bg: "bg-indigo-100", text: "text-indigo-600", 
        border: "border-indigo-200" 
      };
    case "Electronics": 
      return { 
        icon: <MonitorSmartphone size={iconSize} strokeWidth={1.5} />, 
        bg: "bg-zinc-100", text: "text-zinc-600", 
        border: "border-zinc-200" 
      };
    case "Clothing": 
      return { 
        icon: <Shirt size={iconSize} strokeWidth={1.5} />, 
        bg: "bg-pink-100", text: "text-pink-600", 
        border: "border-pink-200" 
      };
    case "Utilities": 
      return { 
        icon: <Zap size={iconSize} strokeWidth={1.5} />, 
        bg: "bg-yellow-100", text: "text-yellow-600", 
        border: "border-yellow-200" 
      };
    case "Transport": 
      return { 
        icon: <Car size={iconSize} strokeWidth={1.5} />, 
        bg: "bg-blue-100", text: "text-blue-600", 
        border: "border-blue-200" 
      };
    case "Entertainment": 
      return { 
        icon: <Clapperboard size={iconSize} strokeWidth={1.5} />, 
        bg: "bg-purple-100", text: "text-purple-600", 
        border: "border-purple-200" 
      };
    case "Services": 
      return { 
        icon: <Wrench size={iconSize} strokeWidth={1.5} />, 
        bg: "bg-slate-100", text: "text-slate-600", 
        border: "border-slate-200" 
      };
    default: 
      return { 
        icon: <Box size={iconSize} strokeWidth={1.5} />, 
        bg: "bg-neutral-100", text: "text-neutral-600", 
        border: "border-neutral-200" 
      };
  }
};

const CategoriesOverviewView: React.FC<CategoriesOverviewViewProps> = ({ receipts, onSelectCategory }) => {
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [dateRange, setDateRange] = useState<DateRangeType>('month');

  // --- Data Processing ---
  const filteredReceipts = useMemo(() => {
    const now = new Date();
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const today = startOfDay(now);
    
    return receipts.filter(r => {
       if (dateRange === 'all') return true;
       
       const rDate = startOfDay(r.purchaseDate);
       if (dateRange === 'month') {
           return r.purchaseDate.getMonth() === now.getMonth() && r.purchaseDate.getFullYear() === now.getFullYear();
       }
       if (dateRange === 'year') {
           return r.purchaseDate.getFullYear() === now.getFullYear();
       }
       if (dateRange === '30days') {
           const thirtyDaysAgo = new Date(today);
           thirtyDaysAgo.setDate(today.getDate() - 30);
           return rDate >= thirtyDaysAgo;
       }
       return true;
    });
  }, [receipts, dateRange]);

  const categoryStats = useMemo(() => {
    const stats: Record<string, { count: number, total: number, lastDate: Date | null }> = {};
    
    // Initialize all categories from taxonomy to ensure grid is full
    Object.keys(TAXONOMY).forEach(cat => {
        stats[cat] = { count: 0, total: 0, lastDate: null };
    });

    // Aggregate data
    filteredReceipts.forEach(r => {
        if (!stats[r.category]) {
             stats[r.category] = { count: 0, total: 0, lastDate: null };
        }
        stats[r.category].count += 1;
        stats[r.category].total += r.totalAmount;
        if (!stats[r.category].lastDate || r.purchaseDate > stats[r.category].lastDate!) {
             stats[r.category].lastDate = r.purchaseDate;
        }
    });

    let result = Object.entries(stats).map(([cat, stat]) => ({
        category: cat,
        ...stat
    }));

    // 1. Search Filter
    if (searchText) {
        const lowerSearch = searchText.toLowerCase();
        result = result.filter(item => item.category.toLowerCase().includes(lowerSearch));
    }

    // 2. Sorting
    if (filterType === 'high-spend') {
         result.sort((a, b) => b.total - a.total);
    } else if (filterType === 'recent') {
         result.sort((a, b) => {
             const dateA = a.lastDate ? a.lastDate.getTime() : 0;
             const dateB = b.lastDate ? b.lastDate.getTime() : 0;
             return dateB - dateA;
         });
    } else {
        // Default: Sort by Spend DESC, then Alphabetical
        result.sort((a, b) => {
            if (Math.abs(b.total - a.total) > 0.01) return b.total - a.total;
            return a.category.localeCompare(b.category);
        });
    }

    return result;
  }, [filteredReceipts, filterType, searchText]);

  const totalSpend = filteredReceipts.reduce((sum, r) => sum + r.totalAmount, 0);

  return (
    <div className="flex flex-col h-full bg-ios-bg">
      {/* --- Header (Fixed) --- */}
      <div className="bg-ios-bg px-4 pt-12 pb-4 flex-shrink-0 z-20 shadow-sm transition-shadow">
        <h1 className="text-3xl font-bold text-neutral-900 tracking-tight mb-4 animate-fade-in">Categories</h1>
        
        {/* Search */}
        <div className="relative mb-4 animate-scale-in origin-left">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-ios-gray" />
          </div>
          <input
            type="text"
            placeholder="Search categories..."
            className="w-full bg-neutral-200/80 text-neutral-900 rounded-xl py-2.5 pl-10 pr-8 focus:outline-none focus:ring-2 focus:ring-ios-blue/50 placeholder-neutral-500 text-[17px] transition-all"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          {searchText && (
            <button 
                onClick={() => setSearchText('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-ios-gray active:text-neutral-600"
            >
                <XCircle size={18} fill="currentColor" className="opacity-50" />
            </button>
          )}
        </div>

        {/* Controls Row */}
        <div className="flex flex-col gap-3">
            {/* Segmented Filter */}
            <div className="bg-neutral-200/60 p-1 rounded-xl flex text-[13px] font-semibold">
                <button 
                    onClick={() => setFilterType('all')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all duration-200 ${filterType === 'all' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500'}`}
                >
                    All
                </button>
                <button 
                    onClick={() => setFilterType('high-spend')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all duration-200 ${filterType === 'high-spend' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500'}`}
                >
                    High Spend
                </button>
                <button 
                    onClick={() => setFilterType('recent')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all duration-200 ${filterType === 'recent' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500'}`}
                >
                    Recent
                </button>
            </div>

            {/* Date Chips */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {[
                    { id: 'month', label: 'This Month' },
                    { id: '30days', label: 'Last 30 Days' },
                    { id: 'year', label: 'YTD' },
                    { id: 'all', label: 'All Time' }
                ].map(opt => (
                    <button
                        key={opt.id}
                        onClick={() => setDateRange(opt.id as DateRangeType)}
                        className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors border ${
                            dateRange === opt.id 
                            ? 'bg-neutral-800 text-white border-neutral-800' 
                            : 'bg-white text-neutral-600 border-neutral-200 active:bg-neutral-100'
                        }`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
        </div>
      </div>

      {/* --- Content Grid --- */}
      <div className="flex-1 overflow-y-auto px-4 pb-32 no-scrollbar">
        
        {/* Summary Text */}
        <div className="mb-4 px-1 flex items-center justify-between text-sm text-neutral-500 font-medium animate-fade-in">
             <span>{categoryStats.filter(c => c.count > 0).length} active categories</span>
             {totalSpend > 0 && (
                <span className="text-neutral-900">Total: ${totalSpend.toFixed(0)}</span>
             )}
        </div>

        {categoryStats.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-20 text-neutral-400 animate-fade-in">
                <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
                    <Search size={24} className="opacity-50" />
                </div>
                <p className="font-medium">No categories found</p>
                <button 
                    onClick={() => {setSearchText(''); setFilterType('all');}} 
                    className="mt-2 text-ios-blue text-sm font-semibold"
                >
                    Clear filters
                </button>
             </div>
        ) : (
            <div className="grid grid-cols-3 gap-3 pb-4">
                {categoryStats.map((stat, idx) => {
                    const config = getCategoryConfig(stat.category);
                    const hasSpend = stat.total > 0;
                    
                    return (
                        <button 
                            key={stat.category}
                            onClick={() => onSelectCategory(stat.category)}
                            className="relative group flex flex-col items-center bg-white rounded-2xl p-3 shadow-sm border border-transparent hover:border-neutral-100 transition-all duration-200 active:scale-[0.98] animate-slide-up"
                            style={{ animationDelay: `${idx * 0.03}s` }}
                        >
                            {/* Count Badge - Absolute Top Right */}
                            {stat.count > 0 && (
                                <div className="absolute top-2 right-2 bg-neutral-100 text-neutral-500 text-[10px] font-bold h-5 min-w-[20px] px-1 rounded-full flex items-center justify-center shadow-sm border border-white/50 z-10">
                                    {stat.count}
                                </div>
                            )}

                            {/* Icon Container - Large & Centered */}
                            <div className={`w-20 h-20 rounded-full mb-3 flex items-center justify-center transition-colors shadow-inner-sm border border-black/5 ${config.bg} ${config.text}`}>
                                {config.icon}
                            </div>

                            {/* Labels */}
                            <div className="text-center w-full">
                                <span className="block text-[13px] font-semibold text-neutral-900 leading-tight truncate px-1">
                                    {stat.category}
                                </span>
                                
                                <div className="h-5 mt-1 flex items-center justify-center">
                                    {hasSpend ? (
                                        <span className="text-[11px] font-medium text-neutral-500">
                                            ${stat.total.toFixed(0)}
                                        </span>
                                    ) : (
                                        <span className="text-[10px] text-neutral-300 font-medium">
                                            No spend
                                        </span>
                                    )}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        )}
      </div>
    </div>
  );
};

export default CategoriesOverviewView;
