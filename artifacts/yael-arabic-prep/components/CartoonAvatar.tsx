import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

// Illustration pigments, independent of the application's light/dark surfaces.
export const avatarOptions = {
  skin: ['#f5d1b2', '#e8b08a', '#c78960', '#9e6546', '#6b4230'],
  hair: ['#302720', '#654334', '#a76a3a', '#d7b16b', '#3c3c45'],
  clothes: ['#17665c', '#b56d59', '#4e6998', '#9c7aab', '#d2a348'],
  background: ['#e8eee7', '#fae4d7', '#dfe8f4', '#eee3f0', '#f5ebc9'],
  hairStyle: ['short', 'curly', 'long'],
} as const;

export type AvatarConfig = { skin: number; hair: number; clothes: number; background: number; hairStyle: number };
export const defaultAvatar: AvatarConfig = { skin: 1, hair: 0, clothes: 0, background: 0, hairStyle: 1 };

export function getAvatarConfig(value: unknown): AvatarConfig {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const result = { ...defaultAvatar };
  for (const key of Object.keys(defaultAvatar) as (keyof AvatarConfig)[]) {
    const index = source[key];
    if (typeof index === 'number' && Number.isInteger(index) && index >= 0 && index < avatarOptions[key].length) {
      result[key] = index;
    }
  }
  return result;
}

export function CartoonAvatar({ config = defaultAvatar, size = 100 }: { config?: AvatarConfig; size?: number }) {
  const avatar = getAvatarConfig(config);
  const skin = avatarOptions.skin[avatar.skin];
  const hair = avatarOptions.hair[avatar.hair];
  return (
    <View accessible accessibilityLabel="الصورة الكرتونية الشخصية" style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 120 120">
        <Circle cx="60" cy="60" r="60" fill={avatarOptions.background[avatar.background]} />
        {avatar.hairStyle === 2 && <Path d="M28 61 Q20 15 60 17 Q102 15 94 102 L27 102Z" fill={hair} />}
        <Path d="M17 120 Q19 87 48 85 L72 85 Q102 87 104 120Z" fill={avatarOptions.clothes[avatar.clothes]} />
        <Rect x="49" y="73" width="22" height="23" rx="10" fill={skin} />
        <Ellipse cx="60" cy="54" rx="29" ry="33" fill={skin} />
        <Circle cx="31" cy="58" r="6" fill={skin} />
        <Circle cx="89" cy="58" r="6" fill={skin} />
        <Path d="M31 46 Q25 17 59 17 Q92 16 91 44 Q76 42 67 30 Q50 47 31 46Z" fill={hair} />
        {avatar.hairStyle === 1 && [33, 44, 56, 68, 80, 88].map((x, i) => <Circle key={x} cx={x} cy={i === 0 || i === 5 ? 34 : 25} r="10" fill={hair} />)}
        {avatar.hairStyle === 2 && <Path d="M33 39 Q24 67 35 83 M85 37 Q99 63 85 85" stroke={hair} strokeWidth="10" fill="none" />}
        <Path d="M41 51 Q46 48 51 51 M69 51 Q74 48 79 51" stroke={hair} strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <Circle cx="46" cy="57" r="2.4" fill="#302720" />
        <Circle cx="74" cy="57" r="2.4" fill="#302720" />
        <Path d="M59 58 L56 67 L62 67" stroke="#9e6546" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        <Path d="M49 73 Q60 83 71 73" stroke="#8a493f" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <Path d="M40 94 L50 105 L60 97 L70 105 L80 94" stroke="#ffffff" strokeOpacity=".65" strokeWidth="2" fill="none" />
      </Svg>
    </View>
  );
}
