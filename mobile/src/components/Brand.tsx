import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../theme';
import { Label } from './ui';

export function BrandMark({ size = 32 }: { size?: number }) {
  const { colors: c } = useTheme();
  return <Svg width={size} height={size} viewBox="0 0 64 64" accessibilityLabel="Karunya Media Desk logo" role="img"><Path fill={c.blue} d="M6 6h12v52H6zM23 29 44 6h16L36 32l24 26H44L23 35z" /></Svg>;
}

export function Brand() {
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><BrandMark /><View><Label bold size={15} style={{ letterSpacing: -0.3, lineHeight: 18 }}>Karunya</Label><Label bold size={15} style={{ letterSpacing: -0.3, lineHeight: 18 }}>Media Desk</Label></View></View>;
}
