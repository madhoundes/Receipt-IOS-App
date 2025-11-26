
import React, { useState, useEffect } from 'react';
import { HashRouter as Router } from 'react-router-dom';
import { Receipt, AppRoute, UserProfile, CategoryDefinition } from './types';
import { MOCK_RECEIPTS, DEFAULT_USER_PROFILE, DEFAULT_CATEGORIES } from './constants';
import { Clock, Grid, Camera, BarChart3, User } from 'lucide-react';
import CameraCaptureView from './components/CameraCaptureView';
import ReceiptDetailView from './components/ReceiptDetailView';
import ReceiptsHistoryView from './components/ReceiptsHistoryView';
import CategoriesOverviewView from './components/CategoriesOverviewView';
import CategoryDetailView from './components/CategoryDetailView';
import SpendInsightsView from './components/SpendInsightsView';
import OnboardingWalkthroughView from './components/OnboardingWalkthroughView';
import SignUpView from './components/SignUpView';
import LoginView from './components/LoginView';
import ProfileAccountView from './components/ProfileAccountView';
import ManageCategoriesView from './components/ManageCategoriesView';

// Haptic Helper
const triggerHaptic = (style: 'light' | 'medium' | 'heavy' | 'success' | 'error') => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    switch (style) {
      case 'light': navigator.vibrate(10); break;
      case 'medium': navigator.vibrate(15); break;
      case 'heavy': navigator.vibrate(20); break;
      case 'success': navigator.vibrate([10, 30, 10]); break;
      case 'error': navigator.vibrate([50, 30, 50, 30, 50]); break;
    }
  }
};

// Testing toggle to force onboarding flow on refresh
const TESTING_MODE = true;

