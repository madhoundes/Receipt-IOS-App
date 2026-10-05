import React from 'react';
import { Image, Text, View } from 'react-native';
import { CategoryIcon } from './CategoryIcon';
import { BRAND_LOGOS } from '../brandLogos';
import { useReceipts } from '../context/ReceiptContext';
import { findBrand } from '../utils/brandMatch';
import { colors, font, soft, tone } from '../theme';

export const initialsOf = (name: string) => {
  const words = name.trim().split(/[\s\-_/]+/).filter(Boolean);
  if (words.length === 0) return '?';
  return (words.length === 1 ? words[0][0] : words[0][0] + words[1][0]).toUpperCase();
};

/** True when the store has a logo in the app. */
export const hasBrandLogo = (name: string) => !!findBrand(name);

/**
 * Round avatar for a merchant: the store's logo when the app has it, otherwise its initials on a tint of the
 * category colour, with an optional small category badge.
 */
export function MerchantAvatar({ name, category, size = 44, badge = true }: { name: string; category?: string; size?: number; badge?: boolean }) {
  const { categories } = useReceipts();
  const raw = categories.find(c => c.name === category)?.color;
  const color = raw ? tone(raw) : colors.accent;
  const text = initialsOf(name);
  const brand = findBrand(name);
  const logo = brand ? BRAND_LOGOS[brand.slug] : undefined;
  return (
    <View style={{ width: size, height: size }}>
      {logo ? (
        <View style={{
          width: size, height: size, borderRadius: size / 2, backgroundColor: '#FFFFFF', overflow: 'hidden',
          borderWidth: 1, borderColor: colors.separator,
        }}>
          <Image source={logo} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityLabel={`${brand!.name} logo`} />
        </View>
      ) : (
        <View style={{
          width: size, height: size, borderRadius: size / 2, backgroundColor: soft(color),
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ ...font.bold, fontSize: size * (text.length > 1 ? 0.34 : 0.4), color }}>{text}</Text>
        </View>
      )}
      {badge && !!category && (
        <View style={{
          position: 'absolute', right: -3, bottom: -3, width: size * 0.42, height: size * 0.42, borderRadius: size * 0.21,
          backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center',
        }}>
          <CategoryIcon category={category} size={size * 0.34} />
        </View>
      )}
    </View>
  );
}
