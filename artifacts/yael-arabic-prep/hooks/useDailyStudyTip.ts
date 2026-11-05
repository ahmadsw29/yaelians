import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { getDailyStudyTip, millisecondsUntilNextLocalDay } from '@/lib/daily-study-tips';

export function useDailyStudyTip() {
  const [tip, setTip] = useState(() => getDailyStudyTip());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      const now = new Date();
      const next = getDailyStudyTip(now);
      setTip(previous => previous.number === next.number ? previous : next);
      clearTimeout(timer);
      timer = setTimeout(refresh, millisecondsUntilNextLocalDay(now));
    };
    refresh();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') refresh();
    });
    return () => { clearTimeout(timer); subscription.remove(); };
  }, []);
  return tip;
}
