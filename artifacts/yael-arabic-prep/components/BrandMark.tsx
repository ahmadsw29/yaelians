import React from 'react';
import { Image } from 'react-native';

/** Decorative logo paired with the readable Yaelians wordmark. */
export function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <Image source={require('../assets/images/yaelians-mark.png')}
      accessible={false} resizeMode="contain"
      style={{ width: size, height: size, flexShrink: 0, borderRadius: size * 0.28, backgroundColor: '#DCF4E8' }} />
  );
}
