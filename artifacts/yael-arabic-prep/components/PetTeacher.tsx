import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, Text, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { useColors } from '@/hooks/useColors';
import { PROGRESS_MAX_HOP } from '@/lib/progress-marker';
import { listenForReduceMotionChanges, updatePetTeacherMotion } from '@/lib/pet-teacher-motion';

export type CreatureKind = 'zizo' | 'lumi' | 'rami' | 'nuna' | 'ghaima';
export type CreatureMood = 'happy' | 'hype' | 'cheer';

export const CREATURE_NAMES: Record<CreatureKind, string> = { zizo: 'زيزو', lumi: 'لومي', rami: 'رامي', nuna: 'نونا', ghaima: 'غيمة' };

const tips = [
  'أنا زيزو، رفيقك في التدريب. نصل إلى هدفك خطوة بخطوة.',
  'اقرأ الجملة كاملة قبل اختيار الإجابة.',
  'الخطأ فرصة للتعلّم، وليس سببًا للتوقّف.',
  'ابحث عن دليل في النص، ولا تعتمد على التخمين وحده.',
];

// Fixed illustration pigments: the creatures keep their identity on light and dark surfaces.
const ink = {
  line: '#2a1e3a', white: '#fffdf7', blush: '#ff5d7a',
  zizo: '#ff8a4c', zizoShade: '#e9672e', zizoBelly: '#ffe2c4', mint: '#5ee0c1', mintShade: '#2fb895',
  lumi: '#ffc83d', lumiShade: '#e9a400', lumiFace: '#fff6d6', flame: '#ff7a59', flameCore: '#ffd36b', teal: '#1f6f78',
  skin: '#c98a64', skinShade: '#b07350', hair: '#2b2230', hoodie: '#2b9bd6', hoodieShade: '#1f7cb3',
  nuna: '#2fc4b2', nunaShade: '#1b9585', nunaBelly: '#d8fbf2', horn: '#ffd36b',
  cloud: '#cfe0ff', cloudShade: '#9fbdf2', bolt: '#ffc83d', shoe: '#ff5d7a', tongue: '#ff8fa3',
};

function Eyes({ lx, rx, y, r, mood }: { lx: number; rx: number; y: number; r: number; mood: CreatureMood }) {
  return <>
    <Ellipse cx={lx} cy={y} rx={r} ry={r * 1.18} fill={ink.white} />
    <Ellipse cx={rx} cy={y} rx={r} ry={r * 1.18} fill={ink.white} />
    <Circle cx={lx + 1} cy={y + 2} r={r * 0.6} fill={ink.line} />
    <Circle cx={rx - 1} cy={y + 2} r={r * 0.6} fill={ink.line} />
    <Circle cx={lx + 3} cy={y - 1} r={r * 0.22} fill={ink.white} />
    <Circle cx={rx + 1} cy={y - 1} r={r * 0.22} fill={ink.white} />
    {mood === 'cheer' && <Path d={`M${lx - r} ${y - r * 1.5} l${r * 1.4} -${r * 0.4} M${rx + r} ${y - r * 1.5} l-${r * 1.4} -${r * 0.4}`} stroke={ink.line} strokeWidth={2.6} strokeLinecap="round" />}
    {mood === 'hype' && <Path d={`M${lx - r} ${y - r * 1.5} q${r} -${r * 0.9} ${r * 1.8} 0 M${rx - r * 0.8} ${y - r * 1.5} q${r} -${r * 0.9} ${r * 1.8} 0`} stroke={ink.line} strokeWidth={2.6} fill="none" strokeLinecap="round" />}
  </>;
}

function OpenMouth({ x, y, w = 14, h = 14 }: { x: number; y: number; w?: number; h?: number }) {
  return <G>
    <Ellipse cx={x} cy={y} rx={w / 2} ry={h / 2} fill={ink.line} />
    <Ellipse cx={x} cy={y + h * 0.24} rx={w * 0.3} ry={h * 0.2} fill={ink.tongue} />
    <Rect x={x - w * 0.28} y={y - h / 2 + 1} width={w * 0.56} height={h * 0.16} rx={1.2} fill={ink.white} />
  </G>;
}

