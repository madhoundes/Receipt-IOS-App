import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, FadeIn, FadeInDown, cancelAnimation,
} from 'react-native-reanimated';
import { Zap, ZapOff, Lightbulb, Image as ImageIcon, Check, X, Sun, Scan, CircleSlash, FileText, Camera } from '../components/icons';
import { ocr } from '../services/ocr';
import { triggerHaptic } from '../utils/nativeUtils';
import { colors, font, radius } from '../theme';

const STEPS = ['Store and date', 'Total and tax', 'Line items'];

export default function CameraCaptureScreen({ navigation }: any) {
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [tips, setTips] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string>();
  const cameraRef = useRef<CameraView>(null);

  // Scan line sweeping the frame.
  const sweep = useSharedValue(0);
  useEffect(() => {
    sweep.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }), -1, true);
    return () => cancelAnimation(sweep);
  }, [sweep]);
  const lineStyle = useAnimatedStyle(() => ({ top: `${6 + sweep.value * 88}%` }));

  const analyze = async (uri: string) => {
    setError(undefined);
    setAnalyzing(true);
    setStep(0);
    const timer = setInterval(() => setStep(s => Math.min(s + 1, STEPS.length - 1)), 600);
    try {
      const result = await ocr.scanReceipt(uri);
      triggerHaptic('success');
      navigation.replace('ScanResult', { photoUri: uri, result });
    } catch {
      triggerHaptic('error');
      setError("We couldn't read that receipt. Try again with better light, or enter it manually.");
    } finally {
      clearInterval(timer);
      setAnalyzing(false);
    }
  };

  const capture = async () => {
    if (!cameraRef.current || analyzing) return;
    triggerHaptic('medium');
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      if (!photo) return;
      const small = await ImageManipulator.manipulateAsync(photo.uri, [{ resize: { width: 1400 } }], {
        compress: 0.8, format: ImageManipulator.SaveFormat.JPEG,
      });
      await analyze(small.uri);
    } catch {
      setError('The camera could not take a photo. Please try again.');
    }
  };

  const importPhoto = async () => {
    setTips(false);
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });
    if (!res.canceled && res.assets[0]) await analyze(res.assets[0].uri);
  };

  const manualEntry = () => { setTips(false); navigation.replace('ScanResult', { photoUri: null, result: null }); };

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.container, styles.permission]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.cancelTop} accessibilityRole="button"><Text style={styles.cancelText}>Cancel</Text></Pressable>
        <View style={styles.permIcon}><Camera size={34} color="#FFFFFF" /></View>
        <Text style={styles.permTitle}>Camera Access Needed</Text>
        <Text style={styles.permText}>Receipt TaX uses the camera to scan your receipts. You can also import a photo or type one in.</Text>
        <Pressable
          style={styles.permPrimary}
          onPress={() => (permission.canAskAgain ? requestPermission() : Linking.openSettings())}
          accessibilityRole="button"
        >
          <Text style={styles.permPrimaryText}>{permission.canAskAgain ? 'Allow Camera' : 'Open Settings'}</Text>
        </Pressable>
        <Pressable style={styles.permSecondary} onPress={importPhoto} accessibilityRole="button"><Text style={styles.permSecondaryText}>Import from Photos</Text></Pressable>
        <Pressable style={styles.permSecondary} onPress={manualEntry} accessibilityRole="button"><Text style={styles.permSecondaryText}>Enter Manually</Text></Pressable>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} enableTorch={torch} />

      <SafeAreaView style={styles.ui}>
        <View style={styles.topBar}>
          <Pressable onPress={() => navigation.goBack()} style={styles.pill} accessibilityRole="button">
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable onPress={() => setTips(true)} style={styles.round} accessibilityRole="button" accessibilityLabel="Scanning tips">
              <Lightbulb size={20} color="#FFFFFF" />
            </Pressable>
            <Pressable onPress={() => setTorch(t => !t)} style={[styles.pill, styles.flash]} accessibilityRole="button" accessibilityLabel={torch ? 'Flash on' : 'Flash off'}>
              {torch ? <Zap size={18} color="#FFD60A" fill="#FFD60A" /> : <ZapOff size={18} color="#FFFFFF" />}
              <Text style={[styles.flashText, torch && { color: '#FFD60A' }]}>{torch ? 'On' : 'Off'}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.frameWrap}>
          <View style={styles.frame}>
            <View style={[styles.corner, { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 18 }]} />
            <View style={[styles.corner, { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 18 }]} />
            <View style={[styles.corner, { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 18 }]} />
            <View style={[styles.corner, { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 18 }]} />
            <Animated.View style={[styles.scanLine, lineStyle]} />
          </View>
          <Text style={styles.hint}>{error ?? 'Align receipt within frame'}</Text>
        </View>

        <View style={styles.bottom}>
          <View style={styles.modes}>
            <Text style={[styles.mode, styles.modeActive]}>Scan</Text>
            <Pressable onPress={manualEntry} accessibilityRole="button"><Text style={styles.mode}>Manual Entry</Text></Pressable>
          </View>
          <View style={styles.controls}>
            <Pressable onPress={importPhoto} style={styles.side} accessibilityRole="button" accessibilityLabel="Import from Photos">
              <View style={styles.sideIcon}><ImageIcon size={22} color="#FFFFFF" /></View>
              <Text style={styles.sideText}>Import</Text>
            </Pressable>
            <Pressable onPress={capture} style={styles.shutter} accessibilityRole="button" accessibilityLabel="Capture receipt">
              <View style={styles.shutterInner} />
            </Pressable>
            <View style={styles.side} />
          </View>
        </View>
      </SafeAreaView>

      {analyzing && (
        <Animated.View entering={FadeIn} style={styles.analyzing} accessibilityLiveRegion="polite">
          <View style={styles.spinnerRing}><FileText size={30} color="#FFFFFF" /></View>
          <Text style={styles.analyzingTitle}>Analyzing Receipt...</Text>
          <Text style={styles.analyzingSub}>Extracting items and prices</Text>
          <View style={styles.steps}>
            {STEPS.map((s, i) => (
              <View key={s} style={styles.stepRow}>
                {i < step ? <Check size={16} color="#5FD3E0" strokeWidth={3} /> : <View style={styles.stepDot} />}
                <Text style={[styles.stepText, i < step && { color: '#E5E5EA' }]}>{s}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      )}

      <Modal visible={tips} transparent animationType="slide" onRequestClose={() => setTips(false)}>
        <Pressable style={styles.backdrop} onPress={() => setTips(false)} accessibilityLabel="Close tips" />
        <Animated.View entering={FadeInDown} style={styles.sheet}>
          <View style={styles.grabber} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Scanning Tips</Text>
            <Pressable onPress={() => setTips(false)} style={styles.sheetClose} accessibilityRole="button" accessibilityLabel="Close tips">
              <X size={16} color="#3A3A40" />
            </Pressable>
          </View>
          <Tip Icon={Sun} tint="#FBF1CF" color="#8A6100" title="Lighting is Key" text="Ensure the receipt is well-lit. Turn on the flash if needed." />
          <Tip Icon={Scan} tint={colors.accentSoft} color={colors.accent} title="Frame it Right" text="Fit the entire receipt within the edges. Keep it flat." />
          <Tip Icon={CircleSlash} tint="#FBE4E4" color="#B42318" title="Avoid Glare" text="Watch out for shiny thermal paper glare that hides text." />
          <View style={styles.sheetDivider} />
          <Pressable style={styles.sheetBtn} onPress={importPhoto} accessibilityRole="button">
            <ImageIcon size={18} color={colors.accent} /><Text style={[styles.sheetBtnText, { color: colors.accent }]}>Import from Photos</Text>
          </Pressable>
          <Pressable style={styles.sheetBtn} onPress={manualEntry} accessibilityRole="button">
            <FileText size={18} color="#3A3A40" /><Text style={styles.sheetBtnText}>Enter Manually</Text>
          </Pressable>
        </Animated.View>
      </Modal>
    </View>
  );
}

const Tip = ({ Icon, tint, color, title, text }: { Icon: typeof Sun; tint: string; color: string; title: string; text: string }) => (
  <View style={styles.tip}>
    <View style={[styles.tipIcon, { backgroundColor: tint }]}><Icon size={22} color={color} /></View>
    <View style={{ flex: 1 }}>
      <Text style={styles.tipTitle}>{title}</Text>
      <Text style={styles.tipText}>{text}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B0D' },
  ui: { flex: 1, justifyContent: 'space-between' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8 },
  pill: { height: 44, paddingHorizontal: 16, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center' },
  cancelText: { ...font.semibold, fontSize: 16, color: '#FFFFFF' },
  round: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  flash: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  flashText: { ...font.bold, fontSize: 14, color: '#FFFFFF' },
  frameWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18 },
  frame: { width: '72%', aspectRatio: 0.63 },
  corner: { position: 'absolute', width: 44, height: 44, borderColor: '#FFFFFF' },
  scanLine: {
    position: 'absolute', left: 14, right: 14, height: 3, borderRadius: 2, backgroundColor: '#5FD3E0',
    shadowColor: '#5FD3E0', shadowOpacity: 0.9, shadowRadius: 10, shadowOffset: { width: 0, height: 0 },
  },
  hint: {
    ...font.semibold, fontSize: 14, color: '#FFFFFF', backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, overflow: 'hidden', textAlign: 'center', maxWidth: '85%',
  },
  bottom: { paddingHorizontal: 28, paddingBottom: 20, gap: 22 },
  modes: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  mode: { ...font.semibold, fontSize: 13, color: '#C7C7CC', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14, overflow: 'hidden' },
  modeActive: { color: '#FFFFFF', backgroundColor: 'rgba(255,255,255,0.18)', ...font.bold },
  controls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  side: { width: 56, alignItems: 'center', gap: 4 },
  sideIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  sideText: { ...font.semibold, fontSize: 11, color: '#C7C7CC' },
  shutter: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#FFFFFF' },
  analyzing: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(8,8,10,0.82)', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 40 },
  spinnerRing: { width: 84, height: 84, borderRadius: 42, borderWidth: 5, borderColor: '#5FD3E0', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  analyzingTitle: { ...font.bold, fontSize: 20, color: '#FFFFFF' },
  analyzingSub: { ...font.regular, fontSize: 15, color: '#C7C7CC' },
  steps: { gap: 10, marginTop: 22, width: 220 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: '#6B6B72' },
  stepText: { ...font.regular, fontSize: 14, color: '#AEAEB2' },
  permission: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  cancelTop: { position: 'absolute', top: 60, left: 16, height: 44, justifyContent: 'center', paddingHorizontal: 8 },
  permIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  permTitle: { ...font.extrabold, fontSize: 24, color: '#FFFFFF' },
  permText: { ...font.regular, fontSize: 16, lineHeight: 23, color: '#C7C7CC', textAlign: 'center', marginBottom: 12 },
  permPrimary: { alignSelf: 'stretch', height: 54, borderRadius: radius.lg, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  permPrimaryText: { ...font.bold, fontSize: 17, color: '#0B7A55' },
  permSecondary: { alignSelf: 'stretch', height: 50, alignItems: 'center', justifyContent: 'center' },
  permSecondaryText: { ...font.semibold, fontSize: 16, color: '#FFFFFF' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 40, gap: 16 },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: '#C7C7CC' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetTitle: { ...font.extrabold, fontSize: 22, color: colors.text },
  sheetClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.fill, alignItems: 'center', justifyContent: 'center' },
  tip: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  tipIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tipTitle: { ...font.bold, fontSize: 16, color: colors.text },
  tipText: { ...font.regular, fontSize: 14, lineHeight: 20, color: colors.textSecondary, marginTop: 2 },
  sheetDivider: { height: 1, backgroundColor: '#D8D8DE' },
  sheetBtn: {
    height: 52, borderRadius: 14, borderWidth: 1, borderColor: '#D8D8DE', backgroundColor: '#FFFFFF',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  sheetBtnText: { ...font.bold, fontSize: 16, color: '#3A3A40' },
});
