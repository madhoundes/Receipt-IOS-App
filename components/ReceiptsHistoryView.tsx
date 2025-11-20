import React, { useState, useMemo, useRef } from 'react';
import { Search, ChevronRight, Receipt as ReceiptIcon, Plus, Camera, Loader2, XCircle } from 'lucide-react';
import { Receipt } from '../types';

interface ReceiptsHistoryViewProps {
  receipts: Receipt[];
  onSelectReceipt: (receipt: Receipt) => void;
  onLaunchCamera: () => void;
}

const ReceiptsHistoryView: React.FC<ReceiptsHistoryViewProps> = ({ receipts, onSelectReceipt, onLaunchCamera }) => {
  const [searchText, setSearchText] = useState('');
  
  // Pull to Refresh State
  const [refreshing, setRefreshing] = useState(false);
  const [pullOffset, setPullOffset] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);

  const filteredReceipts = useMemo(() => {
    if (!searchText) return receipts;
    
    // Split search into terms for "AND" logic (e.g. "Apple Computer")
    const terms = searchText.toLowerCase().split(/\s+/).filter(t => t.length > 0);

    return receipts.filter(r => {
      const searchableContent = [
        r.storeName,
        r.category,
        r.subcategory,
        r.notes,
        r.totalAmount.toFixed(2), // Allow searching "12.50"
        r.purchaseDate.toLocaleDateString(),
        r.purchaseDate.toLocaleString('default', { month: 'long' }), // Allow "September"
        r.purchaseDate.getFullYear().toString()
      ].filter(Boolean).join(' ').toLowerCase();

      // All terms must be present
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
        if (diff > 0 && diff < 150) {
            setPullOffset(diff);
        }
    }
  };

  const handleTouchEnd = () => {
    if (pullOffset > 80) {
        setRefreshing(true);
        setPullOffset(50); // Hold position
        setTimeout(() => {
            setRefreshing(false);
            setPullOffset(0);
        }, 1500); // Simulate network
    } else {
        setPullOffset(0);
    }
    touchStartY.current = 0;
  };

  return (
    <div className="flex flex-col h-full bg-ios-bg">
      <div className="bg-ios-bg px-4 pt-12 pb-2 sticky top-0 z-20 shadow-sm transition-shadow">
        <div className="flex justify-between items-end mb-4">
            <h1 className="text-3xl font-bold text-neutral-900 tracking-tight animate-fade-in">History</h1>
            <button 
                onClick={onLaunchCamera}
                className="w-9 h-9 rounded-full bg-ios-teal text-white flex items-center justify-center shadow-sm ios-btn-press"
            >
                <Plus size={22} />
            </button>
        </div>
        
        <div className="relative animate-scale-in origin-left">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-ios-gray" />
          </div>
          <input
            type="text"
            placeholder="Search store, amount, category..."
            className="w-full bg-neutral-200/80 text-neutral-900 rounded-xl py-2 pl-9 pr-8 focus:outline-none focus:ring-2 focus:ring-ios-blue/50 placeholder-neutral-500 text-[17px] transition-all"
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
      </div>

      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 pb-24 no-scrollbar relative"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Refresh Spinner */}
        <div 
            className="absolute top-0 left-0 right-0 flex justify-center pointer-events-none transition-transform duration-200 ease-out"
            style={{ transform: `translateY(${pullOffset - 40}px)` }}
        >
            {refreshing ? (
                <Loader2 className="animate-spin text-ios-gray" size={24} />
            ) : (
                <div 
                    className="text-ios-gray transition-transform duration-200"
                    style={{ transform: `rotate(${pullOffset * 2}deg)` }}
                >
                    <ReceiptIcon size={24} />
                </div>
            )}
        </div>

        <div style={{ transform: `translateY(${pullOffset > 0 ? pullOffset * 0.4 : 0}px)`, transition: 'transform 0.2s ease-out' }}>
            {receipts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 mt-20 text-center text-neutral-400 gap-4 animate-fade-in">
                <div className="w-20 h-20 rounded-full bg-neutral-200 flex items-center justify-center">
                    <Camera size={40} className="text-neutral-400" />
                </div>
                <div>
                    <h3 className="text-neutral-900 font-semibold text-lg">No receipts yet</h3>
                    <p className="text-sm max-w-[200px] mx-auto mt-1">Capture your first receipt using the camera button.</p>
                </div>
                <button onClick={onLaunchCamera} className="mt-4 text-ios-teal font-medium hover:underline">Open Camera</button>
            </div>
            ) : filteredReceipts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-neutral-400 mt-10 animate-fade-in">
                    <p>No receipts match "{searchText}"</p>
                </div>
            ) : (
                <div className="flex flex-col gap-6 pb-6 pt-2">
                {Object.entries(groupedReceipts).map(([dateKey, groupReceipts]: [string, Receipt[]], idx) => (
                    <div key={dateKey} className="animate-slide-up" style={{ animationDelay: `${idx * 0.1}s` }}>
                        <h2 className="text-xl font-bold text-neutral-900 mb-3 px-1">{dateKey}</h2>
                        <div className="bg-ios-card rounded-xl overflow-hidden shadow-sm divide-y divide-ios-separator/50">
                            {groupReceipts.map(receipt => (
                                <button 
                                    key={receipt.id}
                                    onClick={() => onSelectReceipt(receipt)}
                                    className="w-full flex items-center p-3 pl-3 hover:bg-neutral-50 ios-active transition-colors text-left group"
                                >
                                    <div className="w-12 h-12 rounded-lg bg-neutral-100 overflow-hidden flex-shrink-0 border border-neutral-200">
                                        <img src={receipt.imageName} alt="" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 ml-3 min-w-0">
                                        <h3 className="text-[17px] font-semibold text-neutral-900 truncate">{receipt.storeName}</h3>
                                        <div className="flex items-center gap-1 text-[14px] text-ios-gray truncate">
                                        <span>{receipt.purchaseDate.toLocaleDateString()}</span>
                                        {receipt.subcategory && <><span className="text-ios-gray">•</span><span className="text-ios-teal">{receipt.subcategory}</span></>}
                                        </div>
                                    </div>
                                    <div className="ml-3 flex items-center gap-2">
                                        <span className="text-[17px] font-medium text-neutral-900">${receipt.totalAmount.toFixed(2)}</span>
                                        <ChevronRight size={18} className="text-ios-gray/50 group-hover:text-ios-gray" />
                                    </div>
                                </button>
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