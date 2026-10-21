import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHebrewSpeaker, selectHebrewVoice, PET_SPEECH_STYLES, type SpeechDriver } from '../../artifacts/yael-arabic-prep/lib/hebrew-speaker';

function setup(voices = [{ identifier: 'hebrew', language: 'he-IL' }]) {
  const speak = vi.fn<SpeechDriver['speak']>();
  const driver = { voices: vi.fn(async () => voices), stop: vi.fn(async () => {}), speak };
  const changed = vi.fn();
  return { driver, changed, speaker: createHebrewSpeaker(driver, changed) };
}

afterEach(() => vi.useRealTimers());

describe('Hebrew pronunciation controller', () => {
  it('gives every presenter a distinct, intelligible pitch and pace through the real speech driver', async () => {
    const signatures = new Set<string>();
    for (const character of Object.keys(PET_SPEECH_STYLES) as (keyof typeof PET_SPEECH_STYLES)[]) {
      const { driver, changed } = setup();
      const speaker = createHebrewSpeaker(driver, changed, character);
      await speaker.toggle('שלום');
      const [word, options] = driver.speak.mock.calls[0];
      expect(word).toBe('שלום');
      expect(options).toMatchObject({
        language: 'he-IL', voice: 'hebrew',
        pitch: PET_SPEECH_STYLES[character].pitch, rate: PET_SPEECH_STYLES[character].rate,
      });
      expect(options.pitch).toBeGreaterThanOrEqual(0.9);
      expect(options.pitch).toBeLessThanOrEqual(1.4);
      expect(options.rate).toBeGreaterThanOrEqual(0.7);
      expect(options.rate).toBeLessThanOrEqual(0.9);
      signatures.add(`${options.pitch}:${options.rate}`);
      options.onStart();
      expect(changed).toHaveBeenLastCalledWith({ status: 'speaking', error: null });
      options.onDone();
      expect(changed).toHaveBeenLastCalledWith({ status: 'idle', error: null });
    }
    expect(signatures.size).toBe(Object.keys(PET_SPEECH_STYLES).length);
  });

  it('keeps character voices stable across voice-list order and never chooses a non-Hebrew voice', () => {
    const voices = [
      { identifier: 'a', language: 'en-US' },
      { identifier: 'he-a', language: 'he-IL' },
      { identifier: 'he-b', language: 'iw_IL', quality: 'Enhanced' },
    ];
    for (const character of Object.keys(PET_SPEECH_STYLES) as (keyof typeof PET_SPEECH_STYLES)[]) {
      const selected = selectHebrewVoice(voices, character);
      expect(selected?.language).toMatch(/^(he|iw)/);
      expect(selectHebrewVoice([...voices].reverse(), character)).toEqual(selected);
      expect(selectHebrewVoice([voices[0]], character)).toBeUndefined();
    }
    expect(selectHebrewVoice(voices, 'zizo')).not.toEqual(selectHebrewVoice(voices, 'lumi'));
  });

  it('selects Hebrew, including legacy iw identifiers, never an unrelated voice', () => {
    expect(selectHebrewVoice([{ identifier: 'en', language: 'en-US' }])).toBeUndefined();
    expect(selectHebrewVoice([{ identifier: 'old-he', language: 'iw_IL' }])?.identifier).toBe('old-he');
    expect(selectHebrewVoice([
      { identifier: 'basic', language: 'he-IL' },
      { identifier: 'better', language: 'he-IL', quality: 'Enhanced' },
    ])?.identifier).toBe('better');
  });

  it('speaks only the Hebrew word and moves only between start and completion callbacks', async () => {
    const { speaker, driver, changed } = setup();
    await speaker.toggle(' ללמוד ');
    const [word, options] = driver.speak.mock.calls[0];
    expect(word).toBe('ללמוד');
    expect(options).toMatchObject({ language: 'he-IL', voice: 'hebrew', rate: 0.8 });
    expect(changed).toHaveBeenLastCalledWith({ status: 'loading', error: null });
    options.onStart();
    expect(changed).toHaveBeenLastCalledWith({ status: 'speaking', error: null });
    options.onDone();
    expect(changed).toHaveBeenLastCalledWith({ status: 'idle', error: null });
  });

  it('a second tap stops instead of queueing another utterance', async () => {
    const { speaker, driver, changed } = setup();
    await speaker.toggle('ללמוד');
    const options = driver.speak.mock.calls[0][1];
    options.onStart();
    await speaker.toggle('ללמוד');
    expect(driver.speak).toHaveBeenCalledTimes(1);
    expect(driver.stop).toHaveBeenCalledTimes(2);
    options.onStart();
    expect(changed).toHaveBeenLastCalledWith({ status: 'idle', error: null });
  });

  it('cancels pending voice loading when the question changes', async () => {
    const { speaker, driver } = setup();
    let resolve!: (voices: { identifier: string; language: string }[]) => void;
    driver.voices.mockImplementation(() => new Promise(done => { resolve = done; }));
    const pending = speaker.toggle('ללמוד');
    await Promise.resolve();
    speaker.cancel();
    resolve([{ identifier: 'hebrew', language: 'he-IL' }]);
    await pending;
    expect(driver.speak).not.toHaveBeenCalled();
  });

  it('ignores completion from an old word while a new word is speaking', async () => {
    const { speaker, driver, changed } = setup();
    await speaker.toggle('ללמוד');
    const old = driver.speak.mock.calls[0][1];
    speaker.cancel();
    await speaker.toggle('להצליח');
    driver.speak.mock.calls[1][1].onStart();
    old.onDone();
    expect(changed).toHaveBeenLastCalledWith({ status: 'speaking', error: null });
    speaker.cancel();
  });

  it('explains a missing Hebrew voice and permits retry', async () => {
    const { speaker, driver, changed } = setup([]);
    await speaker.toggle('ללמוד');
    expect(driver.speak).not.toHaveBeenCalled();
    expect(changed.mock.lastCall?.[0]).toMatchObject({ status: 'idle', error: expect.stringContaining('الصوت العبري') });
    driver.voices.mockResolvedValue([{ identifier: 'hebrew', language: 'he-IL' }]);
    await speaker.toggle('ללמוד');
    expect(driver.speak).toHaveBeenCalledTimes(1);
    speaker.cancel();
  });

  it('stops movement and gives a retry message on speech errors', async () => {
    const { speaker, driver, changed } = setup();
    await speaker.toggle('ללמוד');
    const options = driver.speak.mock.calls[0][1];
    options.onStart();
    options.onError(new Error('audio unavailable'));
    expect(changed.mock.lastCall?.[0]).toMatchObject({ status: 'idle', error: expect.any(String) });
    expect(driver.stop).toHaveBeenCalledTimes(2);
  });

  it('does not spin forever if the browser never loads its voices', async () => {
    vi.useFakeTimers();
    const { speaker, driver, changed } = setup();
    driver.voices.mockImplementation(() => new Promise(() => {}));
    void speaker.toggle('ללמוד');
    await vi.advanceTimersByTimeAsync(10000);
    expect(changed.mock.lastCall?.[0]).toMatchObject({ status: 'idle', error: expect.any(String) });
  });
});
