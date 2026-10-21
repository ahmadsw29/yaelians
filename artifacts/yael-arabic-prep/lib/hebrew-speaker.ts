import type { CreatureKind } from '@/components/PetTeacher';

/** Gentle character differences; never distort the Hebrew into sound effects. */
export const PET_SPEECH_STYLES: Record<CreatureKind, { pitch: number; rate: number; voiceIndex: number }> = {
  zizo: { pitch: 1.32, rate: 0.88, voiceIndex: 0 },
  lumi: { pitch: 1.10, rate: 0.78, voiceIndex: 1 },
  nuna: { pitch: 1.20, rate: 0.82, voiceIndex: 2 },
  ghaima: { pitch: 0.94, rate: 0.76, voiceIndex: 1 },
  rami: { pitch: 1.00, rate: 0.84, voiceIndex: 0 },
};

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

export function selectHebrewVoice(voices: HebrewVoice[], character?: CreatureKind) {
  const hebrew = voices.filter(voice => /^(he|iw)([-_]|$)/i.test(voice.language));
  if (character && hebrew.length) {
    const ordered = [...hebrew].sort((a, b) =>
      Number(b.quality === 'Enhanced') - Number(a.quality === 'Enhanced')
      || a.identifier.localeCompare(b.identifier));
    return ordered[PET_SPEECH_STYLES[character].voiceIndex % ordered.length];
  }
  return hebrew.find(voice => voice.quality === 'Enhanced') ?? hebrew[0];
}

const unavailable = 'الصوت العبري غير متوفر على جهازك. فعّل صوت العبرية من إعدادات النطق، ثم حاول مجددًا.';
const failed = 'تعذّر تشغيل النطق. تحقق من الصوت على جهازك، ثم حاول مجددًا.';

/** Ignores late callbacks from an old word and never queues repeated taps. */
export function createHebrewSpeaker(driver: SpeechDriver, onChange: (state: SpeakerState) => void, character?: CreatureKind) {
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
      const voice = selectHebrewVoice(voices, character);
      if (!voice) { fail(unavailable); return; }
      driver.speak(text.trim(), {
        language: 'he-IL', voice: voice.identifier,
        rate: character ? PET_SPEECH_STYLES[character].rate : 0.8,
        pitch: character ? PET_SPEECH_STYLES[character].pitch : 1,
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
