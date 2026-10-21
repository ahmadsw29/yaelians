import AsyncStorage from '@react-native-async-storage/async-storage';
export type SourceSessionExam = { id: string; sections: { options: string[] }[][] };

export const SECTION_MS = 20 * 60 * 1000;
export const ESSAY_MS = 15 * 60 * 1000;
export type SourceMode = 'training' | 'full';

// Stages: 0..sections.length-1 are question sections; next = essay (full only); final = results.
export type SourceSession = {
  version: 1;
  attemptId?: string;
  examId: string;
  mode: SourceMode;
  sections: number[]; // indices into exam.sections covered by this attempt
  stage: number;
  deadline: number | null;
  question: number;
  answers: (number | null)[][];
  essay: string;
};

export function stageCount(s: Pick<SourceSession, 'mode' | 'sections'>) {
  return s.sections.length + (s.mode === 'full' ? 1 : 0);
}
export const isEssayStage = (s: SourceSession) => s.mode === 'full' && s.stage === s.sections.length;
export const isDone = (s: SourceSession) => s.stage >= stageCount(s);

export function storageKey(userId: string | undefined, examId: string, mode: SourceMode, section: number | null) {
  return `yael-source:v1:${userId ?? 'guest'}:${examId}:${mode}:${mode === 'training' ? section : 'all'}`;
}

export function newSourceSession(exam: SourceSessionExam, mode: SourceMode, section: number | null): SourceSession {
  const sections = mode === 'training' ? [section ?? 0] : exam.sections.map((_, i) => i);
  return {
    version: 1, attemptId: `source-${Date.now()}-${Math.random().toString(36).slice(2)}`, examId: exam.id, mode, sections, stage: 0, question: 0,
    deadline: Date.now() + SECTION_MS,
    answers: sections.map(i => exam.sections[i].map(() => null)), essay: '',
  };
}

export function advance(s: SourceSession, from: number): SourceSession {
  const stage = s.stage + 1;
  const total = stageCount(s);
  const deadline = stage >= total ? null : from + (s.mode === 'full' && stage === s.sections.length ? ESSAY_MS : SECTION_MS);
  return { ...s, stage, question: 0, deadline };
}

// Deadlines carry forward from ORIGINAL timestamps, never from resume time.
export function catchUp(s: SourceSession, now: number): SourceSession {
  let next = s;
  while (!isDone(next) && next.deadline !== null && now >= next.deadline) next = advance(next, next.deadline);
  return next;
}

export function parseSourceSession(raw: string, exam: SourceSessionExam, mode: SourceMode, section: number | null): SourceSession {
  const v: unknown = JSON.parse(raw);
  if (!v || typeof v !== 'object') throw new Error('invalid');
  const s = v as SourceSession;
  const expected = mode === 'training' ? [section] : exam.sections.map((_, i) => i);
  const ok = s.version === 1 && s.examId === exam.id && s.mode === mode
    && (s.attemptId === undefined || (typeof s.attemptId === 'string' && s.attemptId.length > 0 && s.attemptId.length <= 120))
    && Array.isArray(s.sections) && s.sections.length === expected.length && s.sections.every((x, i) => x === expected[i])
    && Number.isInteger(s.stage) && s.stage >= 0 && s.stage <= stageCount(s)
    && Number.isInteger(s.question) && s.question >= 0
    && typeof s.essay === 'string'
    && (s.stage < stageCount(s) ? typeof s.deadline === 'number' && Number.isFinite(s.deadline) && s.deadline > 0 : s.deadline === null)
    && Array.isArray(s.answers) && s.answers.length === s.sections.length
    && s.answers.every((row, i) => {
      const qs = exam.sections[s.sections[i]];
      return Array.isArray(row) && row.length === qs.length && row.every((a, j) =>
        a === null || (Number.isInteger(a) && a >= 0 && a < qs[j].options.length));
    });
  if (!ok) throw new Error('invalid');
  const len = s.stage < s.sections.length ? exam.sections[s.sections[s.stage]].length : 1;
  if (s.question >= len) s.question = 0;
  return s;
}

// Serialize writes across renders AND route remounts.
const queues = new Map<string, Promise<void>>();
export function saveSourceSession(key: string, s: SourceSession | null): Promise<void> {
  const prior = queues.get(key) ?? Promise.resolve();
  const next = prior.catch(() => {}).then(() => s ? AsyncStorage.setItem(key, JSON.stringify(s)) : AsyncStorage.removeItem(key));
  queues.set(key, next);
  void next.finally(() => { if (queues.get(key) === next) queues.delete(key); }).catch(() => {});
  return next;
}
export async function loadSourceSession(key: string): Promise<string | null> {
  await queues.get(key)?.catch(() => {});
  return AsyncStorage.getItem(key);
}

export const TYPE_LABEL: Record<string, string> = { completion: 'إكمال جمل', restatement: 'إعادة صياغة', reading: 'فهم المقروء' };
