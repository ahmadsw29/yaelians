import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChunkyButton, usePlay } from '@/components/Playful';
import { Creature, type CreatureKind } from '@/components/PetTeacher';
import { NATIVE_DRIVER, useReduceMotion } from '@/components/HomeMotion';
import { ARABIC_BOLD_FONT } from '@/constants/typography';
import { useHebrewSpeech } from '@/hooks/useHebrewSpeech';
import { VOCABULARY_BANK } from '@/lib/vocabulary-bank';
import type { Question } from '@/lib/study';
import { ACADEMIC_ROWS } from '@/lib/vocabulary/academic';
import { EVERYDAY_ROWS } from '@/lib/vocabulary/everyday';
import { SOCIETY_ROWS } from '@/lib/vocabulary/society';
import { VERB_ROWS } from '@/lib/vocabulary/verbs';
import { WORLD_ROWS } from '@/lib/vocabulary/world';

type CatId = 'all' | 'verbs' | 'academic' | 'society' | 'world' | 'everyday' | 'basic';
const CATS: { id: CatId; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'all', label: 'الكل', icon: 'apps' },
  { id: 'verbs', label: 'أفعال', icon: 'flash' },
  { id: 'academic', label: 'أكاديمي', icon: 'school' },
  { id: 'society', label: 'مجتمع', icon: 'people' },
  { id: 'world', label: 'العالم', icon: 'earth' },
  { id: 'everyday', label: 'يومي', icon: 'cafe' },
  { id: 'basic', label: 'أساسي', icon: 'star' },
];
const PAGE = 20;

const catOf = new Map<string, CatId>();
([['verbs', VERB_ROWS], ['academic', ACADEMIC_ROWS], ['society', SOCIETY_ROWS], ['world', WORLD_ROWS], ['everyday', EVERYDAY_ROWS]] as [CatId, string][])
  .forEach(([id, rows]) => rows.trim().split('\n').forEach(r => { const w = r.split('|')[0]?.trim(); if (w && !catOf.has(w)) catOf.set(w, id); }));
const categoryFor = (q: Question): CatId => catOf.get(q.word) ?? 'basic';
const stripNikud = (t: string) => t.normalize('NFC').replace(/[\u0591-\u05C7\u064B-\u0652]/g, '').toLowerCase().trim();
const toWestern = (t: string) => t.replace(/[\u0660-\u0669]/g, d => String(d.charCodeAt(0) - 0x0660)).replace(/[\u06F0-\u06F9]/g, d => String(d.charCodeAt(0) - 0x06F0));
const PETS: CreatureKind[] = ['zizo', 'lumi', 'nuna', 'rami', 'ghaima'];

function WordCard({ q, index, reduce }: { q: Question; index: number; reduce: boolean }) {
  const p = usePlay();
  const kind = PETS[index % PETS.length];
  const speech = useHebrewSpeech(q.word, kind);
  const playing = speech.status !== 'idle';
  const enter = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  useEffect(() => {
    if (reduce) { enter.setValue(1); return; }
    const a = Animated.timing(enter, { toValue: 1, duration: 300, delay: Math.min(index, 10) * 40, useNativeDriver: NATIVE_DRIVER });
    a.start();
    return () => a.stop();
  }, [reduce, enter, index]);
  const cat = CATS.find(c => c.id === categoryFor(q))!;
  return (
    <Animated.View testID={`vocabulary-word-${index}`} style={[s.word, { borderColor: p.border, backgroundColor: p.isDark ? 'rgba(222,240,231,0.06)' : 'rgba(255,253,248,0.88)',
      opacity: enter, transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }]}>
      <View style={s.wordHead}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text selectable style={[s.he, { color: p.foreground }]}>{q.word}</Text>
          {!!q.transliteration && <Text style={[s.translit, { color: p.mutedForeground }]}>{q.transliteration}</Text>}
        </View>
        <Pressable testID={`vocabulary-audio-${index}`} onPress={speech.toggle} hitSlop={6}
          accessibilityRole="button" accessibilityLabel={playing ? 'إيقاف النطق' : `اسمع نطق ${q.word}`} accessibilityState={{ busy: speech.status === 'loading' }}
          style={[s.audio, { backgroundColor: playing ? p.brandSoft : p.skySoft, borderColor: playing ? p.brand : p.sky }]}>
          <Ionicons name={playing ? 'stop-circle' : 'volume-high'} size={22} color={p.skyInk} />
        </Pressable>
      </View>
      <Text style={[s.meaning, { color: p.brandShade }]}>{q.correctAnswer || q.meaning}</Text>
      <Text selectable style={[s.sentence, { color: p.foreground }]}>{q.sentence}</Text>
      <View style={[s.tag, { backgroundColor: p.sunSoft }]}><Ionicons name={cat.icon} size={12} color={p.sunInk} /><Text style={[s.tagText, { color: p.sunInk }]}>{cat.label}</Text></View>
      {!!speech.error && <Text accessibilityRole="alert" style={[s.err, { color: p.coralInk }]}>{speech.error}</Text>}
    </Animated.View>
  );
}

