import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, Text, View } from 'react-native';
import { useUser } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PracticeSession } from './(tabs)/practice';
import { Creature } from '@/components/PetTeacher';
import { ChunkyButton, usePlay } from '@/components/Playful';
import { ARABIC_BOLD_FONT } from '@/constants/typography';
import { usePlanAccess } from '@/lib/PlanAccess';
import { readingPacks, reserveReadingPack, type ReadingPack } from '@/lib/reading-practice';

export default function ReadingScreen() {
  const p = usePlay();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const { ready, plan, isPremium, claimActivity } = usePlanAccess();
  const [phase, setPhase] = useState<'intro' | 'starting' | 'error' | 'limit' | 'active'>('intro');
  const [round, setRound] = useState<{ pack: ReadingPack; number: number; deadline: number } | null>(null);
  const activityKey = useRef(`reading-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const starting = useRef(false);
  const alive = useRef(true);
  const identity = useRef(user?.id);
  identity.current = user?.id;
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const available = useMemo(() => readingPacks(isPremium).length, [isPremium]);
  const begin = async () => {
    const id = user?.id;
    if (!id || !ready || !plan || starting.current) return;
    starting.current = true;
    setPhase('starting');
    try {
      if (!available) throw new Error('No reading content');
      const allowed = isPremium || await claimActivity('timed-section', activityKey.current);
      if (!alive.current || identity.current !== id) return;
      if (!allowed) { setPhase('limit'); return; }
      const reserved = await reserveReadingPack(id, isPremium);
      if (!alive.current || identity.current !== id) return;
      setRound({ ...reserved, deadline: Date.now() + 10 * 60 * 1000 });
      setPhase('active');
    } catch {
      if (alive.current && identity.current === id) setPhase('error');
    } finally { starting.current = false; }
  };
  if (phase === 'active' && round) {
    return <PracticeSession key={`${user?.id}:${round.number}`} userId={user?.id} isPremium={isPremium}
      initialOrder={[]} initialRoundNumber={round.number} initialMode="reading" readingBank={round.pack.questions}
      deadline={round.deadline} activityKey={activityKey.current} />;
  }
  return <ScrollView style={{ flex: 1, backgroundColor: p.background }}
    contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, gap: 20,
      paddingTop: Math.max(Platform.OS === 'web' ? 64 : 24, insets.top + 16), paddingBottom: insets.bottom + 32, maxWidth: 600, width: '100%', alignSelf: 'center' }}>
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ alignItems: 'center' }}>
      <Creature kind="nuna" mood="hype" size={120} />
    </View>
    <View style={{ backgroundColor: p.skySoft, borderColor: p.sky, borderWidth: 2, borderBottomWidth: 5, borderRadius: 24, padding: 22, gap: 16 }}>
      <Ionicons name="book" size={32} color={p.skyInk} />
      <Text accessibilityRole="header" style={{ fontFamily: ARABIC_BOLD_FONT, fontSize: 30, lineHeight: 43, color: p.foreground, textAlign: 'right' }}>
        فهم المقروء
      </Text>
      <Text style={{ fontFamily: ARABIC_BOLD_FONT, color: p.skyInk, fontSize: 17, lineHeight: 29, textAlign: 'right', writingDirection: 'rtl' }}>
        افتح نصًا، اكتشف فكرته، وجاوب خطوة خطوة مع معلّمك.
      </Text>
      <Text style={{ color: p.foreground, lineHeight: 26, textAlign: 'right', writingDirection: 'rtl' }}>
        نص عبري واحد وأسئلته، حتى ٦ أسئلة خلال ١٠ دقائق. ستبقى القطعة متاحة مع كل سؤال، وبعد إجابتك يظهر شرح بالعربية.
      </Text>
      <Text style={{ color: p.skyInk, lineHeight: 24, textAlign: 'right', writingDirection: 'rtl' }}>
        الأسئلة من النماذج التي أضفتها. الشروح تعليمية وليست مفتاحًا رسميًا.
      </Text>
    </View>
    {!isPremium && <Text style={{ color: p.foreground, lineHeight: 26, textAlign: 'right', writingDirection: 'rtl' }}>
      التجربة المجانية: قسم موقوت واحد يوميًا، مشترك مع إعادة الصياغة والتدريب الموقوت. اختيار فهم المقروء يستخدم هذا القسم.
    </Text>}
    {phase === 'error' && <Text accessibilityRole="alert" style={{ color: p.coralInk, textAlign: 'right' }}>تعذّر تجهيز القراءة. لم نمسح محفوظاتك؛ حاول مجددًا.</Text>}
    {phase === 'limit' ? <>
      <Text accessibilityRole="alert" style={{ color: p.coralInk, lineHeight: 26, textAlign: 'right' }}>استخدمت قسمك الموقوت اليوم. ارجع غدًا أو اختر الخطة الكاملة للتدرّب بلا حدود.</Text>
      <ChunkyButton tone="sun" label="استكشف الخطة الكاملة" onPress={() => router.push('/plans')} />
    </> : <ChunkyButton testID="begin-reading" tone="brand" icon="book" label={phase === 'starting' ? 'جارٍ فتح النص…' : 'ابدأ القراءة'}
      disabled={!ready || !plan || phase === 'starting' || available === 0} onPress={() => void begin()} />}
    {phase === 'starting' && <ActivityIndicator color={p.sky} />}
    {ready && !available && <Text accessibilityRole="alert" style={{ color: p.coralInk }}>لا توجد نصوص قابلة للتدريب في خطتك حاليًا.</Text>}
    <ChunkyButton tone="ghost" label="العودة للرئيسية" onPress={() => router.replace('/')} />
  </ScrollView>;
}