function Zizo({ mood, mouthOpen }: { mood: CreatureMood; mouthOpen: boolean }) {
  const hype = mood === 'hype';
  return <G>
    <Path d="M40 46C24 32 16 14 22 5c11 6 20 22 26 36Z" fill={ink.zizo} />
    <Path d="M80 46c16-14 24-32 18-41-11 6-20 22-26 36Z" fill={ink.zizo} />
    <Circle cx="23" cy="7" r="6" fill={ink.mint} />
    <Circle cx="97" cy="7" r="6" fill={ink.mint} />
    <Path d="M28 70C11 63 6 79 17 88c6-3 10-7 12-10Z" fill={ink.mint} />
    <Path d="M92 70c17-7 22 9 11 18-6-3-10-7-12-10Z" fill={ink.mint} />
    <Ellipse cx="46" cy="110" rx="9" ry="5" fill={ink.zizoShade} />
    <Ellipse cx="74" cy="110" rx="9" ry="5" fill={ink.zizoShade} />
    <Path d="M60 30c26 0 38 22 38 44 0 24-16 36-38 36S22 98 22 74c0-22 12-44 38-44Z" fill={ink.zizo} />
    <Path d="M54 33c-3-10 4-14 8-8 2-6 10-4 6 8Z" fill={ink.zizoShade} />
    <Ellipse cx="60" cy="88" rx="21" ry="16" fill={ink.zizoBelly} />
    <Eyes lx={46} rx={74} y={60} r={9.5} mood={mood} />
    <Ellipse cx="33" cy="76" rx="6" ry="3.6" fill={ink.blush} opacity={0.45} />
    <Ellipse cx="87" cy="76" rx="6" ry="3.6" fill={ink.blush} opacity={0.45} />
    {mouthOpen ? <OpenMouth x={60} y={80} w={16} h={15} /> : mood === 'cheer'
      ? <Path d="M52 79q8 6 16 0" stroke={ink.line} strokeWidth="3" fill="none" strokeLinecap="round" />
      : <>
        <Path d={hype ? 'M48 75q12 20 24 0Z' : 'M51 76q9 12 18 0Z'} fill={ink.line} />
        <Path d={hype ? 'M53 76l3 4 3-4Z M61 76l3 4 3-4Z' : 'M55 76l2.5 3 2.5-3Z'} fill={ink.white} />
      </>}
    {hype
      ? <>
        <Path d="M25 76C14 66 12 52 16 44" stroke={ink.zizo} strokeWidth="9" strokeLinecap="round" fill="none" />
        <Path d="M95 76c11-10 13-24 9-32" stroke={ink.zizo} strokeWidth="9" strokeLinecap="round" fill="none" />
        <Path d="M10 30l3 6 6 1-5 4 1 6-5-3-5 3 1-6-4-4 6-1Z" fill={ink.mint} />
        <Path d="M108 24l2 4 4 1-3 3 1 4-4-2-3 2 1-4-3-3 4-1Z" fill={ink.mint} />
      </>
      : <>
        <Path d="M26 82c-6 6-6 12-2 14" stroke={ink.zizoShade} strokeWidth="7" strokeLinecap="round" fill="none" />
        <Path d="M94 82c6 6 6 12 2 14" stroke={ink.zizoShade} strokeWidth="7" strokeLinecap="round" fill="none" />
      </>}
  </G>;
}

function Lumi({ mood, mouthOpen }: { mood: CreatureMood; mouthOpen: boolean }) {
  return <G>
    <Path d="M60 6c11 12 9 21 0 26-9-5-11-14 0-26Z" fill={ink.flame} />
    <Path d="M60 16c5 6 4 10 0 13-4-3-5-7 0-13Z" fill={ink.flameCore} />
    <Rect x="40" y="30" width="40" height="10" rx="5" fill={ink.teal} />
    <Path d="M30 62c-10 2-14 10-10 16" stroke={ink.lumiShade} strokeWidth="7" strokeLinecap="round" fill="none" />
    <Path d={mood === 'hype' ? 'M90 62c10-4 14-14 12-22' : 'M90 62c10 2 14 10 10 16'} stroke={ink.lumiShade} strokeWidth="7" strokeLinecap="round" fill="none" />
    <Rect x="28" y="38" width="64" height="64" rx="26" fill={ink.lumi} />
    <Rect x="28" y="84" width="64" height="18" rx="9" fill={ink.lumiShade} opacity={0.5} />
    <Rect x="37" y="49" width="46" height="38" rx="17" fill={ink.lumiFace} />
    {mood === 'cheer'
      ? <Eyes lx={50} rx={70} y={64} r={5.5} mood="cheer" />
      : <Path d="M45 66q5-7 10 0M65 66q5-7 10 0" stroke={ink.line} strokeWidth="3.2" fill="none" strokeLinecap="round" />}
    <Ellipse cx="43" cy="75" rx="4" ry="2.6" fill={ink.blush} opacity={0.5} />
    <Ellipse cx="77" cy="75" rx="4" ry="2.6" fill={ink.blush} opacity={0.5} />
    {mouthOpen ? <OpenMouth x={60} y={77} w={12} h={11} /> : <Path d={mood === 'cheer' ? 'M55 78q5 3 10 0' : 'M53 75q7 9 14 0Z'} stroke={ink.line} strokeWidth="2.6" fill={mood === 'cheer' ? 'none' : ink.line} strokeLinecap="round" />}
    <Rect x="38" y="100" width="44" height="9" rx="4.5" fill={ink.teal} />
    <Ellipse cx="48" cy="112" rx="7" ry="4" fill={ink.teal} />
    <Ellipse cx="72" cy="112" rx="7" ry="4" fill={ink.teal} />
  </G>;
}

