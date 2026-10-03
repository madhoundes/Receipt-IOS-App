import React from 'react';
import { Text, View } from 'react-native';
import { CategoryIcon } from './CategoryIcon';
import { colors, font } from '../theme';

/**
 * Round "logo slot" for a merchant: its first letter on a brand tint, with an optional small
 * category badge. The design uses initials rather than official brand logos.
 */
export function MerchantAvatar({ name, category, size = 40 }: { name: string; category?: string; size?: number }) {
  const letter = (name.trim()[0] ?? '?').toUpperCase();
  return (
    <View style={{ width: size, height: size }}>
      <View style={{
        width: size, height: size, borderRadius: size / 2, backgroundColor: colors.accentSoft,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Text style={{ ...font.bold, fontSize: size * 0.4, color: colors.accent }}>{letter}</Text>
      </View>
      {!!category && (
        <View style={{
          position: 'absolute', right: -3, bottom: -3, width: size * 0.42, height: size * 0.42, borderRadius: size * 0.21,
          backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
        }}>
          <CategoryIcon category={category} size={size * 0.34} />
        </View>
      )}
    </View>
  );
}
