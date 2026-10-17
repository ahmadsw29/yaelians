import { describe, expect, it } from 'vitest';
import { QUESTIONS, READING_QUESTIONS, YAEL_VOCABULARY_QUESTIONS } from '../../artifacts/yael-arabic-prep/lib/study';
import {
  PRACTICE_HORIZONTAL_PADDING,
  PROGRESS_COUNT_MAX_WIDTH,
  PROGRESS_LINE_HEIGHT,
  PROGRESS_MASCOT_SIZE,
  PROGRESS_MAX_HOP,
  PROGRESS_RANGE_INSET,
  PROGRESS_ROW_BOTTOM_SPACE,
  PROGRESS_ROW_GAP,
  getPracticeAnswerFeedback,
  getPracticeAnswerState,
  getPracticeModeReset,
  getProgressMarkerPosition,
  getProgressPercent,
  selectPracticeAnswer,
} from '../../artifacts/yael-arabic-prep/lib/progress-marker';

const wordQuestions = [...QUESTIONS, ...YAEL_VOCABULARY_QUESTIONS];

describe('practice progress marker regressions', () => {
  it('aligns the first and last progress positions for vocabulary and reading session lengths', () => {
    for (const questions of [wordQuestions, READING_QUESTIONS]) {
      const firstQuestion = getProgressMarkerPosition(0, questions.length);
      const lastQuestion = getProgressMarkerPosition(questions.length - 1, questions.length);

      expect(firstQuestion.percent).toBeCloseTo(100 / questions.length);
      expect(firstQuestion.fillWidth).toBe(firstQuestion.mascotLeft);
      expect(lastQuestion.percent).toBe(100);
      expect(lastQuestion.fillWidth).toBe(lastQuestion.mascotLeft);
    }

    const vocabularyReset = getPracticeModeReset('words');
    const readingReset = getPracticeModeReset('reading');
    expect(vocabularyReset).toMatchObject({ mode: 'words', index: 0, choice: null, correct: 0, celebrationKey: 0 });
    expect(readingReset).toMatchObject({ mode: 'reading', index: 0, choice: null, correct: 0, celebrationKey: 0 });
    const vocabularyStart = getProgressPercent(vocabularyReset.index, wordQuestions.length);
    const readingStart = getProgressPercent(readingReset.index, READING_QUESTIONS.length);
    expect(vocabularyStart).not.toBe(readingStart);
    expect(getProgressMarkerPosition(vocabularyReset.index, wordQuestions.length).percent).toBe(vocabularyStart);
    expect(getProgressMarkerPosition(readingReset.index, READING_QUESTIONS.length).percent).toBe(readingStart);
  });

  it('starts a clean round when switching modes after an answer', () => {
    const answeredWords = selectPracticeAnswer(
      { choice: null, correct: 0, celebrationKey: 0 },
      'old correct answer',
      'old correct answer',
    )!;
    expect(getPracticeAnswerFeedback(answeredWords.choice, 'old correct answer')?.isCorrect).toBe(true);

    const readingReset = getPracticeModeReset('reading');
    expect(readingReset).toMatchObject({
      mode: 'reading',
      index: 0,
      choice: null,
      correct: 0,
      celebrationKey: 0,
      complete: false,
      saved: false,
    });
    expect(getPracticeAnswerFeedback(readingReset.choice, 'new correct answer')).toBeNull();
    expect(getPracticeAnswerState(readingReset.choice, 'new correct answer', 'new correct answer')).toBe('default');
    expect(getProgressMarkerPosition(readingReset.index, READING_QUESTIONS.length).percent)
      .toBeCloseTo(100 / READING_QUESTIONS.length);

    const answeredReading = selectPracticeAnswer(
      { choice: readingReset.choice, correct: readingReset.correct, celebrationKey: readingReset.celebrationKey },
      'new correct answer',
      'new correct answer',
    )!;
    expect(answeredReading).toEqual({ choice: 'new correct answer', correct: 1, celebrationKey: 1 });
    expect(getPracticeAnswerFeedback(answeredReading.choice, 'new correct answer')?.isCorrect).toBe(true);

    const wordsReset = getPracticeModeReset('words');
    expect(wordsReset).toMatchObject({ mode: 'words', index: 0, choice: null, correct: 0, celebrationKey: 0 });
    expect(getPracticeAnswerFeedback(wordsReset.choice, 'old correct answer')).toBeNull();
    expect(getProgressMarkerPosition(wordsReset.index, wordQuestions.length).percent)
      .toBeCloseTo(100 / wordQuestions.length);
    const answeredNewWords = selectPracticeAnswer(
      { choice: wordsReset.choice, correct: wordsReset.correct, celebrationKey: wordsReset.celebrationKey },
      'new wrong answer',
      'old correct answer',
    )!;
    expect(answeredNewWords).toEqual({ choice: 'new wrong answer', correct: 0, celebrationKey: 0 });
    expect(getPracticeAnswerFeedback(answeredNewWords.choice, 'old correct answer')?.isCorrect).toBe(false);
  });

  it('advances the hop trigger once for a correct answer and not for a wrong answer', () => {
    const initial = { choice: null, correct: 0, celebrationKey: 0 };
    const correct = selectPracticeAnswer(initial, 'right', 'right');
    expect(correct).toEqual({ choice: 'right', correct: 1, celebrationKey: 1 });
    expect(selectPracticeAnswer(correct!, 'another answer', 'right')).toBeNull();

    const wrong = selectPracticeAnswer(initial, 'wrong', 'right');
    expect(wrong).toEqual({ choice: 'wrong', correct: 0, celebrationKey: 0 });
    expect(selectPracticeAnswer(wrong!, 'right', 'right')).toBeNull();
  });

  it('keeps correct and incorrect answer feedback states available independently of motion', () => {
    expect(getPracticeAnswerState(null, 'right', 'right')).toBe('default');
    expect(getPracticeAnswerState('right', 'right', 'right')).toBe('correct');
    expect(getPracticeAnswerState('wrong', 'wrong', 'right')).toBe('wrong');
    // The correct answer remains visually identified even when another option was selected.
    expect(getPracticeAnswerState('wrong', 'right', 'right')).toBe('correct');
    expect(getPracticeAnswerState('wrong', 'other', 'right')).toBe('default');
  });

  it('provides one accessible correctness announcement for each selected answer', () => {
    expect(getPracticeAnswerFeedback(null, 'correct')).toBeNull();
    expect(getPracticeAnswerFeedback('correct', 'correct')).toEqual({
      isCorrect: true,
      announcement: 'إجابتك «correct» صحيحة',
    });
    expect(getPracticeAnswerFeedback('selected', 'correct')).toEqual({
      isCorrect: false,
      announcement: 'إجابتك «selected» غير صحيحة. الإجابة الصحيحة: correct',
    });
  });

  it('keeps the marker within the progress row and away from the count on a 320 px phone', () => {
    const viewportWidth = 320;
    const contentWidth = viewportWidth - 2 * PRACTICE_HORIZONTAL_PADDING;
    const countAndGap = PROGRESS_COUNT_MAX_WIDTH + PROGRESS_ROW_GAP;
    const lineWidth = contentWidth - countAndGap;
    const rangeWidth = lineWidth - 2 * PROGRESS_RANGE_INSET;

    expect(rangeWidth).toBeGreaterThanOrEqual(PROGRESS_MASCOT_SIZE);
    expect(PROGRESS_LINE_HEIGHT).toBeGreaterThanOrEqual(PROGRESS_MASCOT_SIZE);
    const lowestMarkerEdgeDuringHop = PROGRESS_MASCOT_SIZE - PROGRESS_MAX_HOP;
    const spaceToNextPracticeContent = PROGRESS_LINE_HEIGHT + PROGRESS_ROW_BOTTOM_SPACE - lowestMarkerEdgeDuringHop;
    expect(PROGRESS_ROW_BOTTOM_SPACE).toBeGreaterThan(0);
    expect(spaceToNextPracticeContent).toBeGreaterThan(0);
    for (const percent of [getProgressPercent(0, wordQuestions.length), 100]) {
      const center = PROGRESS_RANGE_INSET + (rangeWidth * percent) / 100;
      const mascotLeft = center - PROGRESS_MASCOT_SIZE / 2;
      const mascotRight = center + PROGRESS_MASCOT_SIZE / 2;
      expect(mascotLeft).toBeGreaterThanOrEqual(0);
      expect(mascotRight).toBeLessThanOrEqual(lineWidth);
    }

    // At the endpoint nearest the count, the marker ends at the line edge
    // and remains separated by the gap between the count and progress line.
    const countSideMarkerRight = PROGRESS_RANGE_INSET + rangeWidth - PROGRESS_MASCOT_SIZE / 2 + PROGRESS_MASCOT_SIZE;
    const countStart = lineWidth + PROGRESS_ROW_GAP;
    expect(countStart - countSideMarkerRight).toBe(PROGRESS_ROW_GAP);
    expect(PRACTICE_HORIZONTAL_PADDING * 2 + countAndGap + rangeWidth + PROGRESS_RANGE_INSET * 2)
      .toBe(viewportWidth);
  });

  it('keeps invalid question counts from producing a misplaced marker', () => {
    expect(getProgressPercent(0, 0)).toBe(0);
  });
});