function AppContent() {
  // App State
  const [receipts, setReceipts] = useState<Receipt[]>(MOCK_RECEIPTS);
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE);
  const [categories, setCategories] = useState<CategoryDefinition[]>(DEFAULT_CATEGORIES);
  
  // Navigation State
  const [activeTab, setActiveTab] = useState<'history' | 'categories' | 'insights' | 'profile'>('history');
  const [currentScreen, setCurrentScreen] = useState<AppRoute | null>(null);
  
  // Selection State
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Initialization Logic
  useEffect(() => {
    if (TESTING_MODE) {
      // Testing Mode: Always start at Onboarding, clear persistence
      localStorage.removeItem('receiptfy_onboarded');
      localStorage.removeItem('receiptfy_account');
      setCurrentScreen(AppRoute.ONBOARDING);
      return;
    }

    const hasOnboarded = localStorage.getItem('receiptfy_onboarded');
    const hasAccount = localStorage.getItem('receiptfy_account');

    if (!hasOnboarded) {
        setCurrentScreen(AppRoute.ONBOARDING);
    } else if (!hasAccount) {
        // Default to Login for returning users, user can switch to SignUp
        setCurrentScreen(AppRoute.LOGIN);
    }
  }, []);

  // --- Handlers ---

  const handleCapture = (newReceiptData: Omit<Receipt, 'id'>) => {
    const newReceipt: Receipt = {
      ...newReceiptData,
      id: Date.now().toString(),
    };
    setReceipts([newReceipt, ...receipts]);
    triggerHaptic('success');
    
    // Open the new receipt in detail view
    setSelectedReceipt(newReceipt);
    setCurrentScreen(AppRoute.DETAILS);
  };

  const handleUpdateReceipt = (updated: Receipt) => {
    setReceipts(receipts.map(r => r.id === updated.id ? updated : r));
    setSelectedReceipt(updated);
    triggerHaptic('success');
  };

  const handleDeleteReceipt = (id: string) => {
    triggerHaptic('medium');
    setReceipts(receipts.filter(r => r.id !== id));
    setSelectedReceipt(null);
    if (currentScreen === AppRoute.DETAILS) {
       setCurrentScreen(null); 
    }
  };

  // Profile Handlers
  const handleUpdateProfile = (updatedProfile: UserProfile) => {
      setUserProfile(updatedProfile);
  };

  const handleSignOut = () => {
      triggerHaptic('medium');
      // Reset state
      setReceipts([]);
      setUserProfile(DEFAULT_USER_PROFILE);
      localStorage.removeItem('receiptfy_account');
      setCurrentScreen(AppRoute.LOGIN);
  };

  const handleDeleteAllData = () => {
      triggerHaptic('error');
      setReceipts([]);
  };

  // Category Handlers
  const handleMergeCategories = (sourceId: string, targetId: string) => {
      const sourceCat = categories.find(c => c.id === sourceId);
      const targetCat = categories.find(c => c.id === targetId);
      if (!sourceCat || !targetCat) return;

      // 1. Move receipts
      const updatedReceipts = receipts.map(r => {
          if (r.category === sourceCat.name) {
              return { ...r, category: targetCat.name };
          }
          return r;
      });
      setReceipts(updatedReceipts);

      // 2. Archive Source Category
      const updatedCategories = categories.map(c => 
          c.id === sourceId ? { ...c, visibility: 'archived' as const } : c
      );
      setCategories(updatedCategories);
      triggerHaptic('success');
  };

  const handleManageCategories = () => {
      setCurrentScreen(AppRoute.MANAGE_CATEGORIES);
  };

  // Tab Navigation with Haptic
  const handleTabChange = (tab: 'history' | 'categories' | 'insights' | 'profile') => {
    if (activeTab !== tab) {
        triggerHaptic('light');
        setActiveTab(tab);
    }
  };

  // Auth / Onboarding Handlers
  const handleOnboardingComplete = () => {
    if (!TESTING_MODE) {
      localStorage.setItem('receiptfy_onboarded', 'true');
    }
    setCurrentScreen(AppRoute.LOGIN);
  };

  const handleAuthComplete = () => {
    if (!TESTING_MODE) {
      localStorage.setItem('receiptfy_account', 'true');
    }
    setCurrentScreen(null); // Go to main app
    triggerHaptic('success');
  };

  // --- Routing / Rendering ---

  const renderMainContent = () => {
    // 1. Full Screen Flows
    if (currentScreen === AppRoute.ONBOARDING) {
        return <OnboardingWalkthroughView onComplete={handleOnboardingComplete} />;
    }
    if (currentScreen === AppRoute.SIGNUP) {
        return (
            <SignUpView 
                onSignUp={handleAuthComplete} 
                onNavigateToLogin={() => {
                    triggerHaptic('light');
                    setCurrentScreen(AppRoute.LOGIN);
                }}
            />
        );
    }
    if (currentScreen === AppRoute.LOGIN) {
        return (
            <LoginView 
                onLogin={handleAuthComplete} 
                onGuest={handleAuthComplete}
                onNavigateToSignup={() => {
                    triggerHaptic('light');
                    setCurrentScreen(AppRoute.SIGNUP);
                }}
            />
        );
    }

    // 2. Overlays (Camera)
    if (currentScreen === AppRoute.CAMERA) {
        return (
            <div className="absolute inset-0 z-50 bg-black animate-fade-in">
                <CameraCaptureView 
                    onCancel={() => setCurrentScreen(null)}
                    onCapture={handleCapture}
                />
            </div>
        );
    }

    // 3. Category Management
    if (currentScreen === AppRoute.MANAGE_CATEGORIES) {
        return (
            <div className="absolute inset-0 z-40 bg-ios-bg animate-slide-in-right shadow-2xl">
                <ManageCategoriesView 
                    categories={categories}
                    receipts={receipts}
                    onBack={() => setCurrentScreen(null)}
                    onUpdateCategories={setCategories}
                    onMergeCategories={handleMergeCategories}
                />
            </div>
        );
    }

    // 4. Detail Views (Stacked on top of tabs with Slide Transition)
    if (currentScreen === AppRoute.DETAILS) {
        return (
             <div className="absolute inset-0 z-40 bg-ios-bg animate-slide-in-right shadow-2xl">
                <ReceiptDetailView 
                    receipt={selectedReceipt}
                    onBack={() => {
                        triggerHaptic('light');
                        setCurrentScreen(null);
                    }}
                    onUpdate={handleUpdateReceipt}
                    onDelete={handleDeleteReceipt}
                />
            </div>
        );
    }

    if (currentScreen === AppRoute.CATEGORY_DETAILS && selectedCategory) {
         return (
             <div className="absolute inset-0 z-40 bg-ios-bg animate-slide-in-right shadow-2xl">
                <CategoryDetailView
                    category={selectedCategory}
                    receipts={receipts}
                    onBack={() => {
                        triggerHaptic('light');
                        setCurrentScreen(null);
                    }}
                    onSelectReceipt={(receipt) => {
                        setSelectedReceipt(receipt);
                        setCurrentScreen(AppRoute.DETAILS);
                    }}
                />
            </div>
        );
    }

    // 5. Tab Content (Fade transition between tabs)
    return (
        <div key={activeTab} className="w-full h-full animate-fade-in">
            {activeTab === 'history' && (
                <ReceiptsHistoryView 
                    receipts={receipts}
                    onSelectReceipt={(receipt) => {
                        setSelectedReceipt(receipt);
                        setCurrentScreen(AppRoute.DETAILS);
                    }}
                    onLaunchCamera={() => setCurrentScreen(AppRoute.CAMERA)}
                    showBrandLogos={userProfile.showBrandLogos}
                />
            )}
            {activeTab === 'categories' && (
                <CategoriesOverviewView 
                    receipts={receipts}
                    onSelectCategory={(category) => {
                        setSelectedCategory(category);
                        setCurrentScreen(AppRoute.CATEGORY_DETAILS);
                    }}
                />
            )}
            {activeTab === 'insights' && (
                <SpendInsightsView
                    receipts={receipts}
                    onOpenCategory={(category) => {
                        setSelectedCategory(category);
                        setCurrentScreen(AppRoute.CATEGORY_DETAILS);
                    }}
                />
            )}
             {activeTab === 'profile' && (
                <ProfileAccountView 
                    userProfile={userProfile}
                    onUpdateProfile={handleUpdateProfile}
                    onSignOut={handleSignOut}
                    onDeleteAllData={handleDeleteAllData}
                    onExportData={(format) => alert(`Exporting as ${format}...`)}
                    onManageCategories={handleManageCategories}
                    receipts={receipts}
                />
            )}
        </div>
    );
  };

  // Helper to check if we should show navigation
  const showNavigation = 
    currentScreen !== AppRoute.CAMERA && 
    currentScreen !== AppRoute.DETAILS && 
    currentScreen !== AppRoute.CATEGORY_DETAILS &&
    currentScreen !== AppRoute.ONBOARDING &&
    currentScreen !== AppRoute.SIGNUP &&
    currentScreen !== AppRoute.LOGIN &&
    currentScreen !== AppRoute.MANAGE_CATEGORIES;

  return (
    // Mobile Container
    <div className="flex justify-center min-h-screen bg-neutral-100 font-sans text-neutral-900">
      <div className="w-full max-w-md bg-ios-bg shadow-2xl overflow-hidden relative min-h-[100dvh] flex flex-col">
        
        {/* Main Screen Area */}
        <div className="flex-1 relative overflow-hidden">
            {renderMainContent()}
        </div>

        {/* Bottom Tab Bar */}
        {showNavigation && (
            <div className="bg-ios-card border-t border-ios-separator/30 flex justify-around items-center pb-8 pt-3 px-2 z-30 transition-all duration-300">
                <button 
                    onClick={() => handleTabChange('history')}
                    className={`flex flex-col items-center gap-1 w-16 transition-all duration-200 active:scale-90 ${activeTab === 'history' ? 'text-ios-blue' : 'text-neutral-400'}`}
                >
                    <Clock size={24} className={activeTab === 'history' ? 'fill-current opacity-20' : ''} />
                    <span className="text-[10px] font-medium">History</span>
                </button>

                <button 
                    onClick={() => handleTabChange('categories')}
                    className={`flex flex-col items-center gap-1 w-16 transition-all duration-200 active:scale-90 ${activeTab === 'categories' ? 'text-ios-blue' : 'text-neutral-400'}`}
                >
                    <Grid size={24} className={activeTab === 'categories' ? 'fill-current opacity-20' : ''} />
                    <span className="text-[10px] font-medium">Categories</span>
                </button>

                 <button 
                    onClick={() => handleTabChange('insights')}
                    className={`flex flex-col items-center gap-1 w-16 transition-all duration-200 active:scale-90 ${activeTab === 'insights' ? 'text-ios-blue' : 'text-neutral-400'}`}
                >
                    <BarChart3 size={24} className={activeTab === 'insights' ? 'fill-current opacity-20' : ''} />
                    <span className="text-[10px] font-medium">Insights</span>
                </button>

                <button 
                    onClick={() => handleTabChange('profile')}
                    className={`flex flex-col items-center gap-1 w-16 transition-all duration-200 active:scale-90 ${activeTab === 'profile' ? 'text-ios-blue' : 'text-neutral-400'}`}
                >
                    <User size={24} className={activeTab === 'profile' ? 'fill-current opacity-20' : ''} />
                    <span className="text-[10px] font-medium">Profile</span>
                </button>
            </div>
        )}
         
         {/* Floating Camera Button - Only show on non-profile, non-detail screens for easier access, but typically FABs are hidden in settings */}
         {showNavigation && activeTab !== 'profile' && (
             <div className="absolute bottom-[85px] right-6 z-50 animate-scale-in">
                 <button 
                    onClick={() => {
                        triggerHaptic('medium');
                        setCurrentScreen(AppRoute.CAMERA);
                    }}
                    className="w-14 h-14 bg-ios-blue rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-500/30 active:scale-90 transition-transform duration-200"
                >
                    <Camera size={28} strokeWidth={2.5} />
                </button>
             </div>
         )}

      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
