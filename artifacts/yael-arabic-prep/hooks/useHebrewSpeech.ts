import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Speech from 'expo-speech';
import { createHebrewSpeaker, type SpeakerState } from '@/lib/hebrew-speaker';
import type { CreatureKind } from '@/components/PetTeacher';

export function useHebrewSpeech(text?: string, character?: CreatureKind) {
  const mounted = useRef(true);
  const [state, setState] = useState<SpeakerState>({ status: 'idle', error: null });
  const controller = useMemo(() => createHebrewSpeaker({
    voices: () => Speech.getAvailableVoicesAsync(),
    stop: () => Speech.stop(),
    speak: (word, options) => Speech.speak(word, { ...options, useApplicationAudioSession: false }),
  }, next => { if (mounted.current) setState(next); }, character), [character]);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; controller.cancel(); };
  }, [controller]);
  useEffect(() => { controller.cancel(); }, [controller, text]);
  useFocusEffect(useCallback(() => () => controller.cancel(), [controller]));
  useEffect(() => {
    const listener = AppState.addEventListener('change', next => {
      if (next !== 'active') controller.cancel();
    });
    return () => listener.remove();
  }, [controller]);

  return { ...state, toggle: () => { if (text) void controller.toggle(text); } };
}
