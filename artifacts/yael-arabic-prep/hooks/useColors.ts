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
    text: '#f3efff', foreground: '#f3efff', background: colors.darkBackground,
    card: '#221d45', cardForeground: '#f3efff', primary: '#a88bff', tint: '#a88bff',
    primaryForeground: '#170d3d', secondary: '#173d3b', secondaryForeground: '#8ff0cf',
    muted: '#2a2452', mutedForeground: '#b4acd8', accent: '#4a2a26', accentForeground: '#ffb38f',
    destructive: '#ff6b7f', border: '#3b3370', input: '#4b4290',
  } : colors.light;
  return { ...palette, primaryDeep: dark ? colors.primaryDeepDark : colors.primaryDeepLight, radius: colors.radius, isDark: dark };
}
