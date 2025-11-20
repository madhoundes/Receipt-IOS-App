import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Trash2, Share, Edit2, Calendar, Tag, DollarSign, Save, Percent, AlertCircle, ChevronDown, FileText } from 'lucide-react';
import { Receipt, CATEGORIES, TAXONOMY } from '../types';

interface ReceiptDetailViewProps {
  receipt: Receipt | null;
  onBack: () => void;
  onUpdate: (updatedReceipt: Receipt) => void;
  onDelete: (id: string) => void;
}

const ReceiptDetailView: React.FC<ReceiptDetailViewProps> = ({ receipt, onBack, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedReceipt, setEditedReceipt] = useState<Receipt | null>(receipt);
  
  // Swipe Gesture State
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const [headerShadow, setHeaderShadow] = useState(false);

  useEffect(() => {
    setEditedReceipt(receipt);
  }, [receipt]);

  // Scroll Handler for Header Shadow
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setHeaderShadow(e.currentTarget.scrollTop > 10);
  };

  // Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isEditing) return; // Disable swipe during edit
    // Only start swipe if near left edge
    if (e.targetTouches[0].clientX < 50) {
        setTouchStart(e.targetTouches[0].clientX);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const currentTouch = e.targetTouches[0].clientX;
    const diff = currentTouch - touchStart;
    if (diff > 0) {
        setSwipeOffset(diff);
    }
  };

  const handleTouchEnd = () => {
    if (touchStart === null) return;
    if (swipeOffset > 100) {
        onBack(); // Trigger back
    } else {
        setSwipeOffset(0); // Reset
    }
    setTouchStart(null);
  };

  if (!editedReceipt) {
    return (
      <div className="flex flex-col h-full bg-ios-bg">
         <div className="p-8 flex flex-col items-center justify-center text-neutral-400 mt-20">
             <AlertCircle size={48} />
             <p className="mt-4 font-semibold">Receipt not found</p>
             <button onClick={onBack} className="mt-4 text-ios-blue font-medium">Go Back</button>
         </div>
      </div>
    );
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric'
    }).format(date);
  };

  const handleSave = () => {
    if (editedReceipt) {
        onUpdate(editedReceipt);
        setIsEditing(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Receipt from ${editedReceipt.storeName}`,
        text: `Total: $${editedReceipt.totalAmount.toFixed(2)}`,
        url: window.location.href,
      }).catch(console.error);
    } else {
      alert("Share sheet simulated.");
    }
  };

  const availableSubcategories = TAXONOMY[editedReceipt.category] || [];
  const isManualEntry = editedReceipt.imageName === 'manual_placeholder';

  return (
    <div 
        className="flex flex-col h-full bg-ios-bg overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ 
            transform: `translateX(${swipeOffset}px)`,
            transition: touchStart === null ? 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none' 
        }}
    >
      {/* Header */}
      <div className={`bg-ios-card px-4 pt-12 pb-4 flex justify-between items-center border-b border-ios-separator/20 sticky top-0 z-20 transition-shadow duration-300 ${headerShadow ? 'shadow-md' : 'shadow-sm'}`}>
        <button onClick={onBack} className="text-ios-blue flex items-center gap-1 active:opacity-60 transition-opacity">
          <ArrowLeft size={20} />
          <span className="text-base font-medium">Back</span>
        </button>
        <h1 className="text-lg font-semibold truncate max-w-[50%] opacity-0 animate-fade-in" style={{animationDelay: '0.1s'}}>
            {isEditing ? "Edit Receipt" : editedReceipt.storeName}
        </h1>
        <div className="flex gap-4 text-ios-blue">
          {isEditing ? (
             <button onClick={() => {setEditedReceipt(receipt); setIsEditing(false);}} className="font-medium text-base">Cancel</button>
          ) : (
            <>
              <button onClick={() => setIsEditing(true)} className="active:opacity-60 transition-opacity"><Edit2 size={20} /></button>
              <button onClick={() => onDelete(editedReceipt.id)} className="text-ios-red active:opacity-60 transition-opacity"><Trash2 size={20} /></button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div 
        ref={contentRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 pb-32 no-scrollbar"
      >
        <div className="flex flex-col gap-6 max-w-md mx-auto animate-slide-up">
          
          {/* Image / Placeholder */}
          <div className="w-full aspect-[3/4] rounded-2xl overflow-hidden shadow-md bg-white relative group transform-gpu border border-neutral-100">
            {isManualEntry ? (
                 <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-50 text-neutral-400 gap-3">
                    <div className="w-20 h-20 rounded-full bg-neutral-200 flex items-center justify-center">
                         <FileText size={40} className="text-neutral-400 opacity-60" />
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-medium text-neutral-600">Manual Entry</p>
                        <p className="text-xs text-neutral-400">No receipt image available</p>
                    </div>
                 </div>
            ) : (
                <img 
                src={editedReceipt.imageName} 
                alt="Receipt" 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
            )}
          </div>

          {/* Details Card */}
          <div className="bg-ios-card rounded-2xl p-5 shadow-sm flex flex-col gap-4">
            
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-ios-gray uppercase tracking-wider">Store</label>
              {isEditing ? (
                <input 
                  type="text" 
                  value={editedReceipt.storeName}
                  onChange={(e) => setEditedReceipt({...editedReceipt, storeName: e.target.value})}
                  className="text-xl font-bold border-b border-ios-separator/50 py-1 focus:outline-none focus:border-ios-teal bg-transparent"
                />
              ) : (
                <h2 className="text-2xl font-bold text-neutral-900">{editedReceipt.storeName}</h2>
              )}
            </div>

            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1 text-ios-gray text-sm">
                  <Calendar size={14} />
                  <span>Purchase Date</span>
                </div>
                 {isEditing ? (
                    <input 
                      type="datetime-local"
                      value={editedReceipt.purchaseDate.toISOString().slice(0, 16)}
                      onChange={(e) => setEditedReceipt({...editedReceipt, purchaseDate: new Date(e.target.value)})}
                      className="text-sm font-medium border rounded px-2 py-1 bg-ios-bg w-full"
                    />
                 ) : (
                    <span className="text-neutral-700 font-medium">{formatDate(editedReceipt.purchaseDate)}</span>
                 )}
             </div>

             <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1 text-ios-gray text-sm">
                    <Tag size={14} />
                    <span>Category</span>
                  </div>
                  {isEditing ? (
                    <div className="flex gap-2">
                        <select 
                          value={editedReceipt.category || ''}
                          onChange={(e) => setEditedReceipt({...editedReceipt, category: e.target.value, subcategory: undefined})}
                          className="flex-1 text-sm font-medium border rounded px-2 py-1 bg-ios-bg"
                        >
                          {!CATEGORIES.includes(editedReceipt.category) && <option value="">Select Category</option>}
                          {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                        <select 
                            value={editedReceipt.subcategory || ''}
                            onChange={(e) => setEditedReceipt({...editedReceipt, subcategory: e.target.value || undefined})}
                            className="flex-1 text-sm font-medium border rounded px-2 py-1 bg-ios-bg"
                        >
                            <option value="">None</option>
                            {availableSubcategories.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                        </select>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${editedReceipt.category ? 'bg-ios-teal/10 text-ios-teal' : 'bg-neutral-100 text-neutral-500'}`}>
                          {editedReceipt.category || 'Uncategorized'}
                        </span>
                        {editedReceipt.subcategory && (
                             <span className="text-neutral-500 text-sm font-medium flex items-center gap-1">
                                <ChevronDown size={12} className="-rotate-90" />
                                {editedReceipt.subcategory}
                             </span>
                        )}
                    </div>
                  )}
               </div>

            <div className="h-px bg-ios-separator/30 my-1"></div>

            <div className="flex gap-4">
                <div className="flex-1">
                    <label className="text-xs font-medium text-ios-gray uppercase tracking-wider flex items-center gap-1"><DollarSign size={10} /> Tax</label>
                    {isEditing ? (
                        <input 
                            type="number"
                            step="0.01"
                            value={editedReceipt.hstAmount || ''}
                            onChange={(e) => setEditedReceipt({...editedReceipt, hstAmount: parseFloat(e.target.value) || 0})}
                            className="mt-1 font-medium border-b border-ios-separator/50 w-full focus:outline-none"
                        />
                    ) : (
                        <span className="text-neutral-700 font-medium block mt-1">{editedReceipt.hstAmount ? `$${editedReceipt.hstAmount.toFixed(2)}` : '-'}</span>
                    )}
                </div>
                <div className="flex-1">
                    <label className="text-xs font-medium text-ios-gray uppercase tracking-wider flex items-center gap-1"><Percent size={10} /> Rate</label>
                    {isEditing ? (
                         <input 
                            type="number"
                            step="0.1"
                            value={editedReceipt.hstPercent || ''}
                            onChange={(e) => setEditedReceipt({...editedReceipt, hstPercent: parseFloat(e.target.value) || 0})}
                            className="mt-1 font-medium border-b border-ios-separator/50 w-full focus:outline-none"
                        />
                    ) : (
                         <span className="text-neutral-700 font-medium block mt-1">{editedReceipt.hstPercent ? `${editedReceipt.hstPercent}%` : '-'}</span>
                    )}
                </div>
            </div>

            <div className="h-px bg-ios-separator/30 my-1"></div>

            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-neutral-500">Total</span>
              <div className="flex items-center text-neutral-900">
                {isEditing ? (
                   <input 
                     type="number" 
                     step="0.01"
                     value={editedReceipt.totalAmount}
                     onChange={(e) => setEditedReceipt({...editedReceipt, totalAmount: parseFloat(e.target.value) || 0})}
                     className="text-3xl font-bold w-32 text-right border-b border-ios-separator/50 focus:outline-none"
                   />
                ) : (
                  <span className="text-3xl font-bold tracking-tight">${editedReceipt.totalAmount.toFixed(2)}</span>
                )}
              </div>
            </div>
          </div>

          <div className="bg-ios-card rounded-2xl p-5 shadow-sm flex flex-col gap-2">
             <label className="text-xs font-medium text-ios-gray uppercase tracking-wider">Notes</label>
             {isEditing ? (
               <textarea 
                 value={editedReceipt.notes || ''}
                 onChange={(e) => setEditedReceipt({...editedReceipt, notes: e.target.value})}
                 className="w-full min-h-[100px] bg-ios-bg rounded-lg p-3 text-sm focus:outline-none"
               />
             ) : (
               <p className={`text-sm whitespace-pre-wrap font-mono ${editedReceipt.notes ? 'text-neutral-700' : 'text-neutral-400 italic'}`}>
                 {editedReceipt.notes || "No notes added"}
               </p>
             )}
          </div>

        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-ios-card/90 backdrop-blur-lg border-t border-ios-separator/30 z-10 pb-8">
         {isEditing ? (
            <button 
              onClick={handleSave}
              className="w-full bg-ios-blue text-white font-semibold py-3.5 rounded-xl shadow-lg ios-btn-press flex items-center justify-center gap-2"
            >
              <Save size={18} /> Save Changes
            </button>
         ) : (
            <button 
              onClick={handleShare}
              className="w-full bg-ios-teal text-white font-semibold py-3.5 rounded-xl shadow-lg ios-btn-press flex items-center justify-center gap-2"
            >
              <Share size={18} /> Share Receipt
            </button>
         )}
      </div>
    </div>
  );
};

export default ReceiptDetailView;