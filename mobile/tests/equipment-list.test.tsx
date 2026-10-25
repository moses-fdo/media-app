import { render, screen } from '@testing-library/react-native';
import { EquipmentList } from '../src/features/requests/EquipmentList';
import { ThemeProvider } from '../src/theme';
import { Requirement } from '../src/api/types';

test('equipment is readable text with quantities and notes, without preparation controls', async () => {
  const requirements = [
    { id: 'mic', title: 'Wireless microphones', quantity: 4, department: 'audio', status: 'pending', notes: 'At the lectern' },
    { id: 'projector', title: 'Projector', quantity: null, department: 'video', status: 'tested', notes: '' },
  ] as Requirement[];
  await render(<ThemeProvider><EquipmentList requirements={requirements} /></ThemeProvider>);
  expect(screen.getByText('4 × Wireless microphones')).toBeTruthy();
  expect(screen.getByText('At the lectern')).toBeTruthy();
  expect(screen.getByText('Projector')).toBeTruthy();
  expect(screen.getByText('Quantity to confirm')).toBeTruthy();
  expect(screen.queryByRole('radio')).toBeNull();
  expect(screen.queryByText(/pending|prepared|tested/i)).toBeNull();
});

test('equipment has an honest empty state', async () => {
  await render(<ThemeProvider><EquipmentList requirements={[]} /></ThemeProvider>);
  expect(screen.getByText('No equipment listed. Add items in Edit request.')).toBeTruthy();
});
