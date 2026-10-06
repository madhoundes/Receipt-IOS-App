import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Accelerometer } from 'expo-sensors';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  Easing, FadeIn, FadeInDown, SlideInDown, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming,
} from 'react-native-reanimated';
import {
  Camera, ChevronRight, CircleSlash, Edit, Image as ImageIcon, Lightbulb, Maximize2, ReceiptText, Scan, Sparkles, Sun, Trash, X, Zap, ZapOff,
} from '../components/icons';
import { CategoryIcon, categoryColor } from '../components/CategoryIcon';
import { CategoryPickerSheet } from '../components/CategoryPickerSheet';
import { Illustration } from '../components/Illustration';
import { MerchantAvatar } from '../components/MerchantAvatar';
import { OptionSheet, shortDate } from '../components/kit';
import { Button } from '../components/ui';
import { ZoomableImage } from '../components/ZoomableImage';
import { useReceipts } from '../context/ReceiptContext';
import { ocr, OcrError, OcrResult } from '../services/ocr';
import { onReaderProgress } from '../services/ocrEngine';
import { triggerHaptic } from '../utils/nativeUtils';
import { persistReceiptPhoto } from '../utils/photos';
import { formatCents, resolveReceiptTax, toCents } from '../utils/tax';
import { colors, font, radius, soft, themedStyles } from '../theme';
import type { Receipt } from '../types';

const BRAND_DARK = '#34C98E';

type Phase = 'camera' | 'reading' | 'summary' | 'failed';
type Stage = 'reading' | 'matching';
const STAGE_TEXT: Record<Stage, string> = { reading: 'Reading the receipt', matching: 'Matching store, total and HST' };

// Auto capture: the shot is taken once the phone has been held still for this long.
const STEADY_MS = 1300;
const STEADY_DELTA = 0.035; // change in acceleration (in g) between two readings that still counts as still
const RETRY_COOLDOWN_MS = 6000;
const MAX_MISSES = 3;
/** If the camera has not delivered the photo by then, it is restarted instead of leaving the screen stuck. */
const SHOT_TIMEOUT_MS = 8000;

const PAYMENTS = [
  { value: 'Credit card', label: 'Credit card' }, { value: 'Debit', label: 'Debit' }, { value: 'Cash', label: 'Cash' },
  { value: '', label: 'Not set' },
];
const confidenceLabel = (c: number) => (c >= 0.9 ? 'High' : c >= 0.75 ? 'Medium' : 'Low');

