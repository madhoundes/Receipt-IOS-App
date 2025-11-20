import React, { useState, useMemo, useEffect } from 'react';
import { Receipt } from '../types';
import { TrendingUp, Store, PieChart, Calendar, Lightbulb, DollarSign, Search, XCircle } from 'lucide-react';

interface SpendInsightsViewProps {
  receipts: Receipt[];
  onOpenCategory: (category: string) => void;
}

// Animated Number Component
const CountUp = ({ value, prefix = '' }: { value: number, prefix?: string }) => {
    const [displayValue, setDisplayValue] = useState(0);
    
    useEffect(() => {
        let start = 0;
        const end = value;
        const duration = 800;
        const startTime = performance.now();

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            
            setDisplayValue(start + (end - start) * easeOutQuart);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        requestAnimationFrame(animate);
    }, [value]);

    return <span>{prefix}{displayValue.toFixed(2)}</span>;
};

type TimeRange = 'week' | 'last_week' | 'month' | 'last_month' | 'all';

const SpendInsightsView: React.FC<SpendInsightsViewProps> = ({ receipts, onOpenCategory }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [searchText, setSearchText] = useState('');

  const filteredReceipts = useMemo(() => {
    const now = new Date();
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const today = startOfDay(now);
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    // Time Filtering
    if (timeRange === 'week') {
        const day = today.getDay() || 7;
        startDate = new Date(today); startDate.setDate(today.getDate() - day + 1);
        endDate = new Date(today); endDate.setDate(today.getDate() + (7 - day));
    } else if (timeRange === 'last_week') {
        const day = today.getDay() || 7;
        startDate = new Date(today); startDate.setDate(today.getDate() - day + 1 - 7);
        endDate = new Date(startDate); endDate.setDate(startDate.getDate() + 6);
    } else if (timeRange === 'month') {
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    } else if (timeRange === 'last_month') {
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        endDate = new Date(today.getFullYear(), today.getMonth(), 0);
    }

    return receipts.filter(r => {
        // Date Match
        let dateMatch = true;
        if (timeRange !== 'all' && startDate && endDate) {
             const rDate = startOfDay(r.purchaseDate);
             dateMatch = rDate >= startDate && rDate <= endDate;
        }
        if (!dateMatch) return false;

        // Search Text Match (Merchant or Category)
        if (searchText) {
            const lower = searchText.toLowerCase();
            return r.storeName.toLowerCase().includes(lower) || r.category.toLowerCase().includes(lower);
        }

        return true;
    });
  }, [receipts, timeRange, searchText]);

  const kpi = useMemo(() => {
    const totalSpend = filteredReceipts.reduce((sum, r) => sum + r.totalAmount, 0);
    const totalTax = filteredReceipts.reduce((sum, r) => sum + (r.hstAmount || 0), 0);
    const count = filteredReceipts.length;
    const avg = count > 0 ? totalSpend / count : 0;
    return { totalSpend, totalTax, count, avg };
  }, [filteredReceipts]);

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    filteredReceipts.forEach(r => map[r.category] = (map[r.category] || 0) + r.totalAmount);
    const total = Object.values(map).reduce((a, b) => a + b, 0);
    return Object.entries(map)
        .map(([cat, amount]) => ({ cat, amount, percent: total > 0 ? (amount / total) * 100 : 0 }))
        .sort((a, b) => b.amount - a.amount);
  }, [filteredReceipts]);

  const trendData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredReceipts.forEach(r => {
        const key = r.purchaseDate.getDate().toString();
        map[key] = (map[key] || 0) + r.totalAmount;
    });
    return Object.entries(map).map(([day, amount]) => ({ day, amount }));
  }, [filteredReceipts]);
  
  const maxDailySpend = trendData.reduce((max, d) => Math.max(max, d.amount), 0);

  const insights = useMemo(() => {
    const tips = [];
    if (categoryBreakdown.length > 0) {
        const top = categoryBreakdown[0];
        if (top.percent > 30) {
            tips.push({ title: "Heavy Hitter", desc: `${top.cat} makes up ${top.percent.toFixed(0)}% of your spend. Consider a cap?`, action: "Set Budget", icon: <PieChart size={16} className="text-orange-500" /> });
        }
    }
    const restaurantSpend = categoryBreakdown.find(c => c.cat === 'Restaurant');
    if (restaurantSpend && restaurantSpend.amount > 200) {
         tips.push({ title: "Dining Out", desc: `You spent $${restaurantSpend.amount.toFixed(0)} on food.`, action: "Find Recipes", icon: <Store size={16} className="text-red-500" /> });
    }
    if (kpi.count > 15 && timeRange.includes('week')) {
         tips.push({ title: "Frequent Shopper", desc: `You have ${kpi.count} receipts this period.`, action: "Plan Trips", icon: <Calendar size={16} className="text-ios-blue" /> });
    }
    if (filteredReceipts.length === 0 && !searchText) {
         tips.push({ title: "Start Tracking", desc: "Capture receipts to unlock patterns.", action: "Scan Now", icon: <Lightbulb size={16} className="text-yellow-500" /> });
    }
    return tips.slice(0, 3);
  }, [categoryBreakdown, kpi, filteredReceipts, timeRange, searchText]);

  return (
    <div className="flex flex-col h-full bg-ios-bg text-neutral-900">
      <div className="bg-ios-bg px-4 pt-12 pb-2 sticky top-0 z-20 shadow-sm">
         <h1 className="text-3xl font-bold mb-4 tracking-tight animate-fade-in">Insights</h1>
         
         {/* Search Bar */}
         <div className="relative mb-3">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-ios-gray" />
            </div>
            <input
                type="text"
                placeholder="Filter by merchant or category..."
                className="w-full bg-neutral-200/80 text-neutral-900 rounded-xl py-2 pl-9 pr-8 focus:outline-none focus:ring-2 focus:ring-ios-blue/50 placeholder-neutral-500 text-sm transition-all"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
            />
            {searchText && (
                <button 
                    onClick={() => setSearchText('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-ios-gray active:text-neutral-600"
                >
                    <XCircle size={16} fill="currentColor" className="opacity-50" />
                </button>
            )}
         </div>

         <div className="bg-neutral-200/60 p-1 rounded-lg flex text-[13px] font-medium mb-2 overflow-x-auto no-scrollbar">
            {[{ id: 'week', label: 'This Week' }, { id: 'last_week', label: 'Last Week' }, { id: 'month', label: 'This Month' }, { id: 'last_month', label: 'Last Month' }, { id: 'all', label: 'All' }].map((range) => (
                <button
                    key={range.id}
                    onClick={() => setTimeRange(range.id as TimeRange)}
                    className={`flex-1 px-3 py-1.5 rounded-md whitespace-nowrap transition-all duration-300 ${timeRange === range.id ? 'bg-white shadow-sm text-neutral-900 scale-100' : 'text-neutral-500 hover:text-neutral-700 scale-95'}`}
                >
                    {range.label}
                </button>
            ))}
         </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-24 no-scrollbar">
        {/* KPI Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6 animate-slide-up" style={{ animationDelay: '0ms' }}>
            <div className="bg-ios-card p-4 rounded-xl shadow-sm flex flex-col hover:scale-[1.02] transition-transform duration-300">
                <span className="text-xs font-medium text-ios-gray uppercase tracking-wider">Total Spend</span>
                <span className="text-2xl font-bold mt-1"><CountUp value={kpi.totalSpend} prefix="$" /></span>
            </div>
            <div className="bg-ios-card p-4 rounded-xl shadow-sm flex flex-col hover:scale-[1.02] transition-transform duration-300">
                <span className="text-xs font-medium text-ios-gray uppercase tracking-wider">Avg. Receipt</span>
                <span className="text-2xl font-bold mt-1"><CountUp value={kpi.avg} prefix="$" /></span>
            </div>
            <div className="bg-ios-card p-4 rounded-xl shadow-sm flex flex-col hover:scale-[1.02] transition-transform duration-300">
                <span className="text-xs font-medium text-ios-gray uppercase tracking-wider">Total Tax</span>
                <span className="text-xl font-semibold mt-1 text-neutral-700"><CountUp value={kpi.totalTax} prefix="$" /></span>
            </div>
            <div className="bg-ios-card p-4 rounded-xl shadow-sm flex flex-col hover:scale-[1.02] transition-transform duration-300">
                <span className="text-xs font-medium text-ios-gray uppercase tracking-wider">Receipts</span>
                <span className="text-xl font-semibold mt-1 text-neutral-700">{kpi.count}</span>
            </div>
        </div>

        {/* Trend */}
        <div className="bg-ios-card p-5 rounded-2xl shadow-sm mb-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={18} className="text-ios-teal" />
                <h2 className="font-semibold text-lg">Spending Trend</h2>
            </div>
            {trendData.length > 0 ? (
                <div className="h-32 flex items-end gap-2 justify-between">
                    {trendData.slice(-10).map((d, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                             <div 
                                className="w-full bg-ios-teal/20 rounded-t-sm relative transition-all duration-500 ease-out"
                                style={{ height: `${(d.amount / (maxDailySpend || 1)) * 100}%`, minHeight: '4px' }}
                             >
                                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                    ${d.amount.toFixed(0)}
                                </div>
                             </div>
                             <span className="text-[10px] text-ios-gray">{d.day}</span>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="h-24 flex items-center justify-center text-neutral-400 text-sm">No data for selected period/filter</div>
            )}
        </div>

        {/* Insights */}
        <div className="mb-6 animate-slide-up" style={{ animationDelay: '200ms' }}>
            <h2 className="font-semibold text-lg mb-3 px-1">Insights & Tips</h2>
            <div className="space-y-3">
                {insights.length > 0 ? insights.map((insight, idx) => (
                    <div key={idx} className="bg-gradient-to-br from-blue-50 to-white border border-blue-100 p-4 rounded-xl shadow-sm flex gap-3 ios-active cursor-pointer">
                        <div className="mt-1">{insight.icon}</div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-sm text-neutral-900">{insight.title}</h3>
                            <p className="text-sm text-neutral-600 leading-relaxed mt-0.5">{insight.desc}</p>
                            <button className="mt-2 text-xs font-semibold text-ios-blue bg-blue-100/50 px-2 py-1 rounded hover:bg-blue-100 transition-colors">
                                {insight.action}
                            </button>
                        </div>
                    </div>
                )) : (
                     <div className="text-center py-4 text-neutral-400 text-sm">No insights available</div>
                )}
            </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-ios-card p-5 rounded-2xl shadow-sm mb-6 animate-slide-up" style={{ animationDelay: '300ms' }}>
            <div className="flex items-center gap-2 mb-4">
                <PieChart size={18} className="text-ios-blue" />
                <h2 className="font-semibold text-lg">Top Categories</h2>
            </div>
            <div className="flex flex-col gap-4">
                {categoryBreakdown.slice(0, 5).map((item, idx) => (
                    <button key={idx} onClick={() => onOpenCategory(item.cat)} className="w-full text-left ios-active">
                        <div className="flex justify-between text-sm font-medium mb-1">
                            <span>{item.cat}</span>
                            <span className="text-neutral-600">${item.amount.toFixed(2)}</span>
                        </div>
                        <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                            <div className="h-full bg-ios-blue transition-all duration-1000 ease-out" style={{ width: `${item.percent}%` }} />
                        </div>
                    </button>
                ))}
                {categoryBreakdown.length === 0 && (
                     <div className="text-center py-4 text-neutral-400 text-sm">No data</div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default SpendInsightsView;