import { View } from 'react-native';
import { MediaRequest, Requirement } from '../../api/types';
import { Label } from '../../components/ui';
import { useTheme } from '../../theme';
import { dateLabel, clock } from './presentation';

const labels: Record<string, string> = { title: 'Event', organizer: 'Organizer', venue: 'Venue', contact: 'Contact', summary: 'Notes', event_start: 'Event start', event_end: 'Event end', setup_deadline: 'Setup deadline' };

export function ProposalChanges({ request, changes }: { request: MediaRequest; changes: Partial<MediaRequest> }) {
  const { colors: c } = useTheme();
  const entries = Object.entries(changes).filter(([key, value]) => key in labels && value != null && value !== '');
  function display(key: string, value: unknown) {
    if (!value) return 'Unspecified';
    if (['event_start', 'event_end', 'setup_deadline'].includes(key) && !Number.isNaN(Date.parse(String(value)))) return dateLabel(String(value), request.timezone) + ' · ' + clock(String(value), request.timezone);
    return String(value);
  }
  return <View style={{ gap: 12 }}>
    {entries.map(([key, value]) => <View key={key} style={{ gap: 3 }}>
      <Label size={12} style={{ color: c.amber }}>{labels[key]}</Label>
      <Label size={14}>{display(key, request[key as keyof MediaRequest])} → {display(key, value)}</Label>
    </View>)}
    {!!changes.requirements?.length && <View style={{ gap: 8 }}>
      <Label size={12} style={{ color: c.amber }}>Equipment mentioned in this update</Label>
      {changes.requirements.map((item: Requirement, index: number) => {
        const previous = request.requirements.find(old => old.title.toLowerCase() === item.title.toLowerCase() && old.department === item.department);
        return <Label size={14} key={item.id || String(index)}>{item.title}: {previous ? previous.quantity ?? '?' : 'New item'} → {item.quantity ?? 'Confirm quantity'}</Label>;
      })}
      <Label size={12} style={{ color: c.amber }}>Equipment not mentioned in this email stays unchanged.</Label>
    </View>}
    {!entries.length && !changes.requirements?.length && <Label size={14}>No clear field changes were extracted. Read the source email and edit the request if needed.</Label>}
  </View>;
}