export default function VocabularyStudyHub({ onStart, onResume, starting, error, isPremium, ready }: {
  onStart: () => void; onResume?: () => void; starting: boolean; error?: string; isPremium: boolean; ready: boolean;
}) {
  const p = usePlay();
  const reduce = useReduceMotion();
  const insets = useSafeAreaInsets();
  const web = Platform.OS === 'web';
  const scroller = useRef<ScrollView>(null);
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<CatId>('all');
  const [page, setPage] = useState(0);

  const pool = useMemo(() => (isPremium ? VOCABULARY_BANK : VOCABULARY_BANK.slice(0, PAGE)), [isPremium]);
  const counts = useMemo(() => {
    const c: Record<CatId, number> = { all: pool.length, verbs: 0, academic: 0, society: 0, world: 0, everyday: 0, basic: 0 };
    pool.forEach(q => { c[categoryFor(q)] += 1; });
    return c;
  }, [pool]);
  const filtered = useMemo(() => {
    const t = stripNikud(toWestern(query));
    return pool.filter(q => (cat === 'all' || categoryFor(q) === cat) &&
      (!t || stripNikud(q.word).includes(t) || stripNikud(q.meaning).includes(t) || q.transliteration.toLowerCase().includes(t) || stripNikud(q.sentence).includes(t)));
  }, [pool, cat, query]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const safePage = Math.min(page, pages - 1);
  const visible = filtered.slice(safePage * PAGE, safePage * PAGE + PAGE);
  const goPage = (n: number) => { setPage(n); scroller.current?.scrollTo({ y: 0, animated: !reduce }); };

  const hero = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) { hero.setValue(1); bob.setValue(0); return; }
    const a = Animated.spring(hero, { toValue: 1, friction: 6, useNativeDriver: NATIVE_DRIVER });
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(bob, { toValue: 1, duration: 800, useNativeDriver: NATIVE_DRIVER }),
      Animated.timing(bob, { toValue: 0, duration: 800, useNativeDriver: NATIVE_DRIVER }),
    ]), { iterations: 5 });
    a.start(); loop.start();
    return () => { a.stop(); loop.stop(); };
  }, [reduce, hero, bob]);

  const top = web ? 67 : insets.top;
  const bottom = (web ? 84 : 56 + insets.bottom) + 16;
  const startLabel = starting ? 'جارٍ التجهيز…' : 'ابدأ جولة المفردات';

  return (
    <ScrollView ref={scroller} testID="vocabulary-hub" style={{ flex: 1, backgroundColor: p.background }}
      contentContainerStyle={{ paddingTop: top + 12, paddingBottom: bottom, paddingHorizontal: 16, gap: 14 }}
      keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets>
      <Animated.View style={[s.hero, { backgroundColor: p.isDark ? 'rgba(60,199,156,0.12)' : 'rgba(220,244,234,0.9)', borderColor: p.border,
        opacity: hero, transform: [{ scale: hero.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }] }]}>
        <Animated.View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
          style={{ transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -9] }) }, { rotate: bob.interpolate({ inputRange: [0, 1], outputRange: ['-5deg', '5deg'] }) }] }}>
          <Creature kind="zizo" mood="hype" size={78} />
        </Animated.View>
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <Text accessibilityRole="header" style={[s.h1, { color: p.foreground }]}>بنك المفردات</Text>
          <Text style={[s.sub, { color: p.mutedForeground }]}>{`${VOCABULARY_BANK.length} كلمة عبرية مع معناها بالعربية وجملة مثال. تصفّح واستمع، ثم ابدأ الجولة عندما تكون جاهزًا.`}</Text>
        </View>
      </Animated.View>

      <View style={{ gap: 8 }}>
        {!!error && <Text accessibilityRole="alert" style={[s.err, { color: p.coralInk }]}>{error}</Text>}
        {!onResume && <ChunkyButton testID="vocabulary-start" label={startLabel} icon="play" onPress={onStart} disabled={starting || !ready} />}
        {!!onResume && <ChunkyButton testID="vocabulary-resume" label="تابع الجولة المحفوظة" tone="ghost" icon="refresh" onPress={onResume} disabled={starting} />}
      </View>

      {!isPremium && (
        <View testID="vocabulary-preview-note" style={[s.preview, { backgroundColor: p.sunSoft, borderColor: p.sun }]}>
          <Ionicons name="eye" size={18} color={p.sunInk} />
          <Text style={[s.previewText, { color: p.sunInk }]}>{`معاينة: تعرض أول ${PAGE} كلمة من أصل ${VOCABULARY_BANK.length} للقراءة فقط. الخطة الكاملة تفتح البنك كله.`}</Text>
        </View>
      )}

      <View style={[s.search, { borderColor: p.border, backgroundColor: p.isDark ? 'rgba(222,240,231,0.06)' : 'rgba(255,255,255,0.76)' }]}>
        <Ionicons name="search" size={18} color={p.mutedForeground} />
        <TextInput testID="vocabulary-search" value={query} onChangeText={t => { setQuery(t); setPage(0); }}
          placeholder="ابحث بالعبرية أو العربية" placeholderTextColor={p.mutedForeground} returnKeyType="search"
          accessibilityLabel="ابحث في المفردات" style={[s.input, { color: p.foreground }]} autoCorrect={false} autoCapitalize="none" />
        {!!query && <Pressable testID="vocabulary-search-clear" onPress={() => { setQuery(''); setPage(0); }} accessibilityRole="button" accessibilityLabel="مسح البحث" hitSlop={8}>
          <Ionicons name="close-circle" size={20} color={p.mutedForeground} />
        </Pressable>}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.cats} keyboardShouldPersistTaps="handled">
        {CATS.filter(c => counts[c.id] > 0).map(c => {
          const on = cat === c.id;
          return (
            <Pressable key={c.id} testID={`vocabulary-category-${c.id}`} onPress={() => { setCat(c.id); setPage(0); }}
              accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={`${c.label}، ${counts[c.id]} كلمة`}
              style={[s.chip, { backgroundColor: on ? p.brand : p.isDark ? 'rgba(222,240,231,0.06)' : 'rgba(255,255,255,0.76)', borderColor: on ? p.brandShade : p.border }]}>
              <Ionicons name={c.icon} size={14} color={on ? p.onBrand : p.foreground} />
              <Text style={[s.chipText, { color: on ? p.onBrand : p.foreground }]}>{`${c.label} ${counts[c.id]}`}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text testID="vocabulary-result-count" style={[s.count, { color: p.mutedForeground }]}>
        {filtered.length ? `${filtered.length} كلمة · صفحة ${safePage + 1} من ${pages}` : ''}
      </Text>

      {visible.length === 0 ? (
        <View testID="vocabulary-empty" style={s.empty}>
          <Creature kind="nuna" mood="happy" size={64} />
          <Text style={[s.sub, { color: p.mutedForeground, textAlign: 'center' }]}>لا توجد كلمة مطابقة. جرّب جزءًا من الكلمة أو اختر فئة أخرى.</Text>
        </View>
      ) : visible.map((q, i) => <WordCard key={`${safePage}-${q.word}`} q={q} index={i} reduce={reduce} />)}

      {pages > 1 && (
        <View style={s.pager}>
          <Pressable testID="vocabulary-page-next" disabled={safePage >= pages - 1} onPress={() => goPage(safePage + 1)} accessibilityRole="button" accessibilityLabel="الصفحة التالية"
            style={[s.pageBtn, { borderColor: p.border, opacity: safePage >= pages - 1 ? 0.4 : 1 }]}>
            <Ionicons name="chevron-back" size={20} color={p.foreground} /><Text style={[s.chipText, { color: p.foreground }]}>التالي</Text>
          </Pressable>
          <Text testID="vocabulary-page-label" style={[s.count, { color: p.foreground }]}>{`${safePage + 1} / ${pages}`}</Text>
          <Pressable testID="vocabulary-page-prev" disabled={safePage === 0} onPress={() => goPage(safePage - 1)} accessibilityRole="button" accessibilityLabel="الصفحة السابقة"
            style={[s.pageBtn, { borderColor: p.border, opacity: safePage === 0 ? 0.4 : 1 }]}>
            <Text style={[s.chipText, { color: p.foreground }]}>السابق</Text><Ionicons name="chevron-forward" size={20} color={p.foreground} />
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const rtl = { textAlign: 'right' as const, writingDirection: 'rtl' as const };
const s = StyleSheet.create({
  hero: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, padding: 14, borderRadius: 24, borderWidth: 1.5 },
  h1: { ...rtl, fontFamily: ARABIC_BOLD_FONT, fontWeight: '800', fontSize: 22, lineHeight: 34 },
  sub: { ...rtl, fontSize: 13.5, lineHeight: 23 },
  err: { ...rtl, fontSize: 13, lineHeight: 22 },
  preview: { flexDirection: 'row-reverse', gap: 8, alignItems: 'center', padding: 12, borderRadius: 16, borderWidth: 1 },
  previewText: { ...rtl, flex: 1, fontFamily: ARABIC_BOLD_FONT, fontWeight: '800', fontSize: 13, lineHeight: 22 },
  search: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 12, minHeight: 50 },
  input: { ...rtl, flex: 1, fontSize: 16, paddingVertical: 10 },
  cats: { flexDirection: 'row-reverse', gap: 8, paddingVertical: 2 },
  chip: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 12, minHeight: 40 },
  chipText: { fontFamily: ARABIC_BOLD_FONT, fontWeight: '800', fontSize: 13, lineHeight: 22, writingDirection: 'rtl' },
  count: { ...rtl, fontSize: 12.5, lineHeight: 20 },
  word: { borderWidth: 1.5, borderRadius: 18, padding: 12, gap: 4 },
  wordHead: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  he: { ...rtl, fontSize: 22, lineHeight: 32, fontWeight: '800' },
  translit: { ...rtl, fontSize: 12, lineHeight: 18, writingDirection: 'ltr' },
  audio: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  meaning: { ...rtl, fontFamily: ARABIC_BOLD_FONT, fontWeight: '800', fontSize: 16, lineHeight: 27 },
  sentence: { ...rtl, fontSize: 15.5, lineHeight: 26 },
  tag: { alignSelf: 'flex-end', flexDirection: 'row-reverse', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, marginTop: 2 },
  tagText: { fontSize: 11, fontWeight: '800', writingDirection: 'rtl' },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 24 },
  pager: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  pageBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 12, minHeight: 44 },
});
