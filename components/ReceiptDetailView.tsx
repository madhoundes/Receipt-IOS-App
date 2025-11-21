
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowLeft, Trash2, Share, Edit2, Calendar, Tag, DollarSign, Save, Percent, AlertCircle, ChevronDown, FileText, Copy, Image as ImageIcon, FileSpreadsheet, X, AlertTriangle, RotateCcw, RefreshCw } from 'lucide-react';
import { Receipt, CATEGORIES, TAXONOMY } from '../types';
import { generateCSV, generateReceiptSummary, downloadFile, shareText } from '../exportUtils';
import { getBrandAsset } from '../constants';

interface ReceiptDetailViewProps {
  receipt: Receipt | null;
  onBack: () => void;
  onUpdate: (updatedReceipt: Receipt) => void;
  onDelete: (id: string) => void;
}

// --- Constants ---
const DEFAULT_HST_PERCENT = 13;

// --- Helper Hooks ---

// Computes missing values based on defaults (Canadian HST logic)
const useReceiptMath = (receipt: Receipt | null) => {
  return useMemo(() => {
    if (!receipt) return { computedSubtotal: 0, computedTax: 0, computedPercent: 0, isComputed: false, isMathValid: true };

    const total = receipt.totalAmount || 0;
    const existingSubtotal = receipt.subtotal;
    const existingTax = receipt.hstAmount;
    const existingPercent = receipt.hstPercent;

    let computedSubtotal = existingSubtotal || 0;
    let computedTax = existingTax || 0;
    let computedPercent = existingPercent || DEFAULT_HST_PERCENT;
    let isComputed = false;

    // Case 1: Missing Tax Amount -> Calculate backwards from Total using Percent
    if (existingTax === undefined || existingTax === null) {
      // If subtotal exists, tax = total - subtotal
      if (existingSubtotal) {
        computedTax = total - existingSubtotal;
        // Infer percent if missing
        if (!existingPercent) {
           computedPercent = (computedTax / existingSubtotal) * 100;
        }
      } else {
        // If subtotal missing too, assume 13%
        computedSubtotal = total / (1 + (computedPercent / 100));
        computedTax = total - computedSubtotal;
        isComputed = true;
      }
    }

    // Case 2: Missing Subtotal -> Calculate from Total - Tax
    if (existingSubtotal === undefined || existingSubtotal === null) {
       computedSubtotal = total - computedTax;
       isComputed = true;
    }

    // Validation Check (Tolerance of 0.10)
    const isMathValid = Math.abs((computedSubtotal + computedTax) - total) < 0.10;

    return {
      computedSubtotal,
      computedTax,
      computedPercent,
      isComputed: isComputed || !existingTax, // Flag if we had to infer anything critical
      isMathValid
    };
  }, [receipt]);
};

