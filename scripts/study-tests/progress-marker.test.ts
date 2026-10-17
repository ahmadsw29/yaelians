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

  it('advances the hop trigger once for a correct answer and not for a wrong answer', () => {
    const initial = { choice: null, correct: 0, celebrationKey: 0 };
    const correct = selectPracticeAnswer(initial, 'right', 'right');
    expect(correct).toEqual({ choice: 'right', correct: 1, celebrationKey: 1 });
    expect(selectPracticeAnswer(correct!, 'another answer', 'right')).toBeNull();

    const wrong = selectPracticeAnswer(initial, 'wrong', 'right');
    expect(wrong).toEqual({ choice: 'wrong', correct: 0, celebrationKey: 0 });
    expect(selectPracticeAnswer(wrong!, 'right', 'right')).toBeNull();
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
