export const PRACTICE_HORIZONTAL_PADDING = 21;
export const PROGRESS_ROW_GAP = 12;
export const PROGRESS_RANGE_INSET = 20;
export const PROGRESS_MASCOT_SIZE = 40;
export const PROGRESS_COUNT_MAX_WIDTH = 72;
export const PROGRESS_LINE_HEIGHT = 46;
export const PROGRESS_ROW_BOTTOM_SPACE = 18;
export const PROGRESS_MAX_HOP = 13;

export function getProgressPercent(questionIndex: number, questionCount: number): number {
  if (questionCount <= 0) return 0;
  return ((questionIndex + 1) / questionCount) * 100;
}

export function getProgressMarkerPosition(questionIndex: number, questionCount: number) {
  const percent = getProgressPercent(questionIndex, questionCount);
  const position = `${percent}%` as `${number}%`;
  return { percent, fillWidth: position, mascotLeft: position };
}

export type PracticeMode = 'words' | 'reading';

export function getPracticeCompletionAnnouncement(correct: number, total: number, timedOut: boolean): string {
  const status = timedOut ? 'انتهت الدقائق الخمس لجولتك اليومية.' : 'انتهت الجولة.';
  return `${status} إجابات صحيحة: ${correct} من ${total}.${total === 0 ? ' لم تُجب عن أي سؤال.' : ''}`;
}

export function getPracticeModeReset(mode: PracticeMode) {
  return {
    mode,
    index: 0,
    choice: null,
    correct: 0,
    celebrationKey: 0,
    complete: false,
    saved: false,
  };
}

export type PracticeAnswerSelection = {
  choice: string | null;
  correct: number;
  celebrationKey: number;
};

export type PracticeAnswerState = 'correct' | 'wrong' | 'default';

export type PracticeAnswerFeedback = {
  isCorrect: boolean;
  announcement: string;
};

export function getPracticeAnswerFeedback(
  choice: string | null,
  correctAnswer: string,
): PracticeAnswerFeedback | null {
  if (choice === null) return null;
  const isCorrect = choice === correctAnswer;
  return {
    isCorrect,
    announcement: isCorrect
      ? `إجابتك «${choice}» صحيحة`
      : `إجابتك «${choice}» غير صحيحة. الإجابة الصحيحة: ${correctAnswer}`,
  };
}

export function getPracticeAnswerState(
  choice: string | null,
  option: string,
  correctAnswer: string,
): PracticeAnswerState {
  if (choice === null) return 'default';
  if (option === correctAnswer) return 'correct';
  if (choice === option) return 'wrong';
  return 'default';
}

export function selectPracticeAnswer(
  current: PracticeAnswerSelection,
  answer: string,
  correctAnswer: string,
): PracticeAnswerSelection | null {
  if (current.choice !== null) return null;
  const isCorrect = answer === correctAnswer;
  return {
    choice: answer,
    correct: current.correct + Number(isCorrect),
    celebrationKey: current.celebrationKey + Number(isCorrect),
  };
}