function Rami({ mood, mouthOpen }: { mood: CreatureMood; mouthOpen: boolean }) {
  return <G>
    <Path d="M22 118c0-24 16-36 38-36s38 12 38 36Z" fill={ink.hoodie} />
    <Path d="M46 84l14 12 14-12" stroke={ink.hoodieShade} strokeWidth="5" fill="none" strokeLinecap="round" />
    <Path d="M40 86q20 18 40 0" stroke={ink.flame} strokeWidth="6" fill="none" strokeLinecap="round" />
    <Circle cx="38" cy="86" r="6" fill={ink.flame} />
    <Circle cx="82" cy="86" r="6" fill={ink.flame} />
    <Rect x="53" y="70" width="14" height="14" rx="5" fill={ink.skinShade} />
    <Circle cx="34" cy="54" r="6" fill={ink.skinShade} />
    <Circle cx="86" cy="54" r="6" fill={ink.skinShade} />
    <Circle cx="60" cy="50" r="27" fill={ink.skin} />
    <Path d="M33 46c-5-17 9-27 21-24 6-9 25-7 29 7 7 4 6 14 3 19-8-8-20-10-30-8-9 2-16 4-23 6Z" fill={ink.hair} />
    <Circle cx="42" cy="28" r="6" fill={ink.hair} />
    <Circle cx="78" cy="25" r="6" fill={ink.hair} />
    <Ellipse cx="50" cy="55" rx="3.6" ry={mood === 'hype' ? 5 : 4.4} fill={ink.line} />
    <Ellipse cx="70" cy="55" rx="3.6" ry={mood === 'hype' ? 5 : 4.4} fill={ink.line} />
    <Circle cx="51.2" cy="53.4" r="1.2" fill={ink.white} />
    <Circle cx="71.2" cy="53.4" r="1.2" fill={ink.white} />
    <Path d={mood === 'cheer' ? 'M44 46l10-1M76 46l-10-1' : 'M44 45q6-4 11-1M65 44q6-3 11 1'} stroke={ink.hair} strokeWidth="2.6" fill="none" strokeLinecap="round" />
    <Ellipse cx="42" cy="64" rx="5" ry="3" fill={ink.blush} opacity={0.35} />
    <Ellipse cx="78" cy="64" rx="5" ry="3" fill={ink.blush} opacity={0.35} />
    {mouthOpen ? <OpenMouth x={60} y={67} w={13} h={12} /> : mood === 'cheer'
      ? <Path d="M53 66q7 5 14 0" stroke={ink.line} strokeWidth="2.8" fill="none" strokeLinecap="round" />
      : <Path d="M50 63q10 13 20 0Z" fill={ink.line} />}
    {mood === 'hype' && <>
      <Path d="M96 104c8-10 10-24 6-34" stroke={ink.hoodie} strokeWidth="10" strokeLinecap="round" fill="none" />
      <Circle cx="101" cy="66" r="7" fill={ink.skin} />
    </>}
  </G>;
}

