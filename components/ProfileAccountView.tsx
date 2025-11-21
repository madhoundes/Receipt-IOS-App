
import React, { useState, useRef, useEffect } from 'react';
import { 
    User, Settings, Shield, Bell, Database, LogOut, CreditCard, HelpCircle, 
    ChevronRight, Camera, Zap, FileText, Download, Trash2, Mail, Edit2, 
    X, Check, Smartphone, Moon, Sliders, Layers, Info, Lock, Percent, Globe,
    Image as ImageIcon, RotateCcw, AlertCircle, Store
} from 'lucide-react';
import { UserProfile, Receipt } from '../types';
import { generateCSV, downloadFile } from '../exportUtils';

interface ProfileAccountViewProps {
    userProfile: UserProfile;
    onUpdateProfile: (profile: UserProfile) => void;
    onSignOut: () => void;
    onDeleteAllData: () => void;
    onExportData: (format: 'csv' | 'json') => void;
    onManageCategories: () => void; 
    receipts: Receipt[]; // Updated prop
}

// --- Avatar Camera Component ---
const AvatarCameraView = ({ onCapture, onCancel }: { onCapture: (img: string) => void, onCancel: () => void }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [permissionDenied, setPermissionDenied] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);

    useEffect(() => {
        const startCamera = async () => {
            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({ 
                    video: { 
                        facingMode: 'user',
                        width: { ideal: 1080 },
                        height: { ideal: 1080 }
                    },
                    audio: false 
                });
                setStream(mediaStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }
            } catch (err) {
                console.error("Camera access denied:", err);
                setPermissionDenied(true);
            }
        };
        startCamera();
        return () => {
            if (stream) stream.getTracks().forEach(track => track.stop());
        };
    }, []);

    const handleCapture = () => {
        if (videoRef.current) {
            const video = videoRef.current;
            const canvas = document.createElement('canvas');
            const size = Math.min(video.videoWidth, video.videoHeight);
            canvas.width = 512;
            canvas.height = 512;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                const sx = (video.videoWidth - size) / 2;
                const sy = (video.videoHeight - size) / 2;
                ctx.translate(512, 0);
                ctx.scale(-1, 1);
                ctx.drawImage(video, sx, sy, size, size, 0, 0, 512, 512);
                onCapture(canvas.toDataURL('image/jpeg', 0.9));
            }
        }
    };

    if (permissionDenied) {
        return (
            <div className="absolute inset-0 z-[80] bg-black flex flex-col items-center justify-center p-6 text-white animate-fade-in">
                <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mb-6">
                    <Camera size={32} className="text-neutral-400" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-center">Camera Access Needed</h3>
                <p className="text-center text-neutral-400 mb-8 max-w-xs">
                    Please enable camera access in your device settings to take a profile photo.
                </p>
                <div className="flex flex-col gap-3 w-full max-w-sm">
                    <button onClick={onCancel} className="w-full py-3 rounded-xl bg-white text-black font-semibold">Close</button>
                </div>
            </div>
        );
    }

    return (
        <div className="absolute inset-0 z-[80] bg-black flex flex-col animate-fade-in">
            <div className="flex-1 relative overflow-hidden flex items-center justify-center">
                <video ref={videoRef} autoPlay playsInline muted className="absolute min-w-full min-h-full object-cover transform scale-x-[-1]" />
                <div className="absolute inset-0 bg-black/50">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-transparent border-4 border-white/30 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] overflow-hidden"></div>
                </div>
                <p className="absolute top-24 text-white/80 font-medium text-sm drop-shadow-md">Align your face within the circle</p>
            </div>
            <div className="bg-black pt-6 pb-10 px-8 flex justify-between items-center">
                <button onClick={onCancel} className="text-white font-medium text-lg p-2">Cancel</button>
                <button onClick={handleCapture} className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center active:scale-95 transition-transform"><div className="w-[68px] h-[68px] rounded-full bg-white" /></button>
                <div className="w-16" />
            </div>
        </div>
    );
};

