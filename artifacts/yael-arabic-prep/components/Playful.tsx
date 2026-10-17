import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { play } from '@/constants/colors';
import { Creature, CREATURE_NAMES, type CreatureKind } from '@/components/PetTeacher';

export function usePlay() {
  const c = useColors();
  return { ...c, ...(c.isDark ? play.dark : play.light) };
}

const PRESENTERS: CreatureKind[] = ['zizo', 'lumi', 'rami'];
export function presenterFor(index: number): CreatureKind {
  return PRESENTERS[((index % PRESENTERS.length) + PRESENTERS.length) % PRESENTERS.length];
}

type Tone = 'brand' | 'sun' | 'coral' | 'success' | 'ghost';

export function ChunkyButton({ label, onPress, tone = 'brand', icon, disabled, testID, accessibilityLabel, style }: {
  label: string; onPress: () => void; tone?: Tone; icon?: keyof typeof Ionicons.glyphMap; disabled?: boolean;
  testID?: string; accessibilityLabel?: string; style?: StyleProp<ViewStyle>;
}) {
  const p = usePlay();
  const fills: Record<Tone, [string, string, string]> = {
    brand: [p.brand, p.brandShade, p.onBrand],
    sun: [p.sun, p.sunShade, p.sunInk],
    coral: [p.coral, p.coralShade, p.onBrand],
    success: [p.success, p.successShade, p.onBrand],
    ghost: [p.card, p.border, p.foreground],
  };
  const [bg, shade, fg] = disabled ? [p.muted, p.track, p.mutedForeground] : fills[tone];
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} accessibilityState={{ disabled: !!disabled }}
      testID={testID} disabled={disabled} onPress={onPress}
      style={({ pressed }) => [s.button, { backgroundColor: bg, borderColor: shade, borderWidth: tone === 'ghost' ? 2 : 0, borderBottomWidth: pressed && !disabled ? 2 : 5 },
        pressed && !disabled && { transform: [{ translateY: 3 }] }, style]}>
      <Text style={[s.label, { color: fg }]}>{label}</Text>
      {icon && <Ionicons name={icon} size={19} color={fg} />}
    </Pressable>
  );
}

/** A cast member presents the real question in a speech bubble beside them. */
export function QuestionPrompt({ index, text, hebrew = false, label, children }: {
  index: number; text: string; hebrew?: boolean; label?: string; children?: React.ReactNode;
}) {
  const p = usePlay();
  const kind = presenterFor(index);
  const tint = kind === 'zizo' ? p.coral : kind === 'lumi' ? p.sun : p.sky;
  return (
    <View style={s.row}>
      <View style={s.presenter} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Creature kind={kind} size={82} mood="happy" />
        <View style={[s.nameTag, { backgroundColor: tint }]}><Text style={s.nameText}>{CREATURE_NAMES[kind]}</Text></View>
      </View>
      <View style={[s.bubble, { backgroundColor: p.card, borderColor: p.border }]}>
        <View style={[s.tail, { backgroundColor: p.card, borderColor: p.border }]} />
        {!!label && <Text style={[s.bubbleLabel, { color: p.mutedForeground }]}>{label}</Text>}
        {children}
        {!!text && <Text selectable style={[hebrew ? s.hebrew : s.arabic, { color: p.foreground }]}>{text}</Text>}
      </View>
    </View>
  );
}

/** Thick, rounded progress bar. No mascot rides on it. */
export function ChunkyProgress({ value, color }: { value: number; color?: string }) {
  const p = usePlay();
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={[s.track, { backgroundColor: p.track }]}>
      <View style={[s.fill, { width: `${pct * 100}%`, backgroundColor: color ?? p.brand }]}>
        <View style={s.shine} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  button: { minHeight: 54, borderRadius: 16, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 18 },
  label: { fontSize: 15, fontWeight: '800', letterSpacing: 0.2 },
  row: { flexDirection: 'row-reverse', alignItems: 'flex-end', gap: 8 },
  presenter: { alignItems: 'center', width: 84 },
  nameTag: { marginTop: -6, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 2 },
  nameText: { color: '#2a1e3a', fontSize: 11, fontWeight: '800' },
  bubble: { flex: 1, borderWidth: 2, borderBottomWidth: 4, borderRadius: 20, padding: 14, gap: 6, marginBottom: 20 },
  tail: { position: 'absolute', right: -8, bottom: 22, width: 14, height: 14, borderRightWidth: 2, borderTopWidth: 2, transform: [{ rotate: '45deg' }] },
  bubbleLabel: { fontSize: 11, fontWeight: '700', textAlign: 'right' },
  arabic: { fontSize: 17, lineHeight: 27, fontWeight: '700', textAlign: 'right', writingDirection: 'rtl' },
  hebrew: { fontSize: 19, lineHeight: 32, textAlign: 'right', writingDirection: 'rtl' },
  track: { height: 16, width: '100%', borderRadius: 8, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 8, minWidth: 16, alignSelf: 'flex-end' },
  shine: { position: 'absolute', top: 3, left: 6, right: 6, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)' },
});
