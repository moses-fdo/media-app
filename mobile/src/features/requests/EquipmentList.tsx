import { View } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { Requirement } from '../../api/types';
import { Label } from '../../components/ui';
import { useTheme } from '../../theme';

export function EquipmentList({ requirements }: { requirements: Requirement[] }) {
  const { colors: c } = useTheme();
  return (
    <View style={{ marginTop: 24, gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <Label size={20} bold accessibilityRole="header" style={{ color: c.ink }}>Equipment</Label>
        <Label size={13} muted>{requirements.length} {requirements.length === 1 ? 'item' : 'items'}</Label>
      </View>
      {(['audio', 'video', 'other'] as const).map(department => {
        const items = requirements.filter(item => item.department === department);
        if (!items.length) return null;
        const deptLabel = department === 'audio' ? 'Audio' : department === 'video' ? 'Video' : 'Other';
        return (
          <View key={department} style={{ gap: 6, marginTop: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <Label size={15} bold style={{ color: c.blue }}>{deptLabel}</Label>
              <View style={{ flex: 1, height: 1, backgroundColor: c.blueBorder }} />
            </View>
            {items.map(item => (
              <View key={item.id} style={{ gap: 3, paddingVertical: 8 }}>
                <Label size={15} bold style={{ lineHeight: 22, color: c.ink }}>
                  {item.quantity == null ? item.title : `${item.quantity} × ${item.title}`}
                </Label>
                {item.quantity == null && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <AlertCircle size={13} color={c.amber} />
                    <Label size={13} bold style={{ color: c.amber }}>Quantity to confirm</Label>
                  </View>
                )}
                {!!item.notes && <Label size={13} muted style={{ lineHeight: 18 }}>{item.notes}</Label>}
              </View>
            ))}
          </View>
        );
      })}
      {!requirements.length && <Label size={14} muted>No equipment listed. Add items in Edit request.</Label>}
    </View>
  );
}