const ProfileAccountView: React.FC<ProfileAccountViewProps> = ({ 
    userProfile, onUpdateProfile, onSignOut, onDeleteAllData, onExportData, onManageCategories, receipts
}) => {
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [editForm, setEditForm] = useState({ name: userProfile.name, email: userProfile.email, avatar: userProfile.avatar });
    const [showPhotoOptions, setShowPhotoOptions] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const [showExportSheet, setShowExportSheet] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const toggleHaptic = (enabled: boolean) => {
        if (enabled && navigator.vibrate) navigator.vibrate(10);
        onUpdateProfile({ ...userProfile, hapticsEnabled: enabled });
    };

    const handleEditSave = () => {
        onUpdateProfile({ ...userProfile, ...editForm });
        setIsEditingProfile(false);
    };

    const processSelectedImage = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const size = Math.min(img.width, img.height);
                canvas.width = 512; canvas.height = 512;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    const ox = (img.width - size) / 2;
                    const oy = (img.height - size) / 2;
                    ctx.drawImage(img, ox, oy, size, size, 0, 0, 512, 512);
                    setEditForm(prev => ({ ...prev, avatar: canvas.toDataURL('image/jpeg', 0.9) }));
                }
            };
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            processSelectedImage(e.target.files[0]);
            setShowPhotoOptions(false);
        }
    };

    // Export Handlers
    const handleExportCSV = (range: 'all' | 'month') => {
        let exportData = receipts;
        if (range === 'month') {
            const now = new Date();
            exportData = receipts.filter(r => 
                r.purchaseDate.getMonth() === now.getMonth() && 
                r.purchaseDate.getFullYear() === now.getFullYear()
            );
        }
        if (exportData.length === 0) {
            alert("No receipts found for selected range.");
            return;
        }
        const csv = generateCSV(exportData);
        downloadFile(csv, `Receiptfy_Export_${range}.csv`, 'text/csv');
        setShowExportSheet(false);
    };

    const handleExportJSON = () => {
        const json = JSON.stringify({
            profile: userProfile,
            receipts: receipts,
            exportedAt: new Date().toISOString()
        }, null, 2);
        downloadFile(json, `Receiptfy_Backup_${new Date().toISOString().split('T')[0]}.json`, 'application/json');
        setShowExportSheet(false);
    };

    const ListItem = ({ icon: Icon, color, label, value, onClick, isDestructive = false, hasToggle = false, toggleValue = false, onToggle = () => {} }: any) => (
        <div 
            className={`flex items-center justify-between p-4 bg-white active:bg-neutral-50 transition-colors ${onClick ? 'cursor-pointer' : ''}`}
            onClick={hasToggle ? undefined : onClick}
        >
            <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
                    <Icon size={18} className="text-white" />
                </div>
                <span className={`text-[16px] font-medium ${isDestructive ? 'text-red-600' : 'text-neutral-900'}`}>{label}</span>
            </div>
            <div className="flex items-center gap-2">
                {value && <span className="text-neutral-500 text-[15px]">{value}</span>}
                {hasToggle ? (
                    <button 
                        onClick={() => onToggle(!toggleValue)}
                        className={`w-12 h-7 rounded-full p-1 transition-colors duration-300 ${toggleValue ? 'bg-green-500' : 'bg-neutral-200'}`}
                    >
                        <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${toggleValue ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                ) : (
                    onClick && <ChevronRight size={18} className="text-neutral-300" />
                )}
            </div>
        </div>
    );

    const SectionHeader = ({ title }: { title: string }) => (
        <h3 className="px-4 pb-2 pt-6 text-xs font-semibold text-neutral-500 uppercase tracking-wider">{title}</h3>
    );

    return (
        <div className="flex flex-col h-full bg-ios-bg relative">
            <div className="bg-ios-card px-4 pt-12 pb-6 border-b border-ios-separator/20 z-20 shadow-sm flex-shrink-0">
                <h1 className="text-3xl font-bold text-neutral-900 tracking-tight mb-6">Profile</h1>
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-neutral-200 flex items-center justify-center text-xl font-bold text-neutral-500 overflow-hidden border-2 border-white shadow-sm">
                        {userProfile.avatar ? <img src={userProfile.avatar} alt="Avatar" className="w-full h-full object-cover" /> : <span>{userProfile.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}</span>}
                    </div>
                    <div className="flex-1">
                        <h2 className="text-xl font-bold text-neutral-900">{userProfile.name}</h2>
                        <p className="text-neutral-500 text-sm">{userProfile.email}</p>
                        {userProfile.isPro && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 text-orange-600 text-[10px] font-bold uppercase tracking-wide mt-1 border border-orange-200"><Zap size={10} fill="currentColor" /> Pro Account</span>}
                    </div>
                    <button onClick={() => setIsEditingProfile(true)} className="bg-neutral-100 hover:bg-neutral-200 text-neutral-900 px-4 py-2 rounded-full text-sm font-semibold transition-colors">Edit</button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
                <SectionHeader title="Account" />
                <div className="bg-white border-y border-ios-separator/30">
                    <ListItem icon={Mail} color="bg-blue-500" label="Email" value={userProfile.email} />
                    <div className="h-px bg-ios-separator/30 ml-14" />
                    <ListItem icon={Lock} color="bg-slate-500" label="Change Password" onClick={() => alert('Coming soon')} />
                </div>

                <SectionHeader title="Preferences" />
                <div className="bg-white border-y border-ios-separator/30">
                    <ListItem icon={Globe} color="bg-indigo-500" label="Currency" value={userProfile.currency} onClick={() => {}} />
                    <div className="h-px bg-ios-separator/30 ml-14" />
                    <ListItem icon={Percent} color="bg-green-500" label="Default Tax %" value={`${userProfile.hstDefaultPercent}%`} onClick={() => {}} />
                    <div className="h-px bg-ios-separator/30 ml-14" />
                    <ListItem icon={Layers} color="bg-purple-500" label="Manage Categories" onClick={onManageCategories} />
                    <div className="h-px bg-ios-separator/30 ml-14" />
                    <ListItem icon={Moon} color="bg-neutral-700" label="Reduce Motion" hasToggle toggleValue={userProfile.reduceMotion} onToggle={(val: boolean) => onUpdateProfile({...userProfile, reduceMotion: val})} />
                    <div className="h-px bg-ios-separator/30 ml-14" />
                    <ListItem icon={Store} color="bg-orange-500" label="Show Official Brand Logos" hasToggle toggleValue={userProfile.showBrandLogos} onToggle={(val: boolean) => onUpdateProfile({...userProfile, showBrandLogos: val})} />
                </div>

                <SectionHeader title="Camera & Intelligence" />
                <div className="bg-white border-y border-ios-separator/30">
                    <div className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-orange-500"><Sliders size={18} className="text-white" /></div>
                            <span className="text-[16px] font-medium text-neutral-900">OCR Confidence</span>
                            <span className="ml-auto text-neutral-500 text-[15px]">{Math.round(userProfile.ocrThreshold * 100)}%</span>
                        </div>
                        <input type="range" min="0.5" max="0.95" step="0.05" value={userProfile.ocrThreshold} onChange={(e) => onUpdateProfile({...userProfile, ocrThreshold: parseFloat(e.target.value)})} className="w-full accent-ios-blue" />
                        <p className="text-[11px] text-neutral-400 mt-2 pl-11">Higher values reduce false positives but may miss text.</p>
                    </div>
                    <div className="h-px bg-ios-separator/30 ml-14" />
                    <ListItem icon={FileText} color="bg-teal-500" label="Auto-Categorize" hasToggle toggleValue={userProfile.autoCategorize} onToggle={(val: boolean) => onUpdateProfile({...userProfile, autoCategorize: val})} />
                    <div className="h-px bg-ios-separator/30 ml-14" />
                    <ListItem icon={Camera} color="bg-yellow-500" label="Auto-Crop Receipts" hasToggle toggleValue={userProfile.autoCrop} onToggle={(val: boolean) => onUpdateProfile({...userProfile, autoCrop: val})} />
                </div>

                <SectionHeader title="Notifications & Haptics" />
                <div className="bg-white border-y border-ios-separator/30">
                     <ListItem icon={Smartphone} color="bg-pink-500" label="Haptic Feedback" hasToggle toggleValue={userProfile.hapticsEnabled} onToggle={toggleHaptic} />
                    <div className="h-px bg-ios-separator/30 ml-14" />
                    <ListItem icon={Bell} color="bg-red-500" label="Alerts & Summaries" hasToggle toggleValue={userProfile.notifications.ocr} onToggle={(val: boolean) => onUpdateProfile({...userProfile, notifications: {...userProfile.notifications, ocr: val}})} />
                </div>

                <SectionHeader title="Data & Storage" />
                <div className="bg-white border-y border-ios-separator/30">
                    <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-600"><Database size={18} className="text-white" /></div>
                            <div><span className="block text-[16px] font-medium text-neutral-900">Storage Used</span><span className="block text-xs text-neutral-400">{(receipts.length * 0.15).toFixed(1)} MB estimated</span></div>
                        </div>
                        <button onClick={() => alert('Cleared cache')} className="text-ios-blue text-sm font-medium">Clear Cache</button>
                    </div>
                    <div className="h-px bg-ios-separator/30 ml-14" />
                    <ListItem icon={Download} color="bg-emerald-500" label="Export Data" value="CSV, JSON" onClick={() => setShowExportSheet(true)} />
                    <div className="h-px bg-ios-separator/30 ml-14" />
                    <ListItem icon={Trash2} color="bg-red-100" label="Delete All Receipts" isDestructive onClick={() => setShowDeleteConfirm(true)} />
                </div>

                <SectionHeader title="Support" />
                <div className="bg-white border-y border-ios-separator/30 mb-8">
                    <ListItem icon={HelpCircle} color="bg-neutral-500" label="Help & FAQ" onClick={() => {}} />
                    <div className="h-px bg-ios-separator/30 ml-14" />
                    <ListItem icon={Info} color="bg-neutral-400" label="About" value="v1.2.0" />
                </div>

                <div className="px-4 pb-6">
                    <button onClick={onSignOut} className="w-full py-3 rounded-xl bg-neutral-200 text-neutral-900 font-semibold flex items-center justify-center gap-2 active:bg-neutral-300 transition-colors"><LogOut size={18} /> Sign Out</button>
                    <p className="text-center text-neutral-400 text-xs mt-4">Receiptfy Inc. © 2024</p>
                </div>
            </div>

            {isEditingProfile && (
                <div className="absolute inset-0 z-[60] flex items-end justify-center">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={() => setIsEditingProfile(false)} />
                    <div className="bg-ios-bg w-full max-w-md rounded-t-[2rem] shadow-2xl animate-slide-up overflow-hidden relative">
                        <div className="px-6 py-4 border-b border-ios-separator/20 flex justify-between items-center bg-white/80 backdrop-blur">
                            <button onClick={() => setIsEditingProfile(false)} className="text-ios-blue font-medium">Cancel</button>
                            <h3 className="font-semibold text-lg">Edit Profile</h3>
                            <button onClick={handleEditSave} className="text-ios-blue font-bold">Save</button>
                        </div>
                        <div className="p-6 space-y-6 bg-ios-bg pb-12">
                            <div className="flex flex-col items-center gap-3">
                                <div onClick={() => setShowPhotoOptions(true)} className="w-24 h-24 rounded-full bg-neutral-200 border-4 border-white shadow-md flex items-center justify-center overflow-hidden relative group cursor-pointer ios-active">
                                    {editForm.avatar ? <img src={editForm.avatar} className="w-full h-full object-cover" alt="Avatar" /> : <span className="text-2xl font-bold text-neutral-500">{editForm.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}</span>}
                                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Camera size={24} className="text-white" /></div>
                                </div>
                                <button onClick={() => setShowPhotoOptions(true)} className="text-ios-blue text-sm font-semibold">Change Photo</button>
                                <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleFileSelect} />
                            </div>
                            <div className="space-y-4">
                                <div><label className="block text-xs font-semibold text-ios-gray uppercase mb-1">Display Name</label><input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full p-3 rounded-xl border border-neutral-200 bg-white focus:outline-none focus:border-ios-blue" /></div>
                                <div><label className="block text-xs font-semibold text-ios-gray uppercase mb-1">Email Address</label><input type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} className="w-full p-3 rounded-xl border border-neutral-200 bg-white focus:outline-none focus:border-ios-blue" /></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

             {showPhotoOptions && (
                <div className="absolute inset-0 z-[70] flex items-end justify-center">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={() => setShowPhotoOptions(false)} />
                    <div className="w-full max-w-md p-4 animate-slide-up">
                        <div className="bg-white/90 backdrop-blur-md rounded-xl overflow-hidden shadow-lg mb-2">
                            <button onClick={() => fileInputRef.current?.click()} className="w-full p-4 text-center text-ios-blue font-medium text-lg border-b border-neutral-200/50 active:bg-neutral-100 transition-colors">Choose from Library</button>
                            <button onClick={() => { setShowCamera(true); setShowPhotoOptions(false); }} className="w-full p-4 text-center text-ios-blue font-medium text-lg active:bg-neutral-100 transition-colors">Take Headshot</button>
                        </div>
                        <button onClick={() => setShowPhotoOptions(false)} className="w-full p-4 bg-white rounded-xl text-ios-blue font-bold text-lg shadow-lg active:bg-neutral-100 transition-colors">Cancel</button>
                    </div>
                </div>
            )}

            {/* Export Sheet */}
            {showExportSheet && (
                <div className="absolute inset-0 z-[70] flex items-end justify-center">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={() => setShowExportSheet(false)} />
                    <div className="bg-ios-bg w-full max-w-md rounded-t-[2rem] p-6 animate-slide-up shadow-2xl relative">
                        <div className="w-12 h-1.5 bg-neutral-300 rounded-full mx-auto mb-6 opacity-50" />
                        <h3 className="text-xl font-bold text-neutral-900 mb-2">Export Data</h3>
                        <p className="text-neutral-500 mb-6 text-sm">Choose format and range.</p>
                        
                        <div className="space-y-3">
                            <button onClick={() => handleExportCSV('all')} className="w-full p-4 bg-white rounded-xl flex items-center justify-between font-medium text-neutral-900 shadow-sm active:bg-neutral-50">
                                <span>Export CSV (All Time)</span>
                                <Download size={18} className="text-ios-blue" />
                            </button>
                            <button onClick={() => handleExportCSV('month')} className="w-full p-4 bg-white rounded-xl flex items-center justify-between font-medium text-neutral-900 shadow-sm active:bg-neutral-50">
                                <span>Export CSV (This Month)</span>
                                <Download size={18} className="text-ios-blue" />
                            </button>
                             <button onClick={handleExportJSON} className="w-full p-4 bg-white rounded-xl flex items-center justify-between font-medium text-neutral-900 shadow-sm active:bg-neutral-50">
                                <span>Export JSON Backup</span>
                                <Database size={18} className="text-ios-teal" />
                            </button>
                        </div>
                        <button onClick={() => setShowExportSheet(false)} className="w-full mt-6 py-3.5 bg-neutral-200 rounded-xl font-semibold text-neutral-900">Cancel</button>
                    </div>
                </div>
            )}

            {showCamera && <AvatarCameraView onCapture={(img) => { setEditForm(prev => ({ ...prev, avatar: img })); setShowCamera(false); }} onCancel={() => setShowCamera(false)} />}

            {showDeleteConfirm && (
                <div className="absolute inset-0 z-[70] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setShowDeleteConfirm(false)} />
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl relative animate-scale-in text-center">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 size={24} className="text-red-600" /></div>
                        <h3 className="text-xl font-bold text-neutral-900 mb-2">Delete All Receipts?</h3>
                        <p className="text-neutral-500 mb-6 text-sm leading-relaxed">This action cannot be undone. All your receipt images and data will be permanently removed from this device.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-3 rounded-xl font-semibold bg-neutral-100 text-neutral-900 hover:bg-neutral-200">Cancel</button>
                            <button onClick={() => { onDeleteAllData(); setShowDeleteConfirm(false); }} className="flex-1 py-3 rounded-xl font-semibold bg-red-600 text-white hover:bg-red-700">Delete All</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfileAccountView;
