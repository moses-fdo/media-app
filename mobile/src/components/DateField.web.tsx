import React from 'react';
import { View } from 'react-native';
import { Label } from './ui';
import { useTheme } from '../theme';
import type { DateFieldProps } from './DateField';
export function DateField({label,value,mode,onChange,error}: DateFieldProps) {
 const {colors:c,isDark}=useTheme();
 return <View style={{gap:6}}><Label size={14} bold>{label}</Label>{React.createElement('input',{
  type:mode, value, 'aria-label':label, 'aria-invalid':!!error,
  onChange:(event:React.ChangeEvent<HTMLInputElement>)=>onChange(event.target.value),
  style:{boxSizing:'border-box',width:'100%',minWidth:0,minHeight:48,padding:12,fontSize:16,fontFamily:'inherit',borderRadius:12,border:`1px solid ${error?c.red:c.inputBorder}`,background:c.surface,color:c.ink,colorScheme:isDark?'dark':'light',accentColor:c.blue,outlineColor:c.blue},
 })}{!!error&&<Label size={13} style={{color:c.red}} accessibilityLiveRegion="polite">{error}</Label>}</View>;
}
