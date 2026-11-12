import React, { createContext, useContext, useEffect, useState } from 'react';
import { Appearance, Platform, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '@clerk/expo';
import colors from '@/constants/colors';

type Preference = 'light' | 'dark' | 'system';
const ThemeContext = createContext({ preference: 'system' as Preference, setPreference: (_value: Preference) => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const key = `yael-theme:${user?.id ?? 'guest'}`;
  const [state, setState] = useState<{ key: string; preference: Preference }>({ key: '', preference: 'system' });
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(key).then(value => {
      if (active) setState({ key, preference: value === 'light' || value === 'dark' ? value : 'system' });
    }).catch(() => { if (active) setState({ key, preference: 'system' }); });
    return () => { active = false; };
  }, [key]);
  const preference = state.key === key ? state.preference : 'system';
  useEffect(() => {
    if (Platform.OS !== 'web') {
      Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
    }
  }, [preference]);
  const setPreference = (value: Preference) => {
    setState({ key, preference: value });
    void AsyncStorage.setItem(key, value);
  };
  return React.createElement(ThemeContext.Provider, { value: { preference, setPreference } }, children);
}

export function useThemePreference() { return useContext(ThemeContext); }

export function useColors() {
  const system = useColorScheme();
  const { preference } = useThemePreference();
  const dark = (preference === 'system' ? system : preference) === 'dark';
  const palette = dark ? {
    ...colors.light,
    text: '#f2f1ee', foreground: '#f2f1ee', background: colors.darkBackground,
    card: '#1f1f22', cardForeground: '#f2f1ee', primary: '#3984ff', tint: '#3984ff',
    primaryForeground: '#111113', secondary: '#2a2a2e', secondaryForeground: '#dedcd7',
    muted: '#26262a', mutedForeground: '#a6a49f', accent: '#172b2a', accentForeground: '#8fe3d9',
    destructive: '#ff6b6b', border: '#343438', input: '#424247',
  } : colors.light;
  return { ...palette, primaryDeep: dark ? colors.primaryDeepDark : colors.primaryDeepLight, radius: colors.radius, isDark: dark };
}
