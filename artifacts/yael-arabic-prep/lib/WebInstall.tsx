import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useColors, useThemePreference } from '@/hooks/useColors';

type InstallEvent = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> };
const Context = createContext({ canInstall: false, help: '', install: async () => {} });

export function WebInstallProvider({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  const { preference } = useThemePreference();
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [help, setHelp] = useState('');
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const ensureMeta = (name: string, content: string) => {
      let meta = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = name;
        document.head.appendChild(meta);
      }
      meta.content = content;
    };
    ensureMeta('theme-color', colors.background);
    ensureMeta('apple-mobile-web-app-capable', 'yes');
    ensureMeta('apple-mobile-web-app-status-bar-style', colors.isDark ? 'black-translucent' : 'default');
    document.documentElement.style.backgroundColor = colors.background;
    document.documentElement.style.colorScheme = colors.isDark ? 'dark' : 'light';
    document.body.style.backgroundColor = colors.background;
    try { localStorage.setItem('yael-web-appearance', preference); } catch { /* Private browsing may deny storage. */ }
  }, [colors.background, colors.isDark, preference]);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const standalone = () => setInstalled(window.matchMedia('(display-mode: standalone)').matches
      || !!(navigator as Navigator & { standalone?: boolean }).standalone);
    standalone();
    const prompt = (e: Event) => { e.preventDefault(); setEvent(e as InstallEvent); };
    const done = () => { setInstalled(true); setEvent(null); };
    window.addEventListener('beforeinstallprompt', prompt);
    window.addEventListener('appinstalled', done);
    // Installation tags are in public/index.html before iOS paints the status bar.
    // Network-only navigation fallback: never put learner/API data in a shared cache.
    if (!__DEV__ && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js').catch(() => setHelp('يمكنك استخدام التطبيق من المتصفح، أو إضافته يدويًا إلى الشاشة الرئيسية.'));
    }
    return () => {
      window.removeEventListener('beforeinstallprompt', prompt);
      window.removeEventListener('appinstalled', done);
    };
  }, []);
  const install = async () => {
    if (event) {
      try { await event.prompt(); await event.userChoice; }
      finally { setEvent(null); }
    } else {
      setHelp(/iPhone|iPad|iPod/i.test(navigator.userAgent)
        ? 'افتح الموقع في Safari، اضغط زر المشاركة ثم «إضافة إلى الشاشة الرئيسية». سجّل الدخول بنفس حساب اشتراكك.'
        : 'من قائمة المتصفح، اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية». إذا لم يظهر الخيار، يمكنك الاستمرار من المتصفح.');
    }
  };
  return <Context.Provider value={{ canInstall: Platform.OS === 'web' && !installed, help: installed ? 'التطبيق مثبت بالفعل على جهازك.' : help, install }}>{children}</Context.Provider>;
}
export const useWebInstall = () => useContext(Context);
