import AsyncStorage from '@react-native-async-storage/async-storage';
import { IMPORTED_EXAMS } from './solved-exams';
import type { ReadingQuestion } from './study';
import { vocabularyDeckOrder } from './vocabulary-selection';

export type ReadingPack = { id: string; questions: ReadingQuestion[] };
export function readingPacks(premium: boolean): ReadingPack[] {
  const packs: ReadingPack[] = [];
  for (const exam of IMPORTED_EXAMS) {
    if (!premium && exam.id !== 'b17') continue;
    exam.sections.forEach((section, sectionIndex) => {
      const groups = new Map<string, ReadingQuestion[]>();
      let passage = '';
      for (const q of section) {
        if (q.type !== 'reading') { passage = ''; continue; }
        if (q.passage?.trim()) passage = q.passage.trim();
        if (!passage || q.answer === null) continue;
        const questions = groups.get(passage) ?? [];
        questions.push({
          passage, prompt: q.prompt, options: [...q.options],
          correctAnswer: q.options[q.answer], meaning: q.explanation,
        });
        groups.set(passage, questions);
      }
      [...groups.values()].forEach((questions, i) => {
        if (questions.length) packs.push({ id: `${exam.id}:${sectionIndex}:${i}`, questions: questions.slice(0, 6) });
      });
    });
  }
  return packs;
}
const queues = new Map<string, Promise<unknown>>();
export function reserveReadingPack(userId: string, premium: boolean) {
  if (!userId) return Promise.reject(new Error('Sign in required'));
  const task = (queues.get(userId) ?? Promise.resolve()).catch(() => {}).then(async () => {
    const packs = readingPacks(premium);
    if (!packs.length) throw new Error('No verified reading passages available');
    const key = `yael-reading-round-v1:${userId}`;
    const raw = await AsyncStorage.getItem(key);
    if (raw !== null && !/^(0|[1-9]\d*)$/.test(raw)) throw new Error('Invalid saved reading history');
    const previous = raw === null ? 0 : Number(raw);
    if (!Number.isSafeInteger(previous) || previous < 0) throw new Error('Invalid saved reading history');
    const order = vocabularyDeckOrder(packs.length, `reading:${userId}`);
    const pack = packs[order[previous % packs.length]];
    await AsyncStorage.setItem(key, String(previous + 1));
    return { pack, number: previous + 1 };
  });
  queues.set(userId, task);
  void task.finally(() => { if (queues.get(userId) === task) queues.delete(userId); }).catch(() => {});
  return task;
}
