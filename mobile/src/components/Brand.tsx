import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../theme';
import { Label } from './ui';

export function BrandMark({ size = 32 }: { size?: number }) {
  const { colors: c } = useTheme();
  return <Svg width={size} height={size} viewBox="0 0 64 64" accessibilityLabel="Karunya Media Desk logo" role="img"><Path fill={c.blue} d="M6 6h12v52H6zM23 29 44 6h16L36 32l24 26H44L23 35z" /></Svg>;
}

export function Brand({ size = 28 }: { size?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <BrandMark size={size} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <Label bold size={16} style={{ letterSpacing: -0.3 }}>Karunya</Label>
        <Label size={16} muted style={{ letterSpacing: -0.3 }}>Media Desk</Label>
      </View>
    </View>
  );
}
