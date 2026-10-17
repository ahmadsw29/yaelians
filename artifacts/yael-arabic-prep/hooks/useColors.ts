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
    text: '#edf5ef', foreground: '#edf5ef', background: '#111d1b',
    card: '#1b2b27', cardForeground: '#edf5ef', primary: '#85cbbb', tint: '#85cbbb',
    primaryForeground: '#102923', secondary: '#253c34', secondaryForeground: '#c6ddd0',
    muted: '#283731', mutedForeground: '#a9b9b0', accent: '#513b30', accentForeground: '#f6bc9e',
    border: '#34483e', input: '#40574b',
  } : colors.light;
  return { ...palette, radius: colors.radius, isDark: dark };
}