function Nuna({ mood, mouthOpen }: { mood: CreatureMood; mouthOpen: boolean }) {
  const hype = mood === 'hype';
  return <G>
    <Path d="M86 96c18 4 28-6 24-18-3 8-10 11-18 8" stroke={ink.nuna} strokeWidth="9" fill="none" strokeLinecap="round" />
    <Path d="M108 74l6-6 1 9Z" fill={ink.horn} />
    <Path d="M26 64C10 52 8 36 16 30c4 10 10 18 18 22Z" fill={ink.nunaShade} />
    <Path d="M94 64c16-12 18-28 10-34-4 10-10 18-18 22Z" fill={ink.nunaShade} />
    <Path d="M60 34c24 0 34 18 34 38 0 24-14 38-34 38S26 96 26 72c0-20 10-38 34-38Z" fill={ink.nuna} />
    <Path d="M48 22l6 12h-12Z M60 16l6 16h-12Z M72 22l6 12h-12Z" fill={ink.nunaShade} />
    <Path d="M42 38c-6-10-4-20 2-24 2 8 4 14 8 20Z M78 38c6-10 4-20-2-24-2 8-4 14-8 20Z" fill={ink.horn} />
    <Ellipse cx="60" cy="90" rx="18" ry="15" fill={ink.nunaBelly} />
    <Path d="M48 84h24M50 92h20M53 99h14" stroke={ink.nuna} strokeWidth="1.6" opacity={0.5} />
    <Eyes lx={47} rx={73} y={60} r={8.5} mood={mood} />
    <Circle cx="55" cy="72" r="1.6" fill={ink.nunaShade} />
    <Circle cx="65" cy="72" r="1.6" fill={ink.nunaShade} />
    <Ellipse cx="35" cy="73" rx="5" ry="3" fill={ink.blush} opacity={0.45} />
    <Ellipse cx="85" cy="73" rx="5" ry="3" fill={ink.blush} opacity={0.45} />
    {mouthOpen ? <OpenMouth x={60} y={80} w={14} h={13} /> : mood === 'cheer'
      ? <Path d="M53 79q7 5 14 0" stroke={ink.line} strokeWidth="2.8" fill="none" strokeLinecap="round" />
      : <><Path d={hype ? 'M49 77q11 16 22 0Z' : 'M52 78q8 9 16 0Z'} fill={ink.line} /><Path d="M54 78l2 3 2-3Z M62 78l2 3 2-3Z" fill={ink.white} /></>}
    <Path d={hype ? 'M28 80c-10-6-12-16-8-24' : 'M30 86c-6 4-6 10-2 12'} stroke={ink.nunaShade} strokeWidth="7" fill="none" strokeLinecap="round" />
    <Path d={hype ? 'M92 80c10-6 12-16 8-24' : 'M90 86c6 4 6 10 2 12'} stroke={ink.nunaShade} strokeWidth="7" fill="none" strokeLinecap="round" />
    <Ellipse cx="48" cy="110" rx="8" ry="4.5" fill={ink.nunaShade} />
    <Ellipse cx="72" cy="110" rx="8" ry="4.5" fill={ink.nunaShade} />
  </G>;
}

function Ghaima({ mood, mouthOpen }: { mood: CreatureMood; mouthOpen: boolean }) {
  const hype = mood === 'hype';
  return <G>
    <Path d="M64 4l-12 22h10l-6 18 18-26H62Z" fill={ink.bolt} />
    <Path d={hype ? 'M22 70C8 62 6 48 12 40' : 'M22 74c-10 4-12 12-8 16'} stroke={ink.cloudShade} strokeWidth="7" fill="none" strokeLinecap="round" />
    <Path d={hype ? 'M98 70c14-8 16-22 10-30' : 'M98 74c10 4 12 12 8 16'} stroke={ink.cloudShade} strokeWidth="7" fill="none" strokeLinecap="round" />
    <Path d="M30 98c-14 0-20-12-14-22-8-10 0-26 14-24 2-16 22-24 34-14 12-10 32-2 32 14 14 0 20 16 12 24 6 12-2 22-14 22Z" fill={ink.cloud} />
    <Path d="M30 98h68c-4 6-10 8-16 8H44c-6 0-12-2-14-8Z" fill={ink.cloudShade} />
    <Eyes lx={48} rx={74} y={66} r={8} mood={mood} />
    <Ellipse cx="38" cy="80" rx="5" ry="3" fill={ink.blush} opacity={0.5} />
    <Ellipse cx="84" cy="80" rx="5" ry="3" fill={ink.blush} opacity={0.5} />
    {mouthOpen ? <OpenMouth x={61} y={84} w={13} h={12} /> : mood === 'cheer'
      ? <Path d="M55 83q6 4 12 0" stroke={ink.line} strokeWidth="2.6" fill="none" strokeLinecap="round" />
      : <Path d={hype ? 'M51 81q10 14 20 0Z' : 'M54 82q7 8 14 0Z'} fill={ink.line} />}
    <Rect x="40" y="104" width="7" height="8" rx="3" fill={ink.cloudShade} />
    <Rect x="74" y="104" width="7" height="8" rx="3" fill={ink.cloudShade} />
    <Path d="M34 116c0-6 4-8 10-8s8 4 8 8Z M70 116c0-6 4-8 10-8s8 4 8 8Z" fill={ink.shoe} />
    <Path d="M36 114h14M72 114h14" stroke={ink.white} strokeWidth="2" />
  </G>;
}

