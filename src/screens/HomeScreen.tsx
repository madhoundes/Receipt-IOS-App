import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, ChevronDown, Sparkles, TrendUp, Undo } from '../components/icons';
import { Illustration } from '../components/Illustration';
import { initialsOf } from '../components/MerchantAvatar';
import { LargeHeader, ReceiptRow, RoundButton, TAB_BAR_SPACE, kit } from '../components/kit';
import { Button } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useReceipts } from '../context/ReceiptContext';
import { daysLeft, openReturns } from '../utils/returns';
import { spendByCategory } from '../utils/spend';
import { formatCents, resolveReceiptTax, summarizeTax } from '../utils/tax';
import { colors, font, radius, themedStyles } from '../theme';

const monthLabel = (d: Date) => d.toLocaleDateString('en-CA', { month: 'long', year: 'numeric' });

/** D1 · Home: the month's HST at a glance, things that need attention, and recent receipts. */
export default function HomeScreen({ navigation }: any) {
  const { user } = useAuth();
  const { receipts, categories, userProfile } = useReceipts();
  const [anchor, setAnchor] = useState(() => new Date());
  const [picker, setPicker] = useState(false);
  const now = new Date();
  const isThisMonth = anchor.getMonth() === now.getMonth() && anchor.getFullYear() === now.getFullYear();

  const data = useMemo(() => {
    const tax = summarizeTax(receipts, categories, userProfile.hstDefaultPercent, 'month', anchor);
    const inMonth = receipts.filter(r => { const d = new Date(r.purchaseDate); return d >= tax.range.start && d < tax.range.end; });
    const recent = [...receipts].sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()).slice(0, 4);
    const closing = openReturns(receipts, new Date()).filter(r => daysLeft(r.returnBy!, new Date()) <= 7).length;
    const review = receipts.filter(r => resolveReceiptTax(r, categories, userProfile.hstDefaultPercent).status === 'needsReview').length;
    return { tax, shares: spendByCategory(inMonth).slice(0, 4), recent, closing, review };
  }, [receipts, categories, userProfile.hstDefaultPercent, anchor]);

  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => new Date(now.getFullYear(), now.getMonth() - i, 1)), [now.getFullYear(), now.getMonth()]);
  const review = data.review;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LargeHeader
          eyebrow={now.toLocaleDateString('en-CA', { weekday: 'long', month: 'short', day: 'numeric' })}
          title="Summary"
          right={<>
            <RoundButton label="Insights" onPress={() => navigation.navigate('Insights')}><TrendUp size={20} color={colors.text} /></RoundButton>
            <Pressable onPress={() => navigation.navigate('Profile')} accessibilityRole="button" accessibilityLabel="Profile and settings" style={styles.avatar}>
              <Text style={styles.avatarText}>{initialsOf(user?.name ?? 'You').slice(0, 1)}</Text>
            </Pressable>
          </>}
        />

        <Pressable onPress={() => setPicker(true)} style={styles.month} accessibilityRole="button" accessibilityLabel={`Month: ${monthLabel(anchor)}. Change`}>
          <Text style={styles.monthText}>{monthLabel(anchor)}</Text>
          <ChevronDown size={14} color={colors.text} />
        </Pressable>

        {receipts.length === 0 ? (
          <View style={styles.empty}>
            <Illustration name="emptyReceipts" size={180} label="No receipts yet" />
            <Text style={styles.emptyTitle}>No receipts yet</Text>
            <Text style={styles.emptyText}>Scan a paper receipt or import a photo. The store, total and HST are read for you.</Text>
            <Button title="Scan a Receipt" onPress={() => navigation.navigate('CameraModal')} style={{ alignSelf: 'center', paddingHorizontal: 28, marginTop: 8 }} />
          </View>
        ) : (
          <>
            <Pressable style={styles.hero} onPress={() => navigation.navigate('HST')} accessibilityRole="button"
              accessibilityLabel={`HST paid ${formatCents(data.tax.hstCents)} on ${formatCents(data.tax.spendCents)} spent, ${data.tax.receiptCount} receipts`}>
              <Text style={styles.heroLabel}>{isThisMonth ? 'HST PAID THIS MONTH' : 'HST PAID'}</Text>
              <Text style={styles.heroValue} numberOfLines={1} adjustsFontSizeToFit>{formatCents(data.tax.hstCents)}</Text>
              <Text style={styles.heroSub}>
                on {formatCents(data.tax.spendCents)} spent · {data.tax.receiptCount} {data.tax.receiptCount === 1 ? 'receipt' : 'receipts'}
              </Text>
              {data.shares.length > 0 && (
                <>
                  <View style={styles.bar}>
                    {data.shares.map((s, i) => (
                      <View key={s.category} style={{ flex: Math.max(s.share, 0.04), height: 6, borderRadius: 3, backgroundColor: '#FFFFFF', opacity: 1 - i * 0.22 }} />
                    ))}
                  </View>
                  <View style={styles.legend}>
                    {data.shares.map(s => (
                      <Text key={s.category} style={styles.legendText} numberOfLines={1}>{s.category} {Math.round(s.share * 100)}%</Text>
                    ))}
                  </View>
                </>
              )}
            </Pressable>

            <View style={styles.tiles}>
              <Pressable style={styles.tile} onPress={() => navigation.navigate('Reminders')} accessibilityRole="button">
                <View style={[styles.tileIcon, { backgroundColor: colors.taxSoft }]}><Undo size={18} color={colors.tax} /></View>
                <Text style={styles.tileNum}>{data.closing}</Text>
                <Text style={styles.tileText}>Return {data.closing === 1 ? 'window' : 'windows'} closing this week</Text>
              </Pressable>
              <Pressable style={styles.tile} onPress={() => navigation.navigate('HST')} accessibilityRole="button">
                <View style={[styles.tileIcon, { backgroundColor: colors.accentSoft }]}><Sparkles size={18} color={colors.accent} /></View>
                <Text style={styles.tileNum}>{review}</Text>
                <Text style={styles.tileText}>{review === 1 ? 'Receipt needs' : 'Receipts need'} a quick review</Text>
              </Pressable>
            </View>

            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Recent</Text>
              <Pressable onPress={() => navigation.navigate('Receipts')} accessibilityRole="button" hitSlop={8}><Text style={kit.link}>See All</Text></Pressable>
            </View>
            <View style={[kit.card, { marginHorizontal: 16 }]}>
              {data.recent.map((r, i) => (
                <ReceiptRow key={r.id} receipt={r} first={i === 0} onPress={() => navigation.navigate('ReceiptDetail', { receiptId: r.id })} />
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <Modal visible={picker} transparent animationType="fade" onRequestClose={() => setPicker(false)}>
        <Pressable style={styles.backdrop} onPress={() => setPicker(false)} accessibilityLabel="Close" />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <Text style={styles.sheetTitle}>Month</Text>
          <ScrollView style={{ maxHeight: 380 }}>
            <View style={kit.card}>
              {months.map((m, i) => {
                const on = m.getMonth() === anchor.getMonth() && m.getFullYear() === anchor.getFullYear();
                return (
                  <Pressable key={i} onPress={() => { setAnchor(m); setPicker(false); }} accessibilityRole="button" accessibilityState={{ selected: on }}
                    style={[styles.opt, i > 0 && kit.rowBorder]}>
                    <Text style={[styles.optText, on && font.semibold]}>{monthLabel(m)}</Text>
                    {on && <Check size={20} color={colors.accent} />}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = themedStyles(() => ({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: TAB_BAR_SPACE, gap: 14 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...font.bold, fontSize: 18, color: colors.accent },
  month: {
    alignSelf: 'flex-start', marginLeft: 16, flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 14,
    borderRadius: 17, backgroundColor: colors.fill,
  },
  monthText: { ...font.semibold, fontSize: 15, color: colors.text },
  hero: { marginHorizontal: 16, backgroundColor: colors.accentFill, borderRadius: radius.xl, padding: 20, gap: 4 },
  heroLabel: { ...font.semibold, fontSize: 13, letterSpacing: 0.8, color: 'rgba(255,255,255,0.85)' },
  heroValue: { ...font.bold, fontSize: 44, lineHeight: 50, color: '#FFFFFF', fontVariant: ['tabular-nums'] },
  heroSub: { ...font.regular, fontSize: 15, color: 'rgba(255,255,255,0.9)' },
  bar: { flexDirection: 'row', gap: 3, marginTop: 14 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 2, marginTop: 8 },
  legendText: { ...font.regular, fontSize: 12, color: 'rgba(255,255,255,0.9)' },
  tiles: { flexDirection: 'row', gap: 12, paddingHorizontal: 16 },
  tile: { flex: 1, backgroundColor: colors.card, borderRadius: radius.lg, padding: 14, gap: 6 },
  tileIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tileNum: { ...font.bold, fontSize: 22, color: colors.text, marginTop: 4 },
  tileText: { ...font.regular, fontSize: 13, lineHeight: 17, color: colors.textSecondary },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 4 },
  sectionTitle: { ...font.bold, fontSize: 22, color: colors.text },
  empty: { alignItems: 'center', paddingHorizontal: 32, paddingTop: 24, gap: 8 },
  emptyTitle: { ...font.bold, fontSize: 22, color: colors.text },
  emptyText: { ...font.regular, fontSize: 17, lineHeight: 22, color: colors.textSecondary, textAlign: 'center' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.backdrop },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 34, gap: 12,
  },
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: colors.grabber },
  sheetTitle: { ...font.semibold, fontSize: 17, color: colors.text, textAlign: 'center' },
  opt: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, minHeight: 48, backgroundColor: colors.card },
  optText: { ...font.regular, fontSize: 17, color: colors.text },
}));
