/**
 * Build an isolated browser fixture from the real QuestionPrompt/ChunkyButton
 * and the real screens' style factories. No auth, API calls, or learner writes.
 *
 * node scripts/study-tests/question-bubbles-fixture.mjs
 * Open /__mockup/@fs/<workspace>/generated-artifacts/question-bubbles/index.html
 * with ?scale=1|1.5|2&mode=words|reading|source|exam&presenter=0..4.
 *
 * RN Web does not implement native font scaling. The shim multiplies Text
 * fontSize/lineHeight and supplies the same fontScale to useWindowDimensions.
 * This is a layout approximation, NOT an iOS/Android Dynamic Type certification.
 */
import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const app = path.join(root, 'artifacts/yael-arabic-prep');
const out = path.join(root, 'generated-artifacts/question-bubbles');
const appRequire = createRequire(path.join(app, 'package.json'));
const viteRequire = createRequire(createRequire(path.join(root, 'artifacts/mockup-sandbox/package.json')).resolve('vite/package.json'));
const { build } = viteRequire('esbuild');
await mkdir(out, { recursive: true });

// Extract, don't copy, the screen styles so fixture runs follow future edits.
const factories = [];
for (const [name, file] of [
  ['practiceStyles', 'app/(tabs)/practice.tsx'],
  ['sourceStyles', 'components/SourceSessionScreen.tsx'],
  ['examStyles', 'app/exam.tsx'],
]) {
  const source = await readFile(path.join(app, file), 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const factory = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'makeStyles');
  if (!factory) throw new Error(`Missing style factory: ${file}`);
  factories.push(factory.getText(ast).replace('function makeStyles', `function ${name}`));
}
await writeFile(path.join(out, 'screen-styles.ts'), `
import { StyleSheet, Platform } from 'react-native';
import { ARABIC_BOLD_FONT as BOLD } from '${app}/constants/typography';
import { PRACTICE_HORIZONTAL_PADDING } from '${app}/lib/progress-marker';
const FONT = 'sans-serif';
${factories.join('\n')}
export { practiceStyles, sourceStyles, examStyles };
`);
await writeFile(path.join(out, 'native.tsx'), `
import React from 'react';
import * as RN from '${appRequire.resolve('react-native-web')}';
export * from '${appRequire.resolve('react-native-web')}';
export const scale = Number(new URLSearchParams(location.search).get('scale') || 1);
export const Platform = { OS: 'ios', select: (v) => v.ios ?? v.default };
export function useWindowDimensions() { return { width: 375, height: 812, scale: 1, fontScale: scale }; }
export const Text = React.forwardRef(({style, ...props}, ref) => {
  const flat = RN.StyleSheet.flatten(style) || {};
  return <RN.Text {...props} ref={ref} style={[{fontSize: 14}, flat, {
    fontFamily: 'Arial, sans-serif',
    fontSize: (flat.fontSize || 14) * scale,
    ...(flat.lineHeight ? {lineHeight: flat.lineHeight * scale} : {}),
  }]} />;
});
`);
await writeFile(path.join(out, 'stubs.tsx'), `
import React from 'react';
import { View, Text } from 'react-native';
import colors from '${app}/constants/colors';
export function useColors() { return {...colors.light, radius: colors.radius, isDark: false}; }
export const CREATURE_NAMES = {zizo:'زيزو', lumi:'لومي', rami:'رامي', nuna:'نونا', ghaima:'غيمة'};
export function SpeakingTeacher({size}) { return <View style={{width:size, height:size, borderRadius:size/2, backgroundColor:colors.light.secondary}} />; }
export const Ionicons = ({size, color}) => <View style={{width:size, height:size, flexShrink:0, backgroundColor:color, borderRadius:4}} />;
export const useHebrewSpeech = () => ({status:'idle', error:null, toggle() {}});
`);
await writeFile(path.join(out, 'entry.tsx'), `
import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {View, Text, Pressable, ScrollView, scale} from 'react-native';
import {QuestionPrompt, ChunkyButton, usePlay} from '${app}/components/Playful';
import {usesExpandedQuestionLayout} from '${app}/lib/practice-layout';
import {practiceStyles, sourceStyles, examStyles} from './screen-styles';
const params = new URLSearchParams(location.search);
const mode = params.get('mode') || 'words';
const index = Number(params.get('presenter') || 0);
const arabic = 'اقرأ التعليمات كاملة ثم اختر الإجابة التي تعبّر عن الفكرة الأساسية في النص، وانتبه إلى العلاقة بين الجمل قبل الانتقال إلى السؤال التالي.';
const hebrew = 'למרות השינויים הרבים שהתרחשו בשנים האחרונות, החוקרים ממשיכים לבדוק כיצד משפיעה הסביבה על התפתחות השפה ועל יכולתם של התלמידים להבין טקסטים מורכבים.';
function Fixture() {
  const p = usePlay();
  const practice = practiceStyles(p, 0);
  const s = mode === 'source' ? sourceStyles(p) : mode === 'exam' ? examStyles(p) : practice;
  const words = mode === 'words';
  const timed = mode === 'source' || mode === 'exam';
  const expanded = usesExpandedQuestionLayout(scale);
  const [answer, setAnswer] = useState(false);
  const [next, setNext] = useState(false);
  const footer = <View testID="fixture-footer" style={practice.footer}>
    <View style={words ? practice.compactFooterRow : undefined}>
      {answer && <View style={[practice.feedbackRow, words && {width:68,gap:4}]}>
        <View style={{width:words?34:62,height:words?34:62,flexShrink:0,backgroundColor:p.coralSoft}} />
        <View style={{width:28,height:28,flexShrink:0,backgroundColor:p.coral}} />
        {!words && <View style={{flex:1,minWidth:0,alignItems:'flex-end'}}>
          <Text testID="fixture-correction" style={practice.feedbackBody}>{'الإجابة الصحيحة: ' + arabic}</Text>
        </View>}
      </View>}
      <ChunkyButton testID="fixture-next" disabled={!answer} label={next?'إنهاء التدريب':'السؤال التالي'} icon="arrow-back" onPress={()=>setNext(true)} style={words?{flex:1}:undefined}/>
    </View>
  </View>;
  return <View style={{height:'100vh',width:'100%',backgroundColor:p.background}}>
    <Text testID="fixture-meta" style={{textAlign:'right'}}>375px · {mode} · {scale}</Text>
    <ScrollView testID="fixture-scroll" style={{flex:1}} contentContainerStyle={timed?s.content:practice.content}>
      {!words && <View style={timed?s.card:practice.readingCard}><Text selectable style={timed?s.hebrew:practice.readingHebrew}>{hebrew.repeat(3)}</Text></View>}
      <QuestionPrompt index={index} text={timed?hebrew:arabic} hebrew={timed} label={arabic} spokenWord={words?'התפתחות':undefined} compact={words}>
        {words && <>
          <View style={[practice.wordStage,expanded&&{paddingLeft:0}]}>
            <Text style={practice.hebrew}>התפתחות</Text><Text style={practice.transliteration}>هِتْپَتْحوت</Text>
          </View>
          <View style={practice.sentenceBox}>
            <Text style={practice.sentenceLabel}>مثال بالعبرية</Text>
            <Text style={practice.sentence}>{hebrew}</Text>
          </View>
        </>}
      </QuestionPrompt>
      <View style={{gap:10}}>{[0,1,2,3].map(i=><Pressable key={i} testID={'fixture-option-'+i} style={s.option} onPress={()=>setAnswer(true)}>
        <Text style={s.optionText}>{timed?hebrew:arabic}</Text>
        <View style={timed?s.optionNumber:practice.optionDot}><Text style={timed?s.numberText:practice.optionLetter}>{i+1}</Text></View>
      </Pressable>)}</View>
      {timed ? <View style={s.navigation}>{['السابق','التالي'].map((label,i)=><View key={label} style={{flex:1}}>
        <Pressable testID={'fixture-nav-'+i} style={[s.button,s.secondaryButton]} onPress={()=>setNext(true)}><Text style={s.buttonText}>{label}</Text></Pressable>
      </View>)}</View> : expanded && footer}
      {timed && answer && <Text testID="fixture-correction" style={s.body}>{'الإجابة الصحيحة: '+hebrew}</Text>}
      {next && <Text testID="fixture-completed">تم الانتقال</Text>}
    </ScrollView>
    {!timed && !expanded && footer}
  </View>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
`);

const result = await build({
  entryPoints: [path.join(out, 'entry.tsx')], bundle: true, write: false,
  platform: 'browser', format: 'iife', jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"development"', __DEV__: 'true' },
  nodePaths: [path.join(app, 'node_modules')],
  plugins: [{
    name: 'question-fixture',
    setup(b) {
      b.onResolve({ filter: /^react-native$/ }, () => ({ path: path.join(out, 'native.tsx') }));
      b.onResolve({ filter: /^(@expo\/vector-icons|@\/hooks\/useColors|@\/hooks\/useHebrewSpeech|@\/components\/PetTeacher|@\/components\/SpeakingTeacher)$/ },
        () => ({ path: path.join(out, 'stubs.tsx') }));
      b.onResolve({ filter: /^@\// }, a => ({ path: path.join(app, a.path.slice(2)) + '.ts' }));
    },
  }],
});
await writeFile(path.join(out, 'index.html'), `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Question bubble layout fixture</title><style>html,body,#root{margin:0;width:100%;height:100%;}*{box-sizing:border-box;}</style></head><body><div id="root"></div><script>${result.outputFiles[0].text.replaceAll('</script', '<\\/script')}</script></body></html>`);
console.log(path.join(out, 'index.html'));
