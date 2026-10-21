import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

type InstallEvent = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> };
const Context = createContext({ canInstall: false, help: '', install: async () => {} });

export function WebInstallProvider({ children }: { children: React.ReactNode }) {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [help, setHelp] = useState('');
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const standalone = () => setInstalled(window.matchMedia('(display-mode: standalone)').matches
      || !!(navigator as Navigator & { standalone?: boolean }).standalone);
    standalone();
    const prompt = (e: Event) => { e.preventDefault(); setEvent(e as InstallEvent); };
    const done = () => { setInstalled(true); setEvent(null); };
    window.addEventListener('beforeinstallprompt', prompt);
    window.addEventListener('appinstalled', done);
    const manifest = document.createElement('link');
    manifest.rel = 'manifest'; manifest.href = '/manifest.webmanifest';
    document.head.appendChild(manifest);
    const icon = document.createElement('link');
    icon.rel = 'apple-touch-icon'; icon.href = '/pwa-icon.png';
    document.head.appendChild(icon);
    const meta = document.createElement('meta');
    meta.name = 'theme-color'; meta.content = '#10201c';
    document.head.appendChild(meta);
    // Network-only navigation fallback: never put learner/API data in a shared cache.
    if (!__DEV__ && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js').catch(() => setHelp('يمكنك استخدام التطبيق من المتصفح، أو إضافته يدويًا إلى الشاشة الرئيسية.'));
    }
    return () => {
      window.removeEventListener('beforeinstallprompt', prompt);
      window.removeEventListener('appinstalled', done);
      manifest.remove(); icon.remove(); meta.remove();
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
