import type { ImportedExam } from './solved-exams';

/** Preserve PDF wording, option order, question IDs and page references verbatim. */
export function restatementExam(exam: ImportedExam): ImportedExam {
  return {
    ...exam,
    title: `إعادة صياغة · ${exam.title}`,
    sections: exam.sections.map(section => section.filter(question => question.type === 'restatement')),
  };
}

export function restatementSessionKey(key: string, focused: boolean) {
  return focused ? `${key}:restatement` : key;
}

export type RestatementSlotState = 'active' | 'corrupt' | 'unused' | 'done';
export type RestatementSlot = { examId: string; section: number; state: RestatementSlotState };

/** Pick an unfinished (or corrupt, for recovery) attempt first, then the first unused slot, then the first completed one. */
export function selectRestatementSlot(slots: RestatementSlot[]): RestatementSlot | null {
  return slots.find(s => s.state === 'active' || s.state === 'corrupt')
    ?? slots.find(s => s.state === 'unused')
    ?? slots.find(s => s.state === 'done')
    ?? null;
}

/** Deterministic pool order: b17 first, then the rest in library order. */
export function orderRestatementExams<T extends { id: string }>(exams: T[]): T[] {
  return [...exams.filter(e => e.id === 'b17'), ...exams.filter(e => e.id !== 'b17')];
}