export default function CameraCaptureScreen({ navigation, route }: any) {
  const { categories, userProfile, addReceipt } = useReceipts();
  const [permission, requestPermission] = useCameraPermissions();
  // The top controls must clear the clock and battery. Measured here and applied by hand, with a floor for iPhones,
  // so the controls can never slide under the status bar.
  const insets = useSafeAreaInsets();
  const topPad = Math.max(insets.top, Platform.OS === 'ios' ? 50 : 0) + 8;
  const [percent, setPercent] = useState<number>();
  useEffect(() => onReaderProgress(p => { if (/recogniz/i.test(p.status)) setPercent(Math.round(p.progress * 100)); }), []);
  const [torch, setTorch] = useState(false);
  const [phase, setPhase] = useState<Phase>('camera');
  const [photoUri, setPhotoUri] = useState<string>();
  const [stage, setStage] = useState<Stage>('reading');
  // A camera shot fills the screen like the live view did; an imported photo is shown whole.
  const [fromCam, setFromCam] = useState(false);
  const [result, setResult] = useState<OcrResult>();
  const [error, setError] = useState<string>();
  const [failure, setFailure] = useState<'not-receipt' | 'unreachable' | 'failed'>('failed');
  const [auto, setAuto] = useState(true);
  const [holding, setHolding] = useState(false);
  // The camera has to say it is ready before a photo is asked for; a photo asked for too early never arrives.
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraKey, setCameraKey] = useState(0);
  const busy = useRef(false);
  const misses = useRef(0);
  const cooldownUntil = useRef(0);
  const cameraRef = useRef<CameraView>(null);
  // Bumped when the user backs out, so a late OCR result is ignored.
  const run = useRef(0);

  // Summary sheet (after a successful read)
  const [category, setCategory] = useState('Other');
  const [subcategory, setSubcategory] = useState<string>();
  const [payment, setPayment] = useState('');
  const [notes, setNotes] = useState('');
  const [picker, setPicker] = useState(false);
  const [paySheet, setPaySheet] = useState(false);
  const [viewer, setViewer] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>();

  // Soft scan line sweeping the frame (position only, as the motion rules allow).
  const sweep = useSharedValue(0);
  useEffect(() => {
    sweep.value = withRepeat(withTiming(1, { duration: 2000, easing: Easing.bezier(0.35, 0, 0.65, 1) }), -1, true);
    return () => cancelAnimation(sweep);
  }, [sweep]);
  const lineStyle = useAnimatedStyle(() => ({ top: `${6 + sweep.value * 88}%` }));

  // Some devices never report that the camera is ready. Do not wait for that report forever.
  useEffect(() => {
    if (phase !== 'camera' || cameraReady || !permission?.granted) return;
    const timer = setTimeout(() => setCameraReady(true), 2500);
    return () => clearTimeout(timer);
  }, [phase, cameraReady, cameraKey, permission?.granted]);

  // After a while, say that the read is still going, so a slow first read does not look stuck.
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    setSlow(false);
    if (phase !== 'reading') return;
    const timer = setTimeout(() => setSlow(true), 12000);
    return () => clearTimeout(timer);
  }, [phase, photoUri]);

  // Leaving the screen cancels a read in flight; coming back to it always starts from a clean state.
  useEffect(() => () => { run.current += 1; }, []);
  useFocusEffect(useCallback(() => {
    busy.current = false;
    cooldownUntil.current = Date.now() + 1200;
    return () => { busy.current = false; };
  }, []));

  const manualEntry = () => navigation.replace('ScanResult', { photoUri: null, result: null });

  const analyze = async (uri: string, fromCamera = false) => {
    const id = ++run.current;
    setError(undefined);
    setPhotoUri(uri);
    setFromCam(fromCamera);
    setResult(undefined);
    setStage('reading');
    setPercent(undefined);
    setCameraReady(false);
    setPhase('reading');
    try {
      const read = await ocr.scanReceipt(uri, s => { if (id === run.current) setStage(s); });
      if (id !== run.current) return;
      // Let the "matching" line be seen for a moment before the summary slides in.
      await new Promise(resolve => setTimeout(resolve, 400));
      if (id !== run.current) return;
      triggerHaptic('success');
      setResult(read);
      // With auto-categorize off, the user always picks the category.
      setCategory(userProfile.autoCategorize ? read.category : 'Other');
      setSubcategory(userProfile.autoCategorize ? read.subcategory : undefined);
      setPayment(''); setNotes(''); setSaveError(undefined); setSaving(false);
      setPhase('summary');
    } catch (e) {
      if (id !== run.current) return;
      triggerHaptic('error');
      const code = e instanceof OcrError ? e.code : 'failed';
      if (fromCamera && code === 'not-receipt') {
        // The automatic shot found no receipt: go back to the live camera instead of showing an error screen.
        misses.current += 1;
        cooldownUntil.current = Date.now() + RETRY_COOLDOWN_MS;
        if (misses.current >= MAX_MISSES) {
          setAuto(false);
          setError('Auto capture paused. Tap the shutter when the receipt is in the frame.');
        } else {
          setError('No receipt found. Move closer and hold steady.');
        }
        setPhase('camera');
        setPhotoUri(undefined);
        return;
      }
      setFailure(code);
      setPhase('failed');
    }
  };

  const capture = async () => {
    if (!cameraRef.current || phase !== 'camera' || busy.current || !cameraReady) return;
    busy.current = true;
    triggerHaptic('medium');
    let uri: string | undefined;
    try {
      const photo = await Promise.race([
        cameraRef.current.takePictureAsync({ quality: 0.85 }),
        new Promise<undefined>(resolve => setTimeout(() => resolve(undefined), SHOT_TIMEOUT_MS)),
      ]);
      if (!photo) {
        // The camera went quiet: start it again so the next try works.
        setCameraReady(false);
        setCameraKey(k => k + 1);
        setError('The camera did not respond. Try again.');
        cooldownUntil.current = Date.now() + 2000;
        return;
      }
      const small = await ImageManipulator.manipulateAsync(photo.uri, [{ resize: { width: 1400 } }], {
        compress: 0.8, format: ImageManipulator.SaveFormat.JPEG,
      });
      uri = small.uri;
    } catch {
      setError('The camera could not take a photo. Please try again.');
      cooldownUntil.current = Date.now() + 2000;
    } finally {
      // Free the shutter before the read starts, so nothing can leave it locked.
      busy.current = false;
    }
    if (uri) await analyze(uri, true);
  };

  // Auto capture: watch how much the phone moves; once it has been still for a moment, take the shot.
  const captureRef = useRef(capture);
  captureRef.current = capture;
  useEffect(() => {
    if (!auto || phase !== 'camera' || !permission?.granted || !cameraReady) { setHolding(false); return; }
    let last: { x: number; y: number; z: number } | undefined;
    let stillSince = 0;
    // No motion sensor (the browser preview, some simulators): the shutter button still works.
    let sub: { remove: () => void } | undefined;
    try {
      Accelerometer.setUpdateInterval(120);
      sub = Accelerometer.addListener(a => {
      const moved = last ? Math.abs(a.x - last.x) + Math.abs(a.y - last.y) + Math.abs(a.z - last.z) : 1;
      last = a;
      const now = Date.now();
      if (busy.current || now < cooldownUntil.current || moved > STEADY_DELTA * 3) { stillSince = 0; setHolding(h => (h ? false : h)); return; }
      if (!stillSince) stillSince = now;
      setHolding(h => (h ? h : true));
      if (now - stillSince >= STEADY_MS) {
        stillSince = 0;
        setHolding(false);
        captureRef.current();
      }
      });
    } catch { setHolding(false); }
    return () => { try { sub?.remove(); } catch { /* already gone */ } };
  }, [auto, phase, permission?.granted, cameraReady, cameraKey]);

  const importPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (!res.canceled && res.assets[0]) await analyze(res.assets[0].uri);
  };

  const backToCamera = () => {
    run.current += 1;
    busy.current = false;
    setCameraReady(false);
    setPhase('camera');
    setPhotoUri(undefined);
    setResult(undefined);
    setError(undefined);
    cooldownUntil.current = Date.now() + 2000;
  };

  // A photo picked elsewhere (the empty Receipts screen) goes straight to reading.
  const importUri: string | undefined = route?.params?.importUri;
  useEffect(() => {
    if (importUri) analyze(importUri);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importUri]);

  // ----- summary sheet -----
  const draft: Receipt | undefined = useMemo(() => result && ({
    id: 'draft', imageName: photoUri ?? '', storeName: result.storeName.trim(), purchaseDate: result.purchaseDate,
    totalAmount: result.totalAmount, subtotal: result.subtotal, hstAmount: result.hstAmount, hstPercent: result.hstPercent,
    category, subcategory, items: result.items, taxReviewed: false,
    paymentMethod: payment || undefined, notes: notes.trim() || undefined,
  }), [result, photoUri, category, subcategory, payment, notes]);
  const canSave = !!draft && !!draft.storeName && draft.totalAmount > 0;

  const edit = () => navigation.replace('ScanResult', {
    photoUri, result: result && { ...result, category, subcategory }, payment, notes,
  });
  const save = async () => {
    if (!draft || !photoUri || saving) return;
    if (!canSave) { edit(); return; }
    setSaving(true); setSaveError(undefined);
    try {
      const id = `r_${Date.now()}`;
      // The original photo is stored once, as captured, and never edited.
      const imageName = await persistReceiptPhoto(photoUri, id);
      addReceipt({ ...draft, id, imageName });
      triggerHaptic('success');
      navigation.replace('ScanSaved', { receiptId: id });
    } catch {
      setSaveError('Could not save the receipt. Please try again.');
      setSaving(false);
    }
  };

  if (!permission) return <View style={styles.container} />;

  // B1 · Camera Access
  if (!permission.granted && phase === 'camera') {
    const blocked = !permission.canAskAgain;
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.permBody}>
          <Pressable onPress={() => navigation.goBack()} style={styles.round} accessibilityRole="button" accessibilityLabel="Close">
            <X size={20} color="#FFFFFF" />
          </Pressable>

          <View style={styles.permHero}>
            {blocked ? (
              <Illustration name="cameraDenied" size={160} label="Camera access is turned off" />
            ) : (
              <View style={styles.permIcon}><Camera size={42} color={BRAND_DARK} /></View>
            )}
            <Text style={styles.permTitle} accessibilityRole="header">{blocked ? 'Camera Is Turned Off' : 'Camera Access Needed'}</Text>
            <Text style={styles.permText}>
              {blocked
                ? 'Turn the camera on for Maplestub in Settings, or import a photo or type the receipt in.'
                : 'Maplestub uses the camera only to photograph receipts. Photos stay in the app.'}
            </Text>
          </View>

          <View style={styles.tipsCard}>
            <Text style={styles.tipsLabel}>SCANNING TIPS</Text>
            <Tip Icon={Lightbulb} title="Lighting is key" text="Turn on the flash in dim rooms." />
            <Tip Icon={Scan} title="Frame it right" text="Fit the whole receipt inside the edges." />
            <Tip Icon={CircleSlash} title="Avoid glare" text="Shiny thermal paper can hide text." />
          </View>

          <View style={{ flex: 1 }} />
          <Button title={blocked ? 'Open Settings' : 'Allow Camera'} variant="onAccent"
            onPress={() => (blocked ? Linking.openSettings() : requestPermission())} />
          <View style={styles.permRow}>
            <Button title="Import Photo" variant="glass" icon={<ImageIcon size={18} color="#FFFFFF" />} onPress={importPhoto} compact style={styles.permSecondary} />
            <Button title="Enter Manually" variant="glass" icon={<Edit size={18} color="#FFFFFF" />} onPress={manualEntry} compact style={styles.permSecondary} />
          </View>
        </View>
      </SafeAreaView>
    );
  }


  // B3 · Reading, the summary, and the failed state: all on top of the photo that was just taken.
  if (phase !== 'camera' && photoUri) {
    const tax = draft ? resolveReceiptTax(draft, categories, userProfile.hstDefaultPercent) : undefined;
    const color = categoryColor(categories, category);
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} resizeMode={fromCam ? 'cover' : 'contain'} />
        <View style={styles.dim} />
        <View style={[styles.readTop, { paddingTop: topPad }]}>
          <Pressable onPress={backToCamera} style={styles.round} accessibilityRole="button" accessibilityLabel={phase === 'reading' ? 'Cancel' : 'Close and scan again'}>
            <X size={20} color="#FFFFFF" />
          </Pressable>
          <View style={styles.modeBadge}>
            <Text style={styles.modeText}>Auto Capture: <Text style={{ color: BRAND_DARK }}>{auto ? 'On' : 'Off'}</Text></Text>
          </View>
        </View>

        {phase === 'reading' && (
          <Animated.View entering={FadeIn} style={styles.center} accessibilityLiveRegion="polite" accessibilityRole="progressbar" accessibilityLabel={STAGE_TEXT[stage]}>
            <ReadingSpinner />
            <Text style={styles.stageText}>{STAGE_TEXT[stage]}{stage === 'reading' && percent != null && percent < 100 ? ` ${percent}%` : ''}</Text>
            <Text style={styles.stageSub}>{slow ? 'Still reading. The first read after opening the app takes longer. Tap X to cancel.' : 'Read on this phone. The photo is not uploaded.'}</Text>
          </Animated.View>
        )}

        {phase === 'failed' && (
          <Animated.View entering={FadeInDown} style={styles.sheet}>
            <View style={styles.grabber} />
            <View style={{ alignItems: 'center', gap: 6 }} accessibilityLiveRegion="polite">
              <Illustration name="scanFailed" size={140} label="We could not read the receipt" />
              <Text style={styles.failTitle}>{failure === 'unreachable' ? 'The reader couldn’t start' : failure === 'not-receipt' ? 'No receipt in that photo' : 'We couldn’t read that receipt'}</Text>
              <Text style={styles.failText}>
                {failure === 'unreachable'
                  ? 'The text reader needs the internet once to download. Connect to Wi-Fi and try again, or type the receipt in.'
                  : 'Try again with better light and the whole receipt in the frame, or type it in.'}
              </Text>
              <View style={{ alignSelf: 'stretch', gap: 10, marginTop: 14 }}>
                <Button title="Try Again" onPress={() => analyze(photoUri)} />
                <Button title="Scan Again" variant="tinted" onPress={backToCamera} />
                <Button title="Enter Manually" variant="ghost" onPress={manualEntry} />
              </View>
            </View>
          </Animated.View>
        )}

        {phase === 'summary' && draft && tax && (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetHost} pointerEvents="box-none">
            <Animated.View entering={SlideInDown.duration(320)} style={[styles.sheet, styles.sheetFlow]}>
              <View style={styles.grabber} />
              <View style={styles.sumTop}>
                <Pressable onPress={() => setViewer(true)} style={styles.thumb} accessibilityRole="button" accessibilityLabel="Open the original photo to zoom in">
                  <Image source={{ uri: photoUri }} style={styles.thumbImg} resizeMode="cover" />
                  <View style={styles.thumbBadge}><Maximize2 size={13} color="#FFFFFF" /></View>
                </Pressable>
                <View style={{ flex: 1, minWidth: 0, gap: 8 }}>
                  <View style={styles.storeRow}>
                    <MerchantAvatar name={draft.storeName || '?'} category={category} size={36} badge={false} />
                    <Text style={styles.store} numberOfLines={2} accessibilityRole="header">{draft.storeName || 'Store not found'}</Text>
                  </View>
                  <Pressable onPress={() => setPicker(true)} style={[styles.catChip, { backgroundColor: soft(color) }]} accessibilityRole="button" accessibilityLabel={`Category ${category}. Change`}>
                    <CategoryIcon category={category} size={18} />
                    <Text style={[styles.catText, { color }]} numberOfLines={1}>{category}</Text>
                    <ChevronRight size={14} color={color} />
                  </Pressable>
                  <View style={styles.conf}>
                    <Sparkles size={13} color={colors.accent} />
                    <Text style={styles.confText} numberOfLines={1}>Read automatically · {confidenceLabel(result!.confidence)} confidence</Text>
                  </View>
                </View>
              </View>

              <View style={styles.rows}>
                <Pressable onPress={() => setPaySheet(true)} style={styles.sumRow} accessibilityRole="button" accessibilityLabel={`Payment method ${payment || 'not set'}. Change`}>
                  <Text style={styles.sumLabel}>Payment Method</Text>
                  <Text style={[styles.sumValue, !payment && { color: colors.placeholder }]}>{payment || 'Not set'}</Text>
                  <ChevronRight size={16} color={colors.chevron} />
                </Pressable>
                <View style={[styles.sumRow, styles.sumBorder]}>
                  <Text style={styles.sumLabel}>Total</Text>
                  <Text style={[styles.sumValue, font.bold, !(draft.totalAmount > 0) && { color: colors.tax }]}>{draft.totalAmount > 0 ? formatCents(toCents(draft.totalAmount)) : 'Not found'}</Text>
                </View>
                <View style={[styles.sumRow, styles.sumBorder]}>
                  <Text style={styles.sumLabel}>HST{tax.status === 'taxed' && draft.hstPercent ? ` ${draft.hstPercent}%` : ''}</Text>
                  <Text style={[styles.sumValue, font.bold, { color: colors.tax }]}>
                    {tax.status === 'taxed' ? formatCents(tax.hstCents) : tax.status === 'noTax' ? 'No HST' : 'To review'}
                  </Text>
                </View>
                <View style={[styles.sumRow, styles.sumBorder]}>
                  <Text style={styles.sumLabel}>Date</Text>
                  <Text style={styles.sumValue}>{shortDate(draft.purchaseDate, true)}</Text>
                </View>
              </View>

              <TextInput value={notes} onChangeText={setNotes} placeholder="Notes for your accountant (optional)" placeholderTextColor={colors.placeholder}
                style={styles.notes} accessibilityLabel="Notes" returnKeyType="done" />

              {(!canSave || tax.status === 'needsReview' || !!saveError) && (
                <Text style={[styles.sumHint, !!saveError && { color: colors.danger }]} accessibilityLiveRegion="polite">
                  {saveError ?? (!canSave ? 'The store or the total was not found. Tap Edit to add it.' : 'No tax line was read. You can save now and confirm the HST later, or tap Edit.')}
                </Text>
              )}

              <View style={styles.sumActions}>
                <Pressable onPress={backToCamera} style={({ pressed }) => [styles.sumBtn, { backgroundColor: colors.dangerSoft }, pressed && { opacity: 0.7 }]} accessibilityRole="button" accessibilityLabel="Delete this scan">
                  <Trash size={18} color={colors.danger} />
                  <Text style={[styles.sumBtnText, { color: colors.danger }]}>Delete</Text>
                </Pressable>
                <Pressable onPress={edit} style={({ pressed }) => [styles.sumBtn, { backgroundColor: colors.fill }, pressed && { opacity: 0.7 }]} accessibilityRole="button" accessibilityLabel="Edit the details">
                  <Edit size={18} color={colors.text} />
                  <Text style={[styles.sumBtnText, { color: colors.text }]}>Edit</Text>
                </Pressable>
                <View style={{ flex: 1.5 }}>
                  <Button title="Save" onPress={save} loading={saving} disabled={!canSave} />
                </View>
              </View>
            </Animated.View>
          </KeyboardAvoidingView>
        )}

        <CategoryPickerSheet visible={picker} category={category} subcategory={subcategory} onClose={() => setPicker(false)}
          onDone={(c, sub) => { setCategory(c); setSubcategory(sub); setPicker(false); }} />
        <OptionSheet visible={paySheet} title="Payment Method" options={PAYMENTS} value={payment}
          onPick={v => { setPayment(v); setPaySheet(false); }} onClose={() => setPaySheet(false)} />
        <Modal visible={viewer} animationType="fade" onRequestClose={() => setViewer(false)}>
          <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#000000' }}>
            <ZoomableImage uri={photoUri} label="Original receipt photo. Pinch or double tap to zoom" />
            <View style={[styles.viewerTop, { paddingTop: topPad }]} pointerEvents="box-none">
              <Pressable onPress={() => setViewer(false)} style={styles.round} accessibilityRole="button" accessibilityLabel="Close photo">
                <X size={20} color="#FFFFFF" />
              </Pressable>
              <View style={styles.modeBadge}><Text style={styles.modeText}>Pinch or double tap to zoom</Text></View>
            </View>
          </GestureHandlerRootView>
        </Modal>
      </View>
    );
  }

  // B2 · Scan
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <CameraView key={cameraKey} ref={cameraRef} style={StyleSheet.absoluteFill} enableTorch={torch} onCameraReady={() => setCameraReady(true)}
        onMountError={() => setError('The camera could not start. Close this screen and open it again.')} />

      <SafeAreaView style={styles.ui} edges={['bottom']}>
        <View style={[styles.topBar, { paddingTop: topPad }]}>
          <Pressable onPress={() => navigation.goBack()} style={styles.round} accessibilityRole="button" accessibilityLabel="Close">
            <X size={20} color="#FFFFFF" />
          </Pressable>
          <Pressable onPress={() => { setAuto(a => !a); setError(undefined); misses.current = 0; }} style={[styles.autoPill, auto && styles.autoPillOn]}
            accessibilityRole="button" accessibilityLabel={auto ? 'Turn auto capture off' : 'Turn auto capture on'} accessibilityState={{ selected: auto }}>
            <Scan size={16} color={auto ? '#0C0C0D' : '#FFFFFF'} />
            <Text style={[styles.autoText, auto && { color: '#0C0C0D' }]}>{auto ? 'Auto Capture: On' : 'Auto Capture: Off'}</Text>
          </Pressable>
          <Pressable onPress={() => setTorch(t => !t)} style={styles.round} accessibilityRole="button"
            accessibilityLabel={torch ? 'Turn flash off' : 'Turn flash on'} accessibilityState={{ selected: torch }}>
            {torch ? <Zap size={20} color="#FFD60A" variant="Bold" /> : <ZapOff size={20} color="#FFFFFF" />}
          </Pressable>
        </View>

        <View style={styles.frameWrap}>
          <View style={styles.frame}>
            <View style={[styles.corner, { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 18 }]} />
            <View style={[styles.corner, { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 18 }]} />
            <View style={[styles.corner, { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 18 }]} />
            <View style={[styles.corner, { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 18 }]} />
            <Animated.View style={[styles.scanLine, lineStyle]} />
          </View>
          <Animated.View entering={FadeIn} style={styles.hint} accessibilityLiveRegion="polite">
            {error ? <Sun size={16} color="#FFB057" /> : <Scan size={16} color={BRAND_DARK} />}
            <Text style={styles.hintText}>{error ?? (auto ? (!cameraReady ? 'Starting the camera…' : holding ? 'Hold steady, capturing…' : 'Point at the receipt and hold still') : 'Fit the whole receipt in the frame')}</Text>
          </Animated.View>
        </View>

        <View style={styles.controls}>
          <Pressable onPress={importPhoto} style={styles.side} accessibilityRole="button" accessibilityLabel="Import a photo">
            <ImageIcon size={22} color="#FFFFFF" />
          </Pressable>
          <Pressable onPress={capture} style={styles.shutter} accessibilityRole="button" accessibilityLabel="Capture receipt">
            <View style={styles.shutterInner} />
          </Pressable>
          <Pressable onPress={manualEntry} style={styles.side} accessibilityRole="button" accessibilityLabel="Enter manually">
            <Edit size={22} color="#FFFFFF" />
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}


