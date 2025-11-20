
import React, { useState, useMemo } from 'react';
import { 
    ArrowLeft, Plus, Search, MoreHorizontal, Eye, EyeOff, Archive, 
    Edit2, Trash2, GripVertical, Check, X, Save, AlertTriangle,
    ShoppingBasket, Utensils, Fuel, Pill, Home, MonitorSmartphone, 
    Shirt, Zap, Car, Clapperboard, Wrench, Box, Briefcase, Coffee, 
    Gift, Heart, Music, Scissors, Smartphone, Smile, Star, Sun, Truck, Umbrella, Watch,
    ArrowRightLeft, Info, Layers, Tag, AlertCircle
} from 'lucide-react';
import { CategoryDefinition, Receipt, Subcategory, TaxRule, Visibility, ClassifierBoost } from '../types';

// --- Icon Map ---
const ICON_MAP: Record<string, React.ElementType> = {
    ShoppingBasket, Utensils, Fuel, Pill, Home, MonitorSmartphone, 
    Shirt, Zap, Car, Clapperboard, Wrench, Box, Briefcase, Coffee, 
    Gift, Heart, Music, Scissors, Smartphone, Smile, Star, Sun, Truck, Umbrella, Watch
};

const AVAILABLE_ICONS = Object.keys(ICON_MAP);
const AVAILABLE_COLORS = [
    'red-500', 'orange-500', 'amber-500', 'yellow-500', 'lime-500', 
    'green-500', 'emerald-500', 'teal-500', 'cyan-500', 'sky-500', 
    'blue-500', 'indigo-500', 'violet-500', 'purple-500', 'fuchsia-500', 
    'pink-500', 'rose-500', 'slate-500', 'zinc-500', 'neutral-500'
];

interface ManageCategoriesViewProps {
    categories: CategoryDefinition[];
    receipts: Receipt[];
    onBack: () => void;
    onUpdateCategories: (categories: CategoryDefinition[]) => void;
    onMergeCategories: (sourceId: string, targetId: string) => void;
}

