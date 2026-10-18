import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

/** Announce after results mount, once per round rather than once per save attempt. */
export function usePracticeCompletionAnnouncement(complete: boolean, announcement: string) {
  const announced = useRef(false);

  useEffect(() => {
    if (!complete) {
      announced.current = false;
      return;
    }
    if (announced.current) return;
    announced.current = true;
    // React Native Web's announcement API is a no-op; the screen uses a live region.
    if (Platform.OS !== 'web') AccessibilityInfo.announceForAccessibility(announcement);
  }, [complete, announcement]);
}