const RING = 132, RING_R = 60, RING_LEN = 2 * Math.PI * RING_R;

/** White disc with a receipt in it and an arc that keeps turning while the photo is read. */
function ReadingSpinner() {
  const turn = useSharedValue(0);
  useEffect(() => {
    turn.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(turn);
  }, [turn]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value * 360}deg` }] }));
  return (
    <View style={styles.disc}>
      <Animated.View style={[StyleSheet.absoluteFill, style]}>
        <Svg width={RING} height={RING}>
          <Circle cx={RING / 2} cy={RING / 2} r={RING_R} stroke="#0B7A55" strokeWidth={7} strokeLinecap="round" fill="none"
            strokeDasharray={`${RING_LEN * 0.24} ${RING_LEN}`} />
        </Svg>
      </Animated.View>
      <ReceiptText size={48} color="#111113" />
    </View>
  );
}

const Tip = ({ Icon, title, text }: { Icon: typeof Sun; title: string; text: string }) => (
  <View style={styles.tip}>
    <View style={styles.tipIcon}><Icon size={20} color="#FFFFFF" /></View>
    <View style={{ flex: 1 }}>
      <Text style={styles.tipTitle}>{title}</Text>
      <Text style={styles.tipText}>{text}</Text>
    </View>
  </View>
);

const GLASS = 'rgba(40,40,42,0.7)';
const FILL = { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 } as const;

const styles = themedStyles(() => ({
  container: { flex: 1, backgroundColor: colors.dark },
  round: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: GLASS, alignItems: 'center', justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.15)',
  },
  // B1
  permBody: { flex: 1, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 12, gap: 22 },
  permHero: { alignItems: 'center', gap: 12, marginTop: 14 },
  permIcon: { width: 84, height: 84, borderRadius: 22, backgroundColor: 'rgba(52,201,142,0.16)', alignItems: 'center', justifyContent: 'center' },
  permTitle: { ...font.bold, fontSize: 28, lineHeight: 34, color: '#FFFFFF', textAlign: 'center' },
  permText: { ...font.regular, fontSize: 17, lineHeight: 22, color: '#AEAEB2', textAlign: 'center' },
  tipsCard: { backgroundColor: '#1C1C1E', borderRadius: 16, padding: 16, gap: 14 },
  tipsLabel: { ...font.semibold, fontSize: 12, letterSpacing: 0.8, color: '#8E8E93' },
  tip: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tipIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  tipTitle: { ...font.semibold, fontSize: 16, color: '#FFFFFF' },
  tipText: { ...font.regular, fontSize: 13, color: '#AEAEB2', marginTop: 1 },
  permRow: { flexDirection: 'row', gap: 10 },
  permSecondary: { flex: 1, backgroundColor: '#2C2C2E', paddingHorizontal: 8 },
  // B2
  ui: { flex: 1, justifyContent: 'space-between' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8 },
  frameWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18 },
  frame: { width: '72%', aspectRatio: 0.63 },
  corner: { position: 'absolute', width: 48, height: 48, borderColor: BRAND_DARK },
  scanLine: {
    position: 'absolute', left: 14, right: 14, height: 2, borderRadius: 1, backgroundColor: BRAND_DARK, opacity: 0.85,
    shadowColor: BRAND_DARK, shadowOpacity: 0.8, shadowRadius: 8, shadowOffset: { width: 0, height: 0 },
  },
  hint: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(12,12,13,0.78)',
    paddingHorizontal: 14, height: 36, borderRadius: 18, maxWidth: '88%',
  },
  autoPill: {
    height: 44, paddingHorizontal: 16, borderRadius: 22, backgroundColor: GLASS, flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.15)',
  },
  autoPillOn: { backgroundColor: BRAND_DARK },
  autoText: { ...font.semibold, fontSize: 15, color: '#FFFFFF' },
  hintText: { ...font.semibold, fontSize: 15, color: '#FFFFFF', flexShrink: 1 },
  controls: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 28, paddingTop: 16, paddingBottom: 12,
    backgroundColor: 'rgba(12,12,13,0.85)',
  },
  side: { width: 48, height: 48, borderRadius: 14, backgroundColor: GLASS, alignItems: 'center', justifyContent: 'center' },
  shutter: { width: 78, height: 78, borderRadius: 39, borderWidth: 4, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFFFFF' },
  // B3
  dim: { ...FILL, backgroundColor: 'rgba(0,0,0,0.55)' },
  readTop: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modeBadge: { height: 34, paddingHorizontal: 14, borderRadius: 17, backgroundColor: GLASS, justifyContent: 'center' },
  modeText: { ...font.semibold, fontSize: 14, color: '#FFFFFF' },
  center: { ...FILL, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 32 },
  disc: {
    width: RING, height: RING, borderRadius: RING / 2, backgroundColor: 'rgba(255,255,255,0.95)', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  stageText: { ...font.bold, fontSize: 20, color: '#FFFFFF', textAlign: 'center' },
  stageSub: { ...font.regular, fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  sheetHost: { ...FILL, justifyContent: 'flex-end' },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 34, gap: 14,
  },
  // Inside the keyboard-avoiding host the sheet sits in the normal flow, so it moves up with the keyboard.
  sheetFlow: { position: 'relative' },
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: colors.grabber },
  sumTop: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  thumb: { width: 84, height: 112, borderRadius: 12, overflow: 'hidden', backgroundColor: '#26262B', borderWidth: 1, borderColor: colors.separator },
  thumbImg: { width: '100%', height: '100%' },
  thumbBadge: { position: 'absolute', right: 5, bottom: 5, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  storeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  store: { flex: 1, ...font.bold, fontSize: 22, lineHeight: 26, color: colors.text },
  catChip: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingHorizontal: 10, borderRadius: 16, maxWidth: '100%' },
  catText: { ...font.semibold, fontSize: 15, flexShrink: 1 },
  conf: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  confText: { ...font.medium, fontSize: 12, color: colors.accent, flexShrink: 1 },
  rows: { backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden' },
  sumRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, minHeight: 48 },
  sumBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
  sumLabel: { flex: 1, ...font.regular, fontSize: 17, color: colors.textSecondary },
  sumValue: { ...font.regular, fontSize: 17, color: colors.text, fontVariant: ['tabular-nums'] },
  notes: { ...font.regular, fontSize: 17, color: colors.text, backgroundColor: colors.card, borderRadius: radius.lg, paddingHorizontal: 16, height: 48 },
  sumHint: { ...font.regular, fontSize: 13, lineHeight: 18, color: colors.textSecondary, paddingHorizontal: 4, marginTop: -4 },
  sumActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  sumBtn: { flex: 1, height: 50, borderRadius: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  sumBtnText: { ...font.semibold, fontSize: 16 },
  viewerTop: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  failTitle: { ...font.bold, fontSize: 22, lineHeight: 28, color: colors.text, textAlign: 'center' },
  failText: { ...font.regular, fontSize: 15, lineHeight: 20, color: colors.textSecondary, textAlign: 'center', maxWidth: 300 },
}));
