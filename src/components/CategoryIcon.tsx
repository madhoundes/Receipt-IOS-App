import { soft, tone } from '../theme';
import React from 'react';
import { View } from 'react-native';
import {
  ShoppingBasket, Utensils, Fuel, Pill, Home, MonitorSmartphone, Shirt, Zap, Car, Clapperboard, Wrench, Box, LucideIcon,
} from './icons';
import { useReceipts } from '../context/ReceiptContext';

const ICONS: Record<string, LucideIcon> = {
  ShoppingBasket, Utensils, Fuel, Pill, Home, MonitorSmartphone, Shirt, Zap, Car, Clapperboard, Wrench, Box,
};

/** Tinted rounded tile with the category's icon, as drawn in the design. `round` draws a circle with a thin ring and a larger glyph. */
export function CategoryIcon({ category, size = 44, round }: { category: string; size?: number; round?: boolean }) {
  const { categories } = useReceipts();
  const def = categories.find(c => c.name === category);
  const color = tone(def?.color ?? '#55555C');
  const Icon = ICONS[def?.iconName ?? 'Box'] ?? Box;
  if (round) {
    return (
      <View style={{
        width: size, height: size, borderRadius: size / 2, backgroundColor: soft(color),
        borderWidth: 1, borderColor: `${color}33`, alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={size * 0.52} color={color} strokeWidth={1.8} />
      </View>
    );
  }
  return (
    <View style={{
      width: size, height: size, borderRadius: size * 0.28, backgroundColor: soft(color),
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon size={size * 0.5} color={color} strokeWidth={2} />
    </View>
  );
}

export const categoryColor = (categories: { name: string; color: string }[], name: string) =>
  tone(categories.find(c => c.name === name)?.color ?? '#55555C');
