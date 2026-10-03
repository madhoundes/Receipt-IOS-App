import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import Animated, {
  Easing, FadeIn, FadeInDown, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming,
} from 'react-native-reanimated';
import {
  Camera, Check, CircleSlash, Edit, Image as ImageIcon, Lightbulb, Scan, Sparkles, Sun, X, Zap, ZapOff,
} from '../components/icons';
import { Illustration } from '../components/Illustration';
import { Button } from '../components/ui';
import { ocr } from '../services/ocr';
import { triggerHaptic } from '../utils/nativeUtils';
import { colors, font } from '../theme';

const BRAND_DARK = '#34C98E';
const STEPS = ['Store and date', 'Total and HST', 'Line items', 'Category and payment'];

type Phase = 'camera' | 'reading' | 'failed';

export default function CameraCaptureScreen({ navigation, route }: any) {
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [phase, setPhase] = useState<Phase>('camera');
  const [photoUri, setPhotoUri] = useState<string>();
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string>();
  const cameraRef = useRef<CameraView>(null);
  // Bumped when the user backs out, so a late OCR result is ignored.
  const run = useRef(0);

  // Soft scan line sweeping the frame (position only, as the motion rules allow).
  const sweep = useSharedValue(0);
  useEffect(() => {
    sweep.value = withRepeat(withTiming(1, { duration: 2000, easing: Easing.bezier(0.35, 0, 0.65, 1) }), -1, true);
    return () => cancelAnimation(sweep);
  }, [sweep]);
  const lineStyle = useAnimatedStyle(() => ({ top: `${6 + sweep.value * 88}%` }));

  const manualEntry = () => navigation.replace('ScanResult', { photoUri: null, result: null });

  const analyze = async (uri: string) => {
    const id = ++run.current;
    setError(undefined);
    setPhotoUri(uri);
    setPhase('reading');
    setStep(0);
    setDone(false);
    const timer = setInterval(() => setStep(s => Math.min(s + 1, STEPS.length - 1)), 700);
    try {
      const result = await ocr.scanReceipt(uri);
      if (id !== run.current) return;
      setDone(true);
      triggerHaptic('success');
      setTimeout(() => { if (id === run.current) navigation.replace('ScanResult', { photoUri: uri, result }); }, 350);
    } catch {
      if (id !== run.current) return;
      triggerHaptic('error');
      setPhase('failed');
    } finally {
      clearInterval(timer);
    }
  };

  const capture = async () => {
    if (!cameraRef.current || phase !== 'camera') return;
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
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });
    if (!res.canceled && res.assets[0]) await analyze(res.assets[0].uri);
  };

  const backToCamera = () => {
    run.current += 1;
    setPhase('camera');
    setPhotoUri(undefined);
  };

  // A photo picked elsewhere (the empty Receipts screen) goes straight to reading.
  const importUri: string | undefined = route?.params?.importUri;
  useEffect(() => {
    if (importUri) analyze(importUri);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importUri]);

  if (!permission) return <View style={styles.container} />;

  // B1 · Camera Access
  if (!permission.granted && phase === 'camera') {
    const blocked = !permission.canAskAgain;
    return (
      <SafeAreaView style={styles.container}>
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
                ? 'Turn the camera on for Receipt TaX in Settings, or import a photo or type the receipt in.'
                : 'Receipt TaX uses the camera only to photograph receipts. Photos stay in the app.'}
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
            <Button title="Import Photo" variant="dark" icon={<ImageIcon size={18} color="#FFFFFF" />} onPress={importPhoto} compact style={styles.permSecondary} />
            <Button title="Enter Manually" variant="dark" icon={<Edit size={18} color="#FFFFFF" />} onPress={manualEntry} compact style={styles.permSecondary} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // B3 · Reading Receipt (and the failed state)
  if (phase !== 'camera' && photoUri) {
    const progress = done ? 1 : (step + 0.5) / STEPS.length;
    return (
      <View style={styles.container}>
        <Image source={{ uri: photoUri }} style={styles.readPhoto} resizeMode="contain" />
        <SafeAreaView style={styles.readTop} edges={['top']}>
          <Pressable onPress={backToCamera} style={styles.round} accessibilityRole="button" accessibilityLabel="Cancel">
            <X size={20} color="#FFFFFF" />
          </Pressable>
        </SafeAreaView>

        <Animated.View entering={FadeInDown} style={styles.sheet}>
          <View style={styles.grabber} />
          {phase === 'failed' ? (
            <View style={{ alignItems: 'center', gap: 6 }} accessibilityLiveRegion="polite">
              <Illustration name="scanFailed" size={140} label="We could not read the receipt" />
              <Text style={styles.failTitle}>We couldn’t read that receipt</Text>
              <Text style={styles.failText}>Try again with better light and the whole receipt in the frame, or type it in.</Text>
              <View style={{ alignSelf: 'stretch', gap: 10, marginTop: 14 }}>
                <Button title="Try Again" onPress={() => analyze(photoUri)} />
                <Button title="Enter Manually" variant="tinted" onPress={manualEntry} />
              </View>
            </View>
          ) : (
            <>
              <View style={styles.readHead} accessibilityLiveRegion="polite">
                <View style={styles.sparkle}><Sparkles size={20} color={colors.accent} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.readTitle}>Reading receipt</Text>
                  <Text style={styles.readSub}>This usually takes a few seconds</Text>
                </View>
              </View>
              <View style={styles.track}><View style={[styles.fill, { width: `${progress * 100}%` }]} /></View>
              <View style={styles.stepsCard}>
                {STEPS.map((s, i) => {
                  const complete = done || i < step;
                  const active = !complete && i === step;
                  return (
                    <View key={s} style={[styles.stepRow, i > 0 && styles.stepBorder]}>
                      {complete ? (
                        <View style={styles.stepDone}><Check size={14} color="#FFFFFF" strokeWidth={2.6} /></View>
                      ) : active ? (
                        <ActivityIndicator size="small" color={colors.accent} style={styles.stepSpin} />
                      ) : (
                        <View style={styles.stepIdle} />
                      )}
                      <Text style={[styles.stepText, !complete && !active && { color: colors.placeholder }]}>{s}</Text>
                    </View>
                  );
                })}
              </View>
              <Button title="Review Details" onPress={() => {}} loading={!done} disabled={!done} />
            </>
          )}
        </Animated.View>
      </View>
    );
  }

  // B2 · Scan
  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} enableTorch={torch} />

      <SafeAreaView style={styles.ui}>
        <View style={styles.topBar}>
          <Pressable onPress={() => navigation.goBack()} style={styles.round} accessibilityRole="button" accessibilityLabel="Close">
            <X size={20} color="#FFFFFF" />
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
            <Text style={styles.hintText}>{error ?? 'Fit the whole receipt in the frame'}</Text>
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

