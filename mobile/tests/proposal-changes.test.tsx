import { render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../src/theme';
import { ProposalChanges } from '../src/features/requests/ProposalChanges';
import { MediaRequest } from '../src/api/types';

const request = { venue:'Main Hall',timezone:'Asia/Kolkata',requirements:[{id:'old',title:'Microphone',department:'audio',quantity:4}] } as MediaRequest;

test('venue-only updates show the previous and proposed values', async () => {
  await render(<ThemeProvider><ProposalChanges request={request} changes={{venue:'New Hall'}}/></ThemeProvider>);
  expect(screen.getByText('Main Hall → New Hall')).toBeTruthy();
});

test('equipment changes expose quantities before staff accepts', async () => {
  await render(<ThemeProvider><ProposalChanges request={request} changes={{requirements:[{id:'new',title:'Microphone',department:'audio',quantity:6}] as any}}/></ThemeProvider>);
  expect(screen.getByText('Microphone: 4 → 6')).toBeTruthy();
});

test('unstructured replies explain that manual review is needed', async () => {
  await render(<ThemeProvider><ProposalChanges request={request} changes={{}}/></ThemeProvider>);
  expect(screen.getByText('No clear field changes were extracted. Read the source email and edit the request if needed.')).toBeTruthy();
});
