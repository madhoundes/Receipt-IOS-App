
import React, { useRef, useState, useEffect } from 'react';
import { X, Zap, Image as ImageIcon, RotateCcw, ArrowRight, Loader2, Check, Calendar, DollarSign, Tag, ChevronDown, AlertTriangle, Lightbulb, FileText, Info, Volume2, VolumeX, ScanLine } from 'lucide-react';
import { Receipt } from '../types';
import { GoogleGenAI, Type } from "@google/genai";
import CategoryPickerView, { CategorySuggestion } from './CategoryPickerView';
import { BRAND_REGISTRY, normalizeStoreName, getBrandAsset } from '../constants';

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
    subtotal: 0,
    category: "Other",
    subcategory: undefined,
    notes: "",
    hstAmount: 0,
    hstPercent: 0,
    items: [],
    paymentMethod: "",
    rawText: "",
    brandId: undefined,
    brandDisplayMode: 'text',
    logoDetected: false,
    logoConfidence: 0,
    logoBounds: undefined
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
    const now = Date.now();
    if (now - lastShutterTime.current < 400) return;
    lastShutterTime.current = now;
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const t = ctx.currentTime;
        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(0.6, t);
        masterGain.connect(ctx.destination);
        const bufferSize = ctx.sampleRate * 0.1;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

        const snapSource = ctx.createBufferSource();
        snapSource.buffer = buffer;
        const snapFilter = ctx.createBiquadFilter();
        snapFilter.type = 'highpass';
        snapFilter.frequency.setValueAtTime(2000, t);
        const snapGain = ctx.createGain();
        snapGain.gain.setValueAtTime(0, t);
        snapGain.gain.linearRampToValueAtTime(1, t + 0.002);
        snapGain.gain.exponentialRampToValueAtTime(0.01, t + 0.04);
        snapSource.connect(snapFilter);
        snapFilter.connect(snapGain);
        snapGain.connect(masterGain);
        snapSource.start(t);
    } catch (e) { console.warn("Shutter sound failed:", e); }
  };

  // ----------------------------------------------------------------
  // Pre-OCR Validation (Heuristics)
  // ----------------------------------------------------------------
  const checkImageQuality = (ctx: CanvasRenderingContext2D, width: number, height: number): { valid: boolean; reason?: string } => {
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      let totalBrightness = 0;
      for (let i = 0; i < data.length; i += 16) { 
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
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const qualityCheck = checkImageQuality(context, canvas.width, canvas.height);
        setFlashActive(true);
        triggerHaptic('medium'); 
        playShutterSound(); 
        
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
        processReceiptImage(imgData); 
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
    if (typeof data.totalAmount === 'number' && data.totalAmount > 0) confidence += 0.5;
    else warnings.push("No total amount detected");
    
    if (data.storeName && data.storeName.trim().length > 1) confidence += 0.25;
    else warnings.push("Store name unclear");
    
    if (data.purchaseDate) {
         const d = new Date(data.purchaseDate);
         if (!isNaN(d.getTime())) confidence += 0.15;
         else warnings.push("Date invalid");
    } else warnings.push("No date found");
    
    if ((typeof data.hstAmount === 'number' && data.hstAmount > 0)) confidence += 0.1;

    const isValid = confidence >= 0.5; 
    let reason: string | undefined;
    if (!isValid) reason = "Data incomplete or unclear.";
    return { valid: isValid, confidence, warnings, reason };
  };

  // ----------------------------------------------------------------
  // Brand Matching Logic
  // ----------------------------------------------------------------
  const identifyBrand = (extractedName: string): { brandId?: string, matchedName: string } => {
    const normalized = normalizeStoreName(extractedName);
    
    // Search Registry
    for (const [key, asset] of Object.entries(BRAND_REGISTRY)) {
        // Check key/name match
        if (normalizeStoreName(asset.name) === normalized || key === normalized) {
            return { brandId: key, matchedName: asset.name };
        }
        // Check aliases
        if (asset.aliases.some(alias => normalizeStoreName(alias) === normalized)) {
            return { brandId: key, matchedName: asset.name };
        }
        // Partial match (safer)
        if (normalized.includes(normalizeStoreName(asset.name)) || normalizeStoreName(asset.name).includes(normalized)) {
             return { brandId: key, matchedName: asset.name };
        }
    }

    return { brandId: undefined, matchedName: extractedName };
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

    // Restaurant / Cafe
    if (/starbucks|mcdonald|tim hortons|subway|burger|a&w|kfc|popeyes|dairy queen/.test(text)) addSugg("Restaurant", "Fast Food", "Merchant match", "high");
    
    // Gas / Fuel
    if (/shell|esso|petro|fuel|pioneer|chevron|husky|circle k/.test(text)) addSugg("Gas/Fuel", "Gasoline", "Merchant match", "high");
    
    // Groceries
    if (/walmart|costco|no frills|loblaws|metro|food basics|farm boy|sobeys|longo|whole foods|freshco/.test(text)) addSugg("Groceries", "Food Retail", "Merchant match", "high");
    
    // Transport
    if (/uber|lyft|taxi|transit|presto/.test(text)) addSugg("Transport", "Rideshare", "Merchant match", "high");

    // Household / General
    if (/dollarama|dollar tree|giant tiger|canadian tire|home depot|lowes|home hardware|ikea/.test(text)) addSugg("Household", "Supplies", "Merchant match", "high");

    // Electronics
    if (/best buy|apple|source|staples/.test(text)) addSugg("Electronics", "Gadgets", "Merchant match", "high");
    
    // Clothing
    if (/winners|marshalls|zara|uniqlo|h&m|old navy/.test(text)) addSugg("Clothing", "Apparel", "Merchant match", "high");

    // Pharmacy
    if (/shoppers drug mart|rexall|pharmacy|guardian/.test(text)) addSugg("Pharmacy/Health", "Personal Care", "Merchant match", "high");

    if (suggestions.length === 0) addSugg("Other", "General", "Default", "low");
    return { suggestions: suggestions.slice(0, 3), bestGuess: suggestions[0] };
  };

  const processReceiptImage = async (imageData: string) => {
    setViewState('processing');
    try {
      const apiKey = process.env.API_KEY;
      if (!apiKey) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        // Mock Fallback
        setParsedData({
            storeName: "Mock Store",
            purchaseDate: new Date(),
            totalAmount: 14.99,
            subtotal: 12.99,
            category: "Other",
            subcategory: undefined,
            hstAmount: 2.00,
            hstPercent: 13,
            items: [{ name: "Item 1", qty: 1, unitPrice: 12.99, amount: 12.99 }],
            paymentMethod: "VISA 1234",
            notes: "",
            rawText: "Mock Data",
            brandId: undefined,
            brandDisplayMode: 'text',
            logoDetected: false,
            logoConfidence: 0,
            logoBounds: undefined
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
            { text: `Analyze this receipt image. Extract structured data. 
              Important: Identify the merchant name carefully. If it is a well-known brand (e.g., Costco, Walmart, Starbucks, Shell, Uber), return the standard brand name.
              
              BRAND LOGO DETECTION:
              - Check if the merchant's official logo or stylized wordmark is clearly visible on the receipt.
              - Set 'logoDetected' to true ONLY if there is a distinct graphical logo or branded font.
              - Set 'logoConfidence' (0.0 to 1.0) for this visual detection.
              - Set 'logoBounds' [ymin, xmin, ymax, xmax] for the logo area.
              - If it is plain text, set 'logoDetected' to false.

              Fields:
              - storeName: Standardized merchant name.
              - purchaseDate: ISO 8601 format.
              - totalAmount: Grand total.
              - subtotal: Amount before tax.
              - hstAmount: Total tax.
              - hstPercent: Tax rate (e.g. 13).
              - items: Line items with name, qty, unitPrice, amount.
              - paymentMethod: e.g. 'VISA **** 1234'.
              - logoDetected: Boolean.
              - logoConfidence: Number.
              - logoBounds: Array of 4 numbers.
              Return JSON.` 
            }
          ]
        },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    storeName: { type: Type.STRING, nullable: true },
                    totalAmount: { type: Type.NUMBER, nullable: true },
                    subtotal: { type: Type.NUMBER, nullable: true },
                    purchaseDate: { type: Type.STRING, nullable: true },
                    hstAmount: { type: Type.NUMBER, nullable: true },
                    hstPercent: { type: Type.NUMBER, nullable: true },
                    paymentMethod: { type: Type.STRING, nullable: true },
                    logoDetected: { type: Type.BOOLEAN, nullable: true },
                    logoConfidence: { type: Type.NUMBER, nullable: true },
                    logoBounds: { type: Type.ARRAY, items: { type: Type.NUMBER }, nullable: true },
                    items: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING },
                                qty: { type: Type.NUMBER },
                                unitPrice: { type: Type.NUMBER },
                                amount: { type: Type.NUMBER }
                            }
                        }
                    }
                }
            }
        }
      });

      if (response.text) {
        const data = JSON.parse(response.text);
        const validation = validateReceiptData(data);
        setParsingConfidence(validation.confidence);

        if (!validation.valid) {
            triggerHaptic('error');
            setValidationError({
                title: "Analysis Failed",
                message: validation.reason || "We couldn't find a total or date.",
                reason: 'parsing'
            });
            setViewState('error');
            return;
        }

        // Identify Brand against Registry
        const extractedStoreName = data.storeName || "";
        const brandInfo = identifyBrand(extractedStoreName);
        
        const { suggestions, bestGuess } = classifyReceipt(brandInfo.matchedName, "");
        
        // Strict Logo Detection Logic
        // Only show logo if Vision detected it with high confidence (>= 0.75) AND we have a matching brand asset.
        // Otherwise fall back to text.
        const isLogoVisuallyConfident = data.logoDetected === true && (data.logoConfidence || 0) >= 0.75;
        const hasBrandAsset = !!brandInfo.brandId;
        const finalDisplayMode = (hasBrandAsset && isLogoVisuallyConfident) ? 'logo' : 'text';

        setParsedData({
            storeName: brandInfo.matchedName, // Use standardized name
            purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : new Date(),
            totalAmount: data.totalAmount || 0,
            subtotal: data.subtotal || 0,
            category: bestGuess.category,
            subcategory: bestGuess.subcategory,
            notes: "",
            rawText: "",
            hstAmount: data.hstAmount || 0,
            hstPercent: data.hstPercent || 0,
            items: data.items || [],
            paymentMethod: data.paymentMethod || "",
            brandId: brandInfo.brandId,
            brandDisplayMode: finalDisplayMode,
            logoDetected: data.logoDetected,
            logoConfidence: data.logoConfidence,
            logoBounds: data.logoBounds
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
      setValidationError({ title: "Scan Failed", message: "Could not analyze image.", reason: 'parsing' });
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
      setParsedData({
          storeName: "", purchaseDate: new Date(), totalAmount: 0, subtotal: 0,
          category: "Other", subcategory: undefined, notes: "", hstAmount: 0, hstPercent: 0,
          items: [], paymentMethod: "", rawText: "", brandId: undefined, brandDisplayMode: 'text',
          logoDetected: false, logoConfidence: 0, logoBounds: undefined
      });
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
  // VIEW RENDERERS
  // ----------------------------------------------------------------

  // 1. ERROR VIEW
  if (viewState === 'error') {
      return (
          <div className="absolute inset-0 bg-black z-50 flex flex-col items-center justify-center p-6 animate-fade-in">
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
                          <button onClick={handleRetake} className="w-full bg-ios-blue text-white font-semibold py-3.5 rounded-xl ios-btn-press flex items-center justify-center gap-2">
                              <RotateCcw size={18} /> Retake Photo
                          </button>
                          <button onClick={handleManualEntry} className="w-full bg-neutral-100 text-neutral-900 font-semibold py-3.5 rounded-xl ios-active border border-neutral-200 flex items-center justify-center gap-2">
                              <FileText size={18} /> Enter Manually
                          </button>
                      </div>
                  </div>
              </div>
              <button onClick={onCancel} className="mt-12 text-white/70 font-medium hover:text-white transition-colors">Cancel</button>
          </div>
      );
  }

  // 2. REVIEW VIEW
  if (viewState === 'review') {
    const isManual = capturedImage === 'manual_placeholder';
    return (
        <>
            <div className="absolute inset-0 bg-ios-bg z-50 flex flex-col overflow-hidden text-neutral-900 animate-slide-up">
                <div className="bg-ios-card px-4 py-3 border-b border-ios-separator/20 flex justify-between items-center pt-12 flex-shrink-0">
                    <button onClick={handleRetake} className="text-ios-blue font-medium active:opacity-50 transition-opacity">{isManual ? 'Cancel' : 'Retake'}</button>
                    <h1 className="font-semibold">Review</h1>
                    <button onClick={handleConfirmReceipt} className="text-ios-blue font-bold active:opacity-50 transition-opacity">Save</button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 pb-32 no-scrollbar">
                    <div className="w-full h-48 bg-neutral-900 rounded-xl overflow-hidden mb-6 shadow-sm shrink-0 flex justify-center items-center animate-scale-in relative">
                        {isManual ? (
                            <div className="flex flex-col items-center gap-2 text-neutral-500">
                                <div className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center"><FileText size={32} className="text-neutral-600" /></div>
                                <span className="text-sm font-medium">Manual Entry</span>
                            </div>
                        ) : (
                            <>
                                <img src={capturedImage!} alt="Captured" className="h-full object-contain" />
                                {/* Logo Detection Overlay */}
                                {parsedData.logoDetected && parsedData.logoConfidence && (
                                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur text-white text-[10px] px-2 py-1 rounded-md flex items-center gap-1 z-10">
                                        <ScanLine size={10} className={parsedData.logoConfidence >= 0.75 ? "text-green-400" : "text-yellow-400"} />
                                        <span>Logo Match {(parsedData.logoConfidence * 100).toFixed(0)}%</span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-white p-4 rounded-xl shadow-sm ios-active">
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-xs font-semibold text-ios-gray uppercase">Store Name</label>
                                {/* Brand Identity Badge - Strict Mode */}
                                <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm flex items-center gap-1 ${parsedData.brandDisplayMode === 'logo' ? 'bg-ios-blue text-white' : 'bg-neutral-100 text-neutral-500'}`}>
                                    {parsedData.brandDisplayMode === 'logo' ? (
                                        <>
                                            <ImageIcon size={10} />
                                            <span>LOGO DETECTED</span>
                                        </>
                                    ) : (
                                        <span>TEXT ONLY</span>
                                    )}
                                </div>
                            </div>
                            <input 
                                type="text" 
                                value={parsedData.storeName}
                                onChange={(e) => setParsedData({...parsedData, storeName: e.target.value})}
                                className="w-full mt-1 text-lg font-semibold bg-transparent focus:outline-none placeholder-neutral-300"
                                placeholder="Required"
                            />
                        </div>

                        <div className="flex gap-4">
                            <div className="bg-white p-4 rounded-xl shadow-sm flex-1 ios-active">
                                <div className="flex items-center gap-1 mb-1 text-ios-gray"><DollarSign size={14} /><label className="text-xs font-semibold uppercase">Total</label></div>
                                <input 
                                    type="number" 
                                    value={parsedData.totalAmount || ''}
                                    onChange={(e) => setParsedData({...parsedData, totalAmount: parseFloat(e.target.value) || 0})}
                                    className="w-full text-xl font-bold bg-transparent focus:outline-none placeholder-neutral-300"
                                />
                            </div>
                            <div className="bg-white p-4 rounded-xl shadow-sm flex-1 ios-active">
                                <div className="flex items-center gap-1 mb-1 text-ios-gray"><Calendar size={14} /><label className="text-xs font-semibold uppercase">Date</label></div>
                                <input 
                                    type="date" 
                                    value={parsedData.purchaseDate.toISOString().split('T')[0]}
                                    onChange={(e) => setParsedData({...parsedData, purchaseDate: new Date(e.target.value)})}
                                    className="w-full text-base font-medium bg-transparent focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="bg-white p-4 rounded-xl shadow-sm ios-active">
                            <div className="flex items-center gap-1 mb-2 text-ios-gray"><Tag size={14} /><label className="text-xs font-semibold uppercase">Category</label></div>
                            <button onClick={() => setShowCategoryPicker(true)} className="w-full flex items-center justify-between bg-neutral-5 p-3 rounded-lg border border-neutral-100">
                                <div className="flex flex-col items-start">
                                    <span className="text-lg font-medium text-neutral-900">{parsedData.category}</span>
                                    {parsedData.subcategory && <span className="text-sm text-ios-teal font-medium">{parsedData.subcategory}</span>}
                                </div>
                                <ChevronDown size={20} className="text-neutral-400" />
                            </button>
                            {categorySuggestions.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {categorySuggestions.slice(0, 3).map((sugg, idx) => (
                                        <button key={idx} onClick={() => setParsedData({...parsedData, category: sugg.category, subcategory: sugg.subcategory})} className={`text-xs px-2 py-1 rounded-full border transition-all active:scale-90 ${parsedData.category === sugg.category ? 'bg-ios-teal/10 border-ios-teal text-ios-teal' : 'bg-white border-neutral-200 text-neutral-500'}`}>
                                            {sugg.category}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        
                        {/* Extracted Items Preview */}
                        {parsedData.items && parsedData.items.length > 0 && (
                            <div className="bg-white p-4 rounded-xl shadow-sm">
                                <label className="text-xs font-semibold text-ios-gray uppercase mb-2 block">Extracted Items</label>
                                <div className="space-y-2">
                                    {parsedData.items.slice(0, 3).map((item, i) => (
                                        <div key={i} className="flex justify-between text-sm">
                                            <span className="text-neutral-600 truncate max-w-[70%]">{item.qty > 1 ? `${item.qty}x ` : ''}{item.name}</span>
                                            <span className="font-medium">${item.amount.toFixed(2)}</span>
                                        </div>
                                    ))}
                                    {parsedData.items.length > 3 && <div className="text-xs text-neutral-400 pt-1">+{parsedData.items.length - 3} more items</div>}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-ios-card/90 backdrop-blur border-t border-ios-separator/20 pb-8 z-20">
                    <button onClick={handleConfirmReceipt} className="w-full bg-ios-blue text-white font-semibold py-3.5 rounded-xl shadow-lg ios-btn-press flex items-center justify-center gap-2">
                        <Check size={18} /> Confirm & Save
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
    <div className="absolute inset-0 bg-black z-50 flex flex-col text-white overflow-hidden">
      {flashActive && <div className="absolute inset-0 bg-white z-[100] animate-fade-in pointer-events-none" style={{ animationDuration: '0.1s' }} />}
      <div className="flex justify-between items-center p-4 pt-12 bg-black/50 backdrop-blur-sm absolute top-0 w-full z-10">
        <button onClick={onCancel} className="text-white text-lg font-medium px-2 py-1 hover:opacity-70 transition-opacity">Cancel</button>
        <div className="flex gap-4">
             <button onClick={() => setShowTips(true)} className="p-2 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20"><Info size={20} /></button>
             <button onClick={() => setSoundEnabled(!soundEnabled)} className="p-2 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 transition-colors">{soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} className="text-white/50" />}</button>
             <button className="p-2 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20"><Zap size={20} className="text-yellow-400" fill="currentColor" /></button>
        </div>
      </div>
      <div className="flex-1 relative bg-neutral-900 flex items-center justify-center overflow-hidden">
        <canvas ref={canvasRef} className="hidden" />
        {viewState === 'processing' && (
             <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white animate-fade-in">
                <Loader2 size={48} className="animate-spin text-ios-teal mb-4" />
                <p className="font-medium text-lg">Analyzing Receipt...</p>
                <p className="text-sm text-white/60 mt-2">Extracting items and prices</p>
             </div>
        )}
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[75%] h-[65%] border-2 border-white/30 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] relative">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-lg"></div>
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-lg"></div>
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-lg"></div>
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-lg"></div>
            </div>
        </div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white/70 text-sm font-medium mt-36 pointer-events-none text-center">Align receipt within frame<br/>Ensure good lighting</div>
      </div>
      <div className="bg-black pb-12 pt-8 px-6 flex justify-around items-center z-20">
        <div className="flex justify-between w-full items-center px-4">
            <div className="flex flex-col items-center gap-1">
              <button onClick={() => fileInputRef.current?.click()} className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center ios-active transition-colors"><ImageIcon size={20} className="text-white" /></button>
              <span className="text-[10px] text-neutral-400 font-medium">Import</span>
              <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleFileUpload} />
            </div>
            <button onClick={handleCapture} className="relative group ios-btn-press">
              <div className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center transition-all">
                <div className="w-[68px] h-[68px] rounded-full bg-white group-active:scale-90 transition-transform duration-150"></div>
              </div>
            </button>
             <div className="w-12 flex flex-col items-center gap-1"></div>
        </div>
      </div>

      {/* TIPS MODAL */}
      {showTips && (
        <div className="absolute inset-0 z-[100] flex items-end justify-center">
          <div 
             className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" 
             onClick={() => { triggerHaptic('light'); setShowTips(false); }} 
          />
          <div className="bg-ios-bg w-full max-w-md rounded-t-[2rem] p-6 pb-10 animate-slide-up shadow-2xl relative z-10 text-neutral-900">
            <div className="w-12 h-1.5 bg-neutral-300 rounded-full mx-auto mb-6 opacity-50" />
            
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-neutral-900">Scanning Tips</h3>
              <button 
                onClick={() => { triggerHaptic('light'); setShowTips(false); }}
                className="p-2 bg-neutral-200/80 rounded-full text-neutral-500 hover:bg-neutral-300 active:scale-90 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6 mb-8">
               <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center shrink-0 text-yellow-600">
                     <Lightbulb size={20} fill="currentColor" className="text-yellow-500" />
                  </div>
                  <div>
                     <h4 className="font-semibold text-base mb-1">Lighting is Key</h4>
                     <p className="text-sm text-neutral-500 leading-snug">Ensure the receipt is well-lit. Turn on the flash <Zap size={12} className="inline" /> if needed.</p>
                  </div>
               </div>

               <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0 text-blue-600">
                     <ScanLine size={20} />
                  </div>
                  <div>
                     <h4 className="font-semibold text-base mb-1">Frame it Right</h4>
                     <p className="text-sm text-neutral-500 leading-snug">Fit the entire receipt within the edges. Keep it flat.</p>
                  </div>
               </div>
               
               <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0 text-red-600">
                     <AlertTriangle size={20} />
                  </div>
                  <div>
                     <h4 className="font-semibold text-base mb-1">Avoid Glare</h4>
                     <p className="text-sm text-neutral-500 leading-snug">Watch out for shiny thermal paper glare that hides text.</p>
                  </div>
               </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-neutral-200 pt-6">
               <button 
                  onClick={() => { triggerHaptic('medium'); setShowTips(false); fileInputRef.current?.click(); }}
                  className="w-full py-3.5 bg-white border border-neutral-200 rounded-xl font-semibold text-ios-blue flex items-center justify-center gap-2 shadow-sm active:bg-neutral-50"
               >
                  <ImageIcon size={18} /> Import from Photos
               </button>
               <button 
                  onClick={() => { triggerHaptic('medium'); setShowTips(false); handleManualEntry(); }}
                  className="w-full py-3.5 bg-white border border-neutral-200 rounded-xl font-semibold text-neutral-700 flex items-center justify-center gap-2 shadow-sm active:bg-neutral-50"
               >
                  <FileText size={18} /> Enter Manually
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraCaptureView;