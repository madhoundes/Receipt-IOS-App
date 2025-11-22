
import React, { useState, useMemo, useRef } from 'react';
import { Search, ChevronRight, Receipt as ReceiptIcon, Plus, Camera, Loader2, XCircle, ChevronDown, ChevronUp, FileText, Download } from 'lucide-react';
import { Receipt } from '../types';
import { getBrandAsset, BRAND_REGISTRY } from '../constants';
import { generateCSV, downloadFile } from '../exportUtils';

interface ReceiptsHistoryViewProps {
  receipts: Receipt[];
  onSelectReceipt: (receipt: Receipt) => void;
  onLaunchCamera: () => void;
  showBrandLogos: boolean;
}

// --- Brand Avatar Component ---
const BrandAvatar = ({ receipt, showLogos, size = "md" }: { receipt: Pick<Receipt, 'storeName' | 'brandId' | 'brandDisplayMode'>, showLogos: boolean, size?: "sm" | "md" | "lg" }) => {
    // Resolve Asset
    let asset = null;
    if (receipt.brandId && BRAND_REGISTRY[receipt.brandId]) {
        asset = BRAND_REGISTRY[receipt.brandId];
    } else {
        asset = getBrandAsset(receipt.storeName);
    }

    const initials = receipt.storeName.slice(0, 2).toUpperCase();
    
    // Size definitions (Unified Circular Standard)
    // sm: 32px (Tight spots)
    // md: 64px (Standard List Row - Unified Large Size)
    // lg: 80px (Headers/Details)
    
    let containerDims = "w-16 h-16"; // Default md = 64px
    let textDims = "text-xl";
    
    if (size === "sm") {
        containerDims = "w-8 h-8";
        textDims = "text-xs";
    } else if (size === "lg") {
        containerDims = "w-20 h-20";
        textDims = "text-3xl";
    }

    // Base container: Neutral chip, 1pt border, soft shadow
    const containerClass = `${containerDims} rounded-full overflow-hidden bg-white border border-neutral-200/80 shadow-sm shrink-0 flex items-center justify-center transition-transform`;

    if (asset) {
        const isWide = asset.sizeTier === 'wide';
        
        // Padding Logic:
        // Standard: p-3 (12px) for most logos to be large and clear.
        // Wide logos: p-3.5 (14px) or p-4 (16px) - Increased padding prevents wide wordmarks from hitting edges too hard visually.
        // Asset padding override takes precedence if defined.
        const paddingClass = asset.padding 
            ? `p-${asset.padding}` 
            : (isWide && size !== 'sm' ? "p-3.5" : "p-3");

        // Show Logo Image
        // CRITICAL: Only show logo if user preference enabled AND brandDisplayMode is explicitly 'logo'
        // This respects strict detection rules.
        const shouldShowLogo = showLogos && asset.logoUrl && receipt.brandDisplayMode === 'logo';

        if (shouldShowLogo) {
            return (
                <div className={containerClass} role="img" aria-label={`Brand: ${receipt.storeName}`}>
                    <img src={asset.logoUrl} alt={receipt.storeName} className={`w-full h-full object-contain ${paddingClass}`} />
                </div>
            );
        }
        // Fallback: Brand Color with Initials (Text Badge)
        return (
            <div 
                className={`${containerDims} rounded-full flex items-center justify-center text-white font-bold shrink-0 shadow-sm`}
                style={{ backgroundColor: asset.color }}
                role="img" aria-label={`Brand: ${receipt.storeName}`}
            >
                <span className={textDims}>{initials}</span>
            </div>
        );
    }

    // Generic Fallback
    return (
        <div className={`${containerDims} rounded-full bg-neutral-100 text-neutral-500 border border-neutral-200 flex items-center justify-center font-bold shrink-0`}>
            <span className={textDims}>{initials}</span>
        </div>
    );
};

