import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Home, LayoutGrid, Percent, ReceiptText, Scan } from './icons';
import { triggerHaptic } from '../utils/nativeUtils';
import { colors, font } from '../theme';

const ICONS: Record<string, typeof Home> = { Home, Receipts: ReceiptText, Categories: LayoutGrid, HST: Percent };

/** Floating tab bar from the design: a white capsule with four tabs and a separate Scan button. */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { bottom: Math.max(insets.bottom, 10) + 6 }]} pointerEvents="box-none">
      <View style={styles.bar} accessibilityRole="tablist">
        {state.routes.map((route, i) => {
          const on = state.index === i;
          const Icon = ICONS[route.name] ?? Home;
          return (
            <Pressable key={route.key} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={route.name}
              style={[styles.item, on && styles.itemOn]}
              onPress={() => {
                const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!on && !e.defaultPrevented) navigation.navigate(route.name);
              }}>
              <Icon size={22} color={on ? colors.accent : colors.text} variant={on ? 'Bold' : 'Linear'} />
              <Text style={[styles.label, on && { color: colors.accent, ...font.bold }]} numberOfLines={1}>{route.name}</Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable style={({ pressed }) => [styles.scan, pressed && { transform: [{ scale: 0.96 }] }]} accessibilityRole="button" accessibilityLabel="Scan a receipt"
        onPress={() => { triggerHaptic('light'); navigation.navigate('CameraModal'); }}>
        <Scan size={28} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

const shadow = { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 8 };

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  bar: {
    flex: 1, height: 62, borderRadius: 31, backgroundColor: 'rgba(255,255,255,0.96)', flexDirection: 'row', alignItems: 'center',
    padding: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.06)', ...shadow,
  },
  item: { flex: 1, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', gap: 2 },
  itemOn: { backgroundColor: colors.accentSoft },
  label: { ...font.medium, fontSize: 10, color: colors.text },
  scan: { width: 62, height: 62, borderRadius: 31, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', ...shadow },
});
