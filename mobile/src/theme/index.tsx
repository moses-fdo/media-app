import React, { createContext, useContext, useState } from 'react';
import { useColorScheme } from 'react-native';

const light = {
  bg: '#F8F8F5',
  surface: '#FFFFFF',
  surfaceSubtle: '#F2F4F7',
  card: '#FFFFFF',
  cardBorder: '#E5E8EC',
  ink: '#171C2B',
  muted: '#626875',
  line: '#E1E3E7',
  blue: '#345CD7',
  blueSoft: '#EDF1FF',
  amber: '#895000',
  amberSoft: '#FFF0D6',
  green: '#24734E',
  greenSoft: '#E5F3EB',
  red: '#AF343D',
  redSoft: '#FCEBEC',
  input: '#EEEFF1',
  inputBorder: '#D8DCE3',
  onAccent: '#FFFFFF',
  overlay: 'rgba(23, 28, 43, 0.4)',
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
  amber: '#EBC16C',
  amberSoft: '#3A3020',
  green: '#8CD4AC',
  greenSoft: '#203A2C',
  red: '#FF9C9C',
  redSoft: '#40262A',
  input: '#272C35',
  inputBorder: '#3C4452',
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
  mode: 'light',
  isDark: false,
  setMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [mode, setMode] = useState('light');
  const isDark = mode === 'dark' || (mode === 'system' && system === 'dark');
  const colors = isDark ? dark : light;

  return (
    <Context.Provider value={{ colors, mode, isDark, setMode }}>
      {children}
    </Context.Provider>
  );
}

export const useTheme = () => useContext(Context);
