import type { DailyMetric } from './daily-goals';

export type DailyGoalEvent = { metric: DailyMetric; id: string };
type TimedAttempt = {
  attemptId?: string; mode?: 'full' | 'training'; stage: number; sections?: number[];
  answers: (number | null)[][]; essay: string;
};
/** Only new answers count. A submitted, fully answered model includes its essay. */
export function timedDailyGoalEvents(
  before: TimedAttempt | null,
  next: TimedAttempt | null,
  questionSections: { id: string; type: string }[][],
  finalStage: number,
): DailyGoalEvent[] {
  if (!next?.attemptId) return [];
  const same = !!before && (!before.attemptId || before.attemptId === next.attemptId);
  const events: DailyGoalEvent[] = [];
  next.answers.forEach((row, r) => row.forEach((answer, q) => {
    if (answer === null || (same && before?.answers[r]?.[q] != null)) return;
    const question = questionSections[next.sections?.[r] ?? r]?.[q];
    if (question?.type === 'reading' || question?.type === 'restatement') {
      events.push({ metric: question.type, id: `${next.attemptId}:${r}:${question.id}` });
    }
  }));
  if (same && before && before.stage < finalStage && next.stage >= finalStage && next.mode !== 'training'
    && next.answers.flat().length > 0 && next.answers.flat().every(answer => answer !== null) && next.essay.trim()) {
    events.push({ metric: 'models', id: next.attemptId });
  }
  return events;
}
