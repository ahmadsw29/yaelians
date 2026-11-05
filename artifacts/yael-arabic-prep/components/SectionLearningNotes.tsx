import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlay } from '@/components/Playful';
import { Creature, type CreatureKind } from '@/components/PetTeacher';
import { NATIVE_DRIVER, useReduceMotion } from '@/components/HomeMotion';
import { ARABIC_BOLD_FONT } from '@/constants/typography';
import { SECTION_LEARNING, type Lesson, type LearningSection } from '@/lib/section-learning-content';

const PET: Record<LearningSection, CreatureKind> = { restatement: 'lumi', reading: 'nuna', flashcards: 'zizo', exam: 'ghaima' };

function LessonCard({ lesson, index, open, onToggle, reduce }: { lesson: Lesson; index: number; open: boolean; onToggle: () => void; reduce: boolean }) {
  const p = usePlay();
  const enter = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  const press = useRef(new Animated.Value(1)).current;
  const body = useRef(new Animated.Value(open ? 1 : 0)).current;
  useEffect(() => {
    if (reduce) { enter.setValue(1); return; }
    const a = Animated.timing(enter, { toValue: 1, duration: 420, delay: 90 * index, useNativeDriver: NATIVE_DRIVER });
    a.start();
    return () => a.stop();
  }, [reduce, enter, index]);
  useEffect(() => {
    if (!open) { body.setValue(0); return; }
    if (reduce) { body.setValue(1); return; }
    body.setValue(0);
    const a = Animated.spring(body, { toValue: 1, friction: 7, useNativeDriver: NATIVE_DRIVER });
    a.start();
    return () => a.stop();
  }, [open, reduce, body]);
  const bump = (v: number) => { if (!reduce) Animated.spring(press, { toValue: v, friction: 5, useNativeDriver: NATIVE_DRIVER }).start(); };
  const tones = [p.brand, p.sun, p.coral, p.sky];
  const tone = tones[index % tones.length];
  return (
    <Animated.View style={{ opacity: enter, transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) }, { scale: press }] }}>
      <View style={[s.card, { backgroundColor: p.isDark ? 'rgba(222,240,231,0.06)' : 'rgba(255,253,248,0.86)', borderColor: open ? tone : p.border }]}>
        <Pressable testID={`learning-lesson-${lesson.id}`} onPress={onToggle} onPressIn={() => bump(0.97)} onPressOut={() => bump(1)}
          accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={`${lesson.title}. ${lesson.summary}`} style={s.head}>
          <View style={[s.num, { backgroundColor: tone }]}><Text style={s.numText}>{index + 1}</Text></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[s.title, { color: p.foreground }]}>{lesson.title}</Text>
            <Text style={[s.summary, { color: p.mutedForeground }]}>{lesson.summary}</Text>
          </View>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={p.mutedForeground} />
        </Pressable>
        {open && (
          <Animated.View style={[s.body, { opacity: body, transform: [{ translateY: body.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }] }]}>
            {lesson.points.map((pt, i) => (
              <View key={i} style={s.point}>
                <View style={[s.dot, { backgroundColor: tone }]} />
                <Text style={[s.pointText, { color: p.foreground }]}>{pt}</Text>
              </View>
            ))}
            {lesson.examples.map((ex, i) => (
              <View key={`e${i}`} style={[s.example, { backgroundColor: p.isDark ? 'rgba(92,178,239,0.10)' : 'rgba(226,241,251,0.8)', borderColor: p.border }]}>
                {!!ex.he && <Text selectable style={[s.he, { color: p.foreground }]}>{ex.he}</Text>}
                <Text style={[s.ar, { color: p.skyInk }]}>{ex.ar}</Text>
                {!!ex.note && <Text style={[s.note, { color: p.mutedForeground }]}>{ex.note}</Text>}
              </View>
            ))}
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
}

export default function SectionLearningNotes({ section }: { section: LearningSection }) {
  const p = usePlay();
  const reduce = useReduceMotion();
  const data = SECTION_LEARNING[section];
  const [open, setOpen] = useState<string | null>(data.lessons[0]?.id ?? null);
  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) { bob.setValue(0); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(bob, { toValue: 1, duration: 900, useNativeDriver: NATIVE_DRIVER }),
      Animated.timing(bob, { toValue: 0, duration: 900, useNativeDriver: NATIVE_DRIVER }),
    ]), { iterations: 4 });
    loop.start();
    return () => loop.stop();
  }, [reduce, bob]);
  return (
    <View testID={`learning-notes-${section}`} style={s.wrap}>
      <View style={s.intro}>
        <Animated.View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
          style={{ transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -7] }) }, { rotate: bob.interpolate({ inputRange: [0, 1], outputRange: ['-4deg', '4deg'] }) }] }}>
          <Creature kind={PET[section]} mood="cheer" size={62} />
        </Animated.View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text accessibilityRole="header" style={[s.h, { color: p.foreground }]}>{data.title}</Text>
          <Text style={[s.lead, { color: p.mutedForeground }]}>{data.lead}</Text>
        </View>
      </View>
      {data.lessons.map((l, i) => (
        <LessonCard key={l.id} lesson={l} index={i} reduce={reduce} open={open === l.id} onToggle={() => setOpen(o => (o === l.id ? null : l.id))} />
      ))}
    </View>
  );
}

const rtl = { textAlign: 'right' as const, writingDirection: 'rtl' as const };
const s = StyleSheet.create({
  wrap: { gap: 10, width: '100%' },
  intro: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  h: { ...rtl, fontFamily: ARABIC_BOLD_FONT, fontWeight: '800', fontSize: 18, lineHeight: 30 },
  lead: { ...rtl, fontSize: 13, lineHeight: 22 },
  card: { borderWidth: 1.5, borderRadius: 18, overflow: 'hidden' },
  head: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, padding: 12, minHeight: 56 },
  num: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  numText: { color: '#2a1e3a', fontWeight: '800', fontSize: 14 },
  title: { ...rtl, fontFamily: ARABIC_BOLD_FONT, fontWeight: '800', fontSize: 15, lineHeight: 25 },
  summary: { ...rtl, fontSize: 12.5, lineHeight: 21 },
  body: { paddingHorizontal: 12, paddingBottom: 12, gap: 8 },
  point: { flexDirection: 'row-reverse', gap: 8, alignItems: 'flex-start' },
  dot: { width: 7, height: 7, borderRadius: 4, marginTop: 9 },
  pointText: { ...rtl, flex: 1, fontSize: 14, lineHeight: 24 },
  example: { borderWidth: 1, borderRadius: 14, padding: 10, gap: 2 },
  he: { ...rtl, fontSize: 17, lineHeight: 28, fontWeight: '700' },
  ar: { ...rtl, fontFamily: ARABIC_BOLD_FONT, fontWeight: '800', fontSize: 13.5, lineHeight: 23 },
  note: { ...rtl, fontSize: 12, lineHeight: 20 },
});