const ReceiptsHistoryView: React.FC<ReceiptsHistoryViewProps> = ({ receipts, onSelectReceipt, onLaunchCamera, showBrandLogos }) => {
  const [searchText, setSearchText] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Pull to Refresh State
  const [refreshing, setRefreshing] = useState(false);
  const [pullOffset, setPullOffset] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);

  const filteredReceipts = useMemo(() => {
    if (!searchText) return receipts;
    const terms = searchText.toLowerCase().split(/\s+/).filter(t => t.length > 0);
    return receipts.filter(r => {
      const searchableContent = [
        r.storeName,
        r.category,
        r.subcategory,
        r.totalAmount.toFixed(2),
        r.purchaseDate.toLocaleDateString(),
      ].filter(Boolean).join(' ').toLowerCase();
      return terms.every(term => searchableContent.includes(term));
    });
  }, [receipts, searchText]);

  const groupedReceipts = useMemo(() => {
    const groups: Record<string, Receipt[]> = {};
    filteredReceipts.forEach(r => {
       const key = r.purchaseDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
       if (!groups[key]) groups[key] = [];
       groups[key].push(r);
    });
    return groups;
  }, [filteredReceipts]);

  const toggleExpand = (id: string) => {
      setExpandedId(prev => prev === id ? null : id);
  };

  // Export Handler
  const handleExport = () => {
      if (filteredReceipts.length === 0) return;
      const csvData = generateCSV(filteredReceipts);
      const dateStr = new Date().toISOString().split('T')[0];
      downloadFile(csvData, `Receipts_Export_${dateStr}.csv`, 'text/csv');
      if (navigator.vibrate) navigator.vibrate([10, 30]);
  };

  // Pull to Refresh Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop === 0) {
        touchStartY.current = e.touches[0].clientY;
    }
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current > 0) {
        const currentY = e.touches[0].clientY;
        const diff = currentY - touchStartY.current;
        if (diff > 0 && diff < 150) setPullOffset(diff);
    }
  };
  const handleTouchEnd = () => {
    if (pullOffset > 80) {
        setRefreshing(true);
        setPullOffset(50);
        setTimeout(() => {
            setRefreshing(false);
            setPullOffset(0);
        }, 1500);
    } else {
        setPullOffset(0);
    }
    touchStartY.current = 0;
  };

  return (
    <div className="flex flex-col h-full bg-ios-bg">
      <div className="bg-ios-bg px-4 pt-12 pb-2 flex-shrink-0 z-20 shadow-sm transition-shadow">
        <div className="flex justify-between items-end mb-4">
            <h1 className="text-3xl font-bold text-neutral-900 tracking-tight animate-fade-in">History</h1>
            <div className="flex gap-2">
                {filteredReceipts.length > 0 && (
                    <button 
                        onClick={handleExport}
                        className="w-9 h-9 rounded-full bg-neutral-200 text-neutral-700 flex items-center justify-center shadow-sm active:bg-neutral-300 transition-colors"
                        aria-label="Export CSV"
                    >
                        <Download size={20} />
                    </button>
                )}
                <button onClick={onLaunchCamera} className="w-9 h-9 rounded-full bg-ios-teal text-white flex items-center justify-center shadow-sm ios-btn-press">
                    <Plus size={22} />
                </button>
            </div>
        </div>
        <div className="relative animate-scale-in origin-left">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search size={16} className="text-ios-gray" /></div>
          <input
            type="text"
            placeholder="Search store, amount, category..."
            className="w-full bg-neutral-200/80 text-neutral-900 rounded-xl py-2 pl-9 pr-8 focus:outline-none focus:ring-2 focus:ring-ios-blue/50 placeholder-neutral-500 text-[17px] transition-all"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          {searchText && (
            <button onClick={() => setSearchText('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-ios-gray active:text-neutral-600">
                <XCircle size={16} fill="currentColor" className="opacity-50" />
            </button>
          )}
        </div>
      </div>

      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 pb-24 no-scrollbar relative"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="absolute top-0 left-0 right-0 flex justify-center pointer-events-none transition-transform duration-200 ease-out" style={{ transform: `translateY(${pullOffset - 40}px)` }}>
            {refreshing ? <Loader2 className="animate-spin text-ios-gray" size={24} /> : <div className="text-ios-gray transition-transform duration-200" style={{ transform: `rotate(${pullOffset * 2}deg)` }}><ReceiptIcon size={24} /></div>}
        </div>

        <div style={{ transform: `translateY(${pullOffset > 0 ? pullOffset * 0.4 : 0}px)`, transition: 'transform 0.2s ease-out' }}>
            {receipts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 mt-20 text-center text-neutral-400 gap-4 animate-fade-in">
                <div className="w-20 h-20 rounded-full bg-neutral-200 flex items-center justify-center"><Camera size={40} className="text-neutral-400" /></div>
                <div><h3 className="text-neutral-900 font-semibold text-lg">No receipts yet</h3><p className="text-sm max-w-[200px] mx-auto mt-1">Capture your first receipt using the camera button.</p></div>
                <button onClick={onLaunchCamera} className="mt-4 text-ios-teal font-medium hover:underline">Open Camera</button>
            </div>
            ) : filteredReceipts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-neutral-400 mt-10 animate-fade-in"><p>No receipts match "{searchText}"</p></div>
            ) : (
                <div className="flex flex-col gap-6 pb-6 pt-2">
                {Object.entries(groupedReceipts).map(([dateKey, groupReceipts]: [string, Receipt[]], idx) => (
                    <div key={dateKey} className="animate-slide-up" style={{ animationDelay: `${idx * 0.1}s` }}>
                        <h2 className="text-xl font-bold text-neutral-900 mb-3 px-1">{dateKey}</h2>
                        <div className="bg-ios-card rounded-xl overflow-hidden shadow-sm divide-y divide-ios-separator/50">
                            {groupReceipts.map(receipt => {
                                const isExpanded = expandedId === receipt.id;
                                return (
                                    <div key={receipt.id} className="flex flex-col bg-white transition-colors">
                                        {/* Main Row */}
                                        <button 
                                            onClick={() => toggleExpand(receipt.id)}
                                            className="w-full flex items-center px-3 py-3 hover:bg-neutral-50 ios-active text-left group min-h-[80px]"
                                        >
                                            {/* Brand Logo / Avatar */}
                                            <BrandAvatar receipt={receipt} showLogos={showBrandLogos} />
                                            
                                            <div className="flex-1 ml-4 min-w-0">
                                                <div className="flex items-center justify-between mb-0.5">
                                                    <h3 className="text-[17px] font-semibold text-neutral-900 truncate">{receipt.storeName}</h3>
                                                    <span className="text-[17px] font-medium text-neutral-900 ml-2">${receipt.totalAmount.toFixed(2)}</span>
                                                </div>
                                                
                                                <div className="flex items-center justify-between">
                                                    <div className="flex flex-col gap-0.5">
                                                        <div className="flex items-center gap-1 text-[14px] text-ios-gray truncate">
                                                            <span>{receipt.purchaseDate.toLocaleDateString(undefined, {day: 'numeric', month: 'short'})}</span>
                                                            {receipt.subcategory && <><span className="text-ios-gray">•</span><span className="text-ios-teal font-medium">{receipt.subcategory}</span></>}
                                                        </div>
                                                    </div>
                                                    
                                                    {isExpanded ? <ChevronUp size={18} className="text-ios-gray mt-1" /> : <ChevronDown size={18} className="text-ios-gray/50 group-hover:text-ios-gray mt-1" />}
                                                </div>
                                            </div>
                                        </button>

                                        {/* Expanded Mini Preview */}
                                        {isExpanded && (
                                            <div className="bg-neutral-50/50 border-t border-neutral-100 p-4 animate-slide-up" style={{ animationDuration: '0.2s' }}>
                                                <div className="mb-3 space-y-2">
                                                    {receipt.items && receipt.items.length > 0 ? (
                                                        receipt.items.slice(0, 3).map((item, i) => (
                                                            <div key={i} className="flex justify-between text-sm text-neutral-600">
                                                                <span className="truncate flex-1 pr-4">{item.qty > 1 && <span className="font-semibold text-neutral-400 mr-1">{item.qty}x</span>}{item.name}</span>
                                                                <span>${item.amount.toFixed(2)}</span>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="text-sm text-neutral-400 italic text-center py-2">No line items extracted</div>
                                                    )}
                                                    {receipt.items && receipt.items.length > 3 && (
                                                        <div className="text-xs text-neutral-400 text-center pt-1">+{receipt.items.length - 3} more items...</div>
                                                    )}
                                                </div>

                                                <div className="border-t border-neutral-200/50 pt-2 mb-3">
                                                    {receipt.subtotal && (
                                                        <div className="flex justify-between text-xs text-neutral-500 mb-1">
                                                            <span>Subtotal</span>
                                                            <span>${receipt.subtotal.toFixed(2)}</span>
                                                        </div>
                                                    )}
                                                    {receipt.hstAmount && (
                                                        <div className="flex justify-between text-xs text-neutral-500">
                                                            <span>Tax {receipt.hstPercent ? `(${receipt.hstPercent}%)` : ''}</span>
                                                            <span>${receipt.hstAmount.toFixed(2)}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <button 
                                                    onClick={() => onSelectReceipt(receipt)}
                                                    className="w-full py-2 bg-white border border-neutral-200 rounded-lg text-ios-blue font-semibold text-sm shadow-sm active:bg-neutral-50 transition-colors flex items-center justify-center gap-1"
                                                >
                                                    <FileText size={14} /> View Full Receipt
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default ReceiptsHistoryView;