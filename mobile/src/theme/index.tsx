import React, { createContext, useContext, useState } from 'react';
import { useColorScheme } from 'react-native';

const light = {
  bg: '#F8F8F5', surface: '#FFFFFF', ink: '#171C2B', muted: '#626875',
  line: '#E1E3E7', blue: '#345CD7', blueSoft: '#EDF1FF',
  amber: '#895000', amberSoft: '#FFF0D6', green: '#24734E', greenSoft: '#E5F3EB',
  red: '#AF343D', redSoft: '#FCEBEC', input: '#EEEFF1', onAccent: '#FFFFFF',
};
const dark: typeof light = {
  bg: '#16191E', surface: '#1D2128', ink: '#F1F2F3', muted: '#B1B7C3',
  line: '#353B46', blue: '#A8BEFF', blueSoft: '#263249',
  amber: '#EBC16C', amberSoft: '#3A3020', green: '#8CD4AC', greenSoft: '#203A2C',
  red: '#FF9C9C', redSoft: '#40262A', input: '#272C35', onAccent: '#16191E',
};
export const layout = { gutter: 20, contentWidth: 720 };
const Context = createContext({ colors: light, mode: 'light', setMode: (_: string) => {} });
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [mode, setMode] = useState('light');
  return <Context.Provider value={{ colors: mode === 'dark' || mode === 'system' && system === 'dark' ? dark : light, mode, setMode }}>{children}</Context.Provider>;
}
export const useTheme = () => useContext(Context);
