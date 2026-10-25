import { ApiError } from '../src/api/client';
import storage from '@react-native-async-storage/async-storage';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RequestForm } from '../src/features/requests/RequestForm';
import { ThemeProvider } from '../src/theme';
import { MediaRequest } from '../src/api/types';

jest.mock('@expo/ui/community/datetime-picker', () => ({ __esModule: true, default: () => null }));

let mockMe: any = null;
jest.mock('expo-router', () => ({ usePreventRemove: jest.fn(() => jest.fn()) }));
jest.mock('../src/auth/context', () => ({ useAuth: () => ({ me: mockMe }), api: { get: jest.fn().mockResolvedValue({ items: [] }) } }));

const initial = { title:'Convocation',organizer:'Registrar',venue:'Main Hall',contact:'Office',timezone:'Asia/Kolkata',event_start:'2027-11-20T10:00:00+05:30',setup_deadline:'2027-11-20T08:30:00+05:30',summary:'',priority:'medium',requirements:[{id:'mic',title:'Wireless microphone',department:'audio',quantity:4,notes:'',assignee_id:null,status:'tested',version:1},{id:'camera',title:'Camera',department:'video',quantity:2,notes:'',assignee_id:null,status:'tested',version:1}]} as MediaRequest;

async function show(save: jest.Mock) {
  return render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false,gcTime:Infinity}}})}><ThemeProvider><RequestForm initial={initial} timezone="Asia/Kolkata" onSave={save}/></ThemeProvider></QueryClientProvider>);
}

test('editing quantity resets only changed equipment to pending', async () => {
  const save=jest.fn().mockResolvedValue(undefined);await show(save);
  await fireEvent.changeText(screen.getByLabelText('Equipment 1 quantity'),'6');
  await fireEvent.press(screen.getByRole('button',{name:'Save changes'}));
  expect(save.mock.calls[0][0].requirements[0]).toMatchObject({id:'mic',quantity:6,status:'pending'});
  expect(save.mock.calls[0][0].requirements[1]).toMatchObject({id:'camera',quantity:2,status:'tested'});
});

test('invalid quantity is explained and never saved', async () => {
  const save=jest.fn();await show(save);
  await fireEvent.changeText(screen.getByLabelText('Equipment 1 quantity'),'0');
  await fireEvent.press(screen.getByRole('button',{name:'Save changes'}));
  expect(save).not.toHaveBeenCalled();
  expect(screen.getByText('Equipment quantities must be whole numbers between 1 and 100000.')).toBeTruthy();
});

test('staff can remove an incorrectly parsed equipment item', async () => {
  const save=jest.fn().mockResolvedValue(undefined);await show(save);
  await fireEvent.press(screen.getByRole('button',{name:'Remove equipment 1'}));
  await fireEvent.press(screen.getByRole('button',{name:'Save changes'}));
  expect(save.mock.calls[0][0].requirements).toHaveLength(1);
  expect(save.mock.calls[0][0].requirements[0].id).toBe('camera');
});

test('a background update cannot silently advance the version of an open edit', async () => {
  const save=jest.fn().mockResolvedValue(undefined);
  const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:Infinity}}});
  const content=(version:number)=><QueryClientProvider client={client}><ThemeProvider><RequestForm initial={{...initial,version}} timezone="Asia/Kolkata" onSave={save}/></ThemeProvider></QueryClientProvider>;
  const view=await render(content(3));
  await view.rerender(content(4));
  await fireEvent.press(screen.getByRole('button',{name:'Save changes'}));
  expect(save.mock.calls[0][0].expected_version).toBe(3);
});

test('validation marks the affected field instead of only showing a bottom error', async()=>{
 const save=jest.fn(); await show(save);
 await fireEvent.changeText(screen.getByLabelText('Event or request title'),'');
 await fireEvent.press(screen.getByRole('button',{name:'Save changes'}));
 expect(screen.getByLabelText('Event or request title').props['aria-invalid']).toBe(true);
 expect(save).not.toHaveBeenCalled();
});


beforeEach(async()=>{mockMe=null; await storage.clear();});
test('an interrupted draft restores edits and keeps the original edit version', async()=>{
 mockMe={id:'u1',workspace_id:'w1'};
 const save=jest.fn().mockResolvedValue(undefined);
 const view=await show(save);
 await fireEvent.changeText(screen.getByLabelText('Event or request title'),'Draft title');
 await waitFor(()=>expect(screen.getByText('Draft saved on this device')).toBeTruthy());
 await view.unmount();
 await show(save);
 await fireEvent.press(screen.getByRole('button',{name:'Resume draft'}));
 expect(screen.getByLabelText('Event or request title').props.value).toBe('Draft title');
 await fireEvent.press(screen.getByRole('button',{name:'Save changes'}));
 expect(save.mock.calls[0][0].title).toBe('Draft title');
});
test('another account cannot see a saved draft', async()=>{
 mockMe={id:'u1',workspace_id:'w1'};
 const view=await show(jest.fn());
 await fireEvent.changeText(screen.getByLabelText('Event or request title'),'Private draft');
 await waitFor(()=>expect(screen.getByText('Draft saved on this device')).toBeTruthy());
 await view.unmount();
 mockMe={id:'u2',workspace_id:'w1'};
 await show(jest.fn());
 expect(screen.queryByText('Resume draft')).toBeNull();
 expect(screen.getByLabelText('Event or request title').props.value).toBe('Convocation');
});

test('Back offers usable recovery choices for a dirty draft',async()=>{
 mockMe={id:'u1',workspace_id:'w1'};await show(jest.fn());
 await fireEvent.changeText(screen.getByLabelText('Event or request title'),'Keep my edits');
 const {usePreventRemove}=require('expo-router');
 const repeat=jest.fn();
 await act(()=>usePreventRemove.mock.calls.at(-1)[1]({repeat}));
 await fireEvent.press(screen.getByRole('button',{name:'Save draft and leave'}));
 expect(repeat).toHaveBeenCalled();
 const keys=await storage.getAllKeys();
 const raw=await storage.getItem(keys.find(key=>key.startsWith('media-draft:'))!);
 expect(JSON.parse(raw!).fields.title).toBe('Keep my edits');
});

test('conflict reload deletes the obsolete draft rather than offering it again',async()=>{
 mockMe={id:'u1',workspace_id:'w1'};
 const reload=jest.fn().mockResolvedValue(undefined);
 const save=jest.fn().mockRejectedValue(new ApiError('This request changed. Reload before saving.',409));
 const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:Infinity}}});
 const view=await render(<QueryClientProvider client={client}><ThemeProvider><RequestForm initial={initial} timezone="Asia/Kolkata" onSave={save} onReload={reload}/></ThemeProvider></QueryClientProvider>);
 await fireEvent.changeText(screen.getByLabelText('Event or request title'),'Obsolete edits');
 await fireEvent.press(screen.getByRole('button',{name:'Save changes'}));
 await fireEvent.press(screen.getByRole('button',{name:'Reload latest request'}));
 await fireEvent.press(screen.getByRole('button',{name:'Discard draft and reload'}));
 expect(reload).toHaveBeenCalled();
 await view.unmount();
 const keys=await storage.getAllKeys();
 expect(keys.filter(key=>key.startsWith('media-draft:'))).toHaveLength(0);
});
