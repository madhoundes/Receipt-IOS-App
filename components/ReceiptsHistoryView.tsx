
import React, { useState, useMemo, useRef } from 'react';
import { Search, Plus, Camera, Loader2, XCircle, Download, ChevronDown, ChevronUp, FileText, MapPin, ScanLine } from 'lucide-react';
import { Receipt } from '../types';
import { getBrandAsset, BRAND_REGISTRY } from '../constants';
import { generateCSV, downloadFile } from '../exportUtils';

interface ReceiptsHistoryViewProps {
  receipts: Receipt[];
  onSelectReceipt: (receipt: Receipt) => void;
  onLaunchCamera: () => void;
  showBrandLogos: boolean;
}

// Extracted Component to avoid "key" prop type errors and performance issues
const ReceiptCard: React.FC<{
  receipt: Receipt;
  isExpanded: boolean;
  onToggle: () => void;
  onSelect: (receipt: Receipt) => void;
  showBrandLogos: boolean;
}> = ({ receipt, isExpanded, onToggle, onSelect, showBrandLogos }) => {
  const brandAsset = getBrandAsset(receipt.storeName);
  
  return (
      <div 
          className="receipt-card mx-4 rounded-t-lg animate-receipt-print overflow-hidden ios-active group transition-all duration-300"
          onClick={onToggle}
      >
          {/* --- Top Edge: Clean --- */}
          
          {/* --- Header Section --- */}
          <div className="p-4 pb-2 flex items-start justify-between relative z-20">
               <div className="flex items-center gap-3">
                   {/* Brand Logo / Icon */}
                   {showBrandLogos && brandAsset && brandAsset.logoUrl ? (
                      <div className="w-10 h-10 rounded-full bg-neutral-50 border border-neutral-100 p-1.5 flex items-center justify-center flex-shrink-0">
                          <img src={brandAsset.logoUrl} alt={receipt.storeName} className="w-full h-full object-contain grayscale opacity-80" />
                      </div>
                   ) : (
                      <div className="w-10 h-10 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center flex-shrink-0">
                           <span className="font-receipt font-bold text-neutral-400 text-lg">{receipt.storeName.charAt(0)}</span>
                      </div>
                   )}
                   
                   <div className="flex flex-col">
                       <h3 className="text-base font-bold text-neutral-900 uppercase tracking-wide leading-tight font-receipt truncate max-w-[160px]">
                           {receipt.storeName}
                       </h3>
                       <div className="flex items-center gap-1 text-[11px] text-neutral-500 font-medium uppercase tracking-wider mt-0.5">
                           <span>{receipt.purchaseDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: '2-digit' }).toUpperCase()}</span>
                           <span>•</span>
                           <span>{receipt.purchaseDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                       </div>
                   </div>
               </div>

               <div className="text-right">
                    <span className="block font-receipt font-bold text-xl text-neutral-900">
                        ${receipt.totalAmount.toFixed(2)}
                    </span>
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-500 inline-block mt-1`}>
                        {receipt.category}
                    </span>
               </div>
          </div>

          {/* --- Divider --- */}
          <div className="px-4"><div className="receipt-divider" /></div>

          {/* --- Collapsed / Expanded Content --- */}
          <div className="px-4 pb-3">
               {/* Always show basic info */}
               <div className="flex justify-between items-center text-[11px] text-neutral-400 font-medium uppercase tracking-widest mb-1">
                   <span className="flex items-center gap-1"><MapPin size={10} /> {receipt.storeName}</span>
                   <span>ID: {receipt.id.slice(-6)}</span>
               </div>

               {/* Expanded Details simulating receipt body */}
               {isExpanded && (
                   <div className="mt-3 mb-2 animate-slide-up" style={{animationDuration: '0.2s'}}>
                       {receipt.items && receipt.items.length > 0 ? (
                           <div className="space-y-1.5 mb-3">
                               {receipt.items.map((item, i) => (
                                   <div key={i} className="flex justify-between text-[13px] font-receipt text-neutral-700">
                                       <span className="truncate pr-2 uppercase">{item.name}</span>
                                       <span>{item.amount.toFixed(2)}</span>
                                   </div>
                               ))}
                           </div>
                       ) : (
                           <div className="text-center py-2 text-[11px] text-neutral-400 italic font-receipt">- NO ITEMS DETECTED -</div>
                       )}

                       <div className="receipt-divider opacity-50" />
                       
                       <div className="space-y-1 mt-2 text-[12px] font-receipt text-neutral-600 flex flex-col items-end">
                           {receipt.subtotal && (
                               <div className="flex justify-between w-32"><span>SUBTOTAL</span> <span>{receipt.subtotal.toFixed(2)}</span></div>
                           )}
                           {receipt.hstAmount && (
                               <div className="flex justify-between w-32"><span>TAX</span> <span>{receipt.hstAmount.toFixed(2)}</span></div>
                           )}
                           <div className="flex justify-between w-32 font-bold text-neutral-900 mt-1 text-[14px]">
                               <span>TOTAL</span> <span>{receipt.totalAmount.toFixed(2)}</span>
                           </div>
                       </div>

                       {/* Fake Barcode for aesthetics */}
                       <div className="mt-4 opacity-40 flex flex-col items-center gap-1">
                            <div className="barcode-strip" />
                            <span className="text-[9px] font-mono tracking-[4px] text-neutral-500">1234 5678 9012</span>
                       </div>

                       <button 
                          onClick={(e) => { e.stopPropagation(); onSelect(receipt); }}
                          className="w-full mt-4 py-2.5 bg-neutral-900 text-white rounded font-medium text-xs uppercase tracking-wide flex items-center justify-center gap-2 active:opacity-80"
                       >
                           <FileText size={14} /> View Digital Copy
                       </button>
                   </div>
               )}

               {/* Expand Indicator */}
               {!isExpanded && (
                   <div className="flex justify-center pt-1 opacity-30">
                      <ChevronDown size={16} />
                   </div>
               )}
          </div>

          {/* --- Serrated Bottom Edge --- */}
          <div className="receipt-serrated-edge" />
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
      <div className="bg-ios-bg px-4 pt-12 pb-2 flex-shrink-0 z-20 shadow-sm transition-shadow sticky top-0">
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
        className="flex-1 overflow-y-auto pb-24 no-scrollbar relative"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="absolute top-0 left-0 right-0 flex justify-center pointer-events-none transition-transform duration-200 ease-out" style={{ transform: `translateY(${pullOffset - 40}px)` }}>
            {refreshing ? <Loader2 className="animate-spin text-ios-gray" size={24} /> : <div className="text-ios-gray transition-transform duration-200" style={{ transform: `rotate(${pullOffset * 2}deg)` }}><ScanLine size={24} /></div>}
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
                <div className="flex flex-col gap-8 pb-6 pt-4">
                {Object.entries(groupedReceipts).map(([dateKey, groupReceipts]: [string, Receipt[]], idx) => (
                    <div key={dateKey} className="animate-slide-up" style={{ animationDelay: `${idx * 0.1}s` }}>
                        <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-3 px-6 sticky top-0 bg-ios-bg/95 backdrop-blur z-10 py-2">{dateKey}</h2>
                        <div className="space-y-6">
                            {groupReceipts.map(receipt => (
                                <ReceiptCard 
                                    key={receipt.id}
                                    receipt={receipt}
                                    isExpanded={expandedId === receipt.id}
                                    onToggle={() => toggleExpand(receipt.id)}
                                    onSelect={onSelectReceipt}
                                    showBrandLogos={showBrandLogos}
                                />
                            ))}
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
