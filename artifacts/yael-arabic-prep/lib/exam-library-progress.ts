import {
  isDone, loadSourceSession, parseSourceSession, storageKey,
  type SourceSession, type SourceSessionExam,
} from './source-session';

type ProgressExam = SourceSessionExam & { essayPrompt?: string | null };

export function summarizeExamProgress(
  exam: ProgressExam,
  full: SourceSession | null,
  training: (SourceSession | null)[] = [],
) {
  // A full attempt takes precedence; never add answers from separate attempts.
  const sections = exam.sections.map((questions, index) => ({
    total: questions.length,
    answered: (full ? full.answers[index] : training[index]?.answers[0])
      ?.filter(answer => answer !== null).length ?? 0,
  }));
  const completed = !!full && isDone(full) && sections.length > 0
    && sections.every(section => section.total > 0 && section.answered === section.total)
    && (!exam.essayPrompt?.trim() || !!full.essay.trim());
  return {
    sections, completed,
    started: !!full || training.some(Boolean),
    mode: full ? 'full' as const : training.some(Boolean) ? 'training' as const : 'none' as const,
    essay: !full || !exam.essayPrompt?.trim() ? null : !full.essay.trim() ? 'missing' as const
      : isDone(full) ? 'submitted' as const : 'draft' as const,
  };
}

export type ExamLibraryProgress =
  | { state: 'ready'; summary: ReturnType<typeof summarizeExamProgress> }
  | { state: 'error' };

/** Read-only and identity-scoped; waits for existing autosave queues. */
export async function loadExamLibraryProgress(userId: string | undefined, exam: ProgressExam): Promise<ExamLibraryProgress> {
  try {
    const raw = await loadSourceSession(storageKey(userId, exam.id, 'full', null));
    const full = raw === null ? null : parseSourceSession(raw, exam, 'full', null);
    if (full) return { state: 'ready', summary: summarizeExamProgress(exam, full) };
    const training = await Promise.all(exam.sections.map(async (_, index) => {
      const value = await loadSourceSession(storageKey(userId, exam.id, 'training', index));
      return value === null ? null : parseSourceSession(value, exam, 'training', index);
    }));
    return { state: 'ready', summary: summarizeExamProgress(exam, null, training) };
  } catch {
    // A damaged record is not evidence of an empty or completed attempt.
    return { state: 'error' };
  }
}
