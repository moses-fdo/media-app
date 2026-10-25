import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

const light = {
  bg: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceSubtle: '#F1F5F9',
  card: '#FFFFFF',
  cardBorder: '#E2E8F0',
  ink: '#0F172A',
  muted: '#64748B',
  line: '#E2E8F0',
  blue: '#1E60E8',
  blueSoft: '#EDF5FF',
  blueBorder: '#DBEAFE',
  blueText: '#1D4ED8',
  amber: '#D97706',
  amberSoft: '#FEF3C7',
  amberText: '#92400E',
  green: '#16A34A',
  greenSoft: '#DCFCE7',
  red: '#DC2626',
  redSoft: '#FEE2E2',
  input: '#F8FAFC',
  inputBorder: '#CBD5E1',
  onAccent: '#FFFFFF',
  overlay: 'rgba(15, 23, 42, 0.4)',
};

const dark: typeof light = {
  bg: '#16191E',
  surface: '#1D2128',
  surfaceSubtle: '#222731',
  card: '#1D2128',
  cardBorder: '#2E3542',
  ink: '#F1F2F3',
  muted: '#B1B7C3',
  line: '#353B46',
  blue: '#A8BEFF',
  blueSoft: '#263249',
  blueBorder: '#354668',
  blueText: '#A8BEFF',
  amber: '#EBC16C',
  amberSoft: '#3A3020',
  amberText: '#FDE68A',
  green: '#8CD4AC',
  greenSoft: '#203A2C',
  red: '#FF9C9C',
  redSoft: '#40262A',
  input: '#272C35',
  inputBorder: '#758094',
  onAccent: '#16191E',
  overlay: 'rgba(0, 0, 0, 0.65)',
};

export const layout = {
  gutter: 20,
  contentWidth: 720,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 36,
};

interface ThemeContextType {
  colors: typeof light;
  mode: string;
  isDark: boolean;
  setMode: (mode: string) => void;
}

const Context = createContext<ThemeContextType>({
  colors: light,
  mode: 'system',
  isDark: false,
  setMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [mode, updateMode] = useState('system');
  const changed = useRef(false);
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem('media-appearance').then(saved => {
      if (active && !changed.current && ['light', 'dark', 'system'].includes(saved || '')) updateMode(saved!);
    }).catch(() => {});
    return () => { active = false; };
  }, []);
  const writes = useRef(Promise.resolve());
  function setMode(value: string) {
    if (!['light', 'dark', 'system'].includes(value)) return;
    changed.current = true;
    updateMode(value);
    writes.current = writes.current.catch(() => {}).then(() => AsyncStorage.setItem('media-appearance', value));
    writes.current.catch(() => {});
  }
  const isDark = mode === 'dark' || (mode === 'system' && system === 'dark');
  const colors = isDark ? dark : light;

  return (
    <Context.Provider value={{ colors, mode, isDark, setMode }}>
      {children}
    </Context.Provider>
  );
}

export const useTheme = () => useContext(Context);
