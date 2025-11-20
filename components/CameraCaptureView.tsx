import React, { useRef, useState, useEffect } from 'react';
import { X, Zap, Image as ImageIcon, RotateCcw, ArrowRight, Loader2, Check, Calendar, DollarSign, Tag, ChevronDown, AlertTriangle, Lightbulb, FileText, Info, Volume2, VolumeX } from 'lucide-react';
import { Receipt } from '../types';
import { GoogleGenAI, Type } from "@google/genai";
import CategoryPickerView, { CategorySuggestion } from './CategoryPickerView';

interface CameraCaptureViewProps {
  onCancel: () => void;
  onCapture: (receipt: Omit<Receipt, 'id'>) => void;
}

type ViewState = 'camera' | 'processing' | 'error' | 'review';

interface ValidationError {
    title: string;
    message: string;
    reason: 'quality' | 'parsing' | 'confidence';
}

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

const CameraCaptureView: React.FC<CameraCaptureViewProps> = ({ onCancel, onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Core State
  const [viewState, setViewState] = useState<ViewState>('camera');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [flashActive, setFlashActive] = useState(false);
  
  // Sound State
  const [soundEnabled, setSoundEnabled] = useState(true);
  const lastShutterTime = useRef(0);

  // Error & Validation State
  const [validationError, setValidationError] = useState<ValidationError | null>(null);
  const [showTips, setShowTips] = useState(false);
  const [parsingConfidence, setParsingConfidence] = useState<number>(1.0);

  // Form / Data State
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [categorySuggestions, setCategorySuggestions] = useState<CategorySuggestion[]>([]);
  const [parsedData, setParsedData] = useState<Omit<Receipt, 'id' | 'imageName'>>({
    storeName: "",
    purchaseDate: new Date(),
    totalAmount: 0,
    category: "Other",
    subcategory: undefined,
    notes: "",
    hstAmount: 0,
    hstPercent: 0,
    rawText: ""
  });

  // ----------------------------------------------------------------
  // Camera Management
  // ----------------------------------------------------------------
  useEffect(() => {
    if (viewState === 'camera') {
        startCamera();
    } else {
        stopCamera();
    }
    return () => stopCamera();
  }, [viewState]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setValidationError({
          title: "Camera Error",
          message: "Could not access camera. Please check permissions.",
          reason: 'quality'
      });
      setViewState('error');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  // ----------------------------------------------------------------
  // Audio / Sound FX
  // ----------------------------------------------------------------
  const playShutterSound = () => {
    if (!soundEnabled) return;
    
    // Debounce
    const now = Date.now();
    if (now - lastShutterTime.current < 400) return;
    lastShutterTime.current = now;

    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        
        const ctx = new AudioContext();
        const t = ctx.currentTime;

        // Master Gain for subtle volume control
        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(0.6, t);
        masterGain.connect(ctx.destination);

        // Shared Noise Buffer (100ms)
        const bufferSize = ctx.sampleRate * 0.1;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1; // White noise
        }

        // PART 1: The "Snap" (High-frequency shutter open) - t=0
        const snapSource = ctx.createBufferSource();
        snapSource.buffer = buffer;

        const snapFilter = ctx.createBiquadFilter();
        snapFilter.type = 'highpass';
        snapFilter.frequency.setValueAtTime(2000, t); // Crisp high end
        snapFilter.Q.value = 0.5;

        const snapGain = ctx.createGain();
        snapGain.gain.setValueAtTime(0, t);
        snapGain.gain.linearRampToValueAtTime(1, t + 0.002); // Fast attack
        snapGain.gain.exponentialRampToValueAtTime(0.01, t + 0.04); // Fast decay

        snapSource.connect(snapFilter);
        snapFilter.connect(snapGain);
        snapGain.connect(masterGain);
        snapSource.start(t);

        // PART 2: The "Body" (Mechanical resonance/weight) - t=0
        const bodyOsc = ctx.createOscillator();
        bodyOsc.type = 'triangle';
        bodyOsc.frequency.setValueAtTime(300, t);
        bodyOsc.frequency.exponentialRampToValueAtTime(50, t + 0.08); // Pitch drop

        const bodyGain = ctx.createGain();
        bodyGain.gain.setValueAtTime(0, t);
        bodyGain.gain.linearRampToValueAtTime(0.5, t + 0.005);
        bodyGain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);

        bodyOsc.connect(bodyGain);
        bodyGain.connect(masterGain);
        bodyOsc.start(t);

        // PART 3: The "Clack" (Shutter close/Mirror return) - t=60ms
        const t2 = t + 0.06;
        const clackSource = ctx.createBufferSource();
        clackSource.buffer = buffer;

        const clackFilter = ctx.createBiquadFilter();
        clackFilter.type = 'lowpass';
        clackFilter.frequency.setValueAtTime(1200, t2); // Duller sound

        const clackGain = ctx.createGain();
        clackGain.gain.setValueAtTime(0, t2);
        clackGain.gain.linearRampToValueAtTime(0.7, t2 + 0.005);
        clackGain.gain.exponentialRampToValueAtTime(0.01, t2 + 0.06);

        clackSource.connect(clackFilter);
        clackFilter.connect(clackGain);
        clackGain.connect(masterGain);
        clackSource.start(t2);

    } catch (e) {
        console.warn("Shutter sound failed:", e);
    }
  };

  // ----------------------------------------------------------------
  // Pre-OCR Validation (Heuristics)
  // ----------------------------------------------------------------
  const checkImageQuality = (ctx: CanvasRenderingContext2D, width: number, height: number): { valid: boolean; reason?: string } => {
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      let totalBrightness = 0;
      
      // Check brightness (simple average of R, G, B)
      for (let i = 0; i < data.length; i += 16) { // Sample every 4th pixel for speed
          totalBrightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
      }
      const avgBrightness = totalBrightness / (data.length / 16);
      
      if (avgBrightness < 25) return { valid: false, reason: "Image is too dark." };
      if (avgBrightness > 240) return { valid: false, reason: "Image is overexposed." };

      return { valid: true };
  };

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const context = canvas.getContext('2d');
    if (context) {
        // 1. Draw image
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // 2. Pre-validate
        const qualityCheck = checkImageQuality(context, canvas.width, canvas.height);
        
        // Flash Effect & Feedback
        setFlashActive(true);
        triggerHaptic('medium'); // Shutter feel
        playShutterSound(); // Audible feedback
        
        setTimeout(() => {
            setFlashActive(false);
            
            const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
            setCapturedImage(imageDataUrl);

            if (!qualityCheck.valid) {
                triggerHaptic('error');
                setValidationError({
                    title: "Poor Image Quality",
                    message: qualityCheck.reason || "Try to improve lighting.",
                    reason: 'quality'
                });
                setViewState('error');
            } else {
                // Proceed to OCR
                processReceiptImage(imageDataUrl);
            }
        }, 150);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const imgData = reader.result as string;
        setCapturedImage(imgData);
        processReceiptImage(imgData); // Skip quality check for uploads, assume user intent
      };
      reader.readAsDataURL(file);
    }
  };

  // ----------------------------------------------------------------
  // Post-OCR Validation
  // ----------------------------------------------------------------
  const validateReceiptData = (data: any) => {
    let confidence = 0.0;
    const warnings: string[] = [];

    // 1. Total Amount (Critical) - Weight: 0.5
    if (typeof data.totalAmount === 'number' && data.totalAmount > 0) {
        confidence += 0.5;
    } else {
        warnings.push("No total amount detected");
    }

    // 2. Store Name - Weight: 0.25
    if (data.storeName && 
        typeof data.storeName === 'string' && 
        data.storeName.trim().length > 1 && 
        !/^unknown(\s+store)?$/i.test(data.storeName.trim())) {
        confidence += 0.25;
    } else {
        warnings.push("Store name unclear");
    }

    // 3. Date - Weight: 0.15
    if (data.purchaseDate) {
         const d = new Date(data.purchaseDate);
         const now = new Date();
         // Valid date check: Not NaN, Year > 2000, Not too far in future
         if (!isNaN(d.getTime()) && d.getFullYear() >= 2000 && d.getFullYear() <= now.getFullYear() + 1) {
             confidence += 0.15;
         } else {
             warnings.push("Date invalid");
         }
    } else {
        warnings.push("No date found");
    }

    // 4. Tax/Metadata - Weight: 0.1
    if ((typeof data.hstAmount === 'number' && data.hstAmount > 0) || 
        (typeof data.hstPercent === 'number' && data.hstPercent > 0)) {
        confidence += 0.1;
    }

    // Threshold Logic
    // Must meet minimum confidence (0.5) to be considered a valid receipt scan
    const isValid = confidence >= 0.5; 
    
    let reason: string | undefined;
    if (!isValid) {
        if (confidence === 0) reason = "No readable text found.";
        else if (!data.totalAmount && confidence < 0.5) reason = "No total amount detected.";
        else reason = "Data incomplete or unclear.";
    }

    return { valid: isValid, confidence, warnings, reason };
  };

  // ----------------------------------------------------------------
  // OCR Processing
  // ----------------------------------------------------------------
  const classifyReceipt = (storeName: string, rawText: string): { suggestions: CategorySuggestion[], bestGuess: CategorySuggestion } => {
    const text = (rawText + " " + storeName).toLowerCase();
    const suggestions: CategorySuggestion[] = [];
    const addSugg = (cat: string, sub: string | undefined, reason: string, conf: 'high' | 'medium' | 'low') => {
        if (!suggestions.find(s => s.category === cat)) {
            suggestions.push({ category: cat, subcategory: sub, reason, confidence: conf });
        }
    };

    if (/starbucks|mcdonald|tim hortons|subway|burger/.test(text)) addSugg("Restaurant", "Fast Food", "Merchant match", "high");
    if (/shell|esso|petro|fuel/.test(text)) addSugg("Gas/Fuel", "Gasoline", "Merchant match", "high");
    if (/walmart|costco|no frills|loblaws|metro/.test(text)) addSugg("Groceries", "Food Retail", "Merchant match", "high");
    if (/uber|lyft|taxi/.test(text)) addSugg("Transport", "Rideshare", "Merchant match", "high");
    
    if (suggestions.length === 0) addSugg("Other", "General", "Default", "low");
    
    return { suggestions: suggestions.slice(0, 3), bestGuess: suggestions[0] };
  };

  const processReceiptImage = async (imageData: string) => {
    setViewState('processing');
    
    try {
      const apiKey = process.env.API_KEY;
      
      // --- Mock Implementation for Preview ---
      if (!apiKey) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        // Simulate analysis
        const mockData = {
             storeName: "Mock Store",
             totalAmount: 14.99,
             purchaseDate: new Date().toISOString(),
             notes: "Mock receipt data"
        };
        
        const validation = validateReceiptData(mockData);
        setParsingConfidence(validation.confidence);
        
        setParsedData({
            storeName: mockData.storeName,
            purchaseDate: new Date(mockData.purchaseDate),
            totalAmount: mockData.totalAmount,
            category: "Other",
            subcategory: undefined,
            hstAmount: 0,
            hstPercent: 0,
            notes: mockData.notes,
            rawText: mockData.notes
        });
        setViewState('review');
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      const base64Data = imageData.split(',')[1];
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
            { text: `Analyze this receipt. Extract: storeName, totalAmount, purchaseDate (ISO), hstAmount, hstPercent, notes. If not a receipt, return null.` }
          ]
        },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    storeName: { type: Type.STRING, nullable: true },
                    totalAmount: { type: Type.NUMBER, nullable: true },
                    purchaseDate: { type: Type.STRING, nullable: true },
                    hstAmount: { type: Type.NUMBER, nullable: true },
                    hstPercent: { type: Type.NUMBER, nullable: true },
                    notes: { type: Type.STRING, nullable: true }
                }
            }
        }
      });

      if (response.text) {
        const data = JSON.parse(response.text);
        
        // Validate Logic
        const validation = validateReceiptData(data);
        setParsingConfidence(validation.confidence);

        if (!validation.valid) {
            triggerHaptic('error');
            setValidationError({
                title: "Analysis Failed",
                message: validation.reason || "We couldn't find a total or date. Is this a receipt?",
                reason: 'parsing'
            });
            setViewState('error');
            return;
        }

        const rawText = data.notes || "";
        const { suggestions, bestGuess } = classifyReceipt(data.storeName || "", rawText);

        setParsedData({
            storeName: data.storeName || "",
            purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : new Date(),
            totalAmount: data.totalAmount || 0,
            category: bestGuess.category,
            subcategory: bestGuess.subcategory,
            notes: rawText,
            rawText: rawText,
            hstAmount: data.hstAmount || 0,
            hstPercent: data.hstPercent || 0
        });
        setCategorySuggestions(suggestions);
        triggerHaptic('success');
        setViewState('review');
      } else {
         throw new Error("Empty response");
      }

    } catch (err) {
      console.error("OCR Error:", err);
      triggerHaptic('error');
      setValidationError({
          title: "Scan Failed",
          message: "Could not analyze the image. Please try again.",
          reason: 'parsing'
      });
      setViewState('error');
    }
  };

  // ----------------------------------------------------------------
  // Actions
  // ----------------------------------------------------------------
  const handleRetake = () => {
    setCapturedImage(null);
    setValidationError(null);
    setViewState('camera');
  };

  const handleManualEntry = () => {
      // Reset data for manual entry
      setParsedData({
          storeName: "",
          purchaseDate: new Date(),
          totalAmount: 0,
          category: "Other",
          subcategory: undefined,
          notes: "",
          hstAmount: 0,
          hstPercent: 0,
          rawText: ""
      });
      // Use a placeholder flag for the image
      setCapturedImage('manual_placeholder'); 
      setViewState('review');
  };

  const handleConfirmReceipt = () => {
    if (capturedImage) {
        onCapture({
            imageName: capturedImage,
            ...parsedData
        });
    }
  };

  // ----------------------------------------------------------------
  // SUB-VIEWS
  // ----------------------------------------------------------------

  // 1. ERROR VIEW
  if (viewState === 'error') {
      return (
          <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center p-6 animate-fade-in">
              <div className="bg-ios-card w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl animate-scale-in">
                  <div className="bg-neutral-100 p-6 flex justify-center items-center">
                     <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm">
                        <AlertTriangle size={40} className="text-orange-500" />
                     </div>
                  </div>
                  <div className="p-6 text-center">
                      <h2 className="text-xl font-bold text-neutral-900 mb-2">{validationError?.title || "Capture Failed"}</h2>
                      <p className="text-neutral-500 mb-6 leading-relaxed">{validationError?.message}</p>
                      
                      <div className="space-y-3">
                          <button 
                            onClick={handleRetake}
                            className="w-full bg-ios-blue text-white font-semibold py-3.5 rounded-xl ios-btn-press shadow-md flex items-center justify-center gap-2"
                          >
                              <RotateCcw size={18} /> Retake Photo
                          </button>
                          <button 
                            onClick={handleManualEntry}
                            className="w-full bg-neutral-100 text-neutral-900 font-semibold py-3.5 rounded-xl ios-active border border-neutral-200 flex items-center justify-center gap-2"
                          >
                              <FileText size={18} /> Enter Manually
                          </button>
                      </div>
                      
                      <button 
                        onClick={() => setShowTips(true)}
                        className="mt-6 text-ios-blue text-sm font-medium flex items-center justify-center gap-1"
                      >
                          <Lightbulb size={14} /> View Tips for Better Scanning
                      </button>
                  </div>
              </div>
              
              {/* Background Cancel */}
              <button 
                onClick={onCancel} 
                className="mt-12 text-white/70 font-medium hover:text-white transition-colors"
              >
                Cancel
              </button>

              {/* Tips Overlay */}
              {showTips && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-md z-[60] flex flex-col justify-end">
                      <div className="bg-ios-card rounded-t-[2rem] p-6 animate-slide-up">
                          <div className="flex justify-between items-center mb-6">
                              <h3 className="text-xl font-bold">Scanning Tips</h3>
                              <button onClick={() => setShowTips(false)} className="p-1 bg-neutral-100 rounded-full"><X size={20} /></button>
                          </div>
                          <div className="space-y-4 mb-8">
                              <div className="flex gap-4">
                                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0"><ImageIcon size={20} /></div>
                                  <div>
                                      <h4 className="font-semibold">Fill the Frame</h4>
                                      <p className="text-sm text-neutral-500">Get close enough so the receipt edges are visible.</p>
                                  </div>
                              </div>
                              <div className="flex gap-4">
                                  <div className="w-10 h-10 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center shrink-0"><Zap size={20} /></div>
                                  <div>
                                      <h4 className="font-semibold">Good Lighting</h4>
                                      <p className="text-sm text-neutral-500">Avoid shadows and glare. Turn on flash if needed.</p>
                                  </div>
                              </div>
                              <div className="flex gap-4">
                                  <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0"><FileText size={20} /></div>
                                  <div>
                                      <h4 className="font-semibold">Flat Surface</h4>
                                      <p className="text-sm text-neutral-500">Flatten crumpled receipts for better text recognition.</p>
                                  </div>
                              </div>
                          </div>
                          <button onClick={() => setShowTips(false)} className="w-full bg-ios-blue text-white py-3 rounded-xl font-semibold">Got it</button>
                      </div>
                  </div>
              )}
          </div>
      );
  }

  // 2. REVIEW VIEW
  if (viewState === 'review') {
    const isManual = capturedImage === 'manual_placeholder';
    const showWarning = parsingConfidence < 0.6 && !isManual;

    return (
        <>
            <div className="fixed inset-0 bg-ios-bg z-50 flex flex-col overflow-hidden text-neutral-900 animate-slide-up">
                <div className="bg-ios-card px-4 py-3 border-b border-ios-separator/20 flex justify-between items-center pt-12">
                    <button onClick={handleRetake} className="text-ios-blue font-medium active:opacity-50 transition-opacity">
                        {isManual ? 'Cancel' : 'Retake'}
                    </button>
                    <h1 className="font-semibold">Review</h1>
                    <button onClick={handleConfirmReceipt} className="text-ios-blue font-bold active:opacity-50 transition-opacity">Save</button>
                </div>

                {/* Low Confidence Warning Banner */}
                {showWarning && (
                    <div className="bg-orange-50 border-b border-orange-100 px-4 py-2 flex items-center gap-2 text-orange-800 text-sm animate-fade-in">
                        <AlertTriangle size={16} className="shrink-0" />
                        <span className="font-medium">Some details might be missing. Please verify.</span>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto p-4 pb-32 no-scrollbar">
                    {/* Thumbnail / Placeholder */}
                    <div className="w-full h-48 bg-neutral-900 rounded-xl overflow-hidden mb-6 shadow-sm shrink-0 flex justify-center items-center animate-scale-in">
                        {isManual ? (
                            <div className="flex flex-col items-center gap-2 text-neutral-500">
                                <div className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center">
                                    <FileText size={32} className="text-neutral-600" />
                                </div>
                                <span className="text-sm font-medium">Manual Entry</span>
                            </div>
                        ) : (
                            <img src={capturedImage!} alt="Captured" className="h-full object-contain" />
                        )}
                    </div>

                    <div className="space-y-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                        <div className="bg-white p-4 rounded-xl shadow-sm ios-active cursor-pointer">
                            <label className="text-xs font-semibold text-ios-gray uppercase">Store Name</label>
                            <input 
                                type="text" 
                                value={parsedData.storeName}
                                onChange={(e) => setParsedData({...parsedData, storeName: e.target.value})}
                                className="w-full mt-1 text-lg font-semibold bg-transparent focus:outline-none placeholder-neutral-300"
                                placeholder="Required"
                            />
                        </div>

                        <div className="flex gap-4">
                            <div className="bg-white p-4 rounded-xl shadow-sm flex-1 ios-active cursor-pointer">
                                <div className="flex items-center gap-1 mb-1 text-ios-gray">
                                    <DollarSign size={14} />
                                    <label className="text-xs font-semibold uppercase">Total</label>
                                </div>
                                <input 
                                    type="number" 
                                    value={parsedData.totalAmount || ''}
                                    onChange={(e) => setParsedData({...parsedData, totalAmount: parseFloat(e.target.value) || 0})}
                                    className="w-full text-xl font-bold bg-transparent focus:outline-none placeholder-neutral-300"
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="bg-white p-4 rounded-xl shadow-sm flex-1 ios-active cursor-pointer">
                                <div className="flex items-center gap-1 mb-1 text-ios-gray">
                                    <Calendar size={14} />
                                    <label className="text-xs font-semibold uppercase">Date</label>
                                </div>
                                <input 
                                    type="date" 
                                    value={parsedData.purchaseDate.toISOString().split('T')[0]}
                                    onChange={(e) => setParsedData({...parsedData, purchaseDate: new Date(e.target.value)})}
                                    className="w-full text-base font-medium bg-transparent focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="bg-white p-4 rounded-xl shadow-sm ios-active cursor-pointer">
                            <div className="flex items-center gap-1 mb-2 text-ios-gray">
                                <Tag size={14} />
                                <label className="text-xs font-semibold uppercase">Category</label>
                            </div>
                            <button 
                                onClick={() => setShowCategoryPicker(true)}
                                className="w-full flex items-center justify-between bg-neutral-50 p-3 rounded-lg border border-neutral-100"
                            >
                                <div className="flex flex-col items-start">
                                    <span className="text-lg font-medium text-neutral-900">{parsedData.category}</span>
                                    {parsedData.subcategory && (
                                        <span className="text-sm text-ios-teal font-medium">{parsedData.subcategory}</span>
                                    )}
                                </div>
                                <ChevronDown size={20} className="text-neutral-400" />
                            </button>
                            {/* Suggestions Chips */}
                            {categorySuggestions.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {categorySuggestions.slice(0, 3).map((sugg, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setParsedData({...parsedData, category: sugg.category, subcategory: sugg.subcategory})}
                                            className={`text-xs px-2 py-1 rounded-full border transition-all active:scale-90 ${
                                                parsedData.category === sugg.category 
                                                ? 'bg-ios-teal/10 border-ios-teal text-ios-teal' 
                                                : 'bg-white border-neutral-200 text-neutral-500'
                                            }`}
                                        >
                                            {sugg.category}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-ios-card/90 backdrop-blur border-t border-ios-separator/20">
                    <button 
                        onClick={handleConfirmReceipt}
                        className="w-full bg-ios-blue text-white font-semibold py-3.5 rounded-xl shadow-lg ios-btn-press flex items-center justify-center gap-2"
                    >
                        <Check size={18} />
                        Confirm & Save
                    </button>
                </div>
            </div>

            {showCategoryPicker && (
                <CategoryPickerView 
                    suggestions={categorySuggestions}
                    initialCategory={parsedData.category}
                    initialSubcategory={parsedData.subcategory}
                    onCancel={() => setShowCategoryPicker(false)}
                    onConfirm={(cat, sub) => {
                        setParsedData({...parsedData, category: cat, subcategory: sub});
                        setShowCategoryPicker(false);
                    }}
                />
            )}
        </>
    );
  }

  // 3. CAMERA VIEW (DEFAULT)
  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col text-white overflow-hidden">
      {flashActive && <div className="absolute inset-0 bg-white z-[100] animate-fade-in pointer-events-none" style={{ animationDuration: '0.1s' }} />}
      
      <div className="flex justify-between items-center p-4 pt-12 bg-black/50 backdrop-blur-sm absolute top-0 w-full z-10">
        <button 
          onClick={onCancel}
          className="text-white text-lg font-medium px-2 py-1 hover:opacity-70 transition-opacity"
        >
          Cancel
        </button>
        <div className="flex gap-4">
             <button onClick={() => setShowTips(true)} className="p-2 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20">
                <Info size={20} />
             </button>
             <button 
                onClick={() => setSoundEnabled(!soundEnabled)} 
                className="p-2 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 transition-colors"
             >
                {soundEnabled ? (
                    <Volume2 size={20} />
                ) : (
                    <VolumeX size={20} className="text-white/50" />
                )}
             </button>
             <button className="p-2 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20">
                <Zap size={20} className="text-yellow-400" fill="currentColor" />
             </button>
        </div>
      </div>

      <div className="flex-1 relative bg-neutral-900 flex items-center justify-center overflow-hidden">
        <canvas ref={canvasRef} className="hidden" />

        {viewState === 'processing' && (
             <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white animate-fade-in">
                <Loader2 size={48} className="animate-spin text-ios-teal mb-4" />
                <p className="font-medium text-lg">Analyzing...</p>
                <p className="text-sm text-white/60 mt-2">Reading prices and merchant</p>
             </div>
        )}

        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        
        {/* Guide Overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[75%] h-[65%] border-2 border-white/30 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] relative">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-lg"></div>
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-lg"></div>
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-lg"></div>
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-lg"></div>
            </div>
        </div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white/70 text-sm font-medium mt-36 pointer-events-none text-center">
            Align receipt within frame<br/>Ensure good lighting
        </div>
      </div>

      {/* Controls */}
      <div className="bg-black pb-12 pt-8 px-6 flex justify-around items-center">
        <div className="flex justify-between w-full items-center px-4">
            <div className="flex flex-col items-center gap-1">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center ios-active transition-colors"
              >
                <ImageIcon size={20} className="text-white" />
              </button>
              <span className="text-[10px] text-neutral-400 font-medium">Import</span>
              <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleFileUpload} />
            </div>

            {/* Elastic Shutter Button */}
            <button onClick={handleCapture} className="relative group ios-btn-press">
              <div className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center transition-all">
                <div className="w-[68px] h-[68px] rounded-full bg-white group-active:scale-90 transition-transform duration-150"></div>
              </div>
            </button>

             <div className="w-12 flex flex-col items-center gap-1"></div>
        </div>
      </div>

      {/* Tips Modal for Camera View */}
      {showTips && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md z-[60] flex flex-col justify-end">
              <div className="bg-ios-card rounded-t-[2rem] p-6 animate-slide-up text-neutral-900">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold">Scanning Tips</h3>
                      <button onClick={() => setShowTips(false)} className="p-1 bg-neutral-100 rounded-full"><X size={20} /></button>
                  </div>
                  <div className="space-y-4 mb-8">
                      <div className="flex gap-4">
                          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0"><ImageIcon size={20} /></div>
                          <div>
                              <h4 className="font-semibold">Fill the Frame</h4>
                              <p className="text-sm text-neutral-500">Get close enough so the receipt edges are visible.</p>
                          </div>
                      </div>
                      <div className="flex gap-4">
                          <div className="w-10 h-10 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center shrink-0"><Zap size={20} /></div>
                          <div>
                              <h4 className="font-semibold">Good Lighting</h4>
                              <p className="text-sm text-neutral-500">Avoid shadows and glare. Turn on flash if needed.</p>
                          </div>
                      </div>
                      <div className="flex gap-4">
                          <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0"><FileText size={20} /></div>
                          <div>
                              <h4 className="font-semibold">Flat Surface</h4>
                              <p className="text-sm text-neutral-500">Flatten crumpled receipts for better text recognition.</p>
                          </div>
                      </div>
                  </div>
                  <button onClick={() => setShowTips(false)} className="w-full bg-ios-blue text-white py-3 rounded-xl font-semibold">Got it</button>
              </div>
          </div>
      )}
    </div>
  );
};

export default CameraCaptureView;