const ManageCategoriesView: React.FC<ManageCategoriesViewProps> = ({ 
    categories, receipts, onBack, onUpdateCategories, onMergeCategories 
}) => {
    const [searchText, setSearchText] = useState('');
    const [filterVisibility, setFilterVisibility] = useState<'all' | 'visible' | 'hidden' | 'archived'>('all');
    
    // Editor State
    const [editingCategory, setEditingCategory] = useState<CategoryDefinition | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    
    // Merge State
    const [mergingCategory, setMergingCategory] = useState<CategoryDefinition | null>(null);
    const [mergeTargetId, setMergeTargetId] = useState<string>('');

    // Confirm Delete State
    const [deletingCategory, setDeletingCategory] = useState<CategoryDefinition | null>(null);

    // --- Filtering & Sorting ---
    const displayCategories = useMemo(() => {
        let filtered = categories.filter(c => {
            if (filterVisibility !== 'all' && c.visibility !== filterVisibility) return false;
            if (searchText) {
                const lower = searchText.toLowerCase();
                return c.name.toLowerCase().includes(lower) || 
                       c.aliases.some(a => a.toLowerCase().includes(lower));
            }
            return true;
        });
        
        // Sort: Pinned first, then by orderIndex
        return filtered.sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return a.orderIndex - b.orderIndex;
        });
    }, [categories, searchText, filterVisibility]);

    // Used for duplicate validation
    const existingNames = useMemo(() => 
        categories.map(c => c.name.toLowerCase()), 
        [categories]
    );

    // --- Handlers ---

    const handleSaveCategory = (cat: CategoryDefinition) => {
        if (isCreating) {
            onUpdateCategories([...categories, { ...cat, orderIndex: categories.length }]);
        } else {
            onUpdateCategories(categories.map(c => c.id === cat.id ? cat : c));
        }
        setEditingCategory(null);
        setIsCreating(false);
    };

    const handleDeleteConfirm = () => {
        if (!deletingCategory) return;
        onUpdateCategories(categories.filter(c => c.id !== deletingCategory.id));
        setDeletingCategory(null);
    };

    const handleMergeConfirm = () => {
        if (mergingCategory && mergeTargetId) {
            onMergeCategories(mergingCategory.id, mergeTargetId);
            setMergingCategory(null);
            setMergeTargetId('');
        }
    };

    const handleDragStart = (e: React.DragEvent, index: number) => {
        e.dataTransfer.setData('text/plain', index.toString());
    };

    const handleDrop = (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();
        const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'));
        if (sourceIndex === targetIndex) return;

        // Simple reorder logic (works best on unfiltered list)
        const newCategories = [...categories];
        const [removed] = newCategories.splice(sourceIndex, 1);
        newCategories.splice(targetIndex, 0, removed);
        
        // Update order indices
        const reordered = newCategories.map((c, i) => ({ ...c, orderIndex: i }));
        onUpdateCategories(reordered);
    };

    const getReceiptCount = (catName: string) => receipts.filter(r => r.category === catName).length;

    return (
        <div className="flex flex-col h-full bg-ios-bg relative">
            {/* --- Static Header (Part of Flex Column) --- */}
            <div className="bg-ios-card px-4 pt-12 pb-4 border-b border-ios-separator/20 shadow-sm flex justify-between items-end flex-shrink-0 z-20">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="text-ios-blue active:opacity-50">
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="text-xl font-bold text-neutral-900">Manage Categories</h1>
                </div>
                <button 
                    onClick={() => {
                        setIsCreating(true);
                        setEditingCategory({
                            id: `cat_${Date.now()}`, name: '', iconName: 'Tag', color: 'blue-500',
                            visibility: 'visible', aliases: [], keywords: [], subcategories: [],
                            taxRule: { mode: 'add' }, isPinned: false, orderIndex: 999, classifierBoost: 'none'
                        });
                    }}
                    className="text-ios-blue font-semibold flex items-center gap-1 active:opacity-50"
                >
                    <Plus size={20} /> Add
                </button>
            </div>

            {/* --- Static Filter & Search (Part of Flex Column) --- */}
            <div className="px-4 py-4 bg-ios-bg z-10 border-b border-ios-separator/10 flex-shrink-0">
                <div className="relative mb-3">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ios-gray" />
                    <input 
                        type="text" 
                        placeholder="Search categories, aliases..." 
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)}
                        className="w-full bg-neutral-200/80 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ios-blue/50"
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    {(['all', 'visible', 'hidden', 'archived'] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setFilterVisibility(t)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize border transition-colors ${
                                filterVisibility === t ? 'bg-neutral-800 text-white border-neutral-800' : 'bg-white text-neutral-600 border-neutral-200'
                            }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            {/* --- Scrollable List (Flex 1) --- */}
            <div className="flex-1 overflow-y-auto px-4 pb-32 no-scrollbar">
                {displayCategories.map((cat, index) => {
                    const Icon = ICON_MAP[cat.iconName] || Tag;
                    const receiptCount = getReceiptCount(cat.name);

                    return (
                        <div 
                            key={cat.id}
                            draggable={!searchText} // Only drag when not filtering
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => handleDrop(e, index)}
                            className={`bg-white rounded-xl p-4 mb-3 shadow-sm border flex items-center gap-4 group ${
                                cat.visibility === 'hidden' ? 'opacity-60 border-dashed' : 'border-transparent'
                            } ${cat.visibility === 'archived' ? 'bg-neutral-50 grayscale' : ''}`}
                        >
                            {/* Drag Handle */}
                            {!searchText && (
                                <div className="text-neutral-300 cursor-grab active:cursor-grabbing">
                                    <GripVertical size={20} />
                                </div>
                            )}

                            {/* Icon */}
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-${cat.color.split('-')[0]}-100`}>
                                <Icon size={24} className={`text-${cat.color}`} />
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-neutral-900 truncate">{cat.name}</h3>
                                    {cat.isPinned && <Star size={12} className="fill-yellow-400 text-yellow-400" />}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-neutral-500 mt-1">
                                    <span>{receiptCount} receipts</span>
                                    {cat.subcategories.length > 0 && <span>• {cat.subcategories.length} subs</span>}
                                    {cat.aliases.length > 0 && <span>• {cat.aliases.length} aliases</span>}
                                </div>
                            </div>

                            {/* Badges/Actions */}
                            <div className="flex items-center gap-1">
                                {cat.visibility !== 'visible' && (
                                    <span className="px-2 py-0.5 rounded bg-neutral-100 text-neutral-500 text-[10px] font-bold uppercase mr-2">
                                        {cat.visibility}
                                    </span>
                                )}
                                
                                <button 
                                    onClick={() => {
                                        setEditingCategory(cat);
                                        setIsCreating(false);
                                    }}
                                    className="p-2 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-ios-blue transition-colors"
                                >
                                    <Edit2 size={18} />
                                </button>
                                
                                {/* Context Menu (Simplified for this view as direct buttons) */}
                                <button 
                                    onClick={() => setMergingCategory(cat)}
                                    className="p-2 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-ios-teal transition-colors"
                                >
                                    <ArrowRightLeft size={18} />
                                </button>
                            </div>
                        </div>
                    );
                })}
                {displayCategories.length === 0 && (
                    <div className="text-center py-12 text-neutral-400">
                        <p>No categories found.</p>
                    </div>
                )}
            </div>

            {/* --- Edit Sheet --- */}
            {editingCategory && (
                <CategoryEditSheet 
                    category={editingCategory}
                    existingNames={existingNames}
                    isCreating={isCreating}
                    onSave={handleSaveCategory}
                    onCancel={() => {
                        setEditingCategory(null);
                        setIsCreating(false);
                    }}
                    onDelete={() => {
                        setDeletingCategory(editingCategory);
                        setEditingCategory(null);
                    }}
                    receiptCount={getReceiptCount(editingCategory.name)}
                />
            )}

            {/* --- Merge Sheet --- */}
            {mergingCategory && (
                <div className="absolute inset-0 z-[70] flex items-end justify-center">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMergingCategory(null)} />
                    <div className="bg-ios-bg w-full max-w-md rounded-t-[2rem] p-6 animate-slide-up shadow-2xl relative">
                        <div className="mb-6">
                            <h3 className="text-xl font-bold text-neutral-900">Merge "{mergingCategory.name}"</h3>
                            <p className="text-sm text-neutral-500 mt-1">
                                Move all receipts to another category. The current category will be archived.
                            </p>
                        </div>

                        <div className="mb-6">
                            <label className="text-xs font-bold text-ios-gray uppercase mb-2 block">Merge Into</label>
                            <select 
                                value={mergeTargetId}
                                onChange={e => setMergeTargetId(e.target.value)}
                                className="w-full p-3 rounded-xl border border-neutral-300 bg-white text-lg"
                            >
                                <option value="">Select Category</option>
                                {categories.filter(c => c.id !== mergingCategory.id && c.visibility !== 'archived').map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setMergingCategory(null)} className="flex-1 py-3 rounded-xl bg-neutral-200 font-semibold text-neutral-900">Cancel</button>
                            <button 
                                onClick={handleMergeConfirm}
                                disabled={!mergeTargetId}
                                className="flex-1 py-3 rounded-xl bg-ios-blue text-white font-semibold disabled:opacity-50"
                            >
                                Merge & Archive
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Delete Confirmation --- */}
            {deletingCategory && (
                <div className="absolute inset-0 z-[80] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeletingCategory(null)} />
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl relative text-center animate-scale-in">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle size={24} className="text-red-600" />
                        </div>
                        <h3 className="text-xl font-bold text-neutral-900 mb-2">Delete Category?</h3>
                        {getReceiptCount(deletingCategory.name) > 0 ? (
                            <p className="text-red-600 font-medium mb-6 text-sm">
                                Warning: This category has {getReceiptCount(deletingCategory.name)} receipts. 
                                Please merge them before deleting, or they will become Uncategorized.
                            </p>
                        ) : (
                            <p className="text-neutral-500 mb-6 text-sm">Are you sure? This action cannot be undone.</p>
                        )}
                        <div className="flex gap-3">
                            <button onClick={() => setDeletingCategory(null)} className="flex-1 py-3 rounded-xl bg-neutral-100 font-semibold">Cancel</button>
                            <button onClick={handleDeleteConfirm} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-semibold">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Category Edit Sheet Component ---

const CategoryEditSheet = ({ category, existingNames, isCreating, onSave, onCancel, onDelete, receiptCount }: any) => {
    const [form, setForm] = useState<CategoryDefinition>({ ...category });
    const [newSub, setNewSub] = useState('');
    const [newAlias, setNewAlias] = useState('');
    const [error, setError] = useState<string | null>(null);

    const IconComponent = ICON_MAP[form.iconName] || Tag;

    const handleSave = () => {
        // Validation
        if (!form.name.trim()) {
            setError("Category name is required");
            return;
        }
        
        const nameLower = form.name.trim().toLowerCase();
        // Check duplicate (exclude self if editing)
        if (existingNames.includes(nameLower) && nameLower !== category.name.toLowerCase()) {
            setError("A category with this name already exists");
            return;
        }

        setError(null);
        onSave(form);
    };

    const addSub = () => {
        if (newSub.trim()) {
            setForm({ ...form, subcategories: [...form.subcategories, { id: Date.now().toString(), name: newSub.trim() }] });
            setNewSub('');
        }
    };

    const addAlias = () => {
        if (newAlias.trim()) {
            setForm({ ...form, aliases: [...form.aliases, newAlias.trim()] });
            setNewAlias('');
        }
    };

    return (
        <div className="absolute inset-0 z-[60] flex items-end justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onCancel} />
            <div className="bg-ios-bg w-full h-[90vh] rounded-t-[2rem] flex flex-col shadow-2xl animate-slide-up overflow-hidden relative">
                
                {/* Sheet Header */}
                <div className="px-6 py-4 bg-white border-b border-ios-separator/20 flex justify-between items-center flex-shrink-0">
                    <button onClick={onCancel} className="text-ios-blue font-medium">Cancel</button>
                    <h3 className="font-bold text-lg">{isCreating ? 'New Category' : 'Edit Category'}</h3>
                    <button 
                        onClick={handleSave} 
                        className="text-ios-blue font-bold disabled:opacity-50"
                    >
                        Save
                    </button>
                </div>
                
                {error && (
                    <div className="bg-red-50 text-red-600 px-6 py-3 text-sm font-medium flex items-center gap-2 animate-fade-in flex-shrink-0">
                        <AlertCircle size={16} /> {error}
                    </div>
                )}

                <div className="flex-1 overflow-y-auto p-6 pb-32 space-y-6">
                    
                    {/* Identity Section */}
                    <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
                        <div className="flex items-center gap-4">
                            <div className={`w-16 h-16 rounded-xl flex items-center justify-center bg-${form.color.split('-')[0]}-100 border border-neutral-100`}>
                                <IconComponent size={32} className={`text-${form.color}`} />
                            </div>
                            <div className="flex-1">
                                <label className="text-xs font-bold text-ios-gray uppercase">Category Name</label>
                                <input 
                                    type="text" 
                                    value={form.name}
                                    onChange={e => { setForm({...form, name: e.target.value}); setError(null); }}
                                    className="w-full text-xl font-bold border-b border-neutral-200 py-1 focus:outline-none focus:border-ios-blue bg-transparent"
                                    placeholder="e.g. Hobbies"
                                />
                            </div>
                        </div>
                        
                        {/* Visual Pickers */}
                        <div>
                            <label className="text-xs font-bold text-ios-gray uppercase mb-2 block">Icon</label>
                            <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
                                {AVAILABLE_ICONS.map(iconName => {
                                    const I = ICON_MAP[iconName];
                                    return (
                                        <button 
                                            key={iconName}
                                            onClick={() => setForm({...form, iconName})}
                                            className={`p-2 rounded-lg flex-shrink-0 transition-all ${form.iconName === iconName ? 'bg-neutral-800 text-white scale-110' : 'bg-neutral-100 text-neutral-500'}`}
                                        >
                                            <I size={20} />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-ios-gray uppercase mb-2 block">Color</label>
                            <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
                                {AVAILABLE_COLORS.map(color => (
                                    <button 
                                        key={color}
                                        onClick={() => setForm({...form, color})}
                                        className={`w-8 h-8 rounded-full flex-shrink-0 border-2 transition-all bg-${color.replace('500', '500')} ${form.color === color ? 'border-neutral-800 scale-110' : 'border-transparent'}`}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Visibility & Pin */}
                    <div className="bg-white rounded-xl overflow-hidden shadow-sm divide-y divide-ios-separator/50">
                        <div className="p-4 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-yellow-100 rounded text-yellow-600"><Star size={18} /></div>
                                <span className="font-medium">Pin to Top</span>
                            </div>
                            <button 
                                onClick={() => setForm({...form, isPinned: !form.isPinned})}
                                className={`w-12 h-7 rounded-full p-1 transition-colors duration-300 ${form.isPinned ? 'bg-green-500' : 'bg-neutral-200'}`}
                            >
                                <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${form.isPinned ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                        </div>
                        <div className="p-4 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-neutral-100 rounded text-neutral-600">
                                    {form.visibility === 'visible' ? <Eye size={18} /> : <EyeOff size={18} />}
                                </div>
                                <span className="font-medium">Visibility</span>
                            </div>
                            <select 
                                value={form.visibility}
                                onChange={(e) => setForm({...form, visibility: e.target.value as Visibility})}
                                className="bg-neutral-100 rounded-lg px-3 py-1 text-sm font-medium outline-none"
                            >
                                <option value="visible">Visible</option>
                                <option value="hidden">Hidden</option>
                                <option value="archived">Archived</option>
                            </select>
                        </div>
                    </div>

                    {/* Subcategories */}
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                        <label className="text-xs font-bold text-ios-gray uppercase mb-3 block">Subcategories & Default</label>
                        <p className="text-[10px] text-neutral-400 mb-3">Select the circle to mark as default.</p>
                        <div className="space-y-2 mb-3">
                            {form.subcategories.map(sub => (
                                <div key={sub.id} className="flex justify-between items-center bg-neutral-50 p-2 rounded-lg">
                                    <div className="flex items-center gap-3 flex-1">
                                        <button 
                                            onClick={() => setForm({...form, defaultSubcategoryId: form.defaultSubcategoryId === sub.id ? undefined : sub.id})}
                                            className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors flex-shrink-0 ${
                                                form.defaultSubcategoryId === sub.id 
                                                ? 'bg-ios-blue border-ios-blue' 
                                                : 'border-neutral-300 bg-white'
                                            }`}
                                        >
                                            {form.defaultSubcategoryId === sub.id && <div className="w-2 h-2 bg-white rounded-full" />}
                                        </button>
                                        <span className="text-sm font-medium truncate">{sub.name}</span>
                                        {form.defaultSubcategoryId === sub.id && (
                                            <span className="text-[10px] bg-blue-100 text-ios-blue px-1.5 py-0.5 rounded font-bold uppercase">Default</span>
                                        )}
                                    </div>
                                    <button 
                                        onClick={() => {
                                            setForm({
                                                ...form, 
                                                subcategories: form.subcategories.filter(s => s.id !== sub.id),
                                                defaultSubcategoryId: form.defaultSubcategoryId === sub.id ? undefined : form.defaultSubcategoryId
                                            })
                                        }}
                                        className="text-red-500 p-1 hover:bg-red-50 rounded"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                placeholder="Add subcategory..." 
                                value={newSub}
                                onChange={e => setNewSub(e.target.value)}
                                className="flex-1 bg-neutral-100 rounded-lg px-3 py-2 text-sm outline-none"
                                onKeyDown={e => e.key === 'Enter' && addSub()}
                            />
                            <button onClick={addSub} className="bg-neutral-100 p-2 rounded-lg text-ios-blue font-medium"><Plus size={20} /></button>
                        </div>
                    </div>

                    {/* Smart Classification */}
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-3 text-ios-teal">
                            <Zap size={16} fill="currentColor" />
                            <label className="text-xs font-bold uppercase">Smart Classification</label>
                        </div>
                        <p className="text-xs text-neutral-500 mb-3">Receiptfy uses these keywords to auto-detect this category.</p>
                        
                        <div className="flex flex-wrap gap-2 mb-3">
                            {form.aliases.map((alias, i) => (
                                <span key={i} className="bg-teal-50 text-teal-700 text-xs px-2 py-1 rounded-md flex items-center gap-1 border border-teal-100">
                                    {alias}
                                    <button onClick={() => setForm({...form, aliases: form.aliases.filter((_, idx) => idx !== i)})}>
                                        <X size={12} />
                                    </button>
                                </span>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                placeholder="Add merchant alias (e.g. Starbucks)..." 
                                value={newAlias}
                                onChange={e => setNewAlias(e.target.value)}
                                className="flex-1 bg-neutral-100 rounded-lg px-3 py-2 text-sm outline-none"
                                onKeyDown={e => e.key === 'Enter' && addAlias()}
                            />
                            <button onClick={addAlias} className="bg-neutral-100 p-2 rounded-lg text-ios-teal font-medium"><Plus size={20} /></button>
                        </div>
                        
                        <div className="mt-4 pt-3 border-t border-neutral-100 flex justify-between items-center">
                            <span className="text-sm font-medium">Auto-Detect Boost</span>
                            <div className="flex bg-neutral-100 rounded-lg p-1">
                                {(['none', 'low', 'medium', 'high'] as const).map(lvl => (
                                    <button
                                        key={lvl}
                                        onClick={() => setForm({...form, classifierBoost: lvl})}
                                        className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-all ${form.classifierBoost === lvl ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-400'}`}
                                    >
                                        {lvl}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Tax Rules */}
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                        <label className="text-xs font-bold text-ios-gray uppercase mb-3 block">Tax Rules</label>
                        <div className="flex gap-2 mb-4">
                            {(['add', 'included', 'none'] as const).map(mode => (
                                <button
                                    key={mode}
                                    onClick={() => setForm({...form, taxRule: { ...form.taxRule, mode }})}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase border ${
                                        form.taxRule.mode === mode 
                                        ? 'bg-ios-blue text-white border-ios-blue' 
                                        : 'bg-white text-neutral-500 border-neutral-200'
                                    }`}
                                >
                                    {mode === 'add' ? '+ Tax' : mode}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-neutral-600">Override Default Rate</span>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="number" 
                                    placeholder="Default" 
                                    value={form.taxRule.percentOverride || ''}
                                    onChange={e => setForm({...form, taxRule: { ...form.taxRule, percentOverride: parseFloat(e.target.value) || undefined }})}
                                    className="w-20 bg-neutral-100 rounded-lg px-2 py-1 text-right outline-none"
                                />
                                <span className="text-sm text-neutral-400">%</span>
                            </div>
                        </div>
                    </div>

                    {/* Delete */}
                    {!isCreating && (
                        <button 
                            onClick={onDelete}
                            className="w-full py-3 bg-red-50 text-red-600 rounded-xl font-semibold flex items-center justify-center gap-2 mt-4"
                        >
                            <Trash2 size={18} /> Delete Category
                        </button>
                    )}
                    
                    <div className="h-8" />
                </div>
            </div>
        </div>
    );
};

export default ManageCategoriesView;
