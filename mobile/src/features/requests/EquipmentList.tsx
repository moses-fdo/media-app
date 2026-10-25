import { View } from 'react-native';
import { Requirement } from '../../api/types';
import { Label } from '../../components/ui';
import { useTheme } from '../../theme';

export function EquipmentList({ requirements }: { requirements: Requirement[] }) {
  const { colors: c } = useTheme();
  return <View style={{ marginTop: 32, gap: 16 }}>
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
      <Label size={21} bold accessibilityRole="header">Equipment</Label>
      <Label size={13} muted>{requirements.length} {requirements.length === 1 ? 'item' : 'items'}</Label>
    </View>
    {(['audio', 'video', 'other'] as const).map(department => {
      const items = requirements.filter(item => item.department === department);
      if (!items.length) return null;
      return <View key={department} style={{ gap: 4 }}>
        <Label size={13} bold muted style={{ paddingBottom: 4 }}>{department === 'audio' ? 'Audio' : department === 'video' ? 'Video' : 'Other equipment'}</Label>
        {items.map(item => <View key={item.id} style={{ gap: 4, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.line }}>
          <Label size={16} style={{ lineHeight: 24 }}>{item.quantity == null ? item.title : `${item.quantity} × ${item.title}`}</Label>
          {item.quantity == null && <Label size={13} muted>Quantity to confirm</Label>}
          {!!item.notes && <Label size={14} muted>{item.notes}</Label>}
        </View>)}
      </View>;
    })}
    {!requirements.length && <Label size={14} muted>No equipment listed. Add items in Edit request.</Label>}
  </View>;
}
