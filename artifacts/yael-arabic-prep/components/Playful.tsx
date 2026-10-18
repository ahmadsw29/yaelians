import React from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { play } from '@/constants/colors';
import { CREATURE_NAMES, type CreatureKind } from '@/components/PetTeacher';
import { ARABIC_BOLD_FONT } from '@/constants/typography';
import { SpeakingTeacher } from '@/components/SpeakingTeacher';
import { useHebrewSpeech } from '@/hooks/useHebrewSpeech';
import { usesExpandedQuestionLayout } from '@/lib/practice-layout';

export function usePlay() {
  const c = useColors();
  return { ...c, ...(c.isDark ? play.dark : play.light) };
}

const PRESENTERS = Object.keys(CREATURE_NAMES) as CreatureKind[];
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
export function QuestionPrompt({ index, text, hebrew = false, label, children, spokenWord, compact = false }: {
  index: number; text: string; hebrew?: boolean; label?: string; children?: React.ReactNode; spokenWord?: string; compact?: boolean;
}) {
  const p = usePlay();
  const kind = presenterFor(index);
  const { fontScale } = useWindowDimensions();
  const expanded = usesExpandedQuestionLayout(fontScale);
  const speech = useHebrewSpeech(spokenWord);
  const playing = speech.status !== 'idle';
  const tint = kind === 'zizo' ? p.coral : kind === 'lumi' ? p.sun : kind === 'nuna' ? p.brand : p.sky;
  return (
    <View style={[s.row, expanded && s.expandedRow]}>
      <View style={[s.presenter, compact && { width: 64 }, expanded && s.expandedPresenter]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <SpeakingTeacher kind={kind} speaking={speech.status === 'speaking'} size={compact ? 64 : 82} />
        <View style={[s.nameTag, expanded && s.expandedNameTag, { backgroundColor: tint }]}><Text style={s.nameText}>{CREATURE_NAMES[kind]}</Text></View>
      </View>
      <View style={[s.bubble, compact && s.compactBubble, expanded && s.expandedBubble, { backgroundColor: p.card, borderColor: p.border }]}>
        {!expanded && <View style={[s.tail, { backgroundColor: p.card, borderColor: p.border }]} />}
        {!!label && <Text style={[s.bubbleLabel, { color: p.mutedForeground }]}>{label}</Text>}
        {children}
        {!!spokenWord && <>
          <Pressable testID="hebrew-speaker" onPress={speech.toggle}
            accessibilityRole="button" accessibilityLabel={playing ? 'إيقاف النطق' : `اسمع نطق ${spokenWord} بالعبرية`}
            accessibilityState={{ busy: speech.status === 'loading', selected: playing }}
            style={[s.speaker, compact && !expanded && s.compactSpeaker, { backgroundColor: playing ? p.brandSoft : p.skySoft, borderColor: playing ? p.brand : p.sky }]}>
            <Ionicons name={playing ? 'stop-circle' : 'volume-high'} size={23} color={p.skyInk} />
            {(!compact || expanded) && <Text style={[s.speakerLabel, { color: p.skyInk }]}>{speech.status === 'loading' ? 'جارٍ تجهيز الصوت…' : playing ? 'إيقاف النطق' : 'استمع للعبرية'}</Text>}
          </Pressable>
          {!!speech.error && <Text accessibilityRole="alert" accessibilityLiveRegion="polite"
            style={[s.speechError, { color: p.coralInk }]}>{speech.error}</Text>}
        </>}
        {!!text && <Text selectable style={[hebrew ? s.hebrew : s.arabic, compact && { fontSize: 16, lineHeight: 25 }, { color: p.foreground }]}>{text}</Text>}
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
  button: { minHeight: 54, borderRadius: 16, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 18, paddingVertical: 8 },
  label: { flexShrink: 1, minWidth: 0, textAlign: 'center', writingDirection: 'rtl', fontSize: 15, fontFamily: ARABIC_BOLD_FONT, fontWeight: '800', lineHeight: 26, paddingVertical: 2, includeFontPadding: true },
  row: { flexDirection: 'row-reverse', alignItems: 'flex-end', gap: 8 },
  expandedRow: { flexDirection: 'column', alignItems: 'stretch' },
  presenter: { alignItems: 'center', width: 84, flexShrink: 0 },
  expandedPresenter: { width: '100%', flexDirection: 'row-reverse', gap: 8 },
  nameTag: { maxWidth: '100%', marginTop: -6, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 2 },
  expandedNameTag: { marginTop: 0, flexShrink: 1 },
  nameText: { color: '#2a1e3a', fontSize: 11, fontWeight: '800', textAlign: 'center', writingDirection: 'rtl' },
  bubble: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0, borderWidth: 2, borderBottomWidth: 4, borderRadius: 20, padding: 14, gap: 6, marginBottom: 20 },
  expandedBubble: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', width: '100%' },
  compactBubble: { padding: 10, gap: 4, marginBottom: 8 },
  compactSpeaker: { position: 'absolute', left: 10, top: 10, width: 44, height: 44, paddingHorizontal: 0, zIndex: 1 },
  tail: { position: 'absolute', right: -8, bottom: 22, width: 14, height: 14, borderRightWidth: 2, borderTopWidth: 2, transform: [{ rotate: '45deg' }] },
  bubbleLabel: { fontSize: 11, fontWeight: '700', textAlign: 'right', writingDirection: 'rtl' },
  speaker: { minHeight: 44, borderRadius: 12, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6 },
  speakerLabel: { flexShrink: 1, fontFamily: ARABIC_BOLD_FONT, fontWeight: '800', fontSize: 12, lineHeight: 21, textAlign: 'right', writingDirection: 'rtl' },
  speechError: { fontSize: 12, lineHeight: 21, textAlign: 'right', writingDirection: 'rtl' },
  arabic: { fontSize: 17, lineHeight: 30, fontFamily: ARABIC_BOLD_FONT, fontWeight: '800', includeFontPadding: true, textAlign: 'right', writingDirection: 'rtl' },
  hebrew: { fontSize: 19, lineHeight: 32, textAlign: 'right', writingDirection: 'rtl' },
  track: { height: 16, width: '100%', borderRadius: 8, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 8, minWidth: 16, alignSelf: 'flex-end' },
  shine: { position: 'absolute', top: 3, left: 6, right: 6, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)' },
});
