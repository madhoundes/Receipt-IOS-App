import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, useWindowDimensions, Pressable, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight, Camera, ScanLine, Percent, Layers, BarChart3, ChevronLeft } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { triggerHaptic } from '../../utils/nativeUtils';
import { colors, fonts, radius } from '../../theme';

const SLIDES = [
  { key: 'welcome', title: 'Welcome to Receiptfy', subtitle: 'Snap, auto-scan, and track your spend — without the spreadsheet.', Icon: Camera, tint: '#E3EEFF', color: colors.accent },
  { key: 'capture', title: 'Capture and extract', subtitle: 'Take a photo. OCR auto-fills store, date, total, and tax.', Icon: ScanLine, tint: '#DDF1F4', color: '#0E7C8C' },
  { key: 'tax', title: 'Tax‑ready & discounts', subtitle: 'Applies Canadian HST (13%) by default and captures line‑item discounts. Export clean CSV for tax time.', Icon: Percent, tint: '#DDF4EA', color: colors.success },
  { key: 'organize', title: 'Organize effortlessly', subtitle: 'Smart suggestions for categories. Search everything later.', Icon: Layers, tint: '#E9E6FB', color: '#4A34B8' },
  { key: 'insights', title: 'See where money goes', subtitle: 'Weekly and monthly insights, plus tips to help you save.', Icon: BarChart3, tint: '#FDEBDD', color: colors.tax },
];

export default function OnboardingScreen({ navigation }: any) {
  const { width } = useWindowDimensions();
  const { completeOnboarding } = useAuth();
  const listRef = useRef<FlatList>(null);
  const [index, setIndex] = useState(0);
  const last = index === SLIDES.length - 1;

  const finish = async () => {
    triggerHaptic('medium');
    await completeOnboarding();
    navigation.navigate('SignUp');
  };

  const goTo = (i: number) => {
    triggerHaptic('light');
    listRef.current?.scrollToIndex({ index: i, animated: true });
    setIndex(i);
  };

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        {index > 0 ? (
          <Pressable onPress={() => goTo(index - 1)} accessibilityRole="button" accessibilityLabel="Back" style={styles.iconBtn}>
            <ChevronLeft size={24} color={colors.accent} />
          </Pressable>
        ) : <View style={styles.iconBtn} />}
        {!last && (
          <Pressable onPress={finish} accessibilityRole="button" style={styles.skip}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        keyExtractor={s => s.key}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={styles.art}>
              <View style={[styles.artCircle, { backgroundColor: item.tint }]} />
              <View style={[styles.artTile, { shadowColor: item.color }]}>
                <item.Icon size={72} color={item.color} strokeWidth={1.6} />
              </View>
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.subtitle}</Text>
          </View>
        )}
      />

      <View style={styles.bottom}>
        <View style={styles.dots} accessibilityLabel={`Step ${index + 1} of ${SLIDES.length}`}>
          {SLIDES.map((s, i) => (
            <View key={s.key} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
        <Pressable
          onPress={last ? finish : () => goTo(index + 1)}
          accessibilityRole="button"
          style={({ pressed }) => [styles.next, last && styles.nextWide, pressed && { opacity: 0.9 }]}
        >
          <Text style={styles.nextText}>{last ? 'Get Started' : 'Next'}</Text>
          <ArrowRight size={20} color="#FFFFFF" strokeWidth={2.4} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  topBar: { height: 52, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  skip: { paddingHorizontal: 12, height: 44, justifyContent: 'center' },
  skipText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.accent },
  slide: { flex: 1, paddingHorizontal: 28, justifyContent: 'center' },
  art: { height: 320, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  artCircle: { position: 'absolute', width: 290, height: 290, borderRadius: 145 },
  artTile: {
    width: 150, height: 150, borderRadius: 40, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
    shadowOpacity: 0.2, shadowRadius: 24, shadowOffset: { width: 0, height: 14 }, elevation: 6,
  },
  title: { fontFamily: fonts.extrabold, fontSize: 34, lineHeight: 38, letterSpacing: -1, color: colors.text, marginBottom: 12 },
  subtitle: { fontFamily: fonts.regular, fontSize: 17, lineHeight: 25, color: colors.textSecondary },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingBottom: 16, paddingTop: 8 },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#C7C7CC' },
  dotActive: { width: 24, backgroundColor: colors.accent },
  next: {
    height: 56, paddingLeft: 26, paddingRight: 22, borderRadius: radius.pill, backgroundColor: colors.accent,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  nextWide: { paddingLeft: 28 },
  nextText: { fontFamily: fonts.bold, fontSize: 17, color: '#FFFFFF' },
});
