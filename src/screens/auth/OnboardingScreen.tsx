import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, useWindowDimensions, Pressable, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Scan, Undo, PieChart, LayoutGrid, BarChart3, Check, FileDown, AppIcon } from '../../components/icons';
import { Button } from '../../components/ui';
import { Illustration } from '../../components/Illustration';
import { useAuth } from '../../context/AuthContext';
import { triggerHaptic } from '../../utils/nativeUtils';
import { colors, font, soft, themedStyles, tone } from '../../theme';

type Slide = { key: string; title: string; subtitle: string; art: 'hero' | 'scan' | 'tax' | 'organize' | 'insights' };

// A2 Welcome (1 of 5) and A3 Walkthrough
const SLIDES: Slide[] = [
  { key: 'welcome', art: 'hero', title: 'Every receipt.\nEvery dollar of HST.', subtitle: 'Scan once. Keep it for returns, and hand your accountant a clean tax year.' },
  { key: 'capture', art: 'scan', title: 'Capture and extract', subtitle: 'Take a photo. The store, date, total and tax are read for you.' },
  { key: 'tax', art: 'tax', title: 'Tax-ready, the Canadian way', subtitle: 'HST at 13% is applied by default, zero-rated groceries are kept apart, and line-item discounts are captured.' },
  { key: 'organize', art: 'organize', title: 'Organize effortlessly', subtitle: 'Receipts sort themselves into categories. Search everything later.' },
  { key: 'insights', art: 'insights', title: 'See where money goes', subtitle: 'Monthly totals and HST by category, ready whenever you need them.' },
];

// A function, so the colours follow the active scheme.
const features = (): { Icon: AppIcon; tint: string; color: string; title: string; text: string }[] => [
  { Icon: Scan, tint: colors.accentSoft, color: colors.accent, title: 'Scan in seconds', text: 'Store, date, total and HST read for you' },
  { Icon: Undo, tint: colors.taxSoft, color: colors.tax, title: 'Never miss a return', text: 'The original image, always one tap away' },
  { Icon: PieChart, tint: soft(tone('#0A5BC4')), color: tone('#0A5BC4'), title: 'Tax-ready reports', text: 'HST by category, ready to export' },
];

function HeroArt() {
  return (
    <View style={styles.hero}>
      <Illustration name="hero" size={260} label="A receipt is scanned line by line, then a saved badge appears" />
      <View style={[styles.chip, styles.chipHst]}><Text style={styles.chipHstText}>HST $2.10</Text></View>
      <View style={[styles.chip, styles.chipSaved]}>
        <View style={styles.chipTick}><Check size={14} color="#FFFFFF" strokeWidth={3} /></View>
        <Text style={styles.chipSavedText}>Saved to Grocery</Text>
      </View>
    </View>
  );
}

function TaxArt() {
  const bar = [
    { flex: 34, color: '#B04A08' }, { flex: 22, color: '#0A5BC4' }, { flex: 18, color: '#0B6E77' }, { flex: 26, color: '#B8185A' },
  ];
  return (
    <View style={styles.taxCard}>
      <Text style={styles.taxLabel}>SEPTEMBER · ONTARIO</Text>
      <View style={styles.taxRow}><Text style={styles.taxText}>Subtotal</Text><Text style={styles.taxText}>$1,233.87</Text></View>
      <View style={styles.taxRow}><Text style={styles.taxHst}>HST 13%</Text><Text style={styles.taxHst}>$184.37</Text></View>
      <View style={styles.taxRule} />
      <View style={styles.taxRow}><Text style={styles.taxTotal}>Total</Text><Text style={styles.taxTotal}>$1,418.24</Text></View>
      <View style={styles.taxBar}>{bar.map((b, i) => <View key={i} style={{ flex: b.flex, backgroundColor: b.color }} />)}</View>
      <View style={styles.taxFoot}><FileDown size={16} color={colors.accent} /><Text style={styles.taxFootText}>Ready to export for your accountant</Text></View>
    </View>
  );
}

function IconArt({ Icon, tint, color }: { Icon: AppIcon; tint: string; color: string }) {
  return (
    <View style={[styles.iconCircle, { backgroundColor: tint }]}>
      <View style={styles.iconTile}><Icon size={72} color={color} /></View>
    </View>
  );
}

