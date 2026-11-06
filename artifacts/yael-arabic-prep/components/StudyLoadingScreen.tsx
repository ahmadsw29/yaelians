import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, Easing, Modal, Platform, StyleSheet, Text, View } from 'react-native';
import { useStudy } from '@/lib/StudyProvider';
import { useColors } from '@/hooks/useColors';
import { Creature, CREATURE_NAMES, type CreatureKind } from '@/components/PetTeacher';
import { reserveWaitingCharacter } from '@/lib/loading-characters';

// This screen can appear before custom fonts finish downloading.
const FONT = Platform.OS === 'web' ? 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif' : undefined;
const useNative = Platform.OS !== 'web';

/** Mounted once beside navigation, never in each tab or in the question layout. */
export function StudyLoadingScreen() {
  const { loading } = useStudy();
  if (!loading) return null;
  return <Modal visible transparent animationType="fade" presentationStyle="overFullScreen" statusBarTranslucent onRequestClose={() => {}}>
    <WaitingWindow />
  </Modal>;
}

/** Mounts once per appearance, so the character is reserved once per visible window. */
function WaitingWindow() {
  const c = useColors();
  const [kind, setKind] = useState<CreatureKind | null>(null);
  const [reduceMotion, setReduceMotion] = useState(true);
  const sway = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let alive = true;
    reserveWaitingCharacter().then(k => { if (alive) setKind(k); }).catch(() => { if (alive) setKind('lumi'); });
    AccessibilityInfo.isReduceMotionEnabled().then(v => { if (alive) setReduceMotion(v); }).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', v => { if (alive) setReduceMotion(v); });
    return () => { alive = false; sub.remove(); };
  }, []);

  useEffect(() => {
    if (reduceMotion || !kind) { sway.setValue(0); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(sway, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: useNative }),
      Animated.timing(sway, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: useNative }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [reduceMotion, kind, sway]);

  const rotate = sway.interpolate({ inputRange: [0, 1], outputRange: ['-4deg', '4deg'] });
  const scale = sway.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.04, 1] });
  const name = kind ? CREATURE_NAMES[kind] : '';

  return <View testID="study-loading-screen" style={[s.backdrop, { backgroundColor: c.background }]}>
    <View testID="study-loading-window" accessibilityViewIsModal accessible accessibilityRole="progressbar"
      accessibilityLabel={`جارٍ تحميل تقدّمك${name ? `، ${name} ينتظر معك` : ''}`}
      style={[s.window, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={s.art}>
        <View style={[s.halo, { backgroundColor: c.secondary }]} />
        {kind ? <Animated.View testID={`study-loading-character-${kind}`} style={{ transform: [{ rotate }, { scale }] }}>
          <Creature kind={kind} mood="happy" size={96} />
        </Animated.View> : <View style={{ width: 96, height: 96 }} />}
      </View>
      <Text testID="study-loading-title" style={[s.title, { color: c.foreground }]}>{name ? `${name} يجهّز تدريبك` : 'لحظة واحدة'}</Text>
      <View style={s.row}>
        <ActivityIndicator size="small" color={c.primary} style={{ flexShrink: 0 }} />
        <Text testID="study-loading-caption" accessibilityLiveRegion="polite" style={[s.body, { color: c.mutedForeground }]}>جارٍ تحميل تقدّمك…</Text>
      </View>
    </View>
  </View>;
}

const s = StyleSheet.create({
  backdrop: { flex: 1, width: '100%', alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', padding: 24 },
  window: { width: '100%', maxWidth: 280, alignItems: 'center', gap: 10, paddingVertical: 20, paddingHorizontal: 18, borderRadius: 24, borderWidth: 2, borderBottomWidth: 6 },
  art: { width: 120, height: 112, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: 104, height: 104, borderRadius: 52 },
  title: { alignSelf: 'stretch', fontFamily: FONT, fontWeight: '800', fontSize: 17, lineHeight: 26, textAlign: 'center', writingDirection: 'rtl' },
  row: { alignSelf: 'stretch', minHeight: 26, flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'center', gap: 8 },
  body: { flexShrink: 1, minWidth: 0, fontFamily: FONT, fontSize: 13, lineHeight: 22, textAlign: 'center', writingDirection: 'rtl' },
});
