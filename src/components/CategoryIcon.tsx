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

/** Tinted rounded tile with the category's icon, as drawn in the design. */
export function CategoryIcon({ category, size = 44 }: { category: string; size?: number }) {
  const { categories } = useReceipts();
  const def = categories.find(c => c.name === category);
  const color = tone(def?.color ?? '#55555C');
  const Icon = ICONS[def?.iconName ?? 'Box'] ?? Box;
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
