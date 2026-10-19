import { describe, expect, test } from 'vitest';
import { VOCABULARY_BANK } from '../../artifacts/yael-arabic-prep/lib/vocabulary-bank';
import { reserveVocabularyRound } from '../../artifacts/yael-arabic-prep/lib/vocabulary-deck';
import { formatVocabularyTime, vocabularyRoundOrder, vocabularySecondsLeft } from '../../artifacts/yael-arabic-prep/lib/vocabulary-selection';

describe('rotating vocabulary rounds', () => {
  test('has enough unique words for three distinct daily rounds', () => {
    expect(VOCABULARY_BANK.length).toBeGreaterThanOrEqual(1000);
    expect(VOCABULARY_BANK.length).toBeLessThanOrEqual(1050);
    const threeRounds = [1, 2, 3].flatMap(round => vocabularyRoundOrder(VOCABULARY_BANK.length, 'rotation-user', round));
    expect(threeRounds).toHaveLength(60);
    expect(new Set(threeRounds).size).toBe(60);
    expect(new Set(VOCABULARY_BANK.map(q => q.word)).size).toBe(VOCABULARY_BANK.length);
    for (const question of VOCABULARY_BANK) {
      expect(question.options).toHaveLength(4);
      expect(new Set(question.options).size).toBe(4);
      expect(question.options).toContain(question.correctAnswer);
    }
  });
  test('uses the whole deck before repeating and keeps each round unique', () => {
    const rounds = Array.from({ length: 10 }, (_, index) => vocabularyRoundOrder(66, 'rounds', index + 1));
    expect(new Set(rounds.flat().slice(0, 66)).size).toBe(66);
    expect(rounds.every(round => new Set(round).size === 20)).toBe(true);
    expect(vocabularyRoundOrder(66, 'rounds', 2)).toEqual(rounds[1]);
  });
  test('persists the cursor and respects the server round number', async () => {
    const first = await reserveVocabularyRound('deck-test', 66);
    const second = await reserveVocabularyRound('deck-test', 66);
    expect(first.some(index => second.includes(index))).toBe(false);
    expect(await reserveVocabularyRound('server-deck-test', 66, 3)).toEqual(vocabularyRoundOrder(66, 'server-deck-test', 3));
    expect(await reserveVocabularyRound('server-deck-test', 66)).toEqual(vocabularyRoundOrder(66, 'server-deck-test', 4));
  });
  test('expires on wall-clock time, including time spent in the background', () => {
    expect(formatVocabularyTime(vocabularySecondsLeft(300_000, 0))).toBe('5:00');
    expect(vocabularySecondsLeft(300_000, 240_100)).toBe(60);
    expect(vocabularySecondsLeft(300_000, 300_000)).toBe(0);
    expect(vocabularySecondsLeft(300_000, 800_000)).toBe(0);
  });
});
