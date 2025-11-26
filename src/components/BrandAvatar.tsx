import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SvgUri } from 'react-native-svg';
import { Receipt } from '../types';
import { BRAND_REGISTRY, getBrandAsset, THEME } from '../constants';

interface Props {
  receipt: Pick<Receipt, 'storeName' | 'brandId' | 'brandDisplayMode'>;
  showLogos: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const BrandAvatar: React.FC<Props> = ({ receipt, showLogos, size = 'md' }) => {
  let asset = null;
  if (receipt.brandId && BRAND_REGISTRY[receipt.brandId]) {
    asset = BRAND_REGISTRY[receipt.brandId];
  } else {
    asset = getBrandAsset(receipt.storeName);
  }

  const initials = receipt.storeName.slice(0, 2).toUpperCase();
  
  const dim = size === 'sm' ? 32 : size === 'lg' ? 80 : 64;
  const fontSize = size === 'sm' ? 12 : size === 'lg' ? 30 : 20;

  const containerStyle = {
    width: dim,
    height: dim,
    borderRadius: dim / 2,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    overflow: 'hidden' as const,
  };

  const shouldShowLogo = showLogos && asset?.logoUrl && receipt.brandDisplayMode === 'logo';

  if (shouldShowLogo && asset?.logoUrl) {
    const isWide = asset.sizeTier === 'wide';
    const padding = asset.padding ? asset.padding * 4 : (isWide && size !== 'sm' ? 14 : 12);
    const imgSize = dim - (padding * 2);

    return (
      <View style={containerStyle}>
        <SvgUri width={imgSize} height={imgSize} uri={asset.logoUrl} />
      </View>
    );
  }

  if (asset) {
    return (
      <View style={[containerStyle, { backgroundColor: asset.color, borderWidth: 0 }]}>
        <Text style={{ color: 'white', fontWeight: 'bold', fontSize }}>{initials}</Text>
      </View>
    );
  }

  return (
    <View style={[containerStyle, { backgroundColor: '#F5F5F5' }]}>
      <Text style={{ color: '#8E8E93', fontWeight: 'bold', fontSize }}>{initials}</Text>
    </View>
  );
};