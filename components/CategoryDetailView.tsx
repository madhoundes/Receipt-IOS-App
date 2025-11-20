import React, { useMemo, useState } from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { Receipt, TAXONOMY } from '../types';

interface CategoryDetailViewProps {
  category: string;
  receipts: Receipt[]; // Should already be filtered by app to contain only this category ideally, but we can filter here too
  onBack: () => void;
  onSelectReceipt: (receipt: Receipt) => void;
}

const CategoryDetailView: React.FC<CategoryDetailViewProps> = ({ category, receipts, onBack, onSelectReceipt }) => {
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('All');

  // Filter by category matches first (safeguard)
  const categoryReceipts = useMemo(() => {
      return receipts.filter(r => r.category === category).sort((a, b) => b.purchaseDate.getTime() - a.purchaseDate.getTime());
  }, [receipts, category]);

  // Then filter by subcategory UI
  const displayedReceipts = useMemo(() => {
      if (selectedSubcategory === 'All') return categoryReceipts;
      return categoryReceipts.filter(r => r.subcategory === selectedSubcategory);
  }, [categoryReceipts, selectedSubcategory]);

  const totalSpend = displayedReceipts.reduce((sum, r) => sum + r.totalAmount, 0);
  const avgSpend = displayedReceipts.length ? totalSpend / displayedReceipts.length : 0;
  
  const subcategories = TAXONOMY[category] || [];

  // Determine available subcategories (to only show ones that have receipts? Optional. Let's show all defined in taxonomy + "All")
  const filterOptions = ['All', ...subcategories];

  return (
    <div className="flex flex-col h-full bg-ios-bg">
      {/* Header */}
      <div className="bg-ios-card px-4 pt-12 pb-4 flex items-center gap-4 border-b border-ios-separator/20 sticky top-0 z-20 shadow-sm">
        <button onClick={onBack} className="text-ios-blue flex items-center gap-1 active:opacity-60">
          <ArrowLeft size={20} />
          <span className="text-base font-medium">Back</span>
        </button>
        <h1 className="text-lg font-semibold truncate">{category}</h1>
      </div>

      {/* Stats Header */}
      <div className="bg-ios-bg px-4 py-6">
         <div className="flex gap-4">
             <div className="flex-1">
                 <p className="text-xs text-ios-gray font-semibold uppercase">Total Spent</p>
                 <p className="text-2xl font-bold text-neutral-900">${totalSpend.toFixed(2)}</p>
             </div>
             <div className="flex-1 border-l border-ios-separator/50 pl-4">
                 <p className="text-xs text-ios-gray font-semibold uppercase">Avg. Receipt</p>
                 <p className="text-2xl font-bold text-neutral-900">${avgSpend.toFixed(2)}</p>
             </div>
         </div>
      </div>

      {/* Subcategory Filter */}
      {subcategories.length > 0 && (
          <div className="px-4 pb-4 overflow-x-auto no-scrollbar flex gap-2 sticky top-[88px] z-10 bg-ios-bg/95 backdrop-blur">
            {filterOptions.map(opt => (
                <button
                    key={opt}
                    onClick={() => setSelectedSubcategory(opt)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                        selectedSubcategory === opt
                        ? 'bg-ios-teal text-white shadow-sm'
                        : 'bg-white text-neutral-600 border border-transparent shadow-sm'
                    }`}
                >
                    {opt}
                </button>
            ))}
          </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-24 no-scrollbar">
        {displayedReceipts.length === 0 ? (
            <div className="text-center py-12 text-neutral-400">
                <p>No receipts found for {selectedSubcategory === 'All' ? 'this category' : selectedSubcategory}.</p>
            </div>
        ) : (
            <div className="bg-ios-card rounded-xl overflow-hidden shadow-sm divide-y divide-ios-separator/50 mb-8">
                {displayedReceipts.map(receipt => (
                <button 
                    key={receipt.id}
                    onClick={() => onSelectReceipt(receipt)}
                    className="w-full flex items-center p-3 pl-3 hover:bg-neutral-50 active:bg-neutral-100 transition-colors text-left group"
                >
                    {/* Thumbnail */}
                    <div className="w-12 h-12 rounded-lg bg-neutral-100 overflow-hidden flex-shrink-0 border border-neutral-200">
                        <img src={receipt.imageName} alt="" className="w-full h-full object-cover" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 ml-3 min-w-0">
                        <h3 className="text-[17px] font-semibold text-neutral-900 truncate">{receipt.storeName}</h3>
                        <div className="flex items-center gap-1 text-[14px] text-ios-gray truncate">
                            <span>{receipt.purchaseDate.toLocaleDateString()}</span>
                            {receipt.subcategory && (
                                <>
                                    <span>•</span>
                                    <span className="text-ios-teal">{receipt.subcategory}</span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Amount & Arrow */}
                    <div className="ml-3 flex items-center gap-2">
                        <span className="text-[17px] font-medium text-neutral-900">
                            ${receipt.totalAmount.toFixed(2)}
                        </span>
                        <ChevronRight size={18} className="text-ios-gray/50 group-hover:text-ios-gray" />
                    </div>
                </button>
                ))}
            </div>
        )}
      </div>
    </div>
  );
};

export default CategoryDetailView;