
import React, { useState } from 'react';
import { ArrowRight, Camera, Receipt, ScanLine, Layers, Tag, Lightbulb, Percent, FileText, DollarSign } from 'lucide-react';

interface OnboardingWalkthroughViewProps {
  onComplete: () => void;
}

interface Slide {
  id: number | string;
  title: string;
  subtitle: string;
  color: string;
  illustration: React.ReactNode;
  footnote?: string;
}

const OnboardingWalkthroughView: React.FC<OnboardingWalkthroughViewProps> = ({ onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const slides: Slide[] = [
    {
      id: 1,
      title: "Welcome to Receiptfy",
      subtitle: "Snap, auto-scan, and track your spend—without the spreadsheet.",
      color: "bg-blue-100 text-ios-blue",
      illustration: (
        <div className="relative w-64 h-64">
          <div className="absolute inset-0 bg-blue-50 rounded-full animate-scale-in opacity-50"></div>
          <div className="absolute inset-4 bg-white rounded-2xl shadow-lg flex items-center justify-center border border-blue-100 animate-slide-up">
             <Camera size={80} className="text-ios-blue" strokeWidth={1.5} />
             <div className="absolute -bottom-6 -right-6 bg-white p-4 rounded-xl shadow-md border border-neutral-100">
                <Receipt size={40} className="text-ios-teal" />
             </div>
          </div>
        </div>
      )
    },
    {
      id: 2,
      title: "Capture and Extract",
      subtitle: "Take a photo. OCR auto-fills store, date, total, and tax.",
      color: "bg-teal-100 text-ios-teal",
      illustration: (
        <div className="relative w-64 h-64">
          <div className="absolute inset-0 bg-teal-50 rounded-full animate-scale-in opacity-50" style={{animationDelay: '100ms'}}></div>
          <div className="absolute inset-8 bg-neutral-900 rounded-[2rem] shadow-xl flex items-center justify-center overflow-hidden border-4 border-neutral-800 animate-slide-up">
             <div className="absolute inset-x-0 top-1/4 h-0.5 bg-ios-teal/80 shadow-[0_0_15px_rgba(48,176,199,0.8)] animate-pulse z-10"></div>
             <div className="flex flex-col items-center gap-2 opacity-80">
                <ScanLine size={48} className="text-white" />
                <div className="flex flex-col gap-1 w-24">
                   <div className="h-2 bg-neutral-700 rounded w-full"></div>
                   <div className="h-2 bg-neutral-700 rounded w-3/4"></div>
                </div>
             </div>
          </div>
        </div>
      )
    },
    {
      id: 'tax-ready',
      title: "Tax‑ready & Discounts",
      subtitle: "Applies Canadian HST defaults (13%) and captures line‑item discounts. Export clean CSV for tax returns.",
      color: "bg-emerald-100 text-emerald-600",
      illustration: (
        <div className="relative w-64 h-64">
           <div className="absolute inset-0 bg-emerald-50 rounded-full animate-scale-in opacity-50" style={{animationDelay: '200ms'}}></div>
           <div className="absolute inset-0 flex items-center justify-center animate-slide-up">
               {/* CSV Doc */}
               <div className="absolute -right-2 -top-4 bg-white p-3 rounded-xl shadow-sm border border-blue-100 transform rotate-12 z-10">
                    <FileText size={32} className="text-blue-500" />
               </div>
               
               {/* Main Receipt */}
               <div className="relative bg-white px-5 py-6 rounded-2xl shadow-xl border border-emerald-100 z-20 flex flex-col items-center gap-2">
                    <Receipt size={48} className="text-neutral-700" strokeWidth={1.5} />
                    <div className="w-12 h-2 bg-neutral-100 rounded-full"/>
                    <div className="w-8 h-2 bg-neutral-100 rounded-full"/>
                    
                    {/* Percent Badge */}
                    <div className="absolute -bottom-3 -right-3 bg-emerald-500 text-white p-2 rounded-full border-4 border-white shadow-sm">
                        <Percent size={16} strokeWidth={3} />
                    </div>
               </div>
    
               {/* Dollar Coin */}
               <div className="absolute -left-4 bottom-8 bg-amber-100 p-2.5 rounded-full border-4 border-white shadow-md z-30">
                    <DollarSign size={24} className="text-amber-600" />
               </div>
           </div>
        </div>
      )
    },
    {
      id: 3,
      title: "Organize Effortlessly",
      subtitle: "Smart suggestions for categories. Search everything later.",
      color: "bg-indigo-100 text-indigo-600",
      illustration: (
        <div className="relative w-64 h-64">
           <div className="absolute inset-0 bg-indigo-50 rounded-full animate-scale-in opacity-50" style={{animationDelay: '200ms'}}></div>
           <div className="absolute inset-0 flex items-center justify-center animate-slide-up">
              <div className="bg-white p-4 rounded-2xl shadow-lg border border-indigo-50 transform -rotate-6 translate-y-4 z-10">
                  <div className="flex items-center gap-2 text-indigo-600 font-semibold">
                      <Layers size={24} />
                      <span>Groceries</span>
                  </div>
              </div>
              <div className="absolute bg-white p-4 rounded-2xl shadow-md border border-teal-50 transform rotate-6 -translate-y-4">
                  <div className="flex items-center gap-2 text-ios-teal font-semibold">
                      <Tag size={24} />
                      <span>Electronics</span>
                  </div>
              </div>
           </div>
        </div>
      )
    },
    {
      id: 4,
      title: "See Where Money Goes",
      subtitle: "Weekly/monthly insights and tips to help you save.",
      color: "bg-orange-100 text-orange-600",
      illustration: (
        <div className="relative w-64 h-64">
           <div className="absolute inset-0 bg-orange-50 rounded-full animate-scale-in opacity-50" style={{animationDelay: '300ms'}}></div>
           <div className="absolute inset-4 bg-white rounded-xl shadow-lg border border-neutral-100 flex flex-col p-4 animate-slide-up">
               <div className="flex justify-between items-end h-32 gap-3 mb-4">
                   <div className="w-full bg-neutral-100 rounded-t-md h-[40%]"></div>
                   <div className="w-full bg-orange-200 rounded-t-md h-[70%]"></div>
                   <div className="w-full bg-ios-blue rounded-t-md h-[50%]"></div>
                   <div className="w-full bg-ios-teal rounded-t-md h-[90%]"></div>
               </div>
               <div className="flex items-center gap-2 text-orange-500 font-medium text-sm bg-orange-50 p-2 rounded-lg">
                   <Lightbulb size={16} />
                   <span>Try setting a budget!</span>
               </div>
           </div>
        </div>
      )
    }
  ];

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      if (navigator.vibrate) navigator.vibrate(10);
      setCurrentIndex(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    if (navigator.vibrate) navigator.vibrate(20);
    onComplete();
  };

  return (
    <div className="absolute inset-0 bg-ios-bg z-[100] flex flex-col">
      {/* Top Bar */}
      <div className="flex justify-end p-6 pt-12">
        <button 
          onClick={handleComplete}
          className="text-ios-blue font-medium text-base hover:opacity-70 transition-opacity"
        >
          Skip
        </button>
      </div>

      {/* Carousel */}
      <div className="flex-1 relative overflow-hidden">
        <div 
            className="absolute inset-0 flex transition-transform duration-500 cubic-bezier(0.2, 0.8, 0.2, 1) motion-reduce:transition-opacity"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
            {slides.map((slide) => (
                <div key={slide.id} className="w-full h-full flex-shrink-0 flex flex-col items-center justify-center px-8 pb-20">
                    <div className="mb-10">
                        {slide.illustration}
                    </div>
                    <h2 className="text-3xl font-bold text-neutral-900 text-center mb-3 tracking-tight animate-fade-in">
                        {slide.title}
                    </h2>
                    <p className="text-lg text-neutral-500 text-center leading-relaxed max-w-sm animate-fade-in" style={{animationDelay: '100ms'}}>
                        {slide.subtitle}
                    </p>
                    
                    {slide.footnote && (
                        <p className="text-[11px] text-neutral-400 font-medium mt-6 animate-fade-in text-center px-4">
                            {slide.footnote}
                        </p>
                    )}
                </div>
            ))}
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="p-8 pb-12 bg-ios-bg/90 backdrop-blur-sm">
        <div className="flex items-center justify-between">
            {/* Dots */}
            <div className="flex gap-2">
                {slides.map((_, idx) => (
                    <div 
                        key={idx}
                        className={`h-2 rounded-full transition-all duration-300 ${
                            idx === currentIndex ? 'w-6 bg-ios-blue' : 'w-2 bg-neutral-300'
                        }`}
                    />
                ))}
            </div>

            {/* Button */}
            <button 
                onClick={handleNext}
                className="bg-ios-blue text-white px-6 py-3 rounded-full font-semibold flex items-center gap-2 shadow-lg shadow-blue-500/30 active:scale-95 transition-all"
            >
                {currentIndex === slides.length - 1 ? (
                    <span>Get Started</span>
                ) : (
                    <ArrowRight size={24} />
                )}
            </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWalkthroughView;