const styles = StyleSheet.create({
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
  hintText: { ...font.semibold, fontSize: 15, color: '#FFFFFF', flexShrink: 1 },
  controls: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 28, paddingTop: 16, paddingBottom: 12,
    backgroundColor: 'rgba(12,12,13,0.85)',
  },
  side: { width: 48, height: 48, borderRadius: 14, backgroundColor: GLASS, alignItems: 'center', justifyContent: 'center' },
  shutter: { width: 78, height: 78, borderRadius: 39, borderWidth: 4, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFFFFF' },
  // B3
  readPhoto: { position: 'absolute', top: 0, left: 0, right: 0, height: '55%' },
  readTop: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 8 },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 34, gap: 14,
  },
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: '#C7C7CC' },
  readHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sparkle: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  readTitle: { ...font.bold, fontSize: 22, lineHeight: 28, color: colors.text },
  readSub: { ...font.regular, fontSize: 13, color: colors.textSecondary },
  track: { height: 4, borderRadius: 2, backgroundColor: colors.fill, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2, backgroundColor: colors.accent },
  stepsCard: { backgroundColor: colors.card, borderRadius: 14, overflow: 'hidden' },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, minHeight: 46 },
  stepBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
  stepDone: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  stepSpin: { width: 22, height: 22 },
  stepIdle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#D1D1D6' },
  stepText: { ...font.regular, fontSize: 17, color: colors.text },
  failTitle: { ...font.bold, fontSize: 22, lineHeight: 28, color: colors.text, textAlign: 'center' },
  failText: { ...font.regular, fontSize: 15, lineHeight: 20, color: colors.textSecondary, textAlign: 'center', maxWidth: 300 },
});