const ReceiptDetailView: React.FC<ReceiptDetailViewProps> = ({ receipt, onBack, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedReceipt, setEditedReceipt] = useState<Receipt | null>(receipt);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  
  const { computedSubtotal, computedTax, computedPercent, isComputed, isMathValid } = useReceiptMath(isEditing ? editedReceipt : receipt);

  // Sync initial edit state when opening
  useEffect(() => {
    if (receipt) {
       // If values were computed/missing in the original receipt, verify we populate them for the edit form?
       // Actually, we want to show what is SAVED in the DB. The 'useReceiptMath' handles the display logic.
       setEditedReceipt(receipt); 
       setImageLoading(true);
       setImageError(false);
    }
  }, [receipt]);

  // Swipe Gesture State
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const [headerShadow, setHeaderShadow] = useState(false);

  // Scroll Handler
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setHeaderShadow(e.currentTarget.scrollTop > 10);
  };

  // Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isEditing) return; 
    if (e.targetTouches[0].clientX < 50) setTouchStart(e.targetTouches[0].clientX);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = e.targetTouches[0].clientX - touchStart;
    if (diff > 0) setSwipeOffset(diff);
  };
  const handleTouchEnd = () => {
    if (touchStart === null) return;
    if (swipeOffset > 100) onBack();
    else setSwipeOffset(0);
    setTouchStart(null);
  };

  if (!receipt || !editedReceipt) {
    return (
      <div className="flex flex-col h-full bg-ios-bg items-center justify-center text-neutral-400">
         <AlertCircle size={48} />
         <p className="mt-4 font-semibold">Receipt not found</p>
         <button onClick={onBack} className="mt-4 text-ios-blue font-medium">Go Back</button>
      </div>
    );
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric'
    }).format(date);
  };

  const handleSave = () => {
    // If values were computed during edit (e.g. user cleared tax), persist the computed values
    const finalReceipt: Receipt = {
        ...editedReceipt,
        subtotal: editedReceipt.subtotal || computedSubtotal,
        hstAmount: editedReceipt.hstAmount || computedTax,
        hstPercent: editedReceipt.hstPercent || computedPercent
    };
    onUpdate(finalReceipt);
    setIsEditing(false);
  };

  // --- Edit Logic ---
  const updateSubtotal = (newSub: number) => {
      // When Subtotal changes, maintain Tax Rate, update Tax Amount and Total
      const rate = (editedReceipt.hstPercent || DEFAULT_HST_PERCENT) / 100;
      const newTax = newSub * rate;
      const newTotal = newSub + newTax;
      setEditedReceipt({ ...editedReceipt, subtotal: newSub, hstAmount: newTax, totalAmount: newTotal });
  };

  const updateTotal = (newTotal: number) => {
      // When Total changes, maintain Tax Rate, backwards calculate Subtotal and Tax
      const rate = (editedReceipt.hstPercent || DEFAULT_HST_PERCENT) / 100;
      const newSub = newTotal / (1 + rate);
      const newTax = newTotal - newSub;
      setEditedReceipt({ ...editedReceipt, totalAmount: newTotal, subtotal: newSub, hstAmount: newTax });
  };

  const resetToDefaultTax = () => {
      const total = editedReceipt.totalAmount;
      const rate = 0.13;
      const newSub = total / (1 + rate);
      const newTax = total - newSub;
      setEditedReceipt({ ...editedReceipt, hstPercent: 13, subtotal: newSub, hstAmount: newTax });
  };

  // --- Share Logic ---
  const handleShareCSV = () => {
      const csvData = generateCSV([editedReceipt]);
      const filename = `Receipt_${editedReceipt.storeName.replace(/\s/g, '')}_${editedReceipt.purchaseDate.toISOString().split('T')[0]}.csv`;
      downloadFile(csvData, filename, 'text/csv');
      setShowShareSheet(false);
  };
  const handleShareText = () => {
      shareText(generateReceiptSummary(editedReceipt), `Receipt: ${editedReceipt.storeName}`);
      setShowShareSheet(false);
  };

  const availableSubcategories = TAXONOMY[editedReceipt.category] || [];
  const isManualEntry = editedReceipt.imageName === 'manual_placeholder';
  const brandAsset = getBrandAsset(editedReceipt.storeName);

  return (
    <div 
        className="flex flex-col h-full bg-ios-bg overflow-hidden relative"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ transform: `translateX(${swipeOffset}px)`, transition: touchStart === null ? 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none' }}
    >
      {/* Fixed Header */}
      <div className={`bg-ios-card px-4 pt-12 pb-4 flex justify-between items-center border-b border-ios-separator/20 z-20 transition-shadow duration-300 flex-shrink-0 ${headerShadow ? 'shadow-md' : 'shadow-sm'}`}>
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

      {/* Validation Banner */}
      {!isEditing && !isMathValid && (
        <div className="bg-amber-100 px-4 py-2 text-amber-800 text-xs font-medium flex items-center justify-center gap-2 border-b border-amber-200">
            <AlertTriangle size={14} />
            <span>Totals don't match. Please review values.</span>
            <button onClick={() => setIsEditing(true)} className="underline font-bold">Fix</button>
        </div>
      )}

      {/* Scrollable Content */}
      <div ref={contentRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 pb-32 no-scrollbar">
        <div className="flex flex-col gap-6 max-w-md mx-auto animate-slide-up">
          
          {/* Image Section */}
          <div className="w-full aspect-[3/4] rounded-2xl overflow-hidden shadow-md bg-neutral-100 relative group transform-gpu border border-neutral-100">
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
                <>
                  {imageLoading && !imageError && (
                      <div className="absolute inset-0 flex items-center justify-center bg-neutral-100 z-10">
                          <div className="w-full h-full animate-shimmer bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 bg-[length:200%_100%]" />
                      </div>
                  )}
                  {imageError ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-100 text-neutral-400 gap-2">
                          <AlertCircle size={32} />
                          <span className="text-xs font-medium">Image failed to load</span>
                          <button onClick={() => { setImageError(false); setImageLoading(true); }} className="text-ios-blue text-xs font-bold flex items-center gap-1"><RefreshCw size={10} /> Retry</button>
                      </div>
                  ) : (
                      <img 
                        src={editedReceipt.imageName} 
                        alt="Receipt" 
                        className={`w-full h-full object-cover transition-opacity duration-500 ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
                        onLoad={() => setImageLoading(false)}
                        onError={() => { setImageLoading(false); setImageError(true); }}
                      />
                  )}
                </>
            )}
          </div>

          {/* Header Info */}
          <div className="flex items-center gap-4 px-2">
             {brandAsset && (
                 <div className="w-14 h-14 rounded-full bg-white shadow-sm border border-neutral-100 flex items-center justify-center overflow-hidden p-2">
                     <img src={brandAsset.logoUrl} alt={brandAsset.name} className="w-full h-full object-contain" />
                 </div>
             )}
             <div className="flex-1">
                {isEditing ? (
                     <input 
                        type="text" 
                        value={editedReceipt.storeName}
                        onChange={(e) => setEditedReceipt({...editedReceipt, storeName: e.target.value})}
                        className="text-2xl font-bold w-full bg-transparent border-b border-neutral-200 focus:border-ios-blue outline-none py-1"
                     />
                ) : (
                    <h2 className="text-2xl font-bold text-neutral-900">{editedReceipt.storeName}</h2>
                )}
                {isEditing ? (
                    <input 
                        type="datetime-local"
                        value={editedReceipt.purchaseDate.toISOString().slice(0, 16)}
                        onChange={(e) => setEditedReceipt({...editedReceipt, purchaseDate: new Date(e.target.value)})}
                        className="text-sm mt-1 bg-neutral-100 rounded px-2 py-1 w-full"
                    />
                ) : (
                    <p className="text-neutral-500 text-sm font-medium">{formatDate(editedReceipt.purchaseDate)}</p>
                )}
             </div>
          </div>

          {/* Totals Card */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-neutral-100 space-y-4 relative overflow-hidden">
            {/* Watermark for Computed */}
            {!isEditing && isComputed && (
                <div className="absolute top-0 right-0 bg-neutral-100 text-[10px] text-neutral-500 px-2 py-1 rounded-bl-xl font-medium">
                    Defaults Applied
                </div>
            )}

             {/* Category Row */}
             <div className="flex items-center justify-between">
                 <div className="flex items-center gap-1.5 text-neutral-500 text-xs font-bold uppercase tracking-wider">
                    <Tag size={12} /> Category
                 </div>
                 {isEditing ? (
                    <div className="flex gap-2 flex-1 justify-end max-w-[70%]">
                        <select 
                          value={editedReceipt.category}
                          onChange={(e) => setEditedReceipt({...editedReceipt, category: e.target.value, subcategory: undefined})}
                          className="text-sm font-medium border rounded px-2 py-1 bg-neutral-50 max-w-[50%]"
                        >
                          {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                        <select 
                            value={editedReceipt.subcategory || ''}
                            onChange={(e) => setEditedReceipt({...editedReceipt, subcategory: e.target.value || undefined})}
                            className="text-sm font-medium border rounded px-2 py-1 bg-neutral-50 max-w-[50%]"
                        >
                            <option value="">None</option>
                            {availableSubcategories.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                        </select>
                    </div>
                 ) : (
                     <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-md text-sm font-semibold ${editedReceipt.category ? 'bg-neutral-100 text-neutral-700' : 'bg-neutral-100 text-neutral-400'}`}>
                           {editedReceipt.category || 'Uncategorized'}
                        </span>
                        {editedReceipt.subcategory && (
                            <span className="text-ios-teal text-sm font-medium flex items-center gap-0.5">
                                <ChevronDown size={12} className="-rotate-90" /> {editedReceipt.subcategory}
                            </span>
                        )}
                     </div>
                 )}
             </div>

             <div className="h-px bg-neutral-100" />

             {/* Subtotal */}
             <div className="flex justify-between items-center text-sm">
                 <span className="text-neutral-500">Subtotal</span>
                 {isEditing ? (
                     <input 
                        type="number" step="0.01"
                        value={editedReceipt.subtotal?.toFixed(2) || ''}
                        onChange={(e) => updateSubtotal(parseFloat(e.target.value) || 0)}
                        className="w-24 text-right font-medium bg-neutral-50 border rounded px-1"
                     />
                 ) : (
                     <span className={`font-medium ${!editedReceipt.subtotal ? 'text-neutral-400 italic' : 'text-neutral-900'}`}>
                         ${computedSubtotal.toFixed(2)}
                     </span>
                 )}
             </div>

             {/* Tax Row */}
             <div className="flex justify-between items-center text-sm">
                 <div className="flex items-center gap-1 text-neutral-500">
                     <span>Tax</span>
                     {isEditing ? (
                        <div className="flex items-center bg-neutral-50 rounded px-1 border ml-1">
                            <input 
                                type="number" value={editedReceipt.hstPercent || ''} 
                                onChange={e => setEditedReceipt({...editedReceipt, hstPercent: parseFloat(e.target.value)})}
                                className="w-8 text-right bg-transparent outline-none text-xs" 
                                placeholder="13"
                            />
                            <span className="text-xs">%</span>
                        </div>
                     ) : (
                        <span className="text-xs bg-neutral-100 px-1.5 rounded text-neutral-400">
                            {computedPercent.toFixed(0)}%
                        </span>
                     )}
                     {isEditing && (
                         <button onClick={resetToDefaultTax} className="ml-2 text-[10px] font-bold text-ios-blue flex items-center gap-0.5 bg-blue-50 px-1.5 py-0.5 rounded hover:bg-blue-100">
                             <RotateCcw size={8} /> 13%
                         </button>
                     )}
                 </div>
                 {isEditing ? (
                     <input 
                        type="number" step="0.01"
                        value={editedReceipt.hstAmount?.toFixed(2) || ''}
                        onChange={(e) => setEditedReceipt({...editedReceipt, hstAmount: parseFloat(e.target.value)})}
                        className="w-24 text-right font-medium bg-neutral-50 border rounded px-1"
                     />
                 ) : (
                     <span className={`font-medium ${!editedReceipt.hstAmount ? 'text-neutral-400 italic' : 'text-neutral-900'}`}>
                         ${computedTax.toFixed(2)}
                     </span>
                 )}
             </div>

             <div className="h-px bg-neutral-100" />

             {/* Total */}
             <div className="flex justify-between items-end">
                 <span className="text-lg font-bold text-neutral-900">Total</span>
                 {isEditing ? (
                     <input 
                        type="number" step="0.01"
                        value={editedReceipt.totalAmount.toFixed(2)}
                        onChange={(e) => updateTotal(parseFloat(e.target.value) || 0)}
                        className="w-32 text-right text-2xl font-bold bg-transparent border-b border-neutral-200 focus:border-ios-blue outline-none"
                     />
                 ) : (
                     <span className="text-3xl font-bold text-neutral-900 tracking-tight">
                         ${editedReceipt.totalAmount.toFixed(2)}
                     </span>
                 )}
             </div>

             {/* Helper Text */}
             {!isEditing && isComputed && (
                 <div className="text-[10px] text-neutral-400 text-center pt-1">
                     * Some values computed from Canadian HST defaults (13%)
                 </div>
             )}
          </div>

          {/* Metadata Card */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-neutral-100 space-y-4">
             {/* Payment Method */}
             <div>
                 <label className="text-xs font-bold text-ios-gray uppercase mb-1 block">Payment Method</label>
                 {isEditing ? (
                     <input 
                        type="text" placeholder="e.g. VISA 1234"
                        value={editedReceipt.paymentMethod || ''}
                        onChange={e => setEditedReceipt({...editedReceipt, paymentMethod: e.target.value})}
                        className="w-full bg-neutral-50 border rounded px-3 py-2 text-sm"
                     />
                 ) : (
                     <div className="flex items-center gap-2 text-sm font-medium text-neutral-700">
                         <CreditCardIcon method={editedReceipt.paymentMethod} />
                         <span>{editedReceipt.paymentMethod || "Not detected"}</span>
                     </div>
                 )}
             </div>

             <div className="h-px bg-neutral-100" />

             {/* Notes */}
             <div>
                 <label className="text-xs font-bold text-ios-gray uppercase mb-1 block">Notes</label>
                 {isEditing ? (
                     <textarea 
                        value={editedReceipt.notes || ''}
                        onChange={e => setEditedReceipt({...editedReceipt, notes: e.target.value})}
                        className="w-full bg-neutral-50 border rounded px-3 py-2 text-sm h-24 resize-none"
                        placeholder="Add details..."
                     />
                 ) : (
                     <p className={`text-sm whitespace-pre-wrap ${editedReceipt.notes ? 'text-neutral-700' : 'text-neutral-400 italic'}`}>
                        {editedReceipt.notes || "No notes added"}
                     </p>
                 )}
             </div>
          </div>

        </div>
      </div>

      {/* Fixed Bottom Action Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-lg border-t border-neutral-200 z-20 pb-8">
         {isEditing ? (
            <button onClick={handleSave} className="w-full bg-ios-blue text-white font-semibold py-3.5 rounded-xl shadow-lg ios-btn-press flex items-center justify-center gap-2">
              <Save size={18} /> Save Changes
            </button>
         ) : (
            <button onClick={() => setShowShareSheet(true)} className="w-full bg-ios-teal text-white font-semibold py-3.5 rounded-xl shadow-lg ios-btn-press flex items-center justify-center gap-2">
              <Share size={18} /> Share Receipt
            </button>
         )}
      </div>

      {/* Share Sheet */}
      {showShareSheet && (
          <div className="absolute inset-0 z-[100] flex items-end justify-center">
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={() => setShowShareSheet(false)} />
              <div className="bg-ios-bg w-full max-w-md rounded-t-[2rem] p-6 animate-slide-up shadow-2xl relative z-10">
                  <div className="w-12 h-1.5 bg-neutral-300 rounded-full mx-auto mb-6 opacity-50" />
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-neutral-900">Share Receipt</h3>
                      <button onClick={() => setShowShareSheet(false)} className="p-2 bg-neutral-200/80 rounded-full text-neutral-500 hover:bg-neutral-300"><X size={20} /></button>
                  </div>
                  <div className="space-y-3">
                      <button onClick={() => {alert("Stub: Image Sharing"); setShowShareSheet(false);}} className="w-full p-4 bg-white rounded-xl flex items-center gap-4 active:bg-neutral-50 shadow-sm">
                          <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center"><ImageIcon size={20} /></div>
                          <div className="text-left"><span className="block font-semibold text-neutral-900">Share Image</span><span className="text-xs text-neutral-500">Send original receipt photo</span></div>
                      </button>
                      <button onClick={handleShareCSV} className="w-full p-4 bg-white rounded-xl flex items-center gap-4 active:bg-neutral-50 shadow-sm">
                          <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center"><FileSpreadsheet size={20} /></div>
                          <div className="text-left"><span className="block font-semibold text-neutral-900">Export CSV</span><span className="text-xs text-neutral-500">Compatible with accounting apps</span></div>
                      </button>
                       <button onClick={handleShareText} className="w-full p-4 bg-white rounded-xl flex items-center gap-4 active:bg-neutral-50 shadow-sm">
                          <div className="w-10 h-10 rounded-lg bg-neutral-100 text-neutral-600 flex items-center justify-center"><Copy size={20} /></div>
                          <div className="text-left"><span className="block font-semibold text-neutral-900">Copy Summary</span><span className="text-xs text-neutral-500">Copy text details to clipboard</span></div>
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

// Simple Helper for Credit Card Icon
const CreditCardIcon = ({ method }: { method?: string }) => {
    if (!method) return <DollarSign size={16} className="text-neutral-400" />;
    const m = method.toLowerCase();
    if (m.includes('visa')) return <div className="font-bold text-[10px] bg-blue-800 text-white px-1 rounded">VISA</div>;
    if (m.includes('master')) return <div className="font-bold text-[10px] bg-orange-600 text-white px-1 rounded">MC</div>;
    if (m.includes('amex')) return <div className="font-bold text-[10px] bg-blue-400 text-white px-1 rounded">AMEX</div>;
    if (m.includes('cash')) return <DollarSign size={16} className="text-green-600" />;
    return <DollarSign size={16} className="text-neutral-500" />;
};

export default ReceiptDetailView;