function Art({ kind }: { kind: Slide['art'] }) {
  if (kind === 'hero') return <HeroArt />;
  if (kind === 'tax') return <TaxArt />;
  if (kind === 'scan') return <IconArt Icon={Scan} tint={colors.accentSoft} color={colors.accent} />;
  if (kind === 'organize') return <IconArt Icon={LayoutGrid} tint={soft(tone('#5A3CC2'))} color={tone('#5A3CC2')} />;
  return <IconArt Icon={BarChart3} tint={colors.taxSoft} color={colors.tax} />;
}

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
        <Pressable onPress={() => (index > 0 ? goTo(index - 1) : navigation.goBack())} accessibilityRole="button"
          accessibilityLabel="Back" style={styles.iconBtn} hitSlop={6}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        {!last && (
          <Pressable onPress={finish} accessibilityRole="button" style={styles.skip} hitSlop={6}>
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
            <View style={styles.art}><Art kind={item.art} /></View>
            <Text style={styles.title} accessibilityRole="header">{item.title}</Text>
            <Text style={styles.subtitle}>{item.subtitle}</Text>
            {item.art === 'hero' && (
              <View style={styles.features}>
                {features().map(f => (
                  <View key={f.title} style={styles.feature}>
                    <View style={[styles.featureIcon, { backgroundColor: f.tint }]}><f.Icon size={22} color={f.color} /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.featureTitle}>{f.title}</Text>
                      <Text style={styles.featureText}>{f.text}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      />

      <View style={styles.bottom}>
        <View style={styles.dots} accessibilityLabel={`Step ${index + 1} of ${SLIDES.length}`}>
          {SLIDES.map((s, i) => <View key={s.key} style={[styles.dot, i === index && styles.dotActive]} />)}
        </View>
        <Button title={last ? 'Get Started' : 'Continue'} onPress={last ? finish : () => goTo(index + 1)} />
      </View>
    </SafeAreaView>
  );
}

const shadow = { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 3 };

const styles = themedStyles(() => ({
  container: { flex: 1, backgroundColor: colors.bg },
  topBar: { height: 44, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16 },
  iconBtn: { width: 44, height: 44, justifyContent: 'center' },
  skip: { height: 44, justifyContent: 'center' },
  skipText: { ...font.regular, fontSize: 17, color: colors.accent },
  slide: { paddingHorizontal: 24 },
  art: { height: 290, alignItems: 'center', justifyContent: 'center' },
  title: { ...font.bold, fontSize: 32, lineHeight: 38, letterSpacing: -0.4, color: colors.text, textAlign: 'center', marginTop: 4 },
  subtitle: { ...font.regular, fontSize: 17, lineHeight: 22, color: colors.textSecondary, textAlign: 'center', marginTop: 10 },

  hero: { width: 300, height: 280, alignItems: 'center', justifyContent: 'center' },
  chip: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 6, ...shadow },
  chipHst: { right: 0, top: 34, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16, backgroundColor: colors.taxSoft },
  chipHstText: { ...font.bold, fontSize: 13, color: colors.tax },
  chipSaved: { left: 0, bottom: 30, paddingVertical: 8, paddingLeft: 8, paddingRight: 12, borderRadius: 18, backgroundColor: colors.elevated },
  chipTick: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.accentFill, alignItems: 'center', justifyContent: 'center' },
  chipSavedText: { ...font.semibold, fontSize: 13, color: colors.text },

  features: { gap: 16, marginTop: 24, paddingHorizontal: 8 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  featureIcon: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  featureTitle: { ...font.semibold, fontSize: 17, color: colors.text },
  featureText: { ...font.regular, fontSize: 15, color: colors.textSecondary, marginTop: 1 },

  taxCard: { width: 250, backgroundColor: colors.card, borderRadius: 22, padding: 20, gap: 12, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 36, shadowOffset: { width: 0, height: 18 }, elevation: 6 },
  taxLabel: { ...font.semibold, fontSize: 12, letterSpacing: 0.5, color: colors.textSecondary },
  taxRow: { flexDirection: 'row', justifyContent: 'space-between' },
  taxText: { ...font.regular, fontSize: 15, color: colors.text, fontVariant: ['tabular-nums'] },
  taxHst: { ...font.semibold, fontSize: 15, color: colors.tax, fontVariant: ['tabular-nums'] },
  taxRule: { height: StyleSheet.hairlineWidth, backgroundColor: colors.separator },
  taxTotal: { ...font.bold, fontSize: 17, color: colors.text, fontVariant: ['tabular-nums'] },
  taxBar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', gap: 2 },
  taxFoot: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  taxFootText: { ...font.semibold, fontSize: 13, color: colors.accent },

  iconCircle: { width: 250, height: 250, borderRadius: 125, alignItems: 'center', justifyContent: 'center' },
  iconTile: { width: 140, height: 140, borderRadius: 36, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center', ...shadow },

  bottom: { paddingHorizontal: 24, paddingBottom: 12, paddingTop: 8, gap: 16 },
  dots: { flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.grabber },
  dotActive: { width: 18, backgroundColor: colors.accent },
}));