/** Original Kalima cast. Pure illustration; hidden from assistive tech by callers. */
export function Creature({ kind = 'zizo', mood = 'happy', size, mouthOpen = false }: { kind?: CreatureKind; mood?: CreatureMood; size: number; mouthOpen?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Ellipse cx="60" cy="116" rx="34" ry="3.5" fill={ink.line} opacity={0.1} />
      {kind === 'zizo' ? <Zizo mood={mood} mouthOpen={mouthOpen} /> : kind === 'lumi' ? <Lumi mood={mood} mouthOpen={mouthOpen} />
        : kind === 'nuna' ? <Nuna mood={mood} mouthOpen={mouthOpen} /> : kind === 'ghaima' ? <Ghaima mood={mood} mouthOpen={mouthOpen} />
        : <Rami mood={mood} mouthOpen={mouthOpen} />}
    </Svg>
  );
}

export function PetTeacherReaction({
  mood,
  size = 64,
  jumpKey = 0,
  kind = 'zizo',
  testID,
}: {
  mood: 'happy' | 'sad';
  size?: number;
  jumpKey?: number;
  kind?: CreatureKind;
  testID?: string;
}) {
  const jump = useRef(new Animated.Value(0)).current;
  const squash = useRef(new Animated.Value(1)).current;
  const previousJumpKey = useRef(jumpKey);
  const [reduceMotion, setReduceMotion] = useState(true);
  useEffect(() => {
    return listenForReduceMotionChanges(AccessibilityInfo, setReduceMotion);
  }, []);
  useEffect(() => {
    if (!updatePetTeacherMotion(mood, jumpKey, reduceMotion, previousJumpKey, jump, squash)) return;
    const animation = Animated.sequence([
      Animated.parallel([
        Animated.timing(jump, { toValue: -PROGRESS_MAX_HOP, duration: 150, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(squash, { toValue: 1.12, duration: 130, useNativeDriver: Platform.OS !== 'web' }),
      ]),
      Animated.parallel([
        Animated.timing(jump, { toValue: 0, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }),
        Animated.spring(squash, { toValue: 1, damping: 6, stiffness: 220, useNativeDriver: Platform.OS !== 'web' }),
      ]),
    ]);
    animation.start();
    return () => animation.stop();
  }, [mood, jumpKey, jump, squash, reduceMotion]);
  return (
    <Animated.View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      testID={testID}
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', transform: [{ translateY: jump }, { scale: squash }] }}>
      <Creature kind={kind} mood={mood === 'happy' ? 'hype' : 'cheer'} size={size} />
    </Animated.View>
  );
}

export default function StudyTutor({ quiet = false }: { quiet?: boolean }) {
  const c = useColors();
  const [tip, setTip] = useState(0);
  const [hidden, setHidden] = useState(false);
  if (hidden) return (
    <Pressable accessibilityRole="button" accessibilityLabel="إظهار زيزو" onPress={() => setHidden(false)} style={{ padding: 10 }}>
      <Text style={{ color: c.primary, textAlign: 'right', fontWeight: '700' }}>إظهار زيزو</Text>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginVertical: 8 }}>
      <Pressable testID="pet-teacher" accessibilityRole="button" accessibilityLabel={quiet ? 'زيزو في وضع هادئ' : 'نصيحة جديدة من زيزو'} onPress={() => { if (!quiet) setTip((tip + 1) % tips.length); }}>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><Creature size={76} mood={quiet ? 'happy' : 'hype'} /></View>
      </Pressable>
      <View style={{ flex: 1, backgroundColor: c.card, borderColor: c.border, borderWidth: 2, borderBottomWidth: 4, borderRadius: 18, paddingHorizontal: 13, paddingVertical: 10 }}>
        <View style={{ position: 'absolute', right: -7, top: 22, width: 12, height: 12, backgroundColor: c.card, borderColor: c.border, borderRightWidth: 2, borderTopWidth: 2, transform: [{ rotate: '45deg' }] }} />
        <Text style={{ color: c.foreground, fontSize: 13, lineHeight: 22, textAlign: 'right', fontWeight: '600' }}>{quiet ? 'زيزو معك. خذ وقتك في قراءة السؤال، ثم اختر بثقة.' : tips[tip]}</Text>
        <Pressable onPress={() => setHidden(true)} accessibilityRole="button" accessibilityLabel="إخفاء زيزو" style={{ alignSelf: 'flex-start', paddingVertical: 4 }}>
          <Text style={{ color: c.mutedForeground, fontSize: 11, fontWeight: '700' }}>إخفاء</Text>
        </Pressable>
      </View>
    </View>
  );
}
