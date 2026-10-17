export type HebrewVoice = { identifier: string; language: string; quality?: string };
export type SpeakerState = { status: 'idle' | 'loading' | 'speaking'; error: string | null };
export type SpeechDriver = {
  voices(): Promise<HebrewVoice[]>;
  stop(): Promise<unknown>;
  speak(text: string, options: {
    language: string; voice: string; rate: number; pitch: number;
    onStart(): void; onDone(): void; onStopped(): void; onError(error: Error): void;
  }): void;
};

export function selectHebrewVoice(voices: HebrewVoice[]) {
  const hebrew = voices.filter(voice => /^(he|iw)([-_]|$)/i.test(voice.language));
  return hebrew.find(voice => voice.quality === 'Enhanced') ?? hebrew[0];
}

const unavailable = 'الصوت العبري غير متوفر على جهازك. فعّل صوت العبرية من إعدادات النطق، ثم حاول مجددًا.';
const failed = 'تعذّر تشغيل النطق. تحقق من الصوت على جهازك، ثم حاول مجددًا.';

/** Ignores late callbacks from an old word and never queues repeated taps. */
export function createHebrewSpeaker(driver: SpeechDriver, onChange: (state: SpeakerState) => void) {
  let generation = 0;
  let active = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const clearTimer = () => { clearTimeout(timer); timer = undefined; };
  const cancel = () => {
    generation++;
    clearTimer();
    const wasActive = active;
    active = false;
    onChange({ status: 'idle', error: null });
    if (wasActive) void driver.stop().catch(() => {});
  };
  const toggle = async (text: string) => {
    if (active) { cancel(); return; }
    if (!text.trim()) return;
    const id = ++generation;
    active = true;
    onChange({ status: 'loading', error: null });
    const finish = (error: string | null = null) => {
      if (id !== generation) return;
      generation++;
      clearTimer();
      active = false;
      onChange({ status: 'idle', error });
    };
    const fail = (message = failed) => {
      if (id !== generation) return;
      finish(message);
      void driver.stop().catch(() => {});
    };
    // Some browsers never finish loading voices; do not leave a permanent spinner.
    timer = setTimeout(() => fail(), 10000);
    try {
      await driver.stop();
      if (id !== generation) return;
      const voices = await driver.voices();
      if (id !== generation) return;
      const voice = selectHebrewVoice(voices);
      if (!voice) { fail(unavailable); return; }
      driver.speak(text.trim(), {
        language: 'he-IL', voice: voice.identifier, rate: 0.8, pitch: 1,
        onStart: () => {
          if (id !== generation) return;
          clearTimer();
          onChange({ status: 'speaking', error: null });
          timer = setTimeout(() => fail(), 30000);
        },
        onDone: () => finish(),
        onStopped: () => finish(),
        onError: () => fail(),
      });
    } catch { fail(); }
  };
  return { toggle, cancel };
}
