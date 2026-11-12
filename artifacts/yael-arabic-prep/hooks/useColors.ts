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
    text: '#eef3fb', foreground: '#eef3fb', background: colors.darkBackground,
    card: '#162235', cardForeground: '#eef3fb', primary: '#3984ff', tint: '#3984ff',
    primaryForeground: '#0b1220', secondary: '#1d2c44', secondaryForeground: '#c9d8ee',
    muted: '#1a2840', mutedForeground: '#93a3bc', accent: '#10302f', accentForeground: '#8fe3d9',
    destructive: '#ff6b6b', border: '#26364f', input: '#30425f',
  } : colors.light;
  return { ...palette, primaryDeep: dark ? colors.primaryDeepDark : colors.primaryDeepLight, radius: colors.radius, isDark: dark };
}
