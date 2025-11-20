import React, { useState, useMemo } from 'react';
import { X, Search, ChevronRight, Sparkles, Check, XCircle } from 'lucide-react';
import { TAXONOMY } from '../types';

export interface CategorySuggestion {
  category: string;
  subcategory?: string;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
}

interface CategoryPickerViewProps {
  suggestions: CategorySuggestion[];
  initialCategory?: string;
  initialSubcategory?: string;
  onConfirm: (category: string, subcategory?: string) => void;
  onCancel: () => void;
}

const CategoryPickerView: React.FC<CategoryPickerViewProps> = ({
  suggestions,
  initialCategory,
  initialSubcategory,
  onConfirm,
  onCancel
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialCategory || null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(initialSubcategory || null);
  const [searchText, setSearchText] = useState('');

  const categories = Object.keys(TAXONOMY);

  const filteredCategories = useMemo(() => {
    if (!searchText) return categories;
    const lower = searchText.toLowerCase();
    
    return categories.filter(cat => {
      // Match Category Name
      const matchesCategory = cat.toLowerCase().includes(lower);
      // Match Subcategories inside Taxonomy
      const matchesSubcategory = (TAXONOMY[cat] || []).some(sub => sub.toLowerCase().includes(lower));
      
      return matchesCategory || matchesSubcategory;
    });
  }, [searchText, categories]);

  const handleCategorySelect = (cat: string) => {
    if (selectedCategory !== cat) {
      setSelectedCategory(cat);
      setSelectedSubcategory(null);
    }
  };

  const handleConfirm = () => {
    if (selectedCategory) {
      if (navigator.vibrate) navigator.vibrate(10);
      onConfirm(selectedCategory, selectedSubcategory || undefined);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
        {/* Backdrop with Blur */}
        <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
            onClick={onCancel}
        />

        {/* Sheet Content */}
        <div className="bg-ios-bg w-full max-w-md h-[85vh] rounded-t-[2rem] flex flex-col shadow-2xl animate-slide-up relative overflow-hidden">
            {/* Drag Handle */}
            <div className="w-full flex justify-center pt-3 pb-1" onClick={onCancel}>
                <div className="w-12 h-1.5 bg-neutral-300 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-4 py-3 border-b border-ios-separator/20 flex justify-between items-center">
                <button onClick={onCancel} className="text-ios-blue font-medium text-base active:opacity-50">Cancel</button>
                <h1 className="font-semibold text-neutral-900">Select Category</h1>
                <button 
                    onClick={handleConfirm} 
                    disabled={!selectedCategory}
                    className="text-ios-blue font-bold text-base disabled:opacity-30 active:opacity-50"
                >
                    Done
                </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar">
                <div className="px-4 py-3 bg-ios-bg sticky top-0 z-10">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search size={16} className="text-ios-gray" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search categories"
                            className="w-full bg-neutral-200/80 text-neutral-900 rounded-xl py-2 pl-9 pr-8 focus:outline-none focus:ring-2 focus:ring-ios-blue/50 placeholder-neutral-500 transition-all"
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

                {/* Suggestions */}
                {!searchText && suggestions.length > 0 && (
                    <div className="px-4 mb-6 animate-fade-in">
                        <div className="flex items-center gap-1 mb-2 px-1">
                            <Sparkles size={14} className="text-ios-teal fill-current" />
                            <span className="text-xs font-semibold text-ios-gray uppercase tracking-wide">Suggested</span>
                        </div>
                        <div className="flex flex-col gap-2">
                            {suggestions.map((sugg, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => {
                                        setSelectedCategory(sugg.category);
                                        setSelectedSubcategory(sugg.subcategory || null);
                                    }}
                                    className={`flex items-center justify-between p-3 rounded-xl border transition-all text-left ios-active ${
                                        selectedCategory === sugg.category && selectedSubcategory === sugg.subcategory
                                        ? 'bg-ios-teal/10 border-ios-teal/50' 
                                        : 'bg-ios-card border-transparent shadow-sm hover:bg-neutral-50'
                                    }`}
                                >
                                    <div>
                                        <div className="font-semibold text-neutral-900">{sugg.category}</div>
                                        <div className="text-sm text-neutral-500">
                                            {sugg.subcategory ? `${sugg.subcategory} • ` : ''}{sugg.reason}
                                        </div>
                                    </div>
                                    {selectedCategory === sugg.category && selectedSubcategory === sugg.subcategory && (
                                        <Check size={20} className="text-ios-teal" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Main List */}
                <div className="px-4 pb-32">
                    {!searchText && <div className="text-xs font-semibold text-ios-gray uppercase tracking-wide mb-2 px-1">All Categories</div>}
                    
                    {filteredCategories.length === 0 ? (
                         <div className="text-center text-neutral-400 py-8">No categories match "{searchText}"</div>
                    ) : (
                        <div className="bg-ios-card rounded-xl overflow-hidden shadow-sm divide-y divide-ios-separator/50">
                            {filteredCategories.map(cat => {
                                const isSelected = selectedCategory === cat;
                                const subcategories = TAXONOMY[cat] || [];
                                
                                // Smart Subcategory Filtering:
                                // If user searches specifically for a subcategory (e.g. "Fast Food"), only show that.
                                // If user searches for category (e.g. "Restaurant"), show all subcategories.
                                const displayedSubcategories = searchText 
                                    ? subcategories.filter(s => 
                                        s.toLowerCase().includes(searchText.toLowerCase()) || 
                                        cat.toLowerCase().includes(searchText.toLowerCase())
                                    )
                                    : subcategories;

                                return (
                                    <div key={cat} className="flex flex-col">
                                        <button 
                                            onClick={() => handleCategorySelect(cat)}
                                            className={`w-full flex items-center justify-between p-4 text-left transition-colors ios-active ${isSelected ? 'bg-neutral-50' : 'hover:bg-neutral-50'}`}
                                        >
                                            <span className={`font-medium text-lg ${isSelected ? 'text-ios-blue' : 'text-neutral-900'}`}>
                                                {cat}
                                            </span>
                                            {isSelected && <Check size={20} className="text-ios-blue" />}
                                        </button>

                                        {isSelected && displayedSubcategories.length > 0 && (
                                            <div className="bg-neutral-50/50 border-t border-ios-separator/30 pl-4 animate-slide-up" style={{ animationDuration: '0.2s' }}>
                                                {displayedSubcategories.map(sub => (
                                                    <button
                                                        key={sub}
                                                        onClick={() => setSelectedSubcategory(sub)}
                                                        className="w-full flex items-center justify-between py-3 pr-4 border-b border-ios-separator/20 last:border-0 ios-active"
                                                    >
                                                        <span className={`text-[15px] ${selectedSubcategory === sub ? 'font-semibold text-ios-teal' : 'text-neutral-600'}`}>
                                                            {sub}
                                                        </span>
                                                        {selectedSubcategory === sub && <Check size={16} className="text-ios-teal" />}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4 bg-ios-card/90 backdrop-blur border-t border-ios-separator/20 pb-8">
                <button 
                    onClick={handleConfirm}
                    disabled={!selectedCategory}
                    className="w-full bg-ios-blue text-white font-semibold py-3.5 rounded-xl shadow-lg ios-btn-press disabled:opacity-50"
                >
                    Confirm Selection
                </button>
            </div>
        </div>
    </div>
  );
};

export default CategoryPickerView